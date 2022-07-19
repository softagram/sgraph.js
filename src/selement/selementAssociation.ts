import { SElement, lowestComonAncestor } from '.';

class SElementAssociation {
  fromElement: SElement;
  toElement: SElement;
  deptype?: string;
  attrs?: any;

  constructor(from: SElement, to: SElement, deptype?: any, depattrs: any = {}) {
    this.fromElement = from;
    this.toElement = to;
    this.deptype = deptype;
    this.attrs = depattrs;
  }

  calculateCompareStatus() {
    const compare = this.attrs['compare'];
    if (compare === 'added') return 1;
    if (compare === 'removed') return 2;
    if (compare === 'changed') return 3;
    return 0;
  }

  initElems() {
    this.fromElement?.outgoing.push(this);
    this.toElement?.incoming.push(this);
  }

  setAttrs(a: { [key: string]: any }) {
    this.attrs = a;
  }

  remove() {
    this.fromElement?.outgoing.splice(
      this.fromElement?.outgoing.indexOf(this),
      1
    );
    this.fromElement?.incoming.splice(
      this.fromElement?.incoming.indexOf(this),
      1
    );
  }

  getDependencyLength() {
    if (this.fromElement?.equals(this.toElement!)) {
      return 0;
    }

    const lca = lowestComonAncestor(this.fromElement, this.toElement);

    const levelsBetween = (e: SElement, ancestor: SElement) => {
      let steps = 0;
      let nextAncestor = e.parent;
      while (nextAncestor && nextAncestor.parent) {
        steps += 1;
        if (ancestor.equals(nextAncestor)) return steps;
        nextAncestor = nextAncestor.parent;
      }
      return steps;
    };

    return lca
      ? levelsBetween(this.fromElement, lca) +
          levelsBetween(this.toElement, lca)
      : 0;
  }

  getFromPath = () => this.fromElement?.getPath();
  getToPath = () => this.toElement?.getPath();
  getType = () => this.deptype;
  getAttributes = () => this.attrs;
}

export { SElementAssociation };
