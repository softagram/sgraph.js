import SGraphXMLParser from './sgraphXmlParser';
import { SElement } from '../selement';

class SGraph {
  rootNode?: SElement;

  constructor(rootNode?: SElement) {
    this.rootNode = rootNode;
  }

  static parseXml(
    data: string,
    ignoredAttributes: any[] = [],
    onlyRoot: boolean = false
  ): SGraph {
    const parser = new SGraphXMLParser(ignoredAttributes, onlyRoot);

    parser.parse(data);
    parser.translateReferences();
    const egm = new SGraph(parser.rootNode);

    return egm;
  }

  findElementFromPath(i: string): SElement | undefined {
    if (!this.rootNode) return undefined;
    if (i.length > 0) return this.rootNode.findElement(i);
    return this.rootNode;
  }
}

export { SGraph };
