import hash from 'object-hash';
import { SElementAssociation } from '.';

const DEBUG = true;

class SElement {
  private hash: string = '';
  name: string;
  humanReadableName = '';
  parent: SElement | undefined;
  private attrs: { [key: string]: string | string[] } = {};
  children: SElement[] = [];
  childrenObject: { [key: string]: SElement } = {};
  outgoing: SElementAssociation[] = [];
  incoming: SElementAssociation[] = [];

  constructor(name: string, parent?: SElement) {
    // if (name.replace(/\s/g, '') === '') {
    //   console.error('Creating SElement with empty name');
    // }

    if (parent && this.equals(parent)) {
      throw new Error('Self loop in model\n');
    }

    this.name = name.replace('/', '__slash__');
    this.humanReadableName = '';

    if (parent) {
      this.parent = parent;
      if (!Object.keys(this.parent.childrenObject).includes(this.name)) {
        this.parent.children.push(this);
        this.parent.childrenObject[this.name] = this;
      } else {
        if (DEBUG) {
          throw new Error(
            `Error: overlapping elements related to ${
              this.name
            } under ${this.parent.getPath()}, types: '<not known>' and ${this.parent.childrenObject[
              this.name
            ].getType()}`
          );
        } else {
          throw new SElementMergedException(
            `Element ${
              this.name
            } tried to be merged with an existing element ${this.parent.getPath()}`
          );
        }
      }
    }

    this.updateHash();
  }

  addChild(child: SElement) {
    if (this.equals(child)) {
      console.error('Error with data model loop');
      throw new Error(
        'Aborting due to addChild this not equal to child violation'
      );
    }
    if (!Object.keys(this.childrenObject).includes(child.name)) {
      this.children.push(child);
      this.childrenObject[child.name] = child;
    } else {
      if (DEBUG) {
        throw new Error(
          `Error: overlapping elements related to ${
            child.name
          } under ${this.getPath()}, types: ${child.getType()} and ${this.childrenObject[
            child.name
          ].getType()}`
        );
      } else {
        this.childrenObject[child.name].merge(child);
        this.updateHash();
        return this.childrenObject[child.name];
      }
    }

    child.parent = this;

    this.updateHash();
  }

  merge(other: SElement, ignoreType?: boolean, ignoreAttrs?: boolean) {
    for (let child of other.children) {
      other.detachChild(child);
      this.addChild(child);
    }

    let currentDeps: { [key: string]: string[] } = {};
    for (let ea of this.outgoing) {
      if (ea.toElement) {
        currentDeps[ea.toElement.hash] ??= [];
        if (ea.deptype) currentDeps[ea.toElement.hash].push(ea.deptype);
      }
    }

    for (let ea of other.outgoing) {
      if (
        ea.toElement &&
        ea.toElement.hash in currentDeps &&
        ea.deptype &&
        ea.deptype in currentDeps[ea.toElement.hash] &&
        !this.equals(ea.toElement)
      ) {
        const newEa = new SElementAssociation(
          this,
          ea.toElement,
          ea.deptype,
          ea.attrs
        );
        newEa.initElems();
      }
    }
    other.outgoing = [];

    currentDeps = {};
    for (let ea of this.incoming) {
      if (ea.fromElement) {
        currentDeps[ea.fromElement.hash] ??= [];
        if (ea.deptype) currentDeps[ea.fromElement.hash].push(ea.deptype);
      }
    }

    for (let ea of other.incoming) {
      if (
        ea.fromElement &&
        ea.fromElement.hash in currentDeps &&
        ea.deptype &&
        ea.deptype in currentDeps[ea.fromElement.hash]
      ) {
        const newEa = new SElementAssociation(
          ea.fromElement,
          this,
          ea.deptype,
          ea.attrs
        );
        newEa.initElems();
      }
    }
    other.incoming = [];

    for (let [key, value] of Object.entries(other.attrs)) {
      if (!ignoreAttrs && key !== 'type') {
        if (!Object.keys(this.attrs).includes(key)) {
          this.attrs[key] = value;
        } else if (this.attrs[key] !== value) {
          if (Array.isArray(value)) {
            for (let v of value) {
              if (!this.attrs[key].includes(v)) {
                this.addAttribute(key, v);
              }
            }
          } else {
            this.attrs[key] = `${this.attrs[key]}-merged-${value.toString()}`;
          }
        } else {
          continue;
        }
      } else if (
        !ignoreType &&
        key === 'type' &&
        value !== '' &&
        !this.typeEquals(value)
      ) {
        this.setType(this.getType() + '_' + value);
      }
    }

    if (other.parent) {
      other.parent.detachChild(other);
      other.parent = undefined;
    }

    this.updateHash();
  }

