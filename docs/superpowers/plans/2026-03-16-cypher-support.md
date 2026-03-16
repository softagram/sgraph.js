# Cypher Query Support Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a lightweight Cypher query interpreter to sgraph.js that can query SGraph models, with both a programmatic API and a CLI.

**Architecture:** Hand-written tokenizer + recursive descent parser produces an AST. A graph index maps SElement/SElementAssociation to labeled property graph nodes/edges. An executor matches patterns, filters with WHERE, and projects RETURN results. Zero external dependencies.

**Tech Stack:** TypeScript, Jest (testing), existing sgraph.js types (SElement, SElementAssociation, SGraph)

**Spec:** `docs/superpowers/specs/2026-03-16-cypher-support-design.md`

---

## File Structure

| File | Responsibility |
|------|---------------|
| `src/cypher/parser.ts` | Tokenizer + recursive descent parser → AST types + parse function |
| `src/cypher/graph.ts` | CypherGraph class — indexes SGraph into labeled property graph |
| `src/cypher/executor.ts` | CypherExecutor — pattern matching, WHERE eval, RETURN projection |
| `src/cypher/index.ts` | Public API: `cypherQuery()` function, re-exports types |
| `src/cypher/cli.ts` | CLI entry point with REPL |
| `src/index.ts` | Modify: add `export * from './cypher'` |
| `test/cypher/parser.test.ts` | Parser unit tests |
| `test/cypher/graph.test.ts` | Graph index unit tests |
| `test/cypher/executor.test.ts` | Executor unit tests |
| `test/cypher/integration.test.ts` | End-to-end queries against test model |

---

## Chunk 1: Parser

### Task 1: AST Types and Tokenizer

**Files:**
- Create: `src/cypher/parser.ts`
- Create: `test/cypher/parser.test.ts`

- [ ] **Step 1: Write tokenizer tests**

Create `test/cypher/parser.test.ts`:

```typescript
import { tokenize, TokenType } from '../../src/cypher/parser';

describe('Cypher Tokenizer', () => {
  it('tokenizes a simple MATCH RETURN', () => {
    const tokens = tokenize('MATCH (n) RETURN n');
    expect(tokens.map(t => t.type)).toEqual([
      TokenType.MATCH, TokenType.LPAREN, TokenType.IDENTIFIER,
      TokenType.RPAREN, TokenType.RETURN, TokenType.IDENTIFIER, TokenType.EOF,
    ]);
  });

  it('tokenizes labels and types', () => {
    const tokens = tokenize('(n:file)');
    expect(tokens.map(t => t.type)).toEqual([
      TokenType.LPAREN, TokenType.IDENTIFIER, TokenType.COLON,
      TokenType.IDENTIFIER, TokenType.RPAREN, TokenType.EOF,
    ]);
  });

  it('tokenizes string literals', () => {
    const tokens = tokenize("'hello'");
    expect(tokens[0].type).toBe(TokenType.STRING);
    expect(tokens[0].value).toBe('hello');
  });

  it('tokenizes double-quoted strings', () => {
    const tokens = tokenize('"world"');
    expect(tokens[0].type).toBe(TokenType.STRING);
    expect(tokens[0].value).toBe('world');
  });

  it('tokenizes numbers', () => {
    const tokens = tokenize('42');
    expect(tokens[0].type).toBe(TokenType.NUMBER);
    expect(tokens[0].value).toBe('42');
  });

  it('tokenizes comparison operators', () => {
    const tokens = tokenize('<> <= >= = < >');
    expect(tokens.map(t => t.type)).toEqual([
      TokenType.NEQ, TokenType.LTE, TokenType.GTE,
      TokenType.EQ, TokenType.LT, TokenType.GT, TokenType.EOF,
    ]);
  });

  it('tokenizes relationship arrow -[r:TYPE]->', () => {
    const tokens = tokenize('-[r:TYPE]->');
    expect(tokens.map(t => t.type)).toEqual([
      TokenType.DASH, TokenType.LBRACKET, TokenType.IDENTIFIER,
      TokenType.COLON, TokenType.IDENTIFIER, TokenType.RBRACKET,
      TokenType.DASH, TokenType.GT, TokenType.EOF,
    ]);
  });

  it('tokenizes keywords case-insensitively', () => {
    const tokens = tokenize('match WHERE Return');
    expect(tokens.map(t => t.type)).toEqual([
      TokenType.MATCH, TokenType.WHERE, TokenType.RETURN, TokenType.EOF,
    ]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest test/cypher/parser.test.ts --no-cache`
