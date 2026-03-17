import { SElement } from '../../src/selement/selement';
import { SElementAssociation } from '../../src/selement/selementAssociation';
import { CypherGraph } from '../../src/cypher/graph';
import { CypherExecutor } from '../../src/cypher/executor';
import { parse } from '../../src/cypher/parser';

function buildTestGraph(): CypherGraph {
  const root = new SElement('', undefined);
  const project = new SElement('myproject', root);
  project.setType('dir');
  const fileA = new SElement('a.js', project);
  fileA.setType('file');
  const fileB = new SElement('b.js', project);
  fileB.setType('file');
  const ea = new SElementAssociation(fileA, fileB, 'import');
  ea.initElems();
  return new CypherGraph(root);
}

let graph: CypherGraph;
let executor: CypherExecutor;

beforeAll(() => {
  graph = buildTestGraph();
  executor = new CypherExecutor(graph);
});

describe('CypherExecutor pattern matching', () => {
  it('matches all nodes', () => {
    const result = executor.execute(parse('MATCH (n) RETURN n.name'));
    expect(result.columns).toContain('n.name');
    expect(result.rows.length).toBe(4);
  });

  it('matches nodes by label', () => {
    const result = executor.execute(parse('MATCH (n:file) RETURN n.name'));
    expect(result.rows.length).toBe(2);
    const names = result.rows.map(r => r['n.name']);
    expect(names).toContain('a.js');
    expect(names).toContain('b.js');
  });

  it('matches nodes by inline property', () => {
    const result = executor.execute(parse("MATCH (n {name: 'a.js'}) RETURN n.name"));
    expect(result.rows.length).toBe(1);
    expect(result.rows[0]['n.name']).toBe('a.js');
  });

  it('matches outgoing relationships', () => {
    const result = executor.execute(parse(
      'MATCH (a:file)-[r:import]->(b:file) RETURN a.name, b.name'
    ));
    expect(result.rows.length).toBe(1);
    expect(result.rows[0]['a.name']).toBe('a.js');
    expect(result.rows[0]['b.name']).toBe('b.js');
  });

  it('matches incoming relationships', () => {
    const result = executor.execute(parse(
      'MATCH (a:file)<-[r:import]-(b:file) RETURN a.name, b.name'
    ));
    expect(result.rows.length).toBe(1);
    expect(result.rows[0]['a.name']).toBe('b.js');
    expect(result.rows[0]['b.name']).toBe('a.js');
  });

  it('matches undirected relationships', () => {
    const result = executor.execute(parse(
      'MATCH (a:file)-[r:import]-(b:file) RETURN a.name, b.name'
    ));
    expect(result.rows.length).toBe(2);
  });

  it('matches CONTAINS relationships', () => {
    const result = executor.execute(parse(
      'MATCH (d:dir)-[:CONTAINS]->(f:file) RETURN d.name, f.name'
    ));
    expect(result.rows.length).toBe(2);
  });

  it('returns full node object for variable return', () => {
    const result = executor.execute(parse("MATCH (n {name: 'a.js'}) RETURN n"));
    expect(result.rows[0]['n']).toMatchObject({
      name: 'a.js', type: 'file',
    });
    expect(result.rows[0]['n'].path).toBeDefined();
  });

  it('returns edge info for relationship variable', () => {
    const result = executor.execute(parse(
      'MATCH (a)-[r:import]->(b) RETURN r'
    ));
    expect(result.rows[0]['r']).toMatchObject({ type: 'import' });
    expect(result.rows[0]['r'].from).toBeDefined();
    expect(result.rows[0]['r'].to).toBeDefined();
  });

  it('returns type() function result', () => {
    const result = executor.execute(parse(
      "MATCH (a)-[r]->(b) WHERE type(r) = 'import' RETURN type(r)"
    ));
    expect(result.rows.length).toBeGreaterThanOrEqual(1);
    expect(result.rows[0]['type(r)']).toBe('import');
  });

  it('applies LIMIT', () => {
    const result = executor.execute(parse('MATCH (n) RETURN n.name LIMIT 2'));
    expect(result.rows.length).toBe(2);
  });
});

