"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readAttrsGeneric = void 0;
const sync_1 = require("csv-parse/sync");
const detectCsvDelimiter = (csvData) => {
    var _a, _b;
    const [l1, l2] = csvData.split('\n').slice(0, 2);
    if (l1.includes('\t') && l2.includes('\t'))
        return '\t';
    if (l1.includes(',') && l2.includes(',')) {
        const c = l1 + l2;
        const tabs = ((_a = c.match(/\t/g)) === null || _a === void 0 ? void 0 : _a.length) || 0;
        const commas = ((_b = c.match(/,/g)) === null || _b === void 0 ? void 0 : _b.length) || 0;
        if (tabs > commas)
            return '\t';
    }
    return ',';
};
const readAttrsGeneric = (csvData) => {
    const delimiter = detectCsvDelimiter(csvData);
    const data = readAttrs(csvData, delimiter);
    let first = true;
    let columns = [];
    const entries = [];
    for (let elementId of Object.keys(data)) {
        const attrEntry = data[elementId];
        if (first) {
            columns = Object.keys(attrEntry);
            if (columns.includes('id'))
                columns.splice(columns.indexOf('id'), 1);
            first = false;
        }
        if ('id' in attrEntry) {
            const { id } = attrEntry, rest = __rest(attrEntry, ["id"]);
            entries.push([id, rest]);
        }
        else {
            throw new Error(`Error: the attribute file does not have id column. Keys are ${Object.keys(attrEntry)}`);
        }
    }
    return { columns, entries };
};
exports.readAttrsGeneric = readAttrsGeneric;
const readAttrs = (csvData, delimiter) => (Object.assign({}, (0, sync_1.parse)(csvData, { delimiter, columns: true, skip_empty_lines: true })));
