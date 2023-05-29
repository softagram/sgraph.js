"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SGraph = void 0;
const selement_1 = require("../selement");
const sgraphXmlParser_1 = __importDefault(require("./sgraphXmlParser"));
const converters_1 = require("../converters");
const sgraph_utils_1 = require("../utils/sgraph-utils");
const sgraph_utils_2 = require("../utils/sgraph-utils");
class SGraph {
    constructor(rootNode) {
        this.modelAttrs = {};
        this.rootNode = rootNode;
    }
    static parseXml({ data, ignoredAttributes = [], onlyRoot = false, }) {
        const parser = new sgraphXmlParser_1.default(ignoredAttributes, onlyRoot);
        parser.setTypeRules(['ALL']);
        parser.parse(data);
        parser.translateReferences();
        return new SGraph(parser.rootNode);
    }
    static async parseXmlFileOrZippedXml({ filePath, typeRules, ignoredAttributes, onlyRoot = false, }) {
        const AdmZip = eval('require')('adm-zip');
        const { readFile } = eval('require')('fs/promises');
        let data;
        try {
            if (filePath.includes('.zip')) {
                const zip = new AdmZip(filePath);
                data = zip.readAsText('modelfile.xml');
            }
            else {
                data = (await readFile(filePath)).toString();
            }
        }
        catch (_a) {
            return undefined;
        }
        const model = SGraph.parseXml({
            data,
            typeRules,
            ignoredAttributes,
            onlyRoot,
        });
        model.setModelPath(filePath);
        return model;
    }
    createOrGetElementFromPath(n) {
        var _a, _b;
        if (n.startsWith('/'))
            n = n.slice(1);
        if (!n.includes('/')) {
            const child = (_a = this.rootNode) === null || _a === void 0 ? void 0 : _a.getChildByName(n);
            if (child)
                return child;
            return new selement_1.SElement(n, this.rootNode);
        }
        if (n.length > 0) {
            return (_b = this.rootNode) === null || _b === void 0 ? void 0 : _b.createOrGetElement(n);
        }
        return this.rootNode;
    }
    createOrGetElement(elem) {
        const elems = elem.getPathAsList().reverse();
        let p = this.rootNode;
        for (let i = 0; i < elems.length; i++) {
            const s = elems[i];
            const child = p.getChildByName(s);
            if (child) {
                p = child;
            }
            else {
                return p.createElements(elems, i);
            }
        }
        return p;
    }
    /**
        Create or get element matching this element, yielding also boolean
        to indicate if new was created.
        @param element the element to create or get
        @returns tuple of the matched element and boolean describing if new element was created.
        */
    createOrGetElementWithNew(element) {
        const elements = element.getPathAsList().reverse();
        let p = this.rootNode;
        for (let i = 0; i < elements.length; i++) {
            const s = elements[i];
            const child = p.getChildByName(s);
            if (child) {
                p = child;
            }
            else {
                return { element: p.createElements(elements, i), isNew: true };
            }
        }
        return { element: p, isNew: false };
    }
    findElementFromPath(i) {
        if (!this.rootNode)
            return undefined;
        if (i.length > 0)
            return this.rootNode.findElement(i);
        return this.rootNode;
    }
    setModelPath(filePath) {
        this.modelAttrs['model_path'] = filePath;
    }
    toEcharts() {
        const ec = (0, converters_1.sgraphToEcharts)(this);
        return ec;
    }
    toXml() {
        const rootNode = this.rootNode;
        const counter = new sgraph_utils_2.Counter();
        const elementToNumber = new Map();
        const numberToElement = new Map();
        const addNumber = (n, counter) => {
            if ((n === null || n === void 0 ? void 0 : n.incoming.length) > 0) {
                if (!elementToNumber.has(n)) {
                    const num = counter.now().toString();
                    elementToNumber.set(n, num);
                    numberToElement.set(num, n);
                }
            }
            n.children.forEach((child) => addNumber(child, counter));
            n.outgoing.forEach((outgoing) => {
                const toElement = outgoing.toElement;
                if (!elementToNumber.has(toElement)) {
                    const num = counter.now();
                    elementToNumber.set(toElement, num);
                    numberToElement.set(num, toElement);
                }
            });
        };
        addNumber(rootNode, counter);
        let output = '<model version="2.1">\n<elements>\n';
        const dumpNode = (element, elementToNumber, recursionLevel, output) => {
            const currentIndent = '  '.repeat(recursionLevel);
            const attributeString = (0, sgraph_utils_1.getAttributeString)(element.getAttributes(), element.getType(), currentIndent);
            if (element.incoming.length > 0 && !elementToNumber.has(element)) {
                throw Error('Erroneous model with references to ' + element.getPath() + '\n');
            }
            const elementNumberString = elementToNumber.has(element)
                ? ' i="' + elementToNumber.get(element) + '" '
                : '';
            output = output.concat(`${currentIndent}<e ${elementNumberString} n="${(0, sgraph_utils_1.encodeAttributeValue)(element.name)}" `);
            output = output.concat(attributeString);
            output = output.concat('>\n');
            const groups = (0, sgraph_utils_1.groupElementAssociations)(element.outgoing);
            groups.forEach((group) => {
                const elementNumbers = [];
                const { associationlist, deptype, attrs } = group;
                associationlist.forEach((association) => {
                    const toElement = association.toElement;
                    if (elementToNumber.has(toElement)) {
                        elementNumbers.push(elementToNumber.get(toElement));
                    }
                    else {
                        throw Error(`No numeric id for ${toElement.getPath()} dep from ${association.fromElement.name}`);
                    }
                    const idrefs = elementNumbers.join(',');
                    if (idrefs) {
                        const associationAttributes = (0, sgraph_utils_1.getAttributeString)(attrs, deptype || '', currentIndent);
                        output = output.concat(`${currentIndent}<r r="${idrefs}" ${associationAttributes}/>\n`);
                    }
                });
            });
            const children = element.children.sort(sgraph_utils_1.elementSort);
            children.forEach((child) => (output = dumpNode(child, elementToNumber, recursionLevel + 1, output)));
            output = output.concat(`${currentIndent}</e>\n`);
            return output;
        };
        const rootChildren = rootNode.children.sort(sgraph_utils_1.elementSort);
        rootChildren.forEach((child) => {
            output = dumpNode(child, elementToNumber, 2, output);
        });
        output = output.concat('</elements>\n</model>\n');
        return output;
    }
}
exports.SGraph = SGraph;
