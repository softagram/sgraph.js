// Cypher subset parser for sgraph.js
// Tokenizer, AST types, and recursive descent parser

// --- Error classes ---

export class CypherSyntaxError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CypherSyntaxError';
  }
}

export class CypherExecutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CypherExecutionError';
  }
}

// --- Token types ---

export enum TokenType {
  // Keywords
  MATCH = 'MATCH',
  WHERE = 'WHERE',
  RETURN = 'RETURN',
  AS = 'AS',
  LIMIT = 'LIMIT',
  ORDER = 'ORDER',
  BY = 'BY',
  ASC = 'ASC',
  DESC = 'DESC',
  DISTINCT = 'DISTINCT',
  AND = 'AND',
  OR = 'OR',
  NOT = 'NOT',
  CONTAINS = 'CONTAINS',
  STARTS = 'STARTS',
  ENDS = 'ENDS',
  WITH = 'WITH',
  COUNT = 'COUNT',
  COLLECT = 'COLLECT',
  TYPE = 'TYPE',
  TRUE = 'TRUE',
  FALSE = 'FALSE',
  STAR = 'STAR',

  // Symbols
  LPAREN = 'LPAREN',
  RPAREN = 'RPAREN',
  LBRACKET = 'LBRACKET',
  RBRACKET = 'RBRACKET',
  LBRACE = 'LBRACE',
  RBRACE = 'RBRACE',
  DASH = 'DASH',
  GT = 'GT',
  LT = 'LT',
  COLON = 'COLON',
  DOT = 'DOT',
  COMMA = 'COMMA',
  EQ = 'EQ',
  NEQ = 'NEQ',
  LTE = 'LTE',
  GTE = 'GTE',

  // Values
  IDENTIFIER = 'IDENTIFIER',
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  EOF = 'EOF',
}

export interface Token {
  type: TokenType;
  value: string;
}

// --- Keyword lookup ---

const KEYWORDS: Record<string, TokenType> = {
  MATCH: TokenType.MATCH,
  WHERE: TokenType.WHERE,
  RETURN: TokenType.RETURN,
  AS: TokenType.AS,
  LIMIT: TokenType.LIMIT,
  ORDER: TokenType.ORDER,
  BY: TokenType.BY,
  ASC: TokenType.ASC,
  DESC: TokenType.DESC,
  DISTINCT: TokenType.DISTINCT,
  AND: TokenType.AND,
  OR: TokenType.OR,
  NOT: TokenType.NOT,
  CONTAINS: TokenType.CONTAINS,
  STARTS: TokenType.STARTS,
  ENDS: TokenType.ENDS,
  WITH: TokenType.WITH,
  COUNT: TokenType.COUNT,
  COLLECT: TokenType.COLLECT,
  TRUE: TokenType.TRUE,
  FALSE: TokenType.FALSE,
};

// --- Tokenizer ---

