import { SGraph } from '../sgraph';
import { CypherGraph } from './graph';
import { CypherExecutor, CypherResult } from './executor';
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
