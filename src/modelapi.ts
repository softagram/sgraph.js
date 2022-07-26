import { SElement } from './selement';
import { SGraph } from './sgraph';

class ModelApi {
  model: SGraph;
  egm: SGraph;

  constructor(options: { data: string } | { model: SGraph }) {
    if ('data' in options) {
      this.model = SGraph.parseXml({ data: options.data });
    } else {
      this.model = options.model;
    }

    this.egm = this.model;
  }

  getElementsByName(name: string): SElement[] {
    if (!this.model.rootNode) return [];

    const matching: SElement[] = [];

    const recursiveTraverse = (elem: SElement) => {
      if (elem.name === name) matching.push(elem);
      for (const child of elem.children) {
        recursiveTraverse(child);
      }
    };

    recursiveTraverse(this.model.rootNode);

    return matching;
  }

  getCalledFunctions = (element: SElement) =>
    element.outgoing
      .filter((ea) => ea.deptype === 'function_ref')
      .map((ea) => ea.toElement);

  getCallingFunctions = (element: SElement) =>
    element.incoming
      .filter((ea) => ea.deptype === 'function_ref')
      .map((ea) => ea.fromElement);

  getUsedElements = (element: SElement) =>
    element.outgoing.map((ea) => ea.fromElement);

  getUserElements = (element: SElement) =>
    element.incoming.map((ea) => ea.fromElement);
}

export { ModelApi };
