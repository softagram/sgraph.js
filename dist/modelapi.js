"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelApi = void 0;
const sgraph_1 = require("./sgraph");
class ModelApi {
    constructor(options) {
        this.getCalledFunctions = (element) => element.outgoing
            .filter((ea) => ea.deptype === 'function_ref')
            .map((ea) => ea.toElement);
        this.getCallingFunctions = (element) => element.incoming
            .filter((ea) => ea.deptype === 'function_ref')
            .map((ea) => ea.fromElement);
        this.getUsedElements = (element) => element.outgoing.map((ea) => ea.fromElement);
        this.getUserElements = (element) => element.incoming.map((ea) => ea.fromElement);
        if ('data' in options) {
            this.model = sgraph_1.SGraph.parseXml({ data: options.data });
        }
        else {
            this.model = options.model;
        }
        this.egm = this.model;
    }
    getElementsByName(name) {
        if (!this.model.rootNode)
            return [];
        const matching = [];
        const recursiveTraverse = (elem) => {
            if (elem.name === name)
                matching.push(elem);
            for (const child of elem.children) {
                recursiveTraverse(child);
            }
        };
        recursiveTraverse(this.model.rootNode);
        return matching;
    }
}
exports.ModelApi = ModelApi;
