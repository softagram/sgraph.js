const categories = [
  {
    name: '<not known>',
  },
  {
    name: 'dir',
  },
  {
    name: 'file',
  },
];

const nodes = [
  { id: 0, name: '', category: 0 },
  { id: 1, name: 'mock-project', category: 1 },
  { id: 2, name: 'package.json', category: 2 },
  { id: 3, name: 'src', category: 1 },
  { id: 4, name: 'database', category: 1 },
  { id: 5, name: 'index.js', category: 2 },
  { id: 6, name: 'models.js', category: 2 },
  { id: 7, name: 'index.js', category: 2 },
  { id: 8, name: 'utils', category: 1 },
  { id: 9, name: 'math.js', category: 2 },
];

const links = [
  { source: 0, target: 1 },
  { source: 1, target: 2 },
  { source: 1, target: 3 },
  { source: 3, target: 4 },
  { source: 4, target: 5 },
  { source: 4, target: 6 },
  { source: 3, target: 7 },
  { source: 3, target: 8 },
  { source: 8, target: 9 },
  { source: 5, target: 9, lineStyle: { type: 'dashed' } },
  { source: 5, target: 6, lineStyle: { type: 'dashed' } },
  { source: 5, target: 9, lineStyle: { type: 'dashed' } },
  { source: 5, target: 6, lineStyle: { type: 'dashed' } },
  { source: 7, target: 5, lineStyle: { type: 'dashed' } },
  { source: 7, target: 9, lineStyle: { type: 'dashed' } },
  { source: 7, target: 4, lineStyle: { type: 'dashed' } },
  { source: 7, target: 9, lineStyle: { type: 'dashed' } },
];

export { categories, nodes, links };
