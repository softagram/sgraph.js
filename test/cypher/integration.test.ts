import { readFile } from 'fs/promises';
import { SGraph, cypherQuery } from '../../src';

describe('Cypher integration (modelfile.xml)', () => {
  let model: SGraph;

  beforeAll(async () => {
    const data = await readFile('test/modelfile.xml', 'utf8');
    model = SGraph.parseXml({ data });
  });

  it('finds all file elements', () => {
    const result = cypherQuery(model, 'MATCH (n:file) RETURN n.name');
    expect(result.rows.length).toBeGreaterThan(0);
    const names = result.rows.map((r: Record<string, any>) => r['n.name']);
    expect(names).toContain('index.js');
    expect(names).toContain('math.js');
    expect(names).toContain('models.js');
  });

  it('finds import relationships', () => {
    const result = cypherQuery(model,
      'MATCH (a:file)-[r:import]->(b:file) RETURN a.name, b.name'
    );
    expect(result.rows.length).toBeGreaterThan(0);
  });

  it('finds elements by name', () => {
    const result = cypherQuery(model,
      "MATCH (n {name: 'math.js'}) RETURN n.name, n.path"
    );
    expect(result.rows.length).toBe(1);
    expect(result.rows[0]['n.path']).toBe('mock-project/src/utils/math.js');
  });

  it('queries CONTAINS hierarchy', () => {
    const result = cypherQuery(model,
      "MATCH (d {name: 'src'})-[:CONTAINS]->(f) RETURN f.name"
    );
    // src contains: database, index.js, utils
    expect(result.rows.length).toBe(3);
  });

  it('counts elements by type using type()', () => {
    const result = cypherQuery(model,
      'MATCH (a)-[r]->(b) RETURN type(r), COUNT(r)'
    );
    expect(result.rows.length).toBeGreaterThan(0);
  });

  it('works without hierarchy — no CONTAINS edges', () => {
    const result = cypherQuery(model,
      'MATCH (a)-[r:CONTAINS]->(b) RETURN a.name',
      { includeHierarchy: false }
    );
    expect(result.rows.length).toBe(0);
  });

  it('works without hierarchy — non-CONTAINS edges still present', () => {
    const result = cypherQuery(model,
      'MATCH (a:file)-[r:import]->(b:file) RETURN a.name',
      { includeHierarchy: false }
    );
    expect(result.rows.length).toBeGreaterThan(0);
  });

  it('LIMIT works', () => {
    const result = cypherQuery(model, 'MATCH (n) RETURN n.name LIMIT 3');
    expect(result.rows.length).toBe(3);
  });
});
