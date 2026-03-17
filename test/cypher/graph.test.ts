import { SElement } from '../../src/selement/selement';
import { SElementAssociation } from '../../src/selement/selementAssociation';
import { CypherGraph } from '../../src/cypher/graph';

describe('CypherGraph', () => {
  let graph: CypherGraph;

  beforeAll(() => {
    const root = new SElement('', undefined);
    const project = new SElement('myproject', root);
    project.setType('dir');
    const fileA = new SElement('a.js', project);
    fileA.setType('file');
    fileA.addAttribute('hash', 'abc123');
    const fileB = new SElement('b.js', project);
    fileB.setType('file');
    const ea = new SElementAssociation(fileA, fileB, 'import');
    ea.initElems();

    graph = new CypherGraph(root);
  });

  it('indexes all elements as nodes', () => {
    expect(graph.nodeCount).toBe(4);
  });

  it('indexes associations as edges', () => {
    expect(graph.edgeCount).toBeGreaterThanOrEqual(1);
  });

  it('adds CONTAINS edges by default', () => {
    // 1 import edge + 3 CONTAINS edges (root->myproject, myproject->a.js, myproject->b.js)
    expect(graph.edgeCount).toBe(4);
  });

  it('skips CONTAINS edges when includeHierarchy is false', () => {
    const root = new SElement('', undefined);
    const child = new SElement('c', root);
    child.setType('file');
    const g = new CypherGraph(root, false);
    expect(g.edgeCount).toBe(0);
  });

  it('sets node labels from element type', () => {
    const node = graph.getNodeByPath('myproject/a.js');
    expect(node).toBeDefined();
    expect(node!.labels.has('file')).toBe(true);
  });

  it('sets node properties including name and path', () => {
    const node = graph.getNodeByPath('myproject/a.js');
    expect(node!.properties.name).toBe('a.js');
    expect(node!.properties.path).toBe('myproject/a.js');
  });

  it('flattens single-element array attrs to scalars', () => {
    const node = graph.getNodeByPath('myproject/a.js');
    expect(node!.properties.hash).toBe('abc123');
  });

  it('does not include type in properties', () => {
    const node = graph.getNodeByPath('myproject/a.js');
    expect(node!.properties.type).toBeUndefined();
  });

  it('sets edge type from deptype', () => {
    const edges = graph.getAllEdges();
    const importEdge = edges.find(e => e.type === 'import');
    expect(importEdge).toBeDefined();
  });

  it('provides outgoing and incoming edge lookups', () => {
    const nodeA = graph.getNodeByPath('myproject/a.js');
    const outEdges = graph.getOutEdges(nodeA!.id);
    const importEdges = outEdges.filter(eid => graph.getEdge(eid).type === 'import');
    expect(importEdges.length).toBe(1);
  });
});