describe('CypherExecutor WHERE', () => {
  it('filters by string equality', () => {
    const result = executor.execute(parse(
      "MATCH (n:file) WHERE n.name = 'a.js' RETURN n.name"
    ));
    expect(result.rows.length).toBe(1);
    expect(result.rows[0]['n.name']).toBe('a.js');
  });

  it('filters by inequality', () => {
    const result = executor.execute(parse(
      "MATCH (n:file) WHERE n.name <> 'a.js' RETURN n.name"
    ));
    expect(result.rows.length).toBe(1);
    expect(result.rows[0]['n.name']).toBe('b.js');
  });

  it('filters with CONTAINS', () => {
    const result = executor.execute(parse(
      "MATCH (n) WHERE n.name CONTAINS '.js' RETURN n.name"
    ));
    expect(result.rows.length).toBe(2);
  });

  it('filters with STARTS WITH', () => {
    const result = executor.execute(parse(
      "MATCH (n) WHERE n.name STARTS WITH 'a' RETURN n.name"
    ));
    const names = result.rows.map(r => r['n.name']);
    expect(names).toContain('a.js');
  });

  it('filters with ENDS WITH', () => {
    const result = executor.execute(parse(
      "MATCH (n) WHERE n.name ENDS WITH '.js' RETURN n.name"
    ));
    expect(result.rows.length).toBe(2);
  });

  it('filters with AND', () => {
    const result = executor.execute(parse(
      "MATCH (n) WHERE n.name CONTAINS '.js' AND n.name STARTS WITH 'a' RETURN n.name"
    ));
    expect(result.rows.length).toBe(1);
  });

  it('filters with OR', () => {
    const result = executor.execute(parse(
      "MATCH (n) WHERE n.name = 'a.js' OR n.name = 'b.js' RETURN n.name"
    ));
    expect(result.rows.length).toBe(2);
  });

  it('filters with NOT', () => {
    const result = executor.execute(parse(
      "MATCH (n:file) WHERE NOT n.name = 'a.js' RETURN n.name"
    ));
    expect(result.rows.length).toBe(1);
  });
});

describe('CypherExecutor aggregation', () => {
  it('COUNT returns correct count', () => {
    const result = executor.execute(parse('MATCH (n:file) RETURN COUNT(n)'));
    expect(result.rows.length).toBe(1);
    expect(result.rows[0]['COUNT(n)']).toBe(2);
  });

  it('COUNT with grouping', () => {
    const result = executor.execute(parse(
      'MATCH (n) RETURN n.name, COUNT(n) ORDER BY n.name'
    ));
    expect(result.rows.length).toBeGreaterThan(0);
  });

  it('COLLECT aggregates values', () => {
    const result = executor.execute(parse(
      'MATCH (n:file) RETURN COLLECT(n.name)'
    ));
    expect(result.rows.length).toBe(1);
    expect(result.rows[0]['COLLECT(n.name)']).toContain('a.js');
    expect(result.rows[0]['COLLECT(n.name)']).toContain('b.js');
  });

  it('RETURN DISTINCT deduplicates', () => {
    const result = executor.execute(parse(
      'MATCH (n) RETURN DISTINCT n.name'
    ));
    const names = result.rows.map(r => r['n.name']);
    expect(new Set(names).size).toBe(names.length);
  });

  it('ORDER BY sorts results', () => {
    const result = executor.execute(parse(
      'MATCH (n:file) RETURN n.name ORDER BY n.name ASC'
    ));
    expect(result.rows[0]['n.name']).toBe('a.js');
    expect(result.rows[1]['n.name']).toBe('b.js');
  });

  it('ORDER BY DESC', () => {
    const result = executor.execute(parse(
      'MATCH (n:file) RETURN n.name ORDER BY n.name DESC'
    ));
    expect(result.rows[0]['n.name']).toBe('b.js');
  });
});
