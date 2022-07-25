"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SGraph = void 0;
const selement_1 = require("../selement");
const sgraphXmlParser_1 = __importDefault(require("./sgraphXmlParser"));
const converters_1 = require("../converters");
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
}
exports.SGraph = SGraph;
