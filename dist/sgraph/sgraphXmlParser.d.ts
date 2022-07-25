import sax from 'sax';
import { SElement, SElementAssociation } from '../selement';
export default class SGraphXMLParser {
    idStack: string[];
    rootNode: SElement;
    elemStack: SElement[];
    currentElement?: SElement;
    currentElementPath?: string;
    idToElemMap: {
        [key: string]: SElement;
    };
    currentRelation?: {
        [key: string]: string;
    };
    currentElementOutgoingDeps?: SElementAssociation[];
    acceptAllAssocTypes: boolean;
    acceptableAssocTypes: Set<unknown>;
    ignoreAssocTypes: Set<unknown>;
    ignoredAttributes: any[];
    onlyRoot: boolean | undefined;
    parser: sax.SAXParser;
    constructor(ignoredAttributes?: any[], onlyRoot?: boolean);
    parse(xml: any): void;
    setTypeRules(typeRules: string[]): void;
    onopentag: (tag: sax.Tag | sax.QualifiedTag) => void;
    onclosetag: (tag: string) => void;
    createReference(i: string, t: string): void;
    translateReferences: () => void;
}
