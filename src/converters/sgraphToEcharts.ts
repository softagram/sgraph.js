import { SGraph } from '../sgraph';

interface Category {
  name: string;
}
interface Node {
  id: number;
  name: string;
  category: number;
}
interface Link {
  source: number;
  target: number;
  lineStyle?: any;
}

export interface EChartsOptions {
  categories: Category[];
  nodes: Node[];
  links: Link[];
}

const sgraphToEcharts = (sg: SGraph) => {
  const categories: Category[] = [];
  const nodes: Node[] = [];
  const links: Link[] = [];

  const hashToElemIndex: { [key: string]: number } = {};

  sg.rootNode.traverseElements((e) => {
    const type = e.getType();
    let categoryIndex = categories.findIndex((c) => c.name === type);
    if (categoryIndex === -1) {
      categoryIndex =
        categories.push({
          name: type,
        }) - 1;
    }

    const nodeIndex =
      nodes.push({
        id: nodes.length,
        name: e.name,
        category: categoryIndex,
      }) - 1;
    hashToElemIndex[e.getHash()] = nodeIndex;
    if (e.parent) {
      links.push({
        source: hashToElemIndex[e.parent.getHash()],
        target: nodeIndex,
      });
    }
  });

  sg.rootNode.traverseElements((e) => {
    for (let ea of e.outgoing) {
      links.push({
        source: hashToElemIndex[ea.fromElement.getHash()],
        target: hashToElemIndex[ea.toElement.getHash()],
        lineStyle: {
          type: 'dashed',
        },
      });
    }
  });

  return {
    categories,
    nodes,
    links,
  };
};

export { sgraphToEcharts };