export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < input.length) {
    // Skip whitespace
    if (/\s/.test(input[i])) {
      i++;
      continue;
    }

    // Two-char operators (check before single-char)
    if (i + 1 < input.length) {
      const twoChar = input[i] + input[i + 1];
      if (twoChar === '<>') {
        tokens.push({ type: TokenType.NEQ, value: '<>' });
        i += 2;
        continue;
      }
      if (twoChar === '<=') {
        tokens.push({ type: TokenType.LTE, value: '<=' });
        i += 2;
        continue;
      }
      if (twoChar === '>=') {
        tokens.push({ type: TokenType.GTE, value: '>=' });
        i += 2;
        continue;
      }
    }

    // Single-char symbols
    const ch = input[i];
    if (ch === '(') { tokens.push({ type: TokenType.LPAREN, value: '(' }); i++; continue; }
    if (ch === ')') { tokens.push({ type: TokenType.RPAREN, value: ')' }); i++; continue; }
    if (ch === '[') { tokens.push({ type: TokenType.LBRACKET, value: '[' }); i++; continue; }
    if (ch === ']') { tokens.push({ type: TokenType.RBRACKET, value: ']' }); i++; continue; }
    if (ch === '{') { tokens.push({ type: TokenType.LBRACE, value: '{' }); i++; continue; }
    if (ch === '}') { tokens.push({ type: TokenType.RBRACE, value: '}' }); i++; continue; }
    if (ch === '-') { tokens.push({ type: TokenType.DASH, value: '-' }); i++; continue; }
    if (ch === '>') { tokens.push({ type: TokenType.GT, value: '>' }); i++; continue; }
    if (ch === '<') { tokens.push({ type: TokenType.LT, value: '<' }); i++; continue; }
    if (ch === ':') { tokens.push({ type: TokenType.COLON, value: ':' }); i++; continue; }
    if (ch === '.') { tokens.push({ type: TokenType.DOT, value: '.' }); i++; continue; }
    if (ch === ',') { tokens.push({ type: TokenType.COMMA, value: ',' }); i++; continue; }
    if (ch === '=') { tokens.push({ type: TokenType.EQ, value: '=' }); i++; continue; }
    if (ch === '*') { tokens.push({ type: TokenType.STAR, value: '*' }); i++; continue; }

    // String literals
    if (ch === "'" || ch === '"') {
      const quote = ch;
      i++; // skip opening quote
      let str = '';
      while (i < input.length && input[i] !== quote) {
        str += input[i];
        i++;
      }
      if (i >= input.length) {
        throw new CypherSyntaxError(`Unterminated string literal`);
      }
      i++; // skip closing quote
      tokens.push({ type: TokenType.STRING, value: str });
      continue;
    }

    // Numbers
    if (/[0-9]/.test(ch)) {
      let num = '';
      while (i < input.length && /[0-9]/.test(input[i])) {
        num += input[i];
        i++;
      }
      if (i < input.length && input[i] === '.') {
        num += '.';
        i++;
        while (i < input.length && /[0-9]/.test(input[i])) {
          num += input[i];
          i++;
        }
      }
      tokens.push({ type: TokenType.NUMBER, value: num });
      continue;
    }

    // Identifiers and keywords
    if (/[a-zA-Z_]/.test(ch)) {
      let ident = '';
      while (i < input.length && /[a-zA-Z0-9_]/.test(input[i])) {
        ident += input[i];
        i++;
      }
      const upper = ident.toUpperCase();
      if (upper in KEYWORDS) {
        tokens.push({ type: KEYWORDS[upper], value: upper });
      } else {
        tokens.push({ type: TokenType.IDENTIFIER, value: ident });
      }
      continue;
    }

    throw new CypherSyntaxError(`Unexpected character: '${ch}'`);
  }

  tokens.push({ type: TokenType.EOF, value: '' });
  return tokens;
}

// --- AST Types ---

export interface NodePattern {
  kind: 'node';
  variable?: string;
  labels: string[];
  properties?: Record<string, any>;
}

export interface RelationshipPattern {
  kind: 'relationship';
  variable?: string;
  types: string[];
  direction: 'out' | 'in' | 'both';
}

export type PatternElement = NodePattern | RelationshipPattern;

export interface MatchClause {
  pattern: PatternElement[];
}

// WHERE expression tree
export interface Comparison {
  kind: 'comparison';
  operator: string;
  left: WhereExpr;
  right: WhereExpr;
}

export interface LogicalExpr {
  kind: 'logical';
  op: 'AND' | 'OR';
  left: WhereExpr;
  right: WhereExpr;
}

export interface NotExpr {
  kind: 'not';
  expr: WhereExpr;
}

export interface PropertyAccess {
  kind: 'propertyAccess';
  variable: string;
  property: string;
}

export interface VariableRef {
  kind: 'variable';
  name: string;
}

export interface FunctionCall {
  kind: 'functionCall';
  name: string;
  argument: WhereExpr;
}

export interface Literal {
  kind: 'literal';
  value: string | number | boolean | null;
}

export type WhereExpr =
  | Comparison
  | LogicalExpr
  | NotExpr
  | PropertyAccess
  | VariableRef
  | FunctionCall
  | Literal;

