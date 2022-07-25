"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sax_1 = __importDefault(require("sax"));
const selement_1 = require("../selement");
class SGraphXMLParser {
    constructor(ignoredAttributes, onlyRoot) {
        this.idStack = [];
        this.elemStack = [];
        this.idToElemMap = {};
        this.acceptAllAssocTypes = false;
        this.acceptableAssocTypes = new Set();
        this.ignoreAssocTypes = new Set();
        this.parser = sax_1.default.parser();
        this.onopentag = (tag) => {
            let { name, attributes } = tag;
            name = name.toString().toLowerCase();
            if (name === 'a') {
                let { N: name, V: value } = attributes;
                name = name.toString();
                value = value.toString();
                if (this.currentRelation)
                    this.currentRelation[name] = value;
                else {
                    if (this.currentElement &&
                        this.currentElementPath &&
                        this.currentElementPath.length > 0 &&
                        !(name in this.ignoredAttributes)) {
                        this.currentElement.addAttribute(name, value);
                    }
                }
            }
            else if (name === 'e') {
                let { N: name } = attributes;
                name = name.toString();
                let e;
                if (this.idStack.length <= 0)
                    e = new selement_1.SElement(name, this.rootNode);
                else
                    e = new selement_1.SElement(name, this.elemStack.at(-1));
                this.currentElement = e;
                this.idStack.push(name);
                this.currentElementPath = '/' + this.idStack.join('/');
                this.elemStack.push(this.currentElement);
                for (let [aname, avalue] of Object.entries(attributes)) {
                    aname = aname.toLowerCase();
                    if (aname === 't' || aname === 'type') {
                        this.currentElement.setType(avalue);
                    }
                    else if (aname === 'i') {
                        this.idToElemMap[avalue] = this.currentElement;
                    }
                    else if (aname !== 'n' && !(aname in this.ignoredAttributes)) {
                        this.currentElement.addAttribute(aname, avalue);
                    }
                }
                if (this.onlyRoot) {
                    throw new ParsingIntentionallyAborted('Aborted intentionally');
                }
            }
            else if (name === 'r') {
                this.currentRelation = {};
                let { R: referred, T: t } = attributes;
                referred = referred.toString();
                t = t.toString();
                if (referred.includes(',')) {
                    for (let referred_ of referred.split(',')) {
                        this.createReference(referred_, t);
                    }
                }
                else {
                    this.createReference(referred, t);
                }
                for (let [aname, avalue] of Object.entries(attributes)) {
                    if (aname.length > 1) {
                        this.currentRelation[aname] = avalue;
                    }
                }
            }
            if (tag.isSelfClosing)
                this.onclosetag(tag.name);
        };
        this.onclosetag = (tag) => {
            var _a;
            tag = tag.toLowerCase();
            if (tag === 'e') {
                this.idStack.pop();
                this.elemStack.pop();
                if (this.elemStack.length > 0) {
                    this.currentElement = this.elemStack.at(-1);
                    this.currentElementPath = '/' + this.idStack.join('/');
                }
            }
            else if (tag === 'r') {
                if (this.currentElementOutgoingDeps) {
                    for (let a of this.currentElementOutgoingDeps) {
                        if (this.currentRelation)
                            a.setAttrs(this.currentRelation);
                    }
                    for (let x of this.currentElementOutgoingDeps) {
                        (_a = this.currentElement) === null || _a === void 0 ? void 0 : _a.outgoing.push(x);
                    }
                    this.currentElementOutgoingDeps = undefined;
                }
                this.currentRelation = undefined;
            }
        };
        this.translateReferences = () => {
            const stack = [this.rootNode];
            while (stack.length > 0) {
                const elem = stack.shift();
                if (elem === null || elem === void 0 ? void 0 : elem.outgoing) {
                    for (let ea of elem.outgoing) {
                        if (ea.toElement in this.idToElemMap) {
                            ea.toElement = this.idToElemMap[ea.toElement];
                            ea.toElement.incoming.push(ea);
                        }
                        else {
                            console.error(`Error: unknown id ${ea.toElement} n=${elem.name}`);
                            throw new Error(`Error: unknown id in input data: ${ea.toElement}`);
                        }
                    }
                }
                if (elem === null || elem === void 0 ? void 0 : elem.children) {
                    for (let child of elem.children) {
                        stack.push(child);
                    }
                }
            }
        };
        this.ignoredAttributes = ignoredAttributes || [];
        this.onlyRoot = onlyRoot;
        this.rootNode = new selement_1.SElement('', undefined);
        this.parser.onopentag = this.onopentag;
        this.parser.onclosetag = this.onclosetag;
    }
    parse(xml) {
        this.parser.write(xml).close();
    }
    setTypeRules(typeRules) {
        for (let typeRule of typeRules) {
            typeRule = typeRule.trim();
            if (typeRule.startsWith('IGNORE ')) {
                this.ignoreAssocTypes.add(typeRule.substring(7).trim());
            }
            else {
                if (typeRule === 'ALL') {
                    this.acceptAllAssocTypes = true;
                }
                else {
                    this.acceptableAssocTypes.add(typeRule);
                }
            }
        }
    }
    createReference(i, t) {
        if (this.acceptAllAssocTypes) {
        }
        else if (!this.acceptableAssocTypes && this.ignoreAssocTypes) {
            if (t in this.ignoreAssocTypes)
                return;
        }
        else if (!this.acceptableAssocTypes || t in this.acceptableAssocTypes) {
        }
        else if (this.acceptableAssocTypes &&
            this.acceptableAssocTypes.size === 0) {
            return;
        }
        else {
            return;
        }
        if (!this.currentElementOutgoingDeps)
            this.currentElementOutgoingDeps = [];
        if (i === '0') {
            console.error('zero as ref id');
        }
        const dep = new selement_1.SElementAssociation(this.currentElement, i, t);
        this.currentElementOutgoingDeps.push(dep);
    }
}
exports.default = SGraphXMLParser;
class ParsingIntentionallyAborted extends Error {
    constructor(message) {
        super(message);
        this.name = 'ParsingIntentionallyAborted';
    }
}
