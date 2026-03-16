import { SGraph } from '../sgraph';
/**
 * Converts SGraph to DOT format used by Graphviz.
 * @see https://graphviz.org/doc/info/lang.html
 * @param graph SGraph
 * @returns DOT string
 */
declare const sgraphToDot: (graph: SGraph) => string;
export { sgraphToDot };