export interface ReturnItem {
  expression: WhereExpr;
  alias?: string;
}

export interface ReturnClause {
  distinct: boolean;
  items: ReturnItem[];
}

export interface OrderByItem {
  expression: WhereExpr;
  descending: boolean;
}

export interface OrderByClause {
  items: OrderByItem[];
}

export interface CypherQuery {
  matchClause: MatchClause;
  whereClause?: WhereExpr;
  returnClause: ReturnClause;
  orderByClause?: OrderByClause;
  limit?: number;
}

// --- Parser ---

class Parser {
  private tokens: Token[];
  private pos: number;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
    this.pos = 0;
  }

  private peek(): Token {
    return this.tokens[this.pos];
  }

  private advance(): Token {
    const token = this.tokens[this.pos];
    this.pos++;
    return token;
  }

  private expect(type: TokenType): Token {
    const token = this.peek();
    if (token.type !== type) {
      throw new CypherSyntaxError(
        `Expected ${type} but got ${token.type} ('${token.value}')`
      );
    }
    return this.advance();
  }

  private match(type: TokenType): boolean {
    if (this.peek().type === type) {
      this.advance();
      return true;
    }
    return false;
  }

  private expectIdentifierOrKeyword(): Token {
    const token = this.peek();
    // Accept IDENTIFIER or any keyword token as a name
    if (token.type === TokenType.IDENTIFIER || token.type in TokenType) {
      // Reject structural tokens (symbols, EOF, literals other than identifiers/keywords)
      const nonNameTypes = new Set([
        TokenType.LPAREN, TokenType.RPAREN, TokenType.LBRACKET, TokenType.RBRACKET,
        TokenType.LBRACE, TokenType.RBRACE, TokenType.DASH, TokenType.GT, TokenType.LT,
        TokenType.COLON, TokenType.DOT, TokenType.COMMA, TokenType.EQ, TokenType.NEQ,
        TokenType.LTE, TokenType.GTE, TokenType.STRING, TokenType.NUMBER,
        TokenType.EOF, TokenType.STAR,
      ]);
      if (!nonNameTypes.has(token.type)) {
        return this.advance();
      }
    }
    throw new CypherSyntaxError(
      `Expected identifier or keyword but got ${token.type} ('${token.value}')`
    );
  }

  parseQuery(): CypherQuery {
    // MATCH clause
    this.expect(TokenType.MATCH);
    const matchClause = this.parseMatch();

    // Optional WHERE clause
    let whereClause: WhereExpr | undefined;
    if (this.peek().type === TokenType.WHERE) {
      this.advance();
      whereClause = this.parseOrExpr();
    }

    // RETURN clause
    this.expect(TokenType.RETURN);
    const returnClause = this.parseReturn();

    // Optional ORDER BY
    let orderByClause: OrderByClause | undefined;
    if (this.peek().type === TokenType.ORDER) {
      orderByClause = this.parseOrderBy();
    }

    // Optional LIMIT
    let limit: number | undefined;
    if (this.peek().type === TokenType.LIMIT) {
      limit = this.parseLimit();
    }

    return {
      matchClause,
      whereClause,
      returnClause,
      orderByClause,
      limit,
    };
  }

  private parseMatch(): MatchClause {
    const pattern: PatternElement[] = [];

    // First element must be a node
    pattern.push(this.parseNodePattern());

    // Then alternating relationship-node pairs
    while (this.peek().type === TokenType.DASH || this.peek().type === TokenType.LT) {
      const rel = this.parseRelationshipPattern();
      pattern.push(rel);
      pattern.push(this.parseNodePattern());
    }

    return { pattern };
  }

  private parseNodePattern(): NodePattern {
    this.expect(TokenType.LPAREN);

    let variable: string | undefined;
    const labels: string[] = [];
    let properties: Record<string, any> | undefined;

    // Optional variable name (identifier that is NOT followed by nothing special,
    // or is followed by colon for labels, or RPAREN)
    if (this.peek().type === TokenType.IDENTIFIER) {
      variable = this.advance().value;
    }

    // Optional labels (:Label)
    while (this.peek().type === TokenType.COLON) {
      this.advance(); // consume ':'
      const labelToken = this.expect(TokenType.IDENTIFIER);
      labels.push(labelToken.value);
    }

    // Optional inline properties { key: value, ... }
    if (this.peek().type === TokenType.LBRACE) {
      properties = this.parseInlineProperties();
    }

    this.expect(TokenType.RPAREN);

    return { kind: 'node', variable, labels, properties };
  }

  private parseInlineProperties(): Record<string, any> {
    this.expect(TokenType.LBRACE);
    const props: Record<string, any> = {};

    if (this.peek().type !== TokenType.RBRACE) {
      // Parse first property
      const key = this.expect(TokenType.IDENTIFIER).value;
      this.expect(TokenType.COLON);
      const value = this.parseLiteralValue();
      props[key] = value;

      // Parse additional properties
      while (this.match(TokenType.COMMA)) {
        const k = this.expect(TokenType.IDENTIFIER).value;
        this.expect(TokenType.COLON);
        const v = this.parseLiteralValue();
        props[k] = v;
      }
    }

    this.expect(TokenType.RBRACE);
    return props;
  }

  private parseLiteralValue(): string | number | boolean | null {
    const token = this.peek();
    if (token.type === TokenType.STRING) {
      this.advance();
      return token.value;
    }
    if (token.type === TokenType.NUMBER) {
      this.advance();
      const num = parseFloat(token.value);
      return num;
    }
    if (token.type === TokenType.TRUE) {
      this.advance();
      return true;
    }
    if (token.type === TokenType.FALSE) {
      this.advance();
      return false;
    }
    throw new CypherSyntaxError(
      `Expected literal value but got ${token.type} ('${token.value}')`
    );
  }

  private parseRelationshipPattern(): RelationshipPattern {
    // Possible patterns:
    // -[...]->   outgoing
    // <-[...]-   incoming
    // -[...]-    both (undirected)

    let direction: 'out' | 'in' | 'both';
    let leftArrow = false;

    // Check for incoming arrow start: <-
    if (this.peek().type === TokenType.LT) {
      this.advance(); // consume '<'
      this.expect(TokenType.DASH); // consume '-'
      leftArrow = true;
    } else {
      this.expect(TokenType.DASH); // consume '-'
    }

    // Parse bracket contents [variable:TYPE]
    this.expect(TokenType.LBRACKET);

    let variable: string | undefined;
    const types: string[] = [];

    if (this.peek().type === TokenType.IDENTIFIER) {
      variable = this.advance().value;
    }

    // Optional type (:TYPE) — allow keywords as type names (e.g. CONTAINS)
    while (this.peek().type === TokenType.COLON) {
      this.advance(); // consume ':'
      const typeToken = this.expectIdentifierOrKeyword();
      types.push(typeToken.value);
    }

    this.expect(TokenType.RBRACKET);

    // Check for outgoing arrow end: ->
    this.expect(TokenType.DASH); // consume '-'
    let rightArrow = false;
    if (this.peek().type === TokenType.GT) {
      this.advance(); // consume '>'
      rightArrow = true;
    }

    if (leftArrow && !rightArrow) {
      direction = 'in';
    } else if (!leftArrow && rightArrow) {
      direction = 'out';
    } else {
      direction = 'both';
    }

    return { kind: 'relationship', variable, types, direction };
  }

  // --- WHERE expression parsing (precedence climbing) ---

  private parseOrExpr(): WhereExpr {
    let left = this.parseAndExpr();
    while (this.peek().type === TokenType.OR) {
      this.advance();
      const right = this.parseAndExpr();
      left = { kind: 'logical', op: 'OR', left, right };
    }
    return left;
  }

  private parseAndExpr(): WhereExpr {
    let left = this.parseNotExpr();
    while (this.peek().type === TokenType.AND) {
      this.advance();
      const right = this.parseNotExpr();
      left = { kind: 'logical', op: 'AND', left, right };
    }
    return left;
  }

  private parseNotExpr(): WhereExpr {
    if (this.peek().type === TokenType.NOT) {
      this.advance();
      const expr = this.parseComparison();
      return { kind: 'not', expr };
    }
    return this.parseComparison();
  }

  private parseComparison(): WhereExpr {
    const left = this.parseAtom();

    // Check for comparison operators
    const token = this.peek();
    let operator: string | undefined;

    switch (token.type) {
      case TokenType.EQ:
        operator = '=';
        this.advance();
        break;
      case TokenType.NEQ:
        operator = '<>';
        this.advance();
        break;
      case TokenType.LT:
        operator = '<';
        this.advance();
        break;
      case TokenType.GT:
        operator = '>';
        this.advance();
        break;
      case TokenType.LTE:
        operator = '<=';
        this.advance();
        break;
      case TokenType.GTE:
        operator = '>=';
        this.advance();
        break;
      case TokenType.CONTAINS:
        operator = 'CONTAINS';
        this.advance();
        break;
      case TokenType.STARTS:
        this.advance(); // consume STARTS
        this.expect(TokenType.WITH); // consume WITH
        operator = 'STARTS WITH';
        break;
      case TokenType.ENDS:
        this.advance(); // consume ENDS
        this.expect(TokenType.WITH); // consume WITH
        operator = 'ENDS WITH';
        break;
      default:
        return left;
    }

    const right = this.parseAtom();
    return { kind: 'comparison', operator, left, right };
  }

  private parseAtom(): WhereExpr {
    const token = this.peek();

    // String literal
    if (token.type === TokenType.STRING) {
      this.advance();
      return { kind: 'literal', value: token.value };
    }

    // Number literal
    if (token.type === TokenType.NUMBER) {
      this.advance();
      return { kind: 'literal', value: parseFloat(token.value) };
    }

    // Boolean literals
    if (token.type === TokenType.TRUE) {
      this.advance();
      return { kind: 'literal', value: true };
    }
    if (token.type === TokenType.FALSE) {
      this.advance();
      return { kind: 'literal', value: false };
    }

    // Parenthesized expression
    if (token.type === TokenType.LPAREN) {
      this.advance();
      const expr = this.parseOrExpr();
      this.expect(TokenType.RPAREN);
      return expr;
    }

    // Function call keyword: COUNT(x), COLLECT(x)
    if (this.isFunctionKeyword(token.type)) {
      const name = this.advance().value;
      if (this.peek().type === TokenType.LPAREN) {
        this.advance(); // consume '('
        const argument = this.parseAtom();
        this.expect(TokenType.RPAREN);
        return { kind: 'functionCall', name: this.normalizeFunctionName(name), argument };
      }
      // Not a function call - could be property access or variable ref
      if (this.peek().type === TokenType.DOT) {
        this.advance(); // consume '.'
        const property = this.expect(TokenType.IDENTIFIER).value;
        return { kind: 'propertyAccess', variable: name, property };
      }
      return { kind: 'variable', name };
    }

    // Identifier: could be propertyAccess (n.name), functionCall (type(r)), or variableRef (n)
    if (token.type === TokenType.IDENTIFIER) {
      const ident = this.advance().value;
      if (this.peek().type === TokenType.DOT) {
        this.advance(); // consume '.'
        const property = this.expect(TokenType.IDENTIFIER).value;
        return { kind: 'propertyAccess', variable: ident, property };
      }
      // Check if it's a function call: ident(...)
      if (this.peek().type === TokenType.LPAREN) {
        this.advance(); // consume '('
        const argument = this.parseAtom();
        this.expect(TokenType.RPAREN);
        return { kind: 'functionCall', name: this.normalizeFunctionName(ident), argument };
      }
      return { kind: 'variable', name: ident };
    }

    throw new CypherSyntaxError(
      `Unexpected token in expression: ${token.type} ('${token.value}')`
    );
  }

  private isFunctionKeyword(type: TokenType): boolean {
    return type === TokenType.COUNT || type === TokenType.COLLECT;
  }

  private static KNOWN_FUNCTIONS = new Set(['COUNT', 'COLLECT', 'TYPE']);

  private normalizeFunctionName(name: string): string {
    const upper = name.toUpperCase();
    if (Parser.KNOWN_FUNCTIONS.has(upper)) {
      return upper;
    }
    return name;
  }

  // --- RETURN clause ---

  private parseReturn(): ReturnClause {
    let distinct = false;
    if (this.peek().type === TokenType.DISTINCT) {
      this.advance();
      distinct = true;
    }

    const items: ReturnItem[] = [];
    items.push(this.parseReturnItem());

    while (this.match(TokenType.COMMA)) {
      items.push(this.parseReturnItem());
    }

    return { distinct, items };
  }

  private parseReturnItem(): ReturnItem {
    let expression: WhereExpr;

    // Handle RETURN *
    if (this.peek().type === TokenType.STAR) {
      this.advance();
      expression = { kind: 'variable', name: '*' };
    } else {
      expression = this.parseReturnExpression();
    }

    // Optional alias: AS name
    let alias: string | undefined;
    if (this.peek().type === TokenType.AS) {
      this.advance();
      alias = this.expect(TokenType.IDENTIFIER).value;
    }

    return { expression, alias };
  }

  private parseReturnExpression(): WhereExpr {
    const token = this.peek();

    // Function call keyword: COUNT(x), COLLECT(x)
    if (this.isFunctionKeyword(token.type)) {
      const name = this.advance().value;
      if (this.peek().type === TokenType.LPAREN) {
        this.advance(); // consume '('
        const argument = this.parseAtom();
        this.expect(TokenType.RPAREN);
        return { kind: 'functionCall', name: this.normalizeFunctionName(name), argument };
      }
      // Fallthrough: treat as variable or property access
      if (this.peek().type === TokenType.DOT) {
        this.advance();
        const property = this.expect(TokenType.IDENTIFIER).value;
        return { kind: 'propertyAccess', variable: name, property };
      }
      return { kind: 'variable', name };
    }

    // Identifier: could be propertyAccess, functionCall (type(r)), or variableRef
    if (token.type === TokenType.IDENTIFIER) {
      const ident = this.advance().value;
      if (this.peek().type === TokenType.DOT) {
        this.advance();
        const property = this.expect(TokenType.IDENTIFIER).value;
        return { kind: 'propertyAccess', variable: ident, property };
      }
      if (this.peek().type === TokenType.LPAREN) {
        this.advance(); // consume '('
        const argument = this.parseAtom();
        this.expect(TokenType.RPAREN);
        return { kind: 'functionCall', name: this.normalizeFunctionName(ident), argument };
      }
      return { kind: 'variable', name: ident };
    }

    throw new CypherSyntaxError(
      `Unexpected token in RETURN clause: ${token.type} ('${token.value}')`
    );
  }

  // --- ORDER BY ---

  private parseOrderBy(): OrderByClause {
    this.expect(TokenType.ORDER);
    this.expect(TokenType.BY);

    const items: OrderByItem[] = [];
    items.push(this.parseOrderByItem());

    while (this.match(TokenType.COMMA)) {
      items.push(this.parseOrderByItem());
    }

    return { items };
  }

  private parseOrderByItem(): OrderByItem {
    const expression = this.parseReturnExpression();
    let descending = false;

    if (this.peek().type === TokenType.DESC) {
      this.advance();
      descending = true;
    } else if (this.peek().type === TokenType.ASC) {
      this.advance();
      descending = false;
    }

    return { expression, descending };
  }

  // --- LIMIT ---

  private parseLimit(): number {
    this.expect(TokenType.LIMIT);
    const token = this.expect(TokenType.NUMBER);
    return parseInt(token.value, 10);
  }
}

// --- Public parse function ---

export function parse(input: string): CypherQuery {
  const tokens = tokenize(input);
  const parser = new Parser(tokens);
  return parser.parseQuery();
}