Expected: FAIL — module not found

- [ ] **Step 3: Implement tokenizer and AST types**

Create `src/cypher/parser.ts` with:
- `TokenType` enum (all keywords + symbols + IDENTIFIER, STRING, NUMBER, EOF)
- `Token` interface `{ type: TokenType, value: string }`
- `tokenize(input: string): Token[]` function
- All AST type interfaces: `CypherQuery`, `MatchClause`, `NodePattern`, `RelationshipPattern`, `ReturnClause`, `ReturnItem`, `WhereExpr` (union type), `Comparison`, `LogicalExpr`, `NotExpr`, `PropertyAccess`, `VariableRef`, `FunctionCall`, `Literal`, `OrderByClause`
- Error classes: `CypherSyntaxError`, `CypherExecutionError`

Tokenizer rules:
- Skip whitespace
- Keywords are case-insensitive: check if identifier matches keyword list
- Strings: `'...'` or `"..."`, no escape sequences needed
- Numbers: sequence of digits (optionally with `.`)
- Two-char operators: `<>`, `<=`, `>=`
- Single-char symbols: `( ) [ ] { } - > < : . , =`

- [ ] **Step 4: Run tokenizer tests**

Run: `npx jest test/cypher/parser.test.ts --no-cache`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/cypher/parser.ts test/cypher/parser.test.ts
git commit -m "feat(cypher): add tokenizer and AST types"
```

### Task 2: Recursive Descent Parser

**Files:**
- Modify: `src/cypher/parser.ts`
- Modify: `test/cypher/parser.test.ts`

- [ ] **Step 1: Write parser tests**

Add to `test/cypher/parser.test.ts`:

```typescript
import { parse, tokenize, TokenType } from '../../src/cypher/parser';

