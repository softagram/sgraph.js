import { tokenize, parse, TokenType } from '../../src/cypher/parser';

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
