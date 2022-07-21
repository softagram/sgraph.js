import { SGraph } from '../sgraph';
import { SElement } from '../selement';

export interface EChartsOptions {
  categories: {
    name: string;
  }[];
  nodes: {
    name: string;
    value: 1;
    category: number;
  }[];
  links: {
    source: number;
    target: number;
  }[];
}

const sgraphToEcharts = (sg: SGraph) => {
  const options: EChartsOptions = {
    categories: [
      {
        name: 'repos',
      },
      {
        name: 'directories',
      },
      {
        name: 'files',
      },
    ],
    nodes: [],
    links: [],
  };

  const pickCategory = (e: SElement) =>
    e.parent?.getHash() === sg.rootNode.getHash()
      ? 0
      : e.getType() === 'dir'
      ? 1
      : 2;

  const hashToElemIndex: {
    [key: string]: number;
  } = {};

  for (let e of sg.rootNode.children) {
    e.traverseElements((e) => {
      const index =
        options.nodes.push({
          name: e.name,
          value: 1,
          category: pickCategory(e),
        }) - 1;
      hashToElemIndex[e.getHash()] = index;
      if (e.parent)
        options.links.push({
          source: hashToElemIndex[e.parent.getHash()],
          target: index,
        });
    });
  }

  return options;
};

export { sgraphToEcharts };
