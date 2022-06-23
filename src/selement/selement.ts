import hash from 'object-hash';
import { SElementAssociation } from './selementAssociation';

const DEBUG = true;

class SElement {
  hash: string;
  name: string;
  humanReadableName = '';
  parent: SElement | undefined;
  attrs: { [key: string]: any } = {};
  children: SElement[] = [];
  childrenObject: { [key: string]: SElement } = {};
  outgoing: SElementAssociation[] = [];
  incoming: SElementAssociation[] = [];

  constructor(name: string, parent?: SElement) {
    if (name.replace(/\s/g, '') === '') {
      console.error('Creating with empty name');
    }

    if (parent && this.equals(parent)) {
      throw new Error('Self loop in model\n');
    }

    this.name = name.replace('/', '__slash__');
    this.humanReadableName = '';

    if (parent) {
      this.parent = parent;
      if (!(this.name in this.parent.childrenObject)) {
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

    this.hash = this.getHash();
  }

  addChild(child: SElement) {
    if (this.equals(child)) {
      console.error('Error with data model loop');
      throw new Error(
        'Aborting due to addChild this not equal to child violation'
      );
    }
    if (!(child.name in this.childrenObject)) {
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
        return this.childrenObject[child.name];
      }
    }

    child.parent = this;

    this.hash = this.getHash();
  }

  merge(other: SElement, ignoreType?: boolean, ignoreAttrs?: boolean) {
    for (let child of other.children) {
      other.detachChild(child);
      this.addChild(child);
    }

    let currentDeps: { [key: string]: any[] } = {};
    for (let ea of this.outgoing) {
      if (ea.toElement)
        (currentDeps[ea.toElement.hash] ??= []).push(ea.deptype);
    }

    for (let ea of other.outgoing) {
      if (
        ea.toElement &&
        ea.toElement.hash in currentDeps &&
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
      if (ea.fromElement)
        (currentDeps[ea.fromElement.getHash()] ??= []).push(ea.deptype);
    }

    for (let ea of other.incoming) {
      if (
        ea.fromElement &&
        ea.fromElement.hash in currentDeps &&
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
        if (!(key in this.attrs)) {
          this.attrs[key] = value;
        } else if (this.attrs[key] !== value) {
          if (Array.isArray(value)) {
            for (let v of value) {
              if (!this.attrs[key].includes(v)) {
                this.attrs[key].push(v);
              }
            }
          } else {
            this.attrs[key] = this.attrs[key] + '-merged-' + value.toString();
          }
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

    this.hash = this.getHash();
  }

  detachChild(child: SElement) {
    child.parent = undefined;
    const index = this.children.indexOf(child);
    if (index !== -1) this.children.splice(index, 1);
    if (child.name in this.childrenObject) {
      delete this.childrenObject[child.name];
    } else {
      console.error(
        `Error: Probably duplicated element ${
          child.name
        } under ${this.getPath()}`
      );
    }
  }

  getChildByName = (name: string) => this.childrenObject[name];

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

  addAttribute(name: string, value: any) {
    this.attrs[name] = value;
  }

  typeEquals(t: any) {
    if ('type' in this.attrs) {
      return this.attrs.type === t;
    }
    return t === '';
  }

  setType(t: string) {
    this.attrs.type = t;
  }

  getType() {
    return this.attrs.type || '<not known>';
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

  getHash() {
    return hash(this);
  }

  equals(other: SElement) {
    return this.hash === other.hash;
  }
}

class SElementMergedException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SElementMergedException';
  }
}

export { SElement };
