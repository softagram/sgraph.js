"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.elementSort = exports.Counter = exports.groupElementAssociations = exports.getAttributeString = exports.encodeAttributeValue = exports.encodeAttributeName = void 0;
const selement_1 = require("../selement");
const isNumeric = (string) => {
    return !isNaN(parseInt(string));
};
const encodeAttributeName = (n) => {
    if (isNumeric(n[0])) {
        return '_' + n;
    }
    return n;
};
exports.encodeAttributeName = encodeAttributeName;
const encodeAttributeValue = (v) => {
    if (v) {
        // https://www.w3.org/TR/xml/#NT-AttValue
        // Forbidden chars are: naked ampersand, left angle bracket, double quote
        // single quote is fine as we are using double quotes in XML for attributes
        v = v.toString('utf8');
        return v
            .replace('&', '&amp;')
            .replace('<', '&lt;')
            .replace('>', '&gt;')
            .replace('\n', '&' + '#' + '10;')
            .replace('"', '&quot;');
    }
    return '';
};
exports.encodeAttributeValue = encodeAttributeValue;
const getAttributeString = (attributes, elementType, currentIndent) => {
    const elementAttributes = Object.entries(attributes).filter((attribute) => !attribute[0].startsWith('_tmp_attr_'));
    const sortedAttrs = elementAttributes.sort();
    const attrs = sortedAttrs.map((x) => {
        if (x[0] != 'type') {
            return ((0, exports.encodeAttributeName)(x[0]) + '="' + (0, exports.encodeAttributeValue)(x[1]) + '"');
        }
        else {
            return '';
        }
    });
    let attributeString = ' '.concat(attrs.join(' '));
    if (elementType !== '' && elementType !== selement_1.NOT_KNOWN_TYPE) {
        attributeString =
            ' t="' + elementType + '"\n' + currentIndent + '  ' + attributeString;
    }
    else if (attributeString.trim()) {
        attributeString = '\n' + currentIndent + '  ' + attributeString;
    }
    return attributeString;
};
exports.getAttributeString = getAttributeString;
const groupElementAssociations = (associations) => {
    const easmap = {};
    associations.forEach((association) => {
        const attributes = JSON.stringify(association.getAttributes());
        const k = association.deptype !== undefined
            ? attributes + association.deptype
            : attributes;
        if (Object.keys(easmap).includes(k)) {
            easmap[k].push(association);
        }
        else {
            easmap[k] = [association];
        }
    });
    return Object.entries(easmap).map(([k, v], i) => {
        return { associationlist: v, deptype: v[0].deptype, attrs: v[0].attrs };
    });
};
exports.groupElementAssociations = groupElementAssociations;
class Counter {
    constructor() {
        this.i = 1;
    }
    now() {
        this.i += 1;
        return this.i;
    }
}
exports.Counter = Counter;
const elementSort = (a, b) => {
    const str1 = a.name;
    const str2 = b.name;
    return str1 < str2 ? -1 : +(str1 > str2);
};
exports.elementSort = elementSort;
