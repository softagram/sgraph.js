import { SElement } from '.';
declare class SElementAssociation {
    fromElement: SElement;
    toElement: SElement;
    deptype?: string;
    attrs?: any;
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
    static createUniqueElementAssociation(fromElement: SElement, toElement: SElement, deptype?: any, depattrs?: any): {
        existingOrNewAssociation: SElementAssociation;
        isNew: boolean;
    };
    constructor(from: SElement, to: SElement, deptype?: any, depattrs?: any);
    calculateCompareStatus(): 1 | 0 | 2 | 3;
    initElems(): void;
    setAttrs(a: {
        [key: string]: any;
    }): void;
    remove(): void;
    getDependencyLength(): number;
    getFromPath: () => string;
    getToPath: () => string;
    getType: () => string | undefined;
    getAttributes: () => any;
}
export { SElementAssociation };
