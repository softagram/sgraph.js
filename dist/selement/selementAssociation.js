"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SElementAssociation = void 0;
const _1 = require(".");
class SElementAssociation {
    constructor(from, to, deptype, depattrs = {}) {
        this.getFromPath = () => { var _a; return (_a = this.fromElement) === null || _a === void 0 ? void 0 : _a.getPath(); };
        this.getToPath = () => { var _a; return (_a = this.toElement) === null || _a === void 0 ? void 0 : _a.getPath(); };
        this.getType = () => this.deptype;
        this.getAttributes = () => this.attrs;
        this.fromElement = from;
        this.toElement = to;
        this.deptype = deptype;
        this.attrs = depattrs;
    }
    calculateCompareStatus() {
        const compare = this.attrs['compare'];
        if (compare === 'added')
            return 1;
        if (compare === 'removed')
            return 2;
        if (compare === 'changed')
            return 3;
        return 0;
    }
    initElems() {
        var _a, _b;
        (_a = this.fromElement) === null || _a === void 0 ? void 0 : _a.outgoing.push(this);
        (_b = this.toElement) === null || _b === void 0 ? void 0 : _b.incoming.push(this);
    }
    setAttrs(a) {
        this.attrs = a;
    }
    remove() {
        var _a, _b, _c, _d;
        (_a = this.fromElement) === null || _a === void 0 ? void 0 : _a.outgoing.splice((_b = this.fromElement) === null || _b === void 0 ? void 0 : _b.outgoing.indexOf(this), 1);
        (_c = this.fromElement) === null || _c === void 0 ? void 0 : _c.incoming.splice((_d = this.fromElement) === null || _d === void 0 ? void 0 : _d.incoming.indexOf(this), 1);
    }
    getDependencyLength() {
        var _a;
        if ((_a = this.fromElement) === null || _a === void 0 ? void 0 : _a.equals(this.toElement)) {
            return 0;
        }
        const lca = (0, _1.lowestCommonAncestor)(this.fromElement, this.toElement);
        const levelsBetween = (e, ancestor) => {
            let steps = 0;
            let nextAncestor = e.parent;
            while (nextAncestor && nextAncestor.parent) {
                steps += 1;
                if (ancestor.equals(nextAncestor))
                    return steps;
                nextAncestor = nextAncestor.parent;
            }
            return steps;
        };
        return lca
            ? levelsBetween(this.fromElement, lca) +
                levelsBetween(this.toElement, lca)
            : 0;
    }
}
exports.SElementAssociation = SElementAssociation;
