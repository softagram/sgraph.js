"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelLoader = void 0;
const sgraph_1 = require("../sgraph");
const browser_1 = require("../utils/browser");
class ModelLoader {
    async load(filePath, depTypes = [
        'IGNORE dynamic_function_ref',
        'IGNORE dynamic_typeref_member',
    ], ignoredAttributes = []) {
        if (browser_1.isBrowser)
            throw new Error('ModelLoader cannot be used in the browser');
        const { AttributeLoader } = eval('require')('./attributeLoader');
        let model;
        if (!filePath.endsWith('/dependency/modelfile.xml') &&
            !filePath.endsWith('/dependency/modelfile.xml.zip')) {
            model = await sgraph_1.SGraph.parseXmlFileOrZippedXml({
                filePath,
                typeRules: depTypes,
                ignoredAttributes,
            });
        }
        else {
            model = await sgraph_1.SGraph.parseXmlFileOrZippedXml({
                filePath,
                typeRules: depTypes,
                ignoredAttributes,
            });
            if (!model)
                return;
            const attrLoader = new AttributeLoader();
            const { model: nModel, missingAttrFiles } = await attrLoader.loadAllFiles(filePath
                .replace('/dependency/modelfile.xml.zip', '')
                .replace('/dependency/modelfile.xml', ''), model);
            model = nModel;
            for (let missing of missingAttrFiles) {
                if (missing !== 'attr_temporary.csv') {
                    console.error(`Cannot load default attribute file when loading the model for data mining. Missing: ${missing}`);
                }
            }
        }
        return model;
    }
}
exports.ModelLoader = ModelLoader;
