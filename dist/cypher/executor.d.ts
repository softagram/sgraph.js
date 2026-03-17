import { CypherGraph } from './graph';
import { CypherQuery } from './parser';
export interface CypherResult {
    columns: string[];
    rows: Record<string, any>[];
}
export declare class CypherExecutor {
    private graph;
    constructor(graph: CypherGraph);
    execute(query: CypherQuery): CypherResult;
    private matchPattern;
    private nodeMatchesPattern;
    private expandBindings;
    private getDirectedEdges;
    private getTargetNode;
    private evaluateWhere;
    private evaluateExpr;
    private resolveBindingEntry;
    private compareValues;
    private compareScalar;
    private projectReturn;
    private isAggregation;
    private projectWithAggregation;
    private getColumnName;
    private exprColumnName;
    private resolveReturnValue;
}
