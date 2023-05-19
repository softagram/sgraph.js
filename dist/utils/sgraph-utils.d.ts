import { SElement, SElementAssociation } from '../selement';
export declare const encodeAttributeName: (n: any) => any;
export declare const encodeAttributeValue: (v: any) => any;
export declare const getAttributeString: (attributes: {
    [key: string]: string | string[];
}, elementType: string, currentIndent: string) => string;
export declare const groupElementAssociations: (associations: SElementAssociation[]) => {
    associationlist: SElementAssociation[];
    deptype: string | undefined;
    attrs: Record<string, string> | undefined;
}[];
export declare class Counter {
    i: number;
    constructor();
    now(): number;
}
export declare const elementSort: (a: SElement, b: SElement) => number;
