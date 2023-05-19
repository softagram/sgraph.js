import { SElement } from '../selement';
import { EChartsOptions } from '../converters';
interface ParseXmlOptions {
    data: string;
    typeRules?: string[];
    ignoredAttributes?: string[];
    onlyRoot?: boolean;
}
interface ParseXmlFileOrZippedXmlOptions extends Omit<ParseXmlOptions, 'data'> {
    filePath: string;
}
declare class SGraph {
    rootNode: SElement;
    modelAttrs: {
        [key: string]: string;
    };
    constructor(rootNode: SElement);
    static parseXml({ data, ignoredAttributes, onlyRoot, }: ParseXmlOptions): SGraph;
    static parseXmlFileOrZippedXml({ filePath, typeRules, ignoredAttributes, onlyRoot, }: ParseXmlFileOrZippedXmlOptions): Promise<SGraph | undefined>;
    createOrGetElementFromPath(n: string): SElement;
    createOrGetElement(elem: SElement): SElement;
    /**
        Create or get element matching this element, yielding also boolean
        to indicate if new was created.
        @param element the element to create or get
        @returns tuple of the matched element and boolean describing if new element was created.
        */
    createOrGetElementWithNew(element: SElement): {
        element: SElement;
        isNew: boolean;
    };
    findElementFromPath(i: string): SElement | undefined;
    setModelPath(filePath: string): void;
    toEcharts(): EChartsOptions;
    toXml(): string;
}
export { SGraph };
