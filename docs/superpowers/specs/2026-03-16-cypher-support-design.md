# Cypher Query Support for sgraph.js

## Overview

Lightweight Cypher query interpreter for sgraph.js, enabling read-only Cypher queries against SGraph models. Mirrors the Python sgraph `cypher.py` module's API but uses a hand-written parser+executor instead of the sPyCy dependency. Zero external dependencies.

## Motivation

The Python sgraph library supports Cypher queries via sPyCy. No equivalent JS library exists with a compatible license (MIT). This implements a purpose-built Cypher subset interpreter that covers the practical query patterns used with code analysis models.

## Supported Cypher Subset

### In scope

- `MATCH` with node patterns: `(n)`, `(n:label)`, `(n:label {prop: 'value'})`
- `MATCH` with relationship patterns: `-[r:TYPE]->`, `<-[r:TYPE]-`, `-[r:TYPE]-`
- `WHERE` with comparisons: `=`, `<>`, `<`, `>`, `<=`, `>=`
- `WHERE` string operators: `CONTAINS`, `STARTS WITH`, `ENDS WITH`
- `WHERE` logical operators: `AND`, `OR`, `NOT`
- `RETURN` with property access (`n.name`), variables (`n`, `r`), aliases (`AS`)
- `RETURN DISTINCT`
- `COUNT()`, `COLLECT()`, `type()` functions
- `ORDER BY` (ASC/DESC)
- `LIMIT`
- Inline property matching: `(n {name: 'foo'})`
- Undirected relationships: `(a)-[r]-(b)`

### Out of scope

- Write operations (`CREATE`, `SET`, `DELETE`, `MERGE`)
- Variable-length paths (`[*1..3]`)
- `OPTIONAL MATCH`, `UNION`, `WITH` (as clause), subqueries
- `UNWIND`, `CASE`, list comprehensions
- User-defined functions

## Architecture

```
src/cypher/
  parser.ts    -- tokenizer + recursive descent parser -> AST
  graph.ts     -- indexed graph backend (SElement -> nodes, associations -> edges)
  executor.ts  -- pattern matching, WHERE evaluation, RETURN projection
  index.ts     -- public API: cypherQuery()
  cli.ts       -- CLI entry point
```

### graph.ts -- Graph Index

Maps SGraph to a labeled property graph. Three-pass indexing (mirrors Python `SGraphCypherBackend`):

