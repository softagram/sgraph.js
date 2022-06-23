import { SElement } from './selement';

class SElementAssociation {
  deptype?: any;
  fromElement?: SElement;
  toElement?: SElement;
  attrs?: any;

  constructor(fr?: SElement, to?: SElement, deptype?: any, depattrs: any = {}) {
    this.deptype = deptype;
    this.fromElement = fr;
    this.toElement = to;
    this.attrs = depattrs;
  }

  initElems() {
    this.fromElement?.outgoing.push(this);
    this.toElement?.incoming.push(this);
  }

  setAttrMap(a: { [key: string]: any }) {
    this.attrs = a;
  }
}

export { SElementAssociation };
