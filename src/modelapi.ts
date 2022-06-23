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

    this.model = SGraph.parseXml(data);
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
    element.outgoing.filter((ea) => ea.deptype === 'function_ref');
}

export { ModelApi };
