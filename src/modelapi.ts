import { SElement } from './selement';
import { SGraph } from './sgraph';

interface ModelApiOptions {
  data: string;
}

class ModelApi {
  model: SGraph;
  egm: SGraph;

  constructor(options: ModelApiOptions) {
    const { data } = options;

    this.model = SGraph.parseXml({ data });
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
