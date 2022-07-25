import { SElement } from '.';
declare class SElementAssociation {
    fromElement: SElement;
    toElement: SElement;
    deptype?: string;
    attrs?: any;
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
