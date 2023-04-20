import { SElement } from '../selement';
import { SGraph } from '../sgraph';

const tab = '\t';

/**
 * Converts SGraph to DOT format used by Graphviz.
 * @see https://graphviz.org/doc/info/lang.html
 * @param graph SGraph
 * @returns DOT string
 */
const sgraphToDot = (graph: SGraph): string => {
  const dot: string[] = [];
  const deps: [string, string, string | undefined][] = [];

  dot.push('digraph G {');

  const handleElement = (e: SElement, indent: number) => {
    if (e.children.length > 0) {
      const subgraphHash = e.getHash();

      dot.push(`${tab.repeat(indent)}subgraph "cluster${subgraphHash}" {`);

      e.children.forEach((child) => {
        if (child.children.length > 0) return handleElement(child, indent + 1);

        const childHash = child.getHash();

        child.outgoing.forEach((ea) => {
          const to = ea.toElement;
          if (to.children.length > 0) return;
          deps.push([childHash, to.getHash(), ea.deptype]);
        });

        dot.push(
          `${tab.repeat(indent + 1)}"${childHash}" [label="${child.name}"];`
        );
      });

      if (e.name) {
        dot.push(`${tab.repeat(indent + 1)}label = "${e.name}";`);
      }

      dot.push(`${tab.repeat(indent)}}`);
    }
  };

  handleElement(graph.rootNode, 1);

  dot.push('');

  deps.forEach(([from, to, type]) => {
    dot.push(`${tab}"${from}" -> "${to}" [label="${type}"];`);
  });

  dot.push('}');

  return dot.join('\n');
};

export { sgraphToDot };
