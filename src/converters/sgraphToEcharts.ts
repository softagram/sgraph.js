import { SGraph } from '../sgraph';

export interface EChartsOptions {
  categories: {
    name: string;
    base: string;
    keyword: {};
  }[];
  nodes: {
    name: string;
    value: 1;
    category: 0;
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
        name: sg.rootNode.children[0].name,
        base: sg.rootNode.children[0].name,
        keyword: {},
      },
    ],
    nodes: [],
    links: [],
  };

  const hashToElemIndex: {
    [key: string]: number;
  } = {};

  for (let e of sg.rootNode.children) {
    e.traverseElements((e) => {
      const index =
        options.nodes.push({
          name: e.name,
          value: 1,
          category: 0,
        }) - 1;
      hashToElemIndex[e.getHash()] = index;
      if (e.parent)
        options.links.push({
          source: hashToElemIndex[e.parent?.getHash()],
          target: index,
        });
    });
  }

  return options;
};

export { sgraphToEcharts };
