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
    findElementFromPath(i: string): SElement | undefined;
    setModelPath(filePath: string): void;
    toEcharts(): EChartsOptions;
}
export { SGraph };
