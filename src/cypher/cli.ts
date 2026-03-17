import { SGraph } from '../sgraph';
import { CypherGraph } from './graph';
import { CypherExecutor } from './executor';
import { parse, CypherSyntaxError } from './parser';
import type { CypherResult } from './executor';

function printUsage() {
  console.error(
    'Usage: node cli.js <model-file> [query] [--format table|json|csv] [--no-hierarchy]'
  );
  console.error('');
  console.error('  model-file    Path to .xml or .xml.zip sgraph model');
  console.error('  query         Cypher query to execute (omit for REPL mode)');
  console.error('  --format      Output format: table (default), json, csv');
  console.error('  --no-hierarchy  Exclude CONTAINS hierarchy edges');
}

function parseArgs(argv: string[]): {
  modelPath: string | undefined;
  query: string | undefined;
  format: string;
  includeHierarchy: boolean;
} {
  let format = 'table';
  let includeHierarchy = true;
  const positional: string[] = [];

  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];
    if (arg === '--format' && i + 1 < argv.length) {
      format = argv[i + 1];
      i += 2;
    } else if (arg === '--no-hierarchy') {
      includeHierarchy = false;
      i++;
    } else if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    } else {
      positional.push(arg);
      i++;
    }
  }

  return {
    modelPath: positional[0],
    query: positional[1],
    format,
    includeHierarchy,
  };
}

function printResult(result: CypherResult, format: string): void {
  if (result.rows.length === 0) {
    if (format === 'table') console.log('(no results)');
    else if (format === 'json') console.log('[]');
    return;
  }

  if (format === 'json') {
    console.log(JSON.stringify(result.rows, null, 2));
  } else if (format === 'csv') {
    console.log(result.columns.join(','));
    for (const row of result.rows) {
      console.log(
        result.columns
          .map((c) => {
            const v = row[c];
            const s =
              typeof v === 'object' && v !== null
                ? JSON.stringify(v)
                : String(v ?? '');
            return s.includes(',') ? `"${s}"` : s;
          })
          .join(',')
      );
    }
  } else {
    // table format -- calculate column widths and pad
    const cols = result.columns;
    const widths = cols.map((c) => c.length);
    const stringRows = result.rows.map((row) =>
      cols.map((c, i) => {
        const v = row[c];
        const s =
          typeof v === 'object' && v !== null
            ? JSON.stringify(v)
            : String(v ?? '');
        widths[i] = Math.max(widths[i], s.length);
        return s;
      })
    );
    // Header
    console.log(cols.map((c, i) => c.padEnd(widths[i])).join('  '));
    console.log(cols.map((_, i) => '-'.repeat(widths[i])).join('  '));
    // Rows
    for (const row of stringRows) {
      console.log(row.map((v, i) => v.padEnd(widths[i])).join('  '));
    }
  }
}

function runRepl(executor: CypherExecutor, format: string): void {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stderr,
  });

  console.error(
    'Enter Cypher queries. End with ; or blank line. Type "quit" to exit.'
  );

  let lines: string[] = [];

  const prompt = () =>
    rl.question(
      lines.length === 0 ? 'cypher> ' : '     > ',
      handleLine
    );

  function handleLine(line: string) {
    const trimmed = line.trim();
    if (trimmed === 'quit' || trimmed === 'exit') {
      rl.close();
      return;
    }

    lines.push(line);
    if (trimmed.endsWith(';') || trimmed === '') {
      let queryStr = lines.join(' ').trim();
      if (queryStr.endsWith(';')) queryStr = queryStr.slice(0, -1).trim();
      lines = [];

      if (queryStr) {
        try {
          const t0 = Date.now();
          const ast = parse(queryStr);
          const result = executor.execute(ast);
          printResult(result, format);
          console.error(
            `(${result.rows.length} rows, ${Date.now() - t0}ms)`
          );
        } catch (e: any) {
          console.error('Error:', e.message);
        }
      }
    }
    prompt();
  }

  prompt();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.modelPath) {
    printUsage();
    process.exit(1);
  }

  const t0 = Date.now();
  const sgraph = await SGraph.parseXmlFileOrZippedXml({
    filePath: args.modelPath,
  });

  if (!sgraph) {
    console.error(`Error: Could not load model from '${args.modelPath}'`);
    process.exit(1);
  }

  const graph = new CypherGraph(sgraph.rootNode, args.includeHierarchy);
  const loadTime = Date.now() - t0;

  console.error(
    `Loaded ${graph.nodeCount} nodes, ${graph.edgeCount} edges (${loadTime}ms)`
  );

  const executor = new CypherExecutor(graph);

  if (args.query) {
    // Single query mode
    try {
      const ast = parse(args.query);
      const result = executor.execute(ast);
      printResult(result, args.format);
    } catch (e) {
      if (e instanceof CypherSyntaxError) {
        console.error('Syntax error:', e.message);
        process.exit(1);
      }
      throw e;
    }
  } else {
    // REPL mode
    runRepl(executor, args.format);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err.message || err);
  process.exit(1);
});
