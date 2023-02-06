import { SElementAssociation } from '.';
declare class SElement {
    private hash;
    name: string;
    humanReadableName: string;
    parent: SElement | undefined;
    private attrs;
    children: SElement[];
    childrenObject: {
        [key: string]: SElement;
    };
    outgoing: SElementAssociation[];
    incoming: SElementAssociation[];
    constructor(name: string, parent?: SElement);
    addChild(child: SElement): SElement | undefined;
    merge(other: SElement, ignoreType?: boolean, ignoreAttrs?: boolean): void;
    detachChild(child: SElement): void;
    getChildByName: (name: string) => SElement;
    findElement(name: string): SElement | undefined;
    createOrGetElement(n: string): SElement;
    createElementChain(id: string): SElement;
    traverseElements(visit: (e: SElement) => void): void;
    getAncestors(): SElement[];
    addAttribute(name: string, value: string): void;
    setAttributes(attributes: any): void;
    getAttributes(): {
        [key: string]: string | string[];
    };
    setType(t: string): void;
    getType(): string;
    getPath(): string;
    getHash: () => string;
    updateHash(): void;
    equals(other: SElement): boolean;
    typeEquals(t: any): boolean;
    getPathAsList(): string[];
    createElements(elements: string[], startFrom: number): SElement;
}
export { SElement };
