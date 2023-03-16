import { SElement, lowestCommonAncestor } from '.';

class SElementAssociation {
  fromElement: SElement;
  toElement: SElement;
  deptype?: string;
  attrs?: Record<string, string>;

  /**
     Create association between two elements if there already does not exist a similar association.
     The association is considered to be similar if toElement has an incoming association with the
     same type and the same fromElement.
     @param {SElement} fromElement the elemenet that is the starting point of the association
     @param {SElement} toElement the element that is the ending point of the association
     @param {string} deptype the type of the association
     @param {any} depattrs attributes for the associtaion
     @returns {SElement, boolean} Return an object containing the existing or new element and a 
     boolean indicating if a new element was created (true if new was created, false otherwise)
   */
  static createUniqueElementAssociation(
    fromElement: SElement,
    toElement: SElement,
    deptype?: any,
    depattrs: Record<string, string> = {}
  ): { existingOrNewAssociation: SElementAssociation; isNew: boolean } {
    const existingAssociations = toElement.incoming.filter((incoming) => {
      const fromElementMatches = incoming.fromElement === fromElement;
      return deptype
        ? deptype === incoming.deptype && fromElementMatches
        : fromElementMatches;
    });
    // Do not create association if the same association already exists
    if (existingAssociations.length > 0) {
      // Combine attributes to the existing association
      const existingAttributes = existingAssociations[0].getAttributes();
      if (existingAttributes) {
        // Check that there aren't same attributes with different values
        Object.keys(depattrs).forEach((attributeName) => {
          if (Object.keys(existingAttributes).includes(attributeName)) {
            if (existingAttributes[attributeName] !== depattrs[attributeName]) {
              throw new SElementAssociationException(
                `Can not create association of type ${deptype} from ${fromElement.name} to ${toElement.name} due to attribute conflict: attribute with name ${attributeName} ${existingAttributes[attributeName]} would be replaced by ${depattrs[attributeName]}`
              );
            }
          }
        });
      }
      existingAssociations[0].setAttrs({ ...existingAttributes, ...depattrs });
      return {
        existingOrNewAssociation: existingAssociations[0],
        isNew: false,
      };
    }
    const newAssociation = new SElementAssociation(
      fromElement,
      toElement,
      deptype,
      depattrs
    );
    newAssociation.initElems();
    return { existingOrNewAssociation: newAssociation, isNew: true };
  }

  constructor(from: SElement, to: SElement, deptype?: any, depattrs: any = {}) {
    this.fromElement = from;
    this.toElement = to;
    this.deptype = deptype;
    this.attrs = depattrs;
  }

  calculateCompareStatus() {
    if (this.attrs) {
      const compare = this.attrs['compare'];
      if (compare === 'added') return 1;
      if (compare === 'removed') return 2;
      if (compare === 'changed') return 3;
    }
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

    const lca = lowestCommonAncestor(this.fromElement, this.toElement);

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

class SElementAssociationException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SElemenAssociationException';
  }
}

export { SElementAssociation };
