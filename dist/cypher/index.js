"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cypherQuery = exports.CypherExecutionError = exports.CypherSyntaxError = void 0;
const graph_1 = require("./graph");
const executor_1 = require("./executor");
const parser_1 = require("./parser");
var parser_2 = require("./parser");
Object.defineProperty(exports, "CypherSyntaxError", { enumerable: true, get: function () { return parser_2.CypherSyntaxError; } });
Object.defineProperty(exports, "CypherExecutionError", { enumerable: true, get: function () { return parser_2.CypherExecutionError; } });
function cypherQuery(model, query, options = {}) {
    const { includeHierarchy = true } = options;
    const graph = new graph_1.CypherGraph(model.rootNode, includeHierarchy);
    const executor = new executor_1.CypherExecutor(graph);
    const ast = (0, parser_1.parse)(query);
    return executor.execute(ast);
}
exports.cypherQuery = cypherQuery;