describe('Cypher Parser', () => {
  it('parses simple MATCH (n) RETURN n', () => {
    const ast = parse('MATCH (n) RETURN n');
    expect(ast.matchClause.pattern).toHaveLength(1);
    expect(ast.matchClause.pattern[0]).toMatchObject({
      kind: 'node', variable: 'n', labels: [],
    });
    expect(ast.returnClause.items).toHaveLength(1);
    expect(ast.returnClause.items[0].expression).toMatchObject({
      kind: 'variable', name: 'n',
    });
  });

  it('parses node with label: (n:file)', () => {
    const ast = parse('MATCH (n:file) RETURN n');
    expect(ast.matchClause.pattern[0]).toMatchObject({
      kind: 'node', variable: 'n', labels: ['file'],
    });
  });

  it('parses node with inline properties: (n {name: "foo"})', () => {
    const ast = parse('MATCH (n {name: "foo"}) RETURN n');
    expect(ast.matchClause.pattern[0]).toMatchObject({
      kind: 'node', variable: 'n', properties: { name: 'foo' },
    });
  });

  it('parses outgoing relationship: (a)-[r:import]->(b)', () => {
    const ast = parse('MATCH (a)-[r:import]->(b) RETURN a, b');
    expect(ast.matchClause.pattern).toHaveLength(3);
    expect(ast.matchClause.pattern[1]).toMatchObject({
      kind: 'relationship', variable: 'r', types: ['import'], direction: 'out',
    });
  });

  it('parses incoming relationship: (a)<-[r:import]-(b)', () => {
    const ast = parse('MATCH (a)<-[r:import]-(b) RETURN a');
    expect(ast.matchClause.pattern[1]).toMatchObject({
      kind: 'relationship', direction: 'in',
    });
  });

  it('parses undirected relationship: (a)-[r]-(b)', () => {
    const ast = parse('MATCH (a)-[r]-(b) RETURN a');
    expect(ast.matchClause.pattern[1]).toMatchObject({
      kind: 'relationship', direction: 'both',
    });
  });

  it('parses anonymous node and relationship: ()-[]->()', () => {
    const ast = parse('MATCH ()-[]->() RETURN *');
    expect(ast.matchClause.pattern[0]).toMatchObject({
      kind: 'node', variable: undefined,
    });
  });

  it('parses WHERE with comparison', () => {
    const ast = parse("MATCH (n) WHERE n.name = 'foo' RETURN n");
    expect(ast.whereClause).toMatchObject({
      kind: 'comparison',
      operator: '=',
      left: { kind: 'propertyAccess', variable: 'n', property: 'name' },
      right: { kind: 'literal', value: 'foo' },
    });
  });

  it('parses WHERE with AND/OR', () => {
    const ast = parse("MATCH (n) WHERE n.name = 'a' AND n.path = 'b' RETURN n");
    expect(ast.whereClause).toMatchObject({
      kind: 'logical', op: 'AND',
    });
  });

  it('parses WHERE with NOT', () => {
    const ast = parse("MATCH (n) WHERE NOT n.name = 'a' RETURN n");
    expect(ast.whereClause).toMatchObject({ kind: 'not' });
  });

  it('parses WHERE with CONTAINS', () => {
    const ast = parse("MATCH (n) WHERE n.name CONTAINS 'util' RETURN n");
    expect(ast.whereClause).toMatchObject({
      kind: 'comparison', operator: 'CONTAINS',
    });
  });

  it('parses WHERE with STARTS WITH', () => {
    const ast = parse("MATCH (n) WHERE n.name STARTS WITH 'src' RETURN n");
    expect(ast.whereClause).toMatchObject({
      kind: 'comparison', operator: 'STARTS WITH',
    });
  });

  it('parses WHERE with ENDS WITH', () => {
    const ast = parse("MATCH (n) WHERE n.name ENDS WITH '.js' RETURN n");
    expect(ast.whereClause).toMatchObject({
      kind: 'comparison', operator: 'ENDS WITH',
    });
  });

  it('parses RETURN with property access', () => {
    const ast = parse('MATCH (n) RETURN n.name, n.path');
    expect(ast.returnClause.items).toHaveLength(2);
    expect(ast.returnClause.items[0].expression).toMatchObject({
      kind: 'propertyAccess', variable: 'n', property: 'name',
    });
  });

  it('parses RETURN with alias', () => {
    const ast = parse('MATCH (n) RETURN n.name AS fileName');
    expect(ast.returnClause.items[0].alias).toBe('fileName');
  });

  it('parses RETURN DISTINCT', () => {
    const ast = parse('MATCH (n) RETURN DISTINCT n.name');
    expect(ast.returnClause.distinct).toBe(true);
  });

  it('parses COUNT function', () => {
    const ast = parse('MATCH (n) RETURN COUNT(n)');
    expect(ast.returnClause.items[0].expression).toMatchObject({
      kind: 'functionCall', name: 'COUNT',
    });
  });

  it('parses type() function', () => {
    const ast = parse('MATCH (a)-[r]->(b) RETURN type(r)');
    expect(ast.returnClause.items[0].expression).toMatchObject({
      kind: 'functionCall', name: 'TYPE',
    });
  });

  it('parses LIMIT', () => {
    const ast = parse('MATCH (n) RETURN n LIMIT 10');
    expect(ast.limit).toBe(10);
  });

  it('parses ORDER BY', () => {
    const ast = parse('MATCH (n) RETURN n.name ORDER BY n.name DESC');
    expect(ast.orderByClause!.items[0].descending).toBe(true);
  });

  it('throws CypherSyntaxError on bad input', () => {
    expect(() => parse('MATCH RETURN')).toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest test/cypher/parser.test.ts --no-cache`
Expected: FAIL — `parse` not exported

- [ ] **Step 3: Implement the parser**

Add `parse(input: string): CypherQuery` function to `src/cypher/parser.ts`.

Parser structure (recursive descent):
- `parseQuery()` → calls `parseMatch()`, optionally `parseWhere()`, `parseReturn()`, optionally `parseOrderBy()`, optionally `parseLimit()`
- `parseMatch()` → parses pattern chain: alternating `parseNodePattern()` and `parseRelationshipPattern()`
- `parseNodePattern()` → `(` optional-variable optional-`:label` optional-`{props}` `)`
- `parseRelationshipPattern()` → detects direction from leading `<-` or `-`, parses `[` optional-variable optional-`:TYPE` `]`, detects trailing `->` or `-`
- `parseWhere()` → `parseOrExpr()` → `parseAndExpr()` → `parseNotExpr()` → `parseComparison()`
- `parseComparison()` → `parseAtom() (operator parseAtom())?`
- `parseAtom()` → literal | property access (`ident.ident`) | variable ref | function call | `(` expr `)`
- `parseReturn()` → optional DISTINCT, comma-separated return items, each with optional `AS alias`
- `parseReturnItem()` → function call | property access | variable ref
- `parseOrderBy()` → comma-separated `expression (ASC|DESC)?`
- `parseLimit()` → NUMBER

Use a `Parser` class internally that tracks `tokens[]` and `pos`, with helpers `peek()`, `advance()`, `expect(type)`, `match(type)`.

- [ ] **Step 4: Run parser tests**

Run: `npx jest test/cypher/parser.test.ts --no-cache`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/cypher/parser.ts test/cypher/parser.test.ts
git commit -m "feat(cypher): add recursive descent parser"
```

---

## Chunk 2: Graph Index

### Task 3: CypherGraph

**Files:**
- Create: `src/cypher/graph.ts`
- Create: `test/cypher/graph.test.ts`

- [ ] **Step 1: Write graph index tests**

Create `test/cypher/graph.test.ts`:

```typescript
import { SElement, SElementAssociation } from '../../src/selement';
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
    // root + project + a.js + b.js = 4
    expect(graph.nodeCount).toBe(4);
  });

  it('indexes associations as edges', () => {
    // 1 import edge
    expect(graph.edgeCount).toBeGreaterThanOrEqual(1);
  });

  it('adds CONTAINS edges by default', () => {
    // root->project, project->a.js, project->b.js = 3 CONTAINS
    // plus 1 import = 4 total
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest test/cypher/graph.test.ts --no-cache`
Expected: FAIL — module not found

- [ ] **Step 3: Implement CypherGraph**

Create `src/cypher/graph.ts`:

```typescript
import { SElement } from '../selement';
import { SElementAssociation } from '../selement';

interface NodeData {
  id: number;
  labels: Set<string>;
  properties: Record<string, any>;
}

interface EdgeData {
  id: number;
  type: string;
  properties: Record<string, any>;
  src: number;
  dst: number;
}

class CypherGraph {
  private nodeData: Map<number, NodeData> = new Map();
  private edgeData: Map<number, EdgeData> = new Map();
  private nodeOutEdges: Map<number, number[]> = new Map();
  private nodeInEdges: Map<number, number[]> = new Map();
  private nodeToElem: Map<number, SElement> = new Map();
  private edgeToAssoc: Map<number, SElementAssociation | null> = new Map();
  private pathToNode: Map<string, number> = new Map();

  constructor(root: SElement, includeHierarchy = true) {
    this.buildIndex(root, includeHierarchy);
  }

  // ... three-pass indexing as specified in design
  // Pass 1: traverse all elements, create nodes
  // Pass 2: traverse all outgoing associations, create edges (dedup by identity)
  // Pass 3: if includeHierarchy, create CONTAINS edges

  // Flatten attributes: single-element arrays → scalars
  // Add name, path; remove type from properties

  // Public accessors:
  get nodeCount(): number
  get edgeCount(): number
  getAllNodes(): NodeData[]
  getAllEdges(): EdgeData[]
  getNode(id: number): NodeData
  getEdge(id: number): EdgeData
  getOutEdges(nodeId: number): number[]
  getInEdges(nodeId: number): number[]
  getEdgeSrc(edgeId: number): number
  getEdgeDst(edgeId: number): number
  getNodeByPath(path: string): NodeData | undefined
  getElemForNode(nodeId: number): SElement | undefined
  getAssocForEdge(edgeId: number): SElementAssociation | null | undefined
}
```

- [ ] **Step 4: Run graph tests**

Run: `npx jest test/cypher/graph.test.ts --no-cache`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/cypher/graph.ts test/cypher/graph.test.ts
git commit -m "feat(cypher): add CypherGraph index"
```

---

## Chunk 3: Executor

### Task 4: Executor — Pattern Matching, WHERE, Aggregation

**Files:**
- Create: `src/cypher/executor.ts`
- Create: `test/cypher/executor.test.ts`

**Note:** `CypherResult` is defined in `executor.ts` and re-exported from `index.ts` (Task 6) to avoid circular imports.

- [ ] **Step 1: Write ALL executor tests (pattern matching + WHERE + aggregation)**

Create `test/cypher/executor.test.ts`:

```typescript
import { SElement, SElementAssociation } from '../../src/selement';
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
    expect(result.rows.length).toBe(4); // root + project + a.js + b.js
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
    expect(result.rows.length).toBe(2); // both directions
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest test/cypher/executor.test.ts --no-cache`
Expected: FAIL — module not found

- [ ] **Step 3: Implement executor**

Create `src/cypher/executor.ts` with the full executor including pattern matching, WHERE evaluation, and aggregation:

```typescript
import { CypherGraph } from './graph';
import {
  CypherQuery, CypherExecutionError,
  // ... other AST types as needed
} from './parser';

export interface CypherResult {
  columns: string[];
  rows: Record<string, any>[];
}

type Binding = Map<string, { kind: 'node' | 'edge'; id: number }>;

export class CypherExecutor {
  constructor(private graph: CypherGraph) {}

  execute(query: CypherQuery): CypherResult {
    // 1. Pattern match → bindings
    // 2. WHERE filter
    // 3. RETURN project (with aggregation grouping)
    // 4. DISTINCT
    // 5. ORDER BY
    // 6. LIMIT
  }
}
```

Key implementation details:
- Pattern matching: iterate node patterns and relationship patterns alternately. For each node pattern, if it's the first in the chain, scan all graph nodes. For subsequent nodes (connected by a relationship), expand from the previously bound node via edges.
- WHERE comparison with array properties: if the property value is an array, check if any element matches.
- Aggregation grouping: partition bindings by non-aggregated return items, then compute COUNT/COLLECT per group. When all items are aggregations, all bindings form a single group.
- `type(r)` resolves to the edge's type string.
- RETURN `n` (bare variable): for nodes → `{name, path, type, properties}`, for edges → `{from, to, type, properties}` where `from`/`to` are path strings.
- `CypherResult` is exported from this file (re-exported by `index.ts` in Task 6).

- [ ] **Step 4: Run executor tests**

Run: `npx jest test/cypher/executor.test.ts --no-cache`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/cypher/executor.ts test/cypher/executor.test.ts
git commit -m "feat(cypher): add query executor with pattern matching, WHERE, and aggregation"
```

---

## Chunk 4: Public API, Integration Tests, and CLI

### Task 6: Public API and Integration Tests

**Files:**
- Create: `src/cypher/index.ts`
- Modify: `src/index.ts`
- Create: `test/cypher/integration.test.ts`

- [ ] **Step 1: Write integration tests**

Create `test/cypher/integration.test.ts`:

```typescript
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
    const names = result.rows.map(r => r['n.name']);
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
```

- [ ] **Step 2: Create public API**

Create `src/cypher/index.ts`:

```typescript
import { SGraph } from '../sgraph';
import { CypherGraph } from './graph';
import { CypherExecutor } from './executor';
import { parse } from './parser';

export { CypherSyntaxError, CypherExecutionError } from './parser';
export type { CypherResult } from './executor';

export interface CypherQueryOptions {
  includeHierarchy?: boolean;
}

export function cypherQuery(
  model: SGraph,
  query: string,
  options: CypherQueryOptions = {}
): CypherResult {
  const { includeHierarchy = true } = options;
  const graph = new CypherGraph(model.rootNode, includeHierarchy);
  const executor = new CypherExecutor(graph);
  const ast = parse(query);
  return executor.execute(ast);
}
```

- [ ] **Step 3: Add export to main index**

Modify `src/index.ts` — add:

```typescript
export * from './cypher';
```

- [ ] **Step 4: Run integration tests**

Run: `npx jest test/cypher/integration.test.ts --no-cache`
Expected: All PASS

- [ ] **Step 5: Run ALL tests to verify nothing is broken**

Run: `npx jest --no-cache`
Expected: All suites PASS

- [ ] **Step 6: Commit**

```bash
git add src/cypher/index.ts src/index.ts test/cypher/integration.test.ts
git commit -m "feat(cypher): add public API and integration tests"
```

### Task 7: CLI

**Files:**
- Create: `src/cypher/cli.ts`

- [ ] **Step 1: Implement CLI**

Create `src/cypher/cli.ts`:

```typescript
import { SGraph } from '../sgraph';
import { CypherGraph } from './graph';
import { CypherExecutor } from './executor';
import { parse, CypherSyntaxError, CypherExecutionError } from './parser';
import type { CypherResult } from './index';

// Parse CLI args manually (no external deps)
// argv: [node, script, model-path, optional-query, --format, --no-hierarchy]

// Format functions:
//   table: pad columns, align
//   json: JSON.stringify(result.rows, null, 2)
//   csv: header line + comma-separated values

// Single query mode: parse model, build graph, execute query, print result
// REPL mode: readline interface, cypher> prompt, ; or blank line to execute
//   quit/exit to exit, show timing

async function main() {
  const args = process.argv.slice(2);
  // parse --format, --no-hierarchy flags
  // remaining positional: modelPath, optional query

  const t0 = Date.now();
  const model = await SGraph.parseXmlFileOrZippedXml({ filePath: modelPath });
  if (!model) { console.error('Failed to load model'); process.exit(1); }
  console.error(`Loaded in ${Date.now() - t0}ms`);

  const t1 = Date.now();
  const graph = new CypherGraph(model.rootNode, includeHierarchy);
  console.error(`Index: ${graph.nodeCount} nodes, ${graph.edgeCount} edges (${Date.now() - t1}ms)`);

  const executor = new CypherExecutor(graph);

  if (query) {
    // single query mode
    const ast = parse(query);
    const result = executor.execute(ast);
    printResult(result, format);
  } else {
    // REPL mode using readline
    runRepl(executor, format);
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });
```

- [ ] **Step 2: Compile and test CLI manually**

Run:
```bash
npm run compile
node dist/cypher/cli.js test/modelfile.xml "MATCH (n:file) RETURN n.name"
```
Expected: Table showing 5 file rows (package.json, 2x index.js, models.js, math.js)

```bash
node dist/cypher/cli.js test/modelfile.xml "MATCH (a)-[r:import]->(b) RETURN a.name, b.name"
```
Expected: Table showing import dependencies

```bash
node dist/cypher/cli.js test/modelfile.xml "MATCH (n) RETURN n.name, n.path" --format json
```
Expected: JSON array of objects

```bash
node dist/cypher/cli.js test/modelfile.xml "MATCH (a)-[r]->(b) RETURN type(r), COUNT(r)"
```
Expected: Table showing dependency type counts

- [ ] **Step 3: Commit**

```bash
git add src/cypher/cli.ts
git commit -m "feat(cypher): add CLI with REPL support"
```

### Task 8: Final Verification

- [ ] **Step 1: Run full test suite**

Run: `npx jest --no-cache`
Expected: All suites PASS

- [ ] **Step 2: Compile**

Run: `npm run compile`
Expected: No errors

- [ ] **Step 3: Run CLI end-to-end smoke tests**

```bash
# Basic queries
node dist/cypher/cli.js test/modelfile.xml "MATCH (n:file) RETURN n.name"
node dist/cypher/cli.js test/modelfile.xml "MATCH (n:dir) RETURN n.name, n.path"
node dist/cypher/cli.js test/modelfile.xml "MATCH (a:file)-[r:import]->(b:file) RETURN a.name, b.name"
node dist/cypher/cli.js test/modelfile.xml "MATCH (n {name: 'math.js'}) RETURN n.path"

# WHERE filtering
node dist/cypher/cli.js test/modelfile.xml "MATCH (n) WHERE n.name CONTAINS '.js' RETURN n.name"
node dist/cypher/cli.js test/modelfile.xml "MATCH (n:file) WHERE n.name STARTS WITH 'index' RETURN n.name, n.path"

# Aggregation
node dist/cypher/cli.js test/modelfile.xml "MATCH (n) RETURN COUNT(n)"
node dist/cypher/cli.js test/modelfile.xml "MATCH (a)-[r]->(b) RETURN type(r), COUNT(r)"
node dist/cypher/cli.js test/modelfile.xml "MATCH (n:file) RETURN COLLECT(n.name)"

# Hierarchy
node dist/cypher/cli.js test/modelfile.xml "MATCH (d:dir)-[:CONTAINS]->(f:file) RETURN d.name, f.name"

# Formats
node dist/cypher/cli.js test/modelfile.xml "MATCH (n:file) RETURN n.name" --format json
node dist/cypher/cli.js test/modelfile.xml "MATCH (n:file) RETURN n.name" --format csv

# No hierarchy
node dist/cypher/cli.js test/modelfile.xml "MATCH (n)-[:CONTAINS]->(m) RETURN n.name" --no-hierarchy
```

Verify each produces sensible output matching the model data.

- [ ] **Step 4: Update PYTHON_MAPPING.md**

Add Cypher section to `/Users/ville/code/sgraph.js/PYTHON_MAPPING.md`:

```markdown
## Cypher Query Support

| Python (`cypher.py`) | TypeScript (`src/cypher/`) |
|---|---|
| `SGraphCypherBackend` | `CypherGraph` in `graph.ts` |
| `cypher_query(model, query, include_hierarchy)` | `cypherQuery(model, query, {includeHierarchy})` |
| `SGraphCypherExecutor` (sPyCy) | `CypherExecutor` in `executor.ts` |
| Result: `pd.DataFrame` | Result: `CypherResult {columns, rows}` |
| CLI: `python -m sgraph.cypher` | CLI: `node dist/cypher/cli.js` |
| `_extract_subgraph()` | Not ported |
| Graph output formats | Not ported (use existing converters) |
```

- [ ] **Step 5: Final commit**

```bash
git add PYTHON_MAPPING.md
git commit -m "docs: update Python mapping with Cypher support"
```