  detachChild(child: SElement) {
    child.parent = undefined;
    const index = this.children.indexOf(child);
    if (index !== -1) this.children.splice(index, 1);
    if (Object.keys(this.childrenObject).includes(child.name)) {
      delete this.childrenObject[child.name];
    } else {
      console.error(
        `Error: Probably duplicated element ${
          child.name
        } under ${this.getPath()}`
      );
    }
    this.updateHash();
  }

  getChildByName = (name: string): SElement | undefined => {
    if (Object.getOwnPropertyNames(this.childrenObject).includes(name)) {
      return this.childrenObject[name];
    }
    return undefined;
  };

  findElement(name: string): SElement | undefined {
    if (name.startsWith('/')) {
      name = name.slice(1);
    }
    if (!name.includes('/')) {
      return this.getChildByName(name);
    }

    const pos = name.indexOf('/');
    const root = name.slice(0, pos);
    if (this.children.length <= 0) {
      return undefined;
    }
    const child = this.getChildByName(root);
    if (child) return child.findElement(name.slice(pos + 1));
    return undefined;
  }

  createOrGetElement(n: string): SElement {
    if (n.startsWith('/')) n = n.slice(1);

    if (!n.includes('/')) {
      const child = this.getChildByName(n);
      if (child) return child;
      return new SElement(n, this);
    }

    if (this.children.length === 0) {
      return this.createElementChain(n);
    }

    const pos = n.indexOf('/');
    const root = n.slice(0, pos);
    const child = this.getChildByName(root);
    if (child) return child.createOrGetElement(n.slice(pos + 1));
    return this.createElementChain(n);
  }

  createElementChain(id: string) {
    let current: SElement = this;
    for (let n of id.split('/')) current = new SElement(n, current);
    return current;
  }

  traverseElements(visit: (e: SElement) => void) {
    visit(this);
    for (let c of this.children) {
      c.traverseElements(visit);
    }
  }

  getAncestors() {
    let ancestor: SElement = this;
    const ancestors: SElement[] = [];
    while (ancestor && ancestor.parent) {
      ancestor = ancestor.parent;
      ancestors.push(ancestor);
    }
    return ancestors;
  }

  addAttribute(name: string, value: string) {
    if (name === 'type') {
      this.attrs[name] = value;
    } else {
      (<string[]>(this.attrs[name] ??= [])).push(value);
    }
  }

  setAttributes(attributes: any) {
    this.attrs = attributes;
  }

  getAttributes() {
    return this.attrs;
  }

  setType(t: string) {
    this.attrs.type = t;
  }

  getType() {
    return <string>this.attrs.type || '<not known>';
  }

  getPath() {
    let p = this.parent;
    const pathparts = [this.name];
    while (p && p.parent?.hash !== p.hash) {
      pathparts.push(p.name);
      p = p.parent;
    }
    return pathparts.reverse().join('/');
  }

  getHash = () => this.hash;
  updateHash() {
    this.hash = hash({
      n: this.name,
      h: this.humanReadableName,
      p: this.parent?.getHash(),
      c: this.children.length,
      co: Object.keys(this.childrenObject).sort(),
      o: this.outgoing.length,
      i: this.incoming.length,
    });
  }

  equals(other: SElement) {
    return this.hash === other.hash;
  }

  typeEquals(t: any) {
    return this.attrs.type === t;
  }

  getPathAsList() {
    const a = [];
    a.push(this.name);
    let p = this.parent;
    while (p && p.parent) {
      a.push(p.name);
      p = p.parent;
    }
    return a;
  }

  createElements(elements: string[], startFrom: number) {
    let parent = this as SElement;
    for (let i = startFrom; i < elements.length; i++) {
      parent = new SElement(elements[i], parent);
    }
    return parent;
  }

  /**
   * Returns a list of cyclic dependencies in the form of a list of elements that form a cycle
   * @returns {SElement[][]} a list of cyclic dependencies
   */
  getCyclicDependencies(): SElement[][] {
    const cyclic: SElement[][] = [];
    const stack: SElement[] = [];
    this.#getCyclicDependencies(this, stack, cyclic);
    return cyclic;
  }
  #getCyclicDependencies(
    element: SElement,
    stack: SElement[],
    cyclic: SElement[][],
    path: SElement[] = []
  ) {
    if (stack.includes(element)) {
      if (element === stack[0]) cyclic.push(path);
      return;
    }
    stack.push(element);
    element.outgoing.map((ea) =>
      this.#getCyclicDependencies(ea.toElement, stack, cyclic, [
        ...path,
        element,
      ])
    );
  }
}

class SElementMergedException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SElementMergedException';
  }
}

export { SElement };
