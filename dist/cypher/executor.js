"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CypherExecutor = void 0;
class CypherExecutor {
    constructor(graph) {
        this.graph = graph;
    }
    execute(query) {
        // 1. Pattern matching
        let bindings = this.matchPattern(query.matchClause.pattern);
        // 2. WHERE filtering
        if (query.whereClause) {
            bindings = bindings.filter((binding) => this.evaluateWhere(query.whereClause, binding));
        }
        // 3. RETURN projection (with aggregation detection)
        let { columns, rows } = this.projectReturn(query.returnClause.items, bindings);
        // 5. DISTINCT
        if (query.returnClause.distinct) {
            const seen = new Set();
            rows = rows.filter((row) => {
                const key = JSON.stringify(row);
                if (seen.has(key))
                    return false;
                seen.add(key);
                return true;
            });
        }
        // 6. ORDER BY
        if (query.orderByClause) {
            const orderItems = query.orderByClause.items;
            rows.sort((a, b) => {
                for (const item of orderItems) {
                    const colName = this.exprColumnName(item.expression);
                    const valA = a[colName];
                    const valB = b[colName];
                    let cmp = 0;
                    if (valA < valB)
                        cmp = -1;
                    else if (valA > valB)
                        cmp = 1;
                    if (cmp !== 0)
                        return item.descending ? -cmp : cmp;
                }
                return 0;
            });
        }
        // 7. LIMIT
        if (query.limit !== undefined) {
            rows = rows.slice(0, query.limit);
        }
        return { columns, rows };
    }
    // --- 1. Pattern Matching ---
    matchPattern(pattern) {
        if (pattern.length === 0)
            return [];
        const firstNode = pattern[0];
        let bindings = [];
        // Scan all nodes for the first node pattern
        for (const node of this.graph.getAllNodes()) {
            if (this.nodeMatchesPattern(node, firstNode)) {
                const binding = new Map();
                if (firstNode.variable) {
                    binding.set(firstNode.variable, { kind: 'node', id: node.id });
                }
                bindings.push(binding);
            }
        }
        // Process subsequent relationship-node pairs
        for (let i = 1; i < pattern.length; i += 2) {
            const relPattern = pattern[i];
            const nextNodePattern = pattern[i + 1];
            bindings = this.expandBindings(bindings, relPattern, nextNodePattern, pattern[i - 1]);
        }
        return bindings;
    }
    nodeMatchesPattern(node, pattern) {
        // Check labels: every label in pattern must be in node's labels
        for (const label of pattern.labels) {
            if (!node.labels.has(label))
                return false;
        }
        // Check inline properties
        if (pattern.properties) {
            for (const [key, value] of Object.entries(pattern.properties)) {
                if (node.properties[key] !== value)
                    return false;
            }
        }
        return true;
    }
    expandBindings(bindings, relPattern, nextNodePattern, prevNodePattern) {
        const expanded = [];
        for (const binding of bindings) {
            // Get the previously bound node
            const prevVarName = prevNodePattern.variable;
            if (!prevVarName)
                continue;
            const prevEntry = binding.get(prevVarName);
            if (!prevEntry || prevEntry.kind !== 'node')
                continue;
            const prevNodeId = prevEntry.id;
            // Get edges based on direction
            const edgeIds = this.getDirectedEdges(prevNodeId, relPattern.direction);
            for (const edgeId of edgeIds) {
                const edge = this.graph.getEdge(edgeId);
                // Check type filter
                if (relPattern.types.length > 0) {
                    if (!relPattern.types.includes(edge.type))
                        continue;
                }
                // Get the other end of the edge
                const targetNodeId = this.getTargetNode(edgeId, prevNodeId, relPattern.direction);
                const targetNode = this.graph.getNode(targetNodeId);
                // Check target node pattern
                if (!this.nodeMatchesPattern(targetNode, nextNodePattern))
                    continue;
                // Create expanded binding
                const newBinding = new Map(binding);
                if (relPattern.variable) {
                    newBinding.set(relPattern.variable, { kind: 'edge', id: edgeId });
                }
                if (nextNodePattern.variable) {
                    newBinding.set(nextNodePattern.variable, {
                        kind: 'node',
                        id: targetNodeId,
                    });
                }
                expanded.push(newBinding);
            }
        }
        return expanded;
    }
    getDirectedEdges(nodeId, direction) {
        if (direction === 'out')
            return this.graph.getOutEdges(nodeId);
        if (direction === 'in')
            return this.graph.getInEdges(nodeId);
        // both: combine out + in
        return [
            ...this.graph.getOutEdges(nodeId),
            ...this.graph.getInEdges(nodeId),
        ];
    }
    getTargetNode(edgeId, fromNodeId, direction) {
        if (direction === 'out')
            return this.graph.getEdgeDst(edgeId);
        if (direction === 'in')
            return this.graph.getEdgeSrc(edgeId);
        // both: whichever end is not fromNodeId
        const src = this.graph.getEdgeSrc(edgeId);
        const dst = this.graph.getEdgeDst(edgeId);
        return src === fromNodeId ? dst : src;
    }
    // --- 2. WHERE Evaluation ---
    evaluateWhere(expr, binding) {
        const result = this.evaluateExpr(expr, binding);
        return !!result;
    }
    evaluateExpr(expr, binding) {
        switch (expr.kind) {
            case 'literal':
                return expr.value;
            case 'variable': {
                const varRef = expr;
                const entry = binding.get(varRef.name);
                if (!entry)
                    return undefined;
                return entry.id;
            }
            case 'propertyAccess': {
                const pa = expr;
                const entry = binding.get(pa.variable);
                if (!entry)
                    return undefined;
                if (entry.kind === 'node') {
                    return this.graph.getNode(entry.id).properties[pa.property];
                }
                else {
                    return this.graph.getEdge(entry.id).properties[pa.property];
                }
            }
            case 'functionCall': {
                const fc = expr;
                if (fc.name === 'TYPE') {
                    const argEntry = this.resolveBindingEntry(fc.argument, binding);
                    if (argEntry && argEntry.kind === 'edge') {
                        return this.graph.getEdge(argEntry.id).type;
                    }
                    return undefined;
                }
                if (fc.name === 'COUNT' || fc.name === 'COLLECT') {
                    // Aggregation functions are handled in projectReturn
                    return undefined;
                }
                return undefined;
            }
            case 'comparison': {
                const cmp = expr;
                const left = this.evaluateExpr(cmp.left, binding);
                const right = this.evaluateExpr(cmp.right, binding);
                return this.compareValues(left, right, cmp.operator);
            }
            case 'logical': {
                const logical = expr;
                if (logical.op === 'AND') {
                    return (this.evaluateWhere(logical.left, binding) &&
                        this.evaluateWhere(logical.right, binding));
                }
                else {
                    return (this.evaluateWhere(logical.left, binding) ||
                        this.evaluateWhere(logical.right, binding));
                }
            }
            case 'not': {
                const notExpr = expr;
                return !this.evaluateWhere(notExpr.expr, binding);
            }
            default:
                return undefined;
        }
    }
    resolveBindingEntry(expr, binding) {
        if (expr.kind === 'variable') {
            return binding.get(expr.name);
        }
        return undefined;
    }
    compareValues(left, right, operator) {
        // Handle array-valued properties
        if (Array.isArray(left)) {
            if (operator === '=')
                return left.includes(right);
            if (operator === '<>')
                return !left.includes(right);
            // For other operators on arrays, check if ANY element matches
            return left.some((item) => this.compareScalar(item, right, operator));
        }
        return this.compareScalar(left, right, operator);
    }
    compareScalar(left, right, operator) {
        switch (operator) {
            case '=':
                return left === right;
            case '<>':
                return left !== right;
            case '<':
                return left < right;
            case '>':
                return left > right;
            case '<=':
                return left <= right;
            case '>=':
                return left >= right;
            case 'CONTAINS':
                return String(left).includes(String(right));
            case 'STARTS WITH':
                return String(left).startsWith(String(right));
            case 'ENDS WITH':
                return String(left).endsWith(String(right));
            default:
                return false;
        }
    }
    // --- 3. RETURN Projection ---
    projectReturn(items, bindings) {
        // Check if any item has aggregation
        const hasAggregation = items.some((item) => this.isAggregation(item.expression));
        if (hasAggregation) {
            return this.projectWithAggregation(items, bindings);
        }
        // Non-aggregated projection
        const columns = [];
        const rows = [];
        // Determine columns from first binding (or from items if no bindings)
        for (const item of items) {
            if (item.expression.kind === 'variable' &&
                item.expression.name === '*') {
                // Expand wildcard: use first binding's keys
                if (bindings.length > 0) {
                    for (const varName of bindings[0].keys()) {
                        if (!columns.includes(varName))
                            columns.push(varName);
                    }
                }
            }
            else {
                columns.push(this.getColumnName(item));
            }
        }
        for (const binding of bindings) {
            const row = {};
            for (const item of items) {
                if (item.expression.kind === 'variable' &&
                    item.expression.name === '*') {
                    // Expand wildcard
                    for (const [varName, entry] of binding) {
                        row[varName] = this.resolveReturnValue({ kind: 'variable', name: varName }, binding);
                    }
                }
                else {
                    const colName = this.getColumnName(item);
                    row[colName] = this.resolveReturnValue(item.expression, binding);
                }
            }
            rows.push(row);
        }
        return { columns, rows };
    }
    isAggregation(expr) {
        if (expr.kind === 'functionCall') {
            const fc = expr;
            return fc.name === 'COUNT' || fc.name === 'COLLECT';
        }
        return false;
    }
    projectWithAggregation(items, bindings) {
        const columns = items.map((item) => this.getColumnName(item));
        // Separate group-by keys from aggregations
        const groupByItems = [];
        const aggItems = [];
        items.forEach((item, index) => {
            if (this.isAggregation(item.expression)) {
                aggItems.push({ item, index });
            }
            else {
                groupByItems.push(item);
            }
        });
        // Group bindings
        const groups = new Map();
        if (groupByItems.length === 0) {
            // All items are aggregations -> single group
            groups.set('__all__', bindings);
        }
        else {
            for (const binding of bindings) {
                const keyParts = [];
                for (const gbItem of groupByItems) {
                    keyParts.push(this.resolveReturnValue(gbItem.expression, binding));
                }
                const key = JSON.stringify(keyParts);
                if (!groups.has(key)) {
                    groups.set(key, []);
                }
                groups.get(key).push(binding);
            }
        }
        const rows = [];
        for (const [, groupBindings] of groups) {
            const row = {};
            for (const item of items) {
                const colName = this.getColumnName(item);
                if (this.isAggregation(item.expression)) {
                    const fc = item.expression;
                    if (fc.name === 'COUNT') {
                        row[colName] = groupBindings.length;
                    }
                    else if (fc.name === 'COLLECT') {
                        row[colName] = groupBindings.map((b) => this.resolveReturnValue(fc.argument, b));
                    }
                }
                else {
                    // Non-aggregated: take from first binding in group
                    row[colName] = this.resolveReturnValue(item.expression, groupBindings[0]);
                }
            }
            rows.push(row);
        }
        return { columns, rows };
    }
    getColumnName(item) {
        if (item.alias)
            return item.alias;
        return this.exprColumnName(item.expression);
    }
    exprColumnName(expr) {
        switch (expr.kind) {
            case 'propertyAccess': {
                const pa = expr;
                return `${pa.variable}.${pa.property}`;
            }
            case 'variable': {
                return expr.name;
            }
            case 'functionCall': {
                const fc = expr;
                if (fc.name === 'TYPE' && fc.argument.kind === 'variable') {
                    return `type(${fc.argument.name})`;
                }
                if (fc.name === 'COUNT') {
                    return `COUNT(${this.exprColumnName(fc.argument)})`;
                }
                if (fc.name === 'COLLECT') {
                    return `COLLECT(${this.exprColumnName(fc.argument)})`;
                }
                return `${fc.name}(...)`;
            }
            default:
                return '?';
        }
    }
    resolveReturnValue(expr, binding) {
        switch (expr.kind) {
            case 'propertyAccess': {
                const pa = expr;
                const entry = binding.get(pa.variable);
                if (!entry)
                    return undefined;
                if (entry.kind === 'node') {
                    return this.graph.getNode(entry.id).properties[pa.property];
                }
                else {
                    return this.graph.getEdge(entry.id).properties[pa.property];
                }
            }
            case 'variable': {
                const varRef = expr;
                const entry = binding.get(varRef.name);
                if (!entry)
                    return undefined;
                if (entry.kind === 'node') {
                    const node = this.graph.getNode(entry.id);
                    const labels = Array.from(node.labels);
                    return {
                        name: node.properties.name,
                        path: node.properties.path,
                        type: labels.length > 0 ? labels[0] : undefined,
                        properties: Object.assign({}, node.properties),
                    };
                }
                else {
                    const edge = this.graph.getEdge(entry.id);
                    const srcNode = this.graph.getNode(edge.src);
                    const dstNode = this.graph.getNode(edge.dst);
                    return {
                        from: srcNode.properties.path,
                        to: dstNode.properties.path,
                        type: edge.type,
                        properties: Object.assign({}, edge.properties),
                    };
                }
            }
            case 'functionCall': {
                const fc = expr;
                if (fc.name === 'TYPE') {
                    const argEntry = this.resolveBindingEntry(fc.argument, binding);
                    if (argEntry && argEntry.kind === 'edge') {
                        return this.graph.getEdge(argEntry.id).type;
                    }
                    return undefined;
                }
                // COUNT and COLLECT handled in aggregation path
                return undefined;
            }
            case 'literal':
                return expr.value;
            default:
                return undefined;
        }
    }
}
exports.CypherExecutor = CypherExecutor;
