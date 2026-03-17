export declare class CypherSyntaxError extends Error {
    constructor(message: string);
}
export declare class CypherExecutionError extends Error {
    constructor(message: string);
}
export declare enum TokenType {
    MATCH = "MATCH",
    WHERE = "WHERE",
    RETURN = "RETURN",
    AS = "AS",
    LIMIT = "LIMIT",
    ORDER = "ORDER",
    BY = "BY",
    ASC = "ASC",
    DESC = "DESC",
    DISTINCT = "DISTINCT",
    AND = "AND",
    OR = "OR",
    NOT = "NOT",
    CONTAINS = "CONTAINS",
    STARTS = "STARTS",
    ENDS = "ENDS",
    WITH = "WITH",
    COUNT = "COUNT",
    COLLECT = "COLLECT",
    TYPE = "TYPE",
    TRUE = "TRUE",
    FALSE = "FALSE",
    STAR = "STAR",
    LPAREN = "LPAREN",
    RPAREN = "RPAREN",
    LBRACKET = "LBRACKET",
    RBRACKET = "RBRACKET",
    LBRACE = "LBRACE",
    RBRACE = "RBRACE",
    DASH = "DASH",
    GT = "GT",
    LT = "LT",
    COLON = "COLON",
    DOT = "DOT",
    COMMA = "COMMA",
    EQ = "EQ",
    NEQ = "NEQ",
    LTE = "LTE",
    GTE = "GTE",
    IDENTIFIER = "IDENTIFIER",
    STRING = "STRING",
    NUMBER = "NUMBER",
    EOF = "EOF"
}
export interface Token {
    type: TokenType;
    value: string;
}
export declare function tokenize(input: string): Token[];
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
export declare type PatternElement = NodePattern | RelationshipPattern;
export interface MatchClause {
    pattern: PatternElement[];
}
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
export declare type WhereExpr = Comparison | LogicalExpr | NotExpr | PropertyAccess | VariableRef | FunctionCall | Literal;
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
export declare function parse(input: string): CypherQuery;