**Pass 1 -- Nodes:** Each SElement becomes a node with:
- Numeric ID (sequential)
- Labels from element type (e.g., `file`, `dir`, `function`)
- Properties from element attributes + auto-added `name` and `path` (with `type` removed from properties since it's already a label)
- The virtual root SElement (unnamed container) is indexed but gets an empty-string `path`
- **Attribute flattening:** SElement attributes are stored as `string[]` arrays (except `type`). When building node properties, single-element arrays are flattened to scalar strings (e.g., `['63']` becomes `'63'`). Multi-element arrays are kept as arrays. This matches the natural expectation for WHERE comparisons.

**Pass 2 -- Edges:** Each SElementAssociation becomes an edge with:
- Numeric ID (sequential)
- Type from `deptype` (e.g., `function_ref`, `import`)
- Properties from association attributes
- Deduplicated by association identity

**Pass 3 -- Hierarchy (optional, default on):** Parent-child relationships become `:CONTAINS` edges. These are directional (parent -> child). Under undirected pattern matching `(a)-[r]-(b)`, CONTAINS edges match in both directions like all other edges.

**Index structures:**
- `nodeData[id]` -> `{labels: Set<string>, properties: Record<string, any>}`
- `edgeData[id]` -> `{type: string, properties: Record<string, any>}`
- `nodeOut[id]` -> outgoing edge IDs
- `nodeIn[id]` -> incoming edge IDs
- `edgeSrc[id]` / `edgeDst[id]` -> source/target node IDs
- Reverse maps: `nodeToElem[id]` -> SElement, `edgeToAssoc[id]` -> SElementAssociation | null

### parser.ts -- Tokenizer + Parser

**Tokenizer** produces tokens:
- Keywords: MATCH, WHERE, RETURN, AS, LIMIT, ORDER, BY, ASC, DESC, DISTINCT, AND, OR, NOT, CONTAINS, STARTS, ENDS, WITH, COUNT, COLLECT, TYPE, TRUE, FALSE
- Symbols: `( ) [ ] - > < { } : . , = <> <= >=`
- Identifiers, strings (single/double quoted), numbers

**Note on multi-token operators:** `STARTS WITH` and `ENDS WITH` are parsed as two-token sequences in the WHERE expression grammar. The `WITH` keyword is tokenized but only valid as part of `STARTS WITH` / `ENDS WITH`; standalone `WITH` as a clause keyword is rejected by the parser.

**Recursive descent parser** produces AST:

```
CypherQuery {
  matchClause: MatchClause
  whereClause?: WhereClause
  returnClause: ReturnClause
  orderByClause?: OrderByClause
  limit?: number
}

MatchClause {
  pattern: PatternElement[]  -- alternating NodePattern and RelationshipPattern
}

NodePattern {
  variable?: string
  labels: string[]
  properties?: Record<string, any>
}

RelationshipPattern {
  variable?: string
  types: string[]
  direction: 'out' | 'in' | 'both'
}

WhereClause -- expression tree:
  Comparison { left, operator, right }
  LogicalExpr { op: 'AND'|'OR', left, right }
  NotExpr { expr }
  PropertyAccess { variable, property }
  Literal { value: string | number | boolean | null }

ReturnClause {
  distinct: boolean
  items: ReturnItem[]
}

ReturnItem {
  expression: PropertyAccess | VariableRef | FunctionCall
  alias?: string
}

FunctionCall {
  name: 'COUNT' | 'COLLECT' | 'TYPE'
  argument: Expression
}

OrderByClause {
  items: { expression: Expression, descending: boolean }[]
}
```

**Error handling:** The parser throws `CypherSyntaxError` on malformed queries with a message indicating the position and unexpected token. The executor throws `CypherExecutionError` for runtime errors (e.g., unknown variable in WHERE). Both extend `Error`.

### executor.ts -- Query Executor

**Execution pipeline:**

1. **Pattern matching:** For each node pattern, scan all graph nodes filtered by label and inline properties. For each relationship pattern, follow edges from bound source nodes in the specified direction, filtered by type. Produces a list of bindings (variable -> nodeId/edgeId maps).

2. **WHERE filtering:** Evaluate expression tree recursively against each binding. Property access resolves variable to node/edge, then reads the property. Comparisons apply the operator. When comparing against array-valued properties, the comparison checks if any element in the array matches (membership semantics). AND/OR short-circuit. NOT inverts.

3. **RETURN projection:** For each binding, resolve return expressions:
   - `n.prop` -> node/edge property value
   - `n` -> `{name, path, type, properties}` for nodes
   - `r` -> `{from, to, type, properties}` for edges, where `from` and `to` are the source/target node paths (strings)
   - `type(r)` -> edge type string (the `deptype`)
   - `COUNT(x)` / `COLLECT(x)` -> aggregate across bindings grouped by non-aggregated return items. When all RETURN items are aggregations (no group-by columns), all bindings form a single group.
   - `COLLECT(x)` returns `any[]` in the result column

4. **ORDER BY + LIMIT:** Sort result rows, then truncate.

**Result type:**
```typescript
interface CypherResult {
  columns: string[];
  rows: Record<string, any>[];
}
```

### index.ts -- Public API

```typescript
function cypherQuery(
  model: SGraph,
  query: string,
  options?: { includeHierarchy?: boolean }
): CypherResult;
```

Exported from main `src/index.ts`. Maps to Python's `cypher_query(model, query, include_hierarchy)`.

### cli.ts -- CLI

Invoked via compiled output (no `ts-node` dependency):

```
npm run compile && node dist/cypher/cli.js <model-file> [query] [--format table|json|csv] [--no-hierarchy]
```

- Single query mode: pass query as second arg
- Interactive REPL: omit query arg. `cypher>` prompt, `;` or blank line to execute, `quit` to exit.
- Reports load time, node/edge count on startup
- Output formats: `table` (default), `json`, `csv`

## Python Mapping

| Python (`cypher.py`) | TypeScript (`src/cypher/`) |
|---|---|
| `SGraphCypherBackend` class | `CypherGraph` class in `graph.ts` |
| `cypher_query(model, query, include_hierarchy)` | `cypherQuery(model, query, {includeHierarchy})` |
| `SGraphCypherExecutor` (sPyCy) | `CypherExecutor` class in `executor.ts` |
| Result: `pd.DataFrame` | Result: `CypherResult {columns, rows}` |
| CLI: `python -m sgraph.cypher` | CLI: `node dist/cypher/cli.js` |
| `_extract_subgraph()` | Not ported (add later if needed) |
| Graph output formats (xml, dot, plantuml) | Not ported (use existing converters separately) |

## Testing Strategy

- **Parser unit tests:** Various Cypher patterns -> correct AST structures
- **Executor unit tests:** Queries against programmatically built graphs -> expected bindings
- **Integration tests:** Full queries against `test/modelfile.xml` -> expected result rows
- **CLI manual verification:** Run CLI against test model during development to verify end-to-end

## Example Queries (for testing)

```cypher
-- Find all files
MATCH (n:file) RETURN n.name

-- Find dependencies between files
MATCH (a:file)-[r:function_ref]->(b:file) RETURN a.name, b.name, r

-- Find elements by name
MATCH (n {name: 'index.js'}) RETURN n.name, n.path

-- Find what a directory contains
MATCH (d:dir)-[:CONTAINS]->(f) RETURN d.name, f.name

-- Count dependencies by type
MATCH (a)-[r]->(b) RETURN type(r), COUNT(r)
```
