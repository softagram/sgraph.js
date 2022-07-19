import { parse } from 'csv-parse/sync';

const detectCsvDelimiter = (csvData: string) => {
  const [l1, l2] = csvData.split('\n').slice(0, 2);

  if (l1.includes('\t') && l2.includes('\t')) return '\t';
  if (l1.includes(',') && l2.includes(',')) {
    const c = l1 + l2;
    const tabs = c.match(/\t/g)?.length || 0;
    const commas = c.match(/,/g)?.length || 0;
    if (tabs > commas) return '\t';
  }

  return ',';
};

const readAttrsGeneric = (csvData: string) => {
  const delimiter = detectCsvDelimiter(csvData);
  const data = readAttrs(csvData, delimiter);
  let first = true;
  let columns: string[] = [];
  const entries: [string, any][] = [];

  for (let elementId of Object.keys(data)) {
    const attrEntry = data[elementId];
    if (first) {
      columns = Object.keys(attrEntry);
      if (columns.includes('id')) columns.splice(columns.indexOf('id'), 1);
      first = false;
    }
    if ('id' in attrEntry) {
      const { id, ...rest } = attrEntry;
      entries.push([id, rest]);
    } else {
      throw new Error(
        `Error: the attribute file does not have id column. Keys are ${Object.keys(
          attrEntry
        )}`
      );
    }
  }

  return { columns, entries };
};

const readAttrs = (
  csvData: string,
  delimiter: ReturnType<typeof detectCsvDelimiter>
): {
  [key: string]: any;
} => ({
  ...parse(csvData, { delimiter, columns: true, skip_empty_lines: true }),
});

export { readAttrsGeneric };
