"use strict";
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _SElement_instances, _SElement_getCyclicDependencies;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SElement = void 0;
const object_hash_1 = __importDefault(require("object-hash"));
const _1 = require(".");
const DEBUG = true;
class SElement {
    constructor(name, parent) {
        // if (name.replace(/\s/g, '') === '') {
        //   console.error('Creating SElement with empty name');
        // }
        _SElement_instances.add(this);
        this.hash = '';
        this.humanReadableName = '';
        this.attrs = {};
        this.children = [];
        this.childrenObject = {};
        this.outgoing = [];
        this.incoming = [];
        this.getChildByName = (name) => {
            if (Object.getOwnPropertyNames(this.childrenObject).includes(name)) {
                return this.childrenObject[name];
            }
            return undefined;
        };
        this.getHash = () => this.hash;
        if (parent && this.equals(parent)) {
            throw new Error('Self loop in model\n');
        }
        this.name = name.replace('/', '__slash__');
        this.humanReadableName = '';
        if (parent) {
            this.parent = parent;
            if (!Object.keys(this.parent.childrenObject).includes(this.name)) {
                this.parent.children.push(this);
                this.parent.childrenObject[this.name] = this;
            }
            else {
                if (DEBUG) {
                    throw new Error(`Error: overlapping elements related to ${this.name} under ${this.parent.getPath()}, types: '<not known>' and ${this.parent.childrenObject[this.name].getType()}`);
                }
                else {
                    throw new SElementMergedException(`Element ${this.name} tried to be merged with an existing element ${this.parent.getPath()}`);
                }
            }
        }
        this.updateHash();
    }
    addChild(child) {
        if (this.equals(child)) {
            console.error('Error with data model loop');
            throw new Error('Aborting due to addChild this not equal to child violation');
        }
        if (!Object.keys(this.childrenObject).includes(child.name)) {
            this.children.push(child);
            this.childrenObject[child.name] = child;
        }
        else {
            if (DEBUG) {
                throw new Error(`Error: overlapping elements related to ${child.name} under ${this.getPath()}, types: ${child.getType()} and ${this.childrenObject[child.name].getType()}`);
            }
            else {
                this.childrenObject[child.name].merge(child);
                this.updateHash();
                return this.childrenObject[child.name];
            }
        }
        child.parent = this;
        this.updateHash();
    }
    merge(other, ignoreType, ignoreAttrs) {
        var _a, _b;
        var _c, _d;
        for (let child of other.children) {
            other.detachChild(child);
            this.addChild(child);
        }
        let currentDeps = {};
        for (let ea of this.outgoing) {
            if (ea.toElement) {
                (_a = currentDeps[_c = ea.toElement.hash]) !== null && _a !== void 0 ? _a : (currentDeps[_c] = []);
                if (ea.deptype)
                    currentDeps[ea.toElement.hash].push(ea.deptype);
            }
        }
        for (let ea of other.outgoing) {
            if (ea.toElement &&
                ea.toElement.hash in currentDeps &&
                ea.deptype &&
                ea.deptype in currentDeps[ea.toElement.hash] &&
                !this.equals(ea.toElement)) {
                const newEa = new _1.SElementAssociation(this, ea.toElement, ea.deptype, ea.attrs);
                newEa.initElems();
            }
        }
        other.outgoing = [];
        currentDeps = {};
        for (let ea of this.incoming) {
            if (ea.fromElement) {
                (_b = currentDeps[_d = ea.fromElement.hash]) !== null && _b !== void 0 ? _b : (currentDeps[_d] = []);
                if (ea.deptype)
                    currentDeps[ea.fromElement.hash].push(ea.deptype);
            }
        }
        for (let ea of other.incoming) {
            if (ea.fromElement &&
                ea.fromElement.hash in currentDeps &&
                ea.deptype &&
                ea.deptype in currentDeps[ea.fromElement.hash]) {
                const newEa = new _1.SElementAssociation(ea.fromElement, this, ea.deptype, ea.attrs);
                newEa.initElems();
            }
        }
        other.incoming = [];
        for (let [key, value] of Object.entries(other.attrs)) {
            if (!ignoreAttrs && key !== 'type') {
                if (!Object.keys(this.attrs).includes(key)) {
                    this.attrs[key] = value;
                }
                else if (this.attrs[key] !== value) {
                    if (Array.isArray(value)) {
                        for (let v of value) {
                            if (!this.attrs[key].includes(v)) {
                                this.addAttribute(key, v);
                            }
                        }
                    }
                    else {
                        this.attrs[key] = `${this.attrs[key]}-merged-${value.toString()}`;
                    }
                }
                else {
                    continue;
                }
            }
            else if (!ignoreType &&
                key === 'type' &&
                value !== '' &&
                !this.typeEquals(value)) {
                this.setType(this.getType() + '_' + value);
            }
        }
        if (other.parent) {
            other.parent.detachChild(other);
            other.parent = undefined;
        }
        this.updateHash();
    }
    detachChild(child) {
        child.parent = undefined;
        const index = this.children.indexOf(child);
        if (index !== -1)
            this.children.splice(index, 1);
        if (Object.keys(this.childrenObject).includes(child.name)) {
            delete this.childrenObject[child.name];
        }
        else {
            console.error(`Error: Probably duplicated element ${child.name} under ${this.getPath()}`);
        }
        this.updateHash();
    }
    findElement(name) {
        if (name.startsWith('/')) {
            name = name.slice(1);
        }
        if (!name.includes('/')) {
            return this.getChildByName(name);
        }
        const pos = name.indexOf('/');
        const root = name.slice(0, pos);
        if (this.children.length <= 0) {
            return undefined;
        }
        const child = this.getChildByName(root);
        if (child)
            return child.findElement(name.slice(pos + 1));
        return undefined;
    }
    createOrGetElement(n) {
        if (n.startsWith('/'))
            n = n.slice(1);
        if (!n.includes('/')) {
            const child = this.getChildByName(n);
            if (child)
                return child;
            return new SElement(n, this);
        }
        if (this.children.length === 0) {
            return this.createElementChain(n);
        }
        const pos = n.indexOf('/');
        const root = n.slice(0, pos);
        const child = this.getChildByName(root);
        if (child)
            return child.createOrGetElement(n.slice(pos + 1));
        return this.createElementChain(n);
    }
    createElementChain(id) {
        let current = this;
        for (let n of id.split('/'))
            current = new SElement(n, current);
        return current;
    }
    traverseElements(visit) {
        visit(this);
        for (let c of this.children) {
            c.traverseElements(visit);
        }
    }
    getAncestors() {
        let ancestor = this;
        const ancestors = [];
        while (ancestor && ancestor.parent) {
            ancestor = ancestor.parent;
            ancestors.push(ancestor);
        }
        return ancestors;
    }
    addAttribute(name, value) {
        var _a;
        var _b;
        if (name === 'type') {
            this.attrs[name] = value;
        }
        else {
            ((_a = (_b = this.attrs)[name]) !== null && _a !== void 0 ? _a : (_b[name] = [])).push(value);
        }
    }
    setAttributes(attributes) {
        this.attrs = attributes;
    }
    getAttributes() {
        return this.attrs;
    }
    setType(t) {
        this.attrs.type = t;
    }
    getType() {
        return this.attrs.type || '<not known>';
    }
    getPath() {
        var _a;
        let p = this.parent;
        const pathparts = [this.name];
        while (p && ((_a = p.parent) === null || _a === void 0 ? void 0 : _a.hash) !== p.hash) {
            pathparts.push(p.name);
            p = p.parent;
        }
        return pathparts.reverse().join('/');
    }
    updateHash() {
        var _a;
        this.hash = (0, object_hash_1.default)({
            n: this.name,
            h: this.humanReadableName,
            p: (_a = this.parent) === null || _a === void 0 ? void 0 : _a.getHash(),
            c: this.children.length,
            co: Object.keys(this.childrenObject).sort(),
            o: this.outgoing.length,
            i: this.incoming.length,
        });
    }
    equals(other) {
        return this.hash === other.hash;
    }
    typeEquals(t) {
        return this.attrs.type === t;
    }
    getPathAsList() {
        const a = [];
        a.push(this.name);
        let p = this.parent;
        while (p && p.parent) {
            a.push(p.name);
            p = p.parent;
        }
        return a;
    }
    createElements(elements, startFrom) {
        let parent = this;
        for (let i = startFrom; i < elements.length; i++) {
            parent = new SElement(elements[i], parent);
        }
        return parent;
    }
    /**
     * Returns a list of cyclic dependencies in the form of a list of elements that form a cycle
     * @returns {SElement[][]} a list of cyclic dependencies
     */
    getCyclicDependencies() {
        const cyclic = [];
        const stack = [];
        __classPrivateFieldGet(this, _SElement_instances, "m", _SElement_getCyclicDependencies).call(this, this, stack, cyclic);
        return cyclic;
    }
}
exports.SElement = SElement;
_SElement_instances = new WeakSet(), _SElement_getCyclicDependencies = function _SElement_getCyclicDependencies(element, stack, cyclic, path = []) {
    if (stack.includes(element)) {
        if (element === stack[0])
            cyclic.push(path);
        return;
    }
    stack.push(element);
    element.outgoing.map((ea) => __classPrivateFieldGet(this, _SElement_instances, "m", _SElement_getCyclicDependencies).call(this, ea.toElement, stack, cyclic, [
        ...path,
        element,
    ]));
};
class SElementMergedException extends Error {
    constructor(message) {
        super(message);
        this.name = 'SElementMergedException';
    }
}
