import { SGraph } from '../sgraph';
import { isBrowser } from '../utils/browser';

class ModelLoader {
  async load(
    filePath: string,
    depTypes: string[] = [
      'IGNORE dynamic_function_ref',
      'IGNORE dynamic_typeref_member',
    ],
    ignoredAttributes: string[] = []
  ): Promise<SGraph | undefined> {
    if (isBrowser) throw new Error('ModelLoader cannot be used in the browser');
    const { AttributeLoader } = eval('require')('./attributeLoader');

    let model;

    if (
      !filePath.endsWith('/dependency/modelfile.xml') &&
      !filePath.endsWith('/dependency/modelfile.xml.zip')
    ) {
      model = await SGraph.parseXmlFileOrZippedXml({
        filePath,
        typeRules: depTypes,
        ignoredAttributes,
      });
    } else {
      model = await SGraph.parseXmlFileOrZippedXml({
        filePath,
        typeRules: depTypes,
        ignoredAttributes,
      });
      if (!model) return;
      const attrLoader = new AttributeLoader();
      const { model: nModel, missingAttrFiles } = await attrLoader.loadAllFiles(
        filePath
          .replace('/dependency/modelfile.xml.zip', '')
          .replace('/dependency/modelfile.xml', ''),
        model
      );
      model = nModel;

      for (let missing of missingAttrFiles) {
        if (missing !== 'attr_temporary.csv') {
          console.error(
            `Cannot load default attribute file when loading the model for data mining. Missing: ${missing}`
          );
        }
      }
    }

    return model;
  }
}

export { ModelLoader };
