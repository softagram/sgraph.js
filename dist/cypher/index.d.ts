import { SGraph } from '../sgraph';
import { CypherResult } from './executor';
export { CypherSyntaxError, CypherExecutionError } from './parser';
export type { CypherResult } from './executor';
export interface CypherQueryOptions {
    includeHierarchy?: boolean;
}
export declare function cypherQuery(model: SGraph, query: string, options?: CypherQueryOptions): CypherResult;
