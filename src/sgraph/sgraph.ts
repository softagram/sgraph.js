import { SElement } from '../selement';
import SGraphXMLParser from './sgraphXmlParser';
import { EChartsOptions, sgraphToEcharts } from '../converters';
import {
  elementSort,
  encodeAttributeValue,
  getAttributeString,
  groupElementAssociations,
} from '../utils/sgraph-utils';
import { Counter } from '../utils/sgraph-utils';

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
    parser.setTypeRules(['ALL']);
    parser.parse(data);
    parser.translateReferences();
    return new SGraph(parser.rootNode);
  }

  static async parseXmlFileOrZippedXml({
    filePath,
    typeRules,
    ignoredAttributes,
    onlyRoot = false,
  }: ParseXmlFileOrZippedXmlOptions): Promise<SGraph | undefined> {
    const AdmZip = eval('require')('adm-zip');
    const { readFile } = eval('require')('fs/promises');

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

  createOrGetElement(elem: SElement): SElement {
    const elems = elem.getPathAsList().reverse();

    let p = this.rootNode;
    for (let i = 0; i < elems.length; i++) {
      const s = elems[i];
      const child = p.getChildByName(s);
      if (child) {
        p = child;
      } else {
        return p.createElements(elems, i);
      }
    }
    return p;
  }
  /** 
      Create or get element matching this element, yielding also boolean 
      to indicate if new was created.
      @param element the element to create or get
      @returns tuple of the matched element and boolean describing if new element was created.
      */
  createOrGetElementWithNew(element: SElement): {
    element: SElement;
    isNew: boolean;
  } {
    const elements = element.getPathAsList().reverse();
    let p = this.rootNode;
    for (let i = 0; i < elements.length; i++) {
      const s = elements[i];
      const child = p.getChildByName(s);
      if (child) {
        p = child;
      } else {
        return { element: p.createElements(elements, i), isNew: true };
      }
    }
    return { element: p, isNew: false };
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

  toXml() {
    const rootNode = this.rootNode;
    const counter = new Counter();
    const elementToNumber = new Map();
    const numberToElement = new Map();

    const addNumber = (n: SElement, counter: Counter) => {
      if (n?.incoming.length > 0) {
        if (!elementToNumber.has(n)) {
          const num = counter.now().toString();
          elementToNumber.set(n, num);
          numberToElement.set(num, n);
        }
      }
      n.children.forEach((child) => addNumber(child, counter));

      n.outgoing.forEach((outgoing) => {
        const toElement = outgoing.toElement;
        if (!elementToNumber.has(toElement)) {
          const num = counter.now();
          elementToNumber.set(toElement, num);
          numberToElement.set(num, toElement);
        }
      });
    };

    addNumber(rootNode, counter);

    let output = '<model version="2.1">\n<elements>\n';

    const dumpNode = (
      element: SElement,
      elementToNumber: Map<SElement, number>,
      recursionLevel: number,
      output: string
    ) => {
      const currentIndent = '  '.repeat(recursionLevel);
      const attributeString = getAttributeString(
        element.getAttributes(),
        element.getType(),
        currentIndent
      );

      if (element.incoming.length > 0 && !elementToNumber.has(element)) {
        throw Error(
          'Erroneous model with references to ' + element.getPath() + '\n'
        );
      }
      const elementNumberString = elementToNumber.has(element)
        ? ' i="' + elementToNumber.get(element) + '" '
        : '';

      output = output.concat(
        `${currentIndent}<e ${elementNumberString} n="${encodeAttributeValue(
          element.name
        )}" `
      );
      output = output.concat(attributeString);
      output = output.concat('>\n');

      const groups = groupElementAssociations(element.outgoing);
      groups.forEach((group) => {
        const elementNumbers: (number | undefined)[] = [];
        const { associationlist, deptype, attrs } = group;
        associationlist.forEach((association) => {
          const toElement = association.toElement;
          if (elementToNumber.has(toElement)) {
            elementNumbers.push(elementToNumber.get(toElement));
          } else {
            throw Error(
              `No numeric id for ${toElement.getPath()} dep from ${
                association.fromElement.name
              }`
            );
          }
        });
        const idrefs = elementNumbers.join(',');
        if (idrefs) {
          const associationAttributes = getAttributeString(
            attrs as { [key: string]: string | string[] },
            deptype || '',
            currentIndent
          );
          output = output.concat(
            `${currentIndent}<r r="${idrefs}" ${associationAttributes}/>\n`
          );
        }
      });

      const children = element.children.sort(elementSort);
      children.forEach(
        (child) =>
          (output = dumpNode(
            child,
            elementToNumber,
            recursionLevel + 1,
            output
          ))
      );
      output = output.concat(`${currentIndent}</e>\n`);
      return output;
    };

    const rootChildren = rootNode.children.sort(elementSort);
    rootChildren.forEach((child) => {
      output = dumpNode(child, elementToNumber, 2, output);
    });
    output = output.concat('</elements>\n</model>\n');
    return output;
  }
}

export { SGraph };
