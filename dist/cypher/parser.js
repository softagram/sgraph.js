"use strict";
// Cypher subset parser for sgraph.js
// Tokenizer, AST types, and recursive descent parser
Object.defineProperty(exports, "__esModule", { value: true });
exports.parse = exports.tokenize = exports.TokenType = exports.CypherExecutionError = exports.CypherSyntaxError = void 0;
// --- Error classes ---
class CypherSyntaxError extends Error {
    constructor(message) {
        super(message);
        this.name = 'CypherSyntaxError';
    }
}
exports.CypherSyntaxError = CypherSyntaxError;
class CypherExecutionError extends Error {
    constructor(message) {
        super(message);
        this.name = 'CypherExecutionError';
    }
}
exports.CypherExecutionError = CypherExecutionError;
// --- Token types ---
var TokenType;
(function (TokenType) {
    // Keywords
    TokenType["MATCH"] = "MATCH";
    TokenType["WHERE"] = "WHERE";
    TokenType["RETURN"] = "RETURN";
    TokenType["AS"] = "AS";
    TokenType["LIMIT"] = "LIMIT";
    TokenType["ORDER"] = "ORDER";
    TokenType["BY"] = "BY";
    TokenType["ASC"] = "ASC";
    TokenType["DESC"] = "DESC";
    TokenType["DISTINCT"] = "DISTINCT";
    TokenType["AND"] = "AND";
    TokenType["OR"] = "OR";
    TokenType["NOT"] = "NOT";
    TokenType["CONTAINS"] = "CONTAINS";
    TokenType["STARTS"] = "STARTS";
    TokenType["ENDS"] = "ENDS";
    TokenType["WITH"] = "WITH";
    TokenType["COUNT"] = "COUNT";
    TokenType["COLLECT"] = "COLLECT";
    TokenType["TYPE"] = "TYPE";
    TokenType["TRUE"] = "TRUE";
    TokenType["FALSE"] = "FALSE";
    TokenType["STAR"] = "STAR";
    // Symbols
    TokenType["LPAREN"] = "LPAREN";
    TokenType["RPAREN"] = "RPAREN";
    TokenType["LBRACKET"] = "LBRACKET";
    TokenType["RBRACKET"] = "RBRACKET";
    TokenType["LBRACE"] = "LBRACE";
    TokenType["RBRACE"] = "RBRACE";
    TokenType["DASH"] = "DASH";
    TokenType["GT"] = "GT";
    TokenType["LT"] = "LT";
    TokenType["COLON"] = "COLON";
    TokenType["DOT"] = "DOT";
    TokenType["COMMA"] = "COMMA";
    TokenType["EQ"] = "EQ";
    TokenType["NEQ"] = "NEQ";
    TokenType["LTE"] = "LTE";
    TokenType["GTE"] = "GTE";
    // Values
    TokenType["IDENTIFIER"] = "IDENTIFIER";
    TokenType["STRING"] = "STRING";
    TokenType["NUMBER"] = "NUMBER";
    TokenType["EOF"] = "EOF";
})(TokenType = exports.TokenType || (exports.TokenType = {}));
// --- Keyword lookup ---
const KEYWORDS = {
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
function tokenize(input) {
    const tokens = [];
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
        if (ch === '(') {
            tokens.push({ type: TokenType.LPAREN, value: '(' });
            i++;
            continue;
        }
        if (ch === ')') {
            tokens.push({ type: TokenType.RPAREN, value: ')' });
            i++;
            continue;
        }
        if (ch === '[') {
            tokens.push({ type: TokenType.LBRACKET, value: '[' });
            i++;
            continue;
        }
        if (ch === ']') {
            tokens.push({ type: TokenType.RBRACKET, value: ']' });
            i++;
            continue;
        }
        if (ch === '{') {
            tokens.push({ type: TokenType.LBRACE, value: '{' });
            i++;
            continue;
        }
        if (ch === '}') {
            tokens.push({ type: TokenType.RBRACE, value: '}' });
            i++;
            continue;
        }
        if (ch === '-') {
            tokens.push({ type: TokenType.DASH, value: '-' });
            i++;
            continue;
        }
        if (ch === '>') {
            tokens.push({ type: TokenType.GT, value: '>' });
            i++;
            continue;
        }
        if (ch === '<') {
            tokens.push({ type: TokenType.LT, value: '<' });
            i++;
            continue;
        }
        if (ch === ':') {
            tokens.push({ type: TokenType.COLON, value: ':' });
            i++;
            continue;
        }
        if (ch === '.') {
            tokens.push({ type: TokenType.DOT, value: '.' });
            i++;
            continue;
        }
        if (ch === ',') {
            tokens.push({ type: TokenType.COMMA, value: ',' });
            i++;
            continue;
        }
        if (ch === '=') {
            tokens.push({ type: TokenType.EQ, value: '=' });
            i++;
            continue;
        }
        if (ch === '*') {
            tokens.push({ type: TokenType.STAR, value: '*' });
            i++;
            continue;
        }
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
            }
            else {
                tokens.push({ type: TokenType.IDENTIFIER, value: ident });
            }
            continue;
        }
        throw new CypherSyntaxError(`Unexpected character: '${ch}'`);
    }
    tokens.push({ type: TokenType.EOF, value: '' });
    return tokens;
}
exports.tokenize = tokenize;
// --- Parser ---
class Parser {
    constructor(tokens) {
        this.tokens = tokens;
        this.pos = 0;
    }
    peek() {
        return this.tokens[this.pos];
    }
    advance() {
        const token = this.tokens[this.pos];
        this.pos++;
        return token;
    }
    expect(type) {
        const token = this.peek();
        if (token.type !== type) {
            throw new CypherSyntaxError(`Expected ${type} but got ${token.type} ('${token.value}')`);
        }
        return this.advance();
    }
    match(type) {
        if (this.peek().type === type) {
            this.advance();
            return true;
        }
        return false;
    }
    expectIdentifierOrKeyword() {
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
        throw new CypherSyntaxError(`Expected identifier or keyword but got ${token.type} ('${token.value}')`);
    }
    parseQuery() {
        // MATCH clause
        this.expect(TokenType.MATCH);
        const matchClause = this.parseMatch();
        // Optional WHERE clause
        let whereClause;
        if (this.peek().type === TokenType.WHERE) {
            this.advance();
            whereClause = this.parseOrExpr();
        }
        // RETURN clause
        this.expect(TokenType.RETURN);
        const returnClause = this.parseReturn();
        // Optional ORDER BY
        let orderByClause;
        if (this.peek().type === TokenType.ORDER) {
            orderByClause = this.parseOrderBy();
        }
        // Optional LIMIT
        let limit;
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
    parseMatch() {
        const pattern = [];
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
    parseNodePattern() {
        this.expect(TokenType.LPAREN);
        let variable;
        const labels = [];
        let properties;
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
    parseInlineProperties() {
        this.expect(TokenType.LBRACE);
        const props = {};
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
    parseLiteralValue() {
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
        throw new CypherSyntaxError(`Expected literal value but got ${token.type} ('${token.value}')`);
    }
    parseRelationshipPattern() {
        // Possible patterns:
        // -[...]->   outgoing
        // <-[...]-   incoming
        // -[...]-    both (undirected)
        let direction;
        let leftArrow = false;
        // Check for incoming arrow start: <-
        if (this.peek().type === TokenType.LT) {
            this.advance(); // consume '<'
            this.expect(TokenType.DASH); // consume '-'
            leftArrow = true;
        }
        else {
            this.expect(TokenType.DASH); // consume '-'
        }
        // Parse bracket contents [variable:TYPE]
        this.expect(TokenType.LBRACKET);
        let variable;
        const types = [];
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
        }
        else if (!leftArrow && rightArrow) {
            direction = 'out';
        }
        else {
            direction = 'both';
        }
        return { kind: 'relationship', variable, types, direction };
    }
    // --- WHERE expression parsing (precedence climbing) ---
    parseOrExpr() {
        let left = this.parseAndExpr();
        while (this.peek().type === TokenType.OR) {
            this.advance();
            const right = this.parseAndExpr();
            left = { kind: 'logical', op: 'OR', left, right };
        }
        return left;
    }
    parseAndExpr() {
        let left = this.parseNotExpr();
        while (this.peek().type === TokenType.AND) {
            this.advance();
            const right = this.parseNotExpr();
            left = { kind: 'logical', op: 'AND', left, right };
        }
        return left;
    }
    parseNotExpr() {
        if (this.peek().type === TokenType.NOT) {
            this.advance();
            const expr = this.parseComparison();
            return { kind: 'not', expr };
        }
        return this.parseComparison();
    }
    parseComparison() {
        const left = this.parseAtom();
        // Check for comparison operators
        const token = this.peek();
        let operator;
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
    parseAtom() {
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
        throw new CypherSyntaxError(`Unexpected token in expression: ${token.type} ('${token.value}')`);
    }
    isFunctionKeyword(type) {
        return type === TokenType.COUNT || type === TokenType.COLLECT;
    }
    normalizeFunctionName(name) {
        const upper = name.toUpperCase();
        if (Parser.KNOWN_FUNCTIONS.has(upper)) {
            return upper;
        }
        return name;
    }
    // --- RETURN clause ---
    parseReturn() {
        let distinct = false;
        if (this.peek().type === TokenType.DISTINCT) {
            this.advance();
            distinct = true;
        }
        const items = [];
        items.push(this.parseReturnItem());
        while (this.match(TokenType.COMMA)) {
            items.push(this.parseReturnItem());
        }
        return { distinct, items };
    }
    parseReturnItem() {
        let expression;
        // Handle RETURN *
        if (this.peek().type === TokenType.STAR) {
            this.advance();
            expression = { kind: 'variable', name: '*' };
        }
        else {
            expression = this.parseReturnExpression();
        }
        // Optional alias: AS name
        let alias;
        if (this.peek().type === TokenType.AS) {
            this.advance();
            alias = this.expect(TokenType.IDENTIFIER).value;
        }
        return { expression, alias };
    }
    parseReturnExpression() {
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
        throw new CypherSyntaxError(`Unexpected token in RETURN clause: ${token.type} ('${token.value}')`);
    }
    // --- ORDER BY ---
    parseOrderBy() {
        this.expect(TokenType.ORDER);
        this.expect(TokenType.BY);
        const items = [];
        items.push(this.parseOrderByItem());
        while (this.match(TokenType.COMMA)) {
            items.push(this.parseOrderByItem());
        }
        return { items };
    }
    parseOrderByItem() {
        const expression = this.parseReturnExpression();
        let descending = false;
        if (this.peek().type === TokenType.DESC) {
            this.advance();
            descending = true;
        }
        else if (this.peek().type === TokenType.ASC) {
            this.advance();
            descending = false;
        }
        return { expression, descending };
    }
    // --- LIMIT ---
    parseLimit() {
        this.expect(TokenType.LIMIT);
        const token = this.expect(TokenType.NUMBER);
        return parseInt(token.value, 10);
    }
}
Parser.KNOWN_FUNCTIONS = new Set(['COUNT', 'COLLECT', 'TYPE']);
// --- Public parse function ---
function parse(input) {
    const tokens = tokenize(input);
    const parser = new Parser(tokens);
    return parser.parseQuery();
}
exports.parse = parse;
