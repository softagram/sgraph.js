"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttributeLoader = void 0;
const adm_zip_1 = __importDefault(require("adm-zip"));
const promises_1 = require("fs/promises");
const path_1 = __importDefault(require("path"));
const attributes_1 = require("../attributes");
const attrFiles = [
    'attr_temporary.csv',
    'git/attr_git_propagated.csv',
    'git/attr_analysis_state.csv',
    'content/loc/attr_loc_propagated.csv',
    'content/loc/attr_testcode_loc_propagated.csv',
    'content/loc/attr_languages.csv',
    'content/attr_licenses.csv',
    'attr_issue_propagated.csv',
    'content/attr_risk_level.csv',
    'content/attr_pmd.csv',
];
class AttributeLoader {
    loadAttrFile(data, model) {
        const { columns, entries } = (0, attributes_1.readAttrsGeneric)(data);
        for (let [elemPath, attrs] of entries) {
            for (let column of columns) {
                const value = attrs[column];
                model.createOrGetElementFromPath(elemPath).addAttribute(column, value);
            }
        }
        return model;
    }
    async loadAllFiles(filePathOfModelRoot, model) {
        const missingAttrFiles = [];
        for (let attrFile of attrFiles) {
            const filePath = `${filePathOfModelRoot}/${attrFile}`;
            try {
                const zip = new adm_zip_1.default(`${filePath}.zip`);
                const data = zip.readAsText(path_1.default.basename(filePath));
                this.loadAttrFile(data, model);
            }
            catch (_a) {
                try {
                    const file = await (0, promises_1.readFile)(filePath, 'utf-8');
                    this.loadAttrFile(file, model);
                }
                catch (_b) {
                    missingAttrFiles.push(attrFile);
                }
            }
        }
        return {
            model,
            missingAttrFiles,
        };
    }
}
exports.AttributeLoader = AttributeLoader;
