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
    /**
       Create association between two elements if there already does not exist a similar association.
       The association is considered to be similar if toElement has an incoming association with the
       same type and the same fromElement.
       @param {SElement} fromElement the elemenet that is the starting point of the association
       @param {SElement} toElement the element that is the ending point of the association
       @param {string} deptype the type of the association
       @param {any} depattrs attributes for the associtaion
       @returns {SElement, boolean} Return an object containing the existing or new element and a
       boolean indicating if a new element was created (true if new was created, false otherwise)
     */
    static createUniqueElementAssociation(fromElement, toElement, deptype, depattrs = {}) {
        const existingAssociations = toElement.incoming.filter((incoming) => {
            const fromElementMatches = incoming.fromElement === fromElement;
            return deptype
                ? deptype === incoming.deptype && fromElementMatches
                : fromElementMatches;
        });
        // Do not create association if the same association already exists
        if (existingAssociations.length > 0) {
            // Combine attributes to the existing association
            const existingAttributes = existingAssociations[0].getAttributes();
            if (existingAttributes) {
                // Check that there aren't same attributes with different values
                Object.keys(depattrs).forEach((attributeName) => {
                    if (Object.keys(existingAttributes).includes(attributeName)) {
                        if (existingAttributes[attributeName] !== depattrs[attributeName]) {
                            throw new SElementAssociationException(`Can not create association of type ${deptype} from ${fromElement.name} to ${toElement.name} due to attribute conflict: attribute with name ${attributeName} ${existingAttributes[attributeName]} would be replaced by ${depattrs[attributeName]}`);
                        }
                    }
                });
            }
            existingAssociations[0].setAttrs(Object.assign(Object.assign({}, existingAttributes), depattrs));
            return {
                existingOrNewAssociation: existingAssociations[0],
                isNew: false,
            };
        }
        const newAssociation = new SElementAssociation(fromElement, toElement, deptype, depattrs);
        newAssociation.initElems();
        return { existingOrNewAssociation: newAssociation, isNew: true };
    }
    calculateCompareStatus() {
        if (this.attrs) {
            const compare = this.attrs['compare'];
            if (compare === 'added')
                return 1;
            if (compare === 'removed')
                return 2;
            if (compare === 'changed')
                return 3;
        }
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
class SElementAssociationException extends Error {
    constructor(message) {
        super(message);
        this.name = 'SElemenAssociationException';
    }
}
