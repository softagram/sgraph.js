import AdmZip from 'adm-zip';
import { readFile } from 'fs/promises';
import { SElement } from '../selement';
import SGraphXMLParser from './sgraphXmlParser';
import { EChartsOptions, sgraphToEcharts } from '../converters';

interface ParseXmlOptions {
  data: string;
  typeRules?: string[];
  ignoredAttributes?: string[];
  onlyRoot?: boolean;
}

interface ParseXmlFileOrZippedXmlOptions extends Omit<ParseXmlOptions, 'data'> {
  filePath: string;
}

class SGraph {
  rootNode: SElement;
  modelAttrs: { [key: string]: string } = {};

  constructor(rootNode: SElement) {
    this.rootNode = rootNode;
  }

  static parseXml({
    data,
    ignoredAttributes = [],
    onlyRoot = false,
  }: ParseXmlOptions): SGraph {
    const parser = new SGraphXMLParser(ignoredAttributes, onlyRoot);
    parser.parse(data);
    parser.setTypeRules(['ALL']);
    parser.translateReferences();
    return new SGraph(parser.rootNode);
  }

  static async parseXmlFileOrZippedXml({
    filePath,
    typeRules,
    ignoredAttributes,
    onlyRoot = false,
  }: ParseXmlFileOrZippedXmlOptions): Promise<SGraph | undefined> {
    let data;

    try {
      if (filePath.includes('.zip')) {
        const zip = new AdmZip(filePath);
        data = zip.readAsText('modelfile.xml');
      } else {
        data = (await readFile(filePath)).toString();
      }
    } catch {
      return undefined;
    }
    const model = SGraph.parseXml({
      data,
      typeRules,
      ignoredAttributes,
      onlyRoot,
    });
    model.setModelPath(filePath);
    return model;
  }

  createOrGetElementFromPath(n: string) {
    if (n.startsWith('/')) n = n.slice(1);

    if (!n.includes('/')) {
      const child = this.rootNode?.getChildByName(n);
      if (child) return child;
      return new SElement(n, this.rootNode);
    }
    if (n.length > 0) {
      return this.rootNode?.createOrGetElement(n);
    }
    return this.rootNode;
  }

  findElementFromPath(i: string): SElement | undefined {
    if (!this.rootNode) return undefined;
    if (i.length > 0) return this.rootNode.findElement(i);
    return this.rootNode;
  }

  setModelPath(filePath: string) {
    this.modelAttrs['model_path'] = filePath;
  }

  toEcharts(): EChartsOptions {
    const ec = sgraphToEcharts(this);
    return ec;
  }
}

export { SGraph };
