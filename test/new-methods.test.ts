import { readFile } from 'fs/promises';
import {
  SElement,
  SElementAssociation,
  SGraph,
  ModelApi,
  ModelLoader,
} from '../src';

/**
 * Tests for methods ported from Python sgraph library.
 */

describe('SElement new methods', () => {
  let root: SElement;
  let project: SElement;
  let src: SElement;
  let utils: SElement;
  let mathFile: SElement;
  let helperFile: SElement;

  beforeEach(() => {
    root = new SElement('', undefined);
    project = new SElement('project', root);
    project.setType('repository');
    src = new SElement('src', project);
    src.setType('dir');
    utils = new SElement('utils', src);
    utils.setType('dir');
    mathFile = new SElement('math.js', utils);
    mathFile.setType('file');
    helperFile = new SElement('helper.js', src);
    helperFile.setType('file');
  });

  describe('getLevel', () => {
    it('returns 0 for root element', () => {
      expect(root.getLevel()).toBe(0);
    });

    it('returns correct level for nested elements', () => {
      expect(project.getLevel()).toBe(1);
      expect(src.getLevel()).toBe(2);
      expect(utils.getLevel()).toBe(3);
      expect(mathFile.getLevel()).toBe(4);
    });
  });

  describe('getRoot', () => {
    it('returns self for root element', () => {
      expect(root.getRoot()).toBe(root);
    });

    it('returns root for deeply nested element', () => {
      expect(mathFile.getRoot()).toBe(root);
    });

    it('returns root for direct child', () => {
      expect(project.getRoot()).toBe(root);
    });
  });

  describe('isDescendantOf', () => {
    it('returns true for direct child', () => {
      expect(src.isDescendantOf(project)).toBe(true);
    });

    it('returns true for deeply nested descendant', () => {
      expect(mathFile.isDescendantOf(project)).toBe(true);
      expect(mathFile.isDescendantOf(root)).toBe(true);
    });

    it('returns false for self', () => {
      expect(project.isDescendantOf(project)).toBe(false);
    });

    it('returns false for non-ancestor', () => {
      expect(project.isDescendantOf(mathFile)).toBe(false);
      expect(helperFile.isDescendantOf(utils)).toBe(false);
    });
  });

  describe('getAncestorOfType', () => {
    it('returns self if type matches', () => {
      expect(mathFile.getAncestorOfType('file')).toBe(mathFile);
    });

    it('returns ancestor with matching type', () => {
      expect(mathFile.getAncestorOfType('dir')).toBe(utils);
      expect(mathFile.getAncestorOfType('repository')).toBe(project);
    });

    it('returns undefined if no ancestor matches', () => {
      expect(mathFile.getAncestorOfType('class')).toBeUndefined();
    });
  });

  describe('getAncestorOfTypes', () => {
    it('finds ancestor matching any of the types (array)', () => {
      expect(mathFile.getAncestorOfTypes(['class', 'repository'])).toBe(
        project
      );
    });

    it('finds ancestor matching any of the types (Set)', () => {
      expect(mathFile.getAncestorOfTypes(new Set(['dir', 'class']))).toBe(
        utils
      );
    });

    it('returns self if type matches', () => {
      expect(mathFile.getAncestorOfTypes(['file'])).toBe(mathFile);
    });

    it('returns undefined if no type matches', () => {
      expect(mathFile.getAncestorOfTypes(['class', 'method'])).toBeUndefined();
    });
  });

  describe('getAncestorOfLevel', () => {
    it('returns self for own level', () => {
      expect(mathFile.getAncestorOfLevel(4)).toBe(mathFile);
    });

    it('returns correct ancestor for higher level', () => {
      expect(mathFile.getAncestorOfLevel(3)).toBe(utils);
      expect(mathFile.getAncestorOfLevel(2)).toBe(src);
      expect(mathFile.getAncestorOfLevel(1)).toBe(project);
    });
  });

  describe('getDescendants', () => {
    it('returns empty for leaf element', () => {
      expect(mathFile.getDescendants()).toEqual([]);
    });

    it('returns all descendants', () => {
      const descendants = project.getDescendants();
      expect(descendants).toContain(src);
      expect(descendants).toContain(utils);
      expect(descendants).toContain(mathFile);
      expect(descendants).toContain(helperFile);
      expect(descendants.length).toBe(4);
    });

    it('returns subtree descendants', () => {
      const descendants = src.getDescendants();
      expect(descendants).toContain(utils);
      expect(descendants).toContain(mathFile);
      expect(descendants).toContain(helperFile);
      expect(descendants.length).toBe(3);
    });
  });

  describe('getNodeCount', () => {
    it('returns 1 for leaf element', () => {
      expect(mathFile.getNodeCount()).toBe(1);
    });

    it('counts all nodes in subtree', () => {
      expect(project.getNodeCount()).toBe(5); // project + src + utils + math.js + helper.js
      expect(src.getNodeCount()).toBe(4); // src + utils + math.js + helper.js
    });
  });

  describe('getEACount', () => {
    it('returns 0 when no associations', () => {
      expect(project.getEACount()).toBe(0);
    });

    it('counts associations in subtree', () => {
      const ea = new SElementAssociation(helperFile, mathFile, 'import');
      ea.initElems();
      expect(src.getEACount()).toBe(1);
      expect(project.getEACount()).toBe(1);
      expect(mathFile.getEACount()).toBe(0); // math.js has no outgoing
    });
  });

  describe('getEATypes', () => {
    it('collects association types', () => {
      const ea1 = new SElementAssociation(helperFile, mathFile, 'import');
      ea1.initElems();
      const ea2 = new SElementAssociation(mathFile, helperFile, 'function_ref');
      ea2.initElems();

      const types = new Set<string>();
      project.getEATypes(types);
      expect(types.has('import')).toBe(true);
      expect(types.has('function_ref')).toBe(true);
      expect(types.size).toBe(2);
    });
  });

  describe('getEATypeCounts', () => {
    it('counts association types', () => {
      const ea1 = new SElementAssociation(helperFile, mathFile, 'import');
      ea1.initElems();
      const ea2 = new SElementAssociation(mathFile, helperFile, 'import');
      ea2.initElems();
      const ea3 = new SElementAssociation(
        mathFile,
        helperFile,
        'function_ref'
      );
      ea3.initElems();

      const counts: { [key: string]: number } = {};
      project.getEATypeCounts(counts);
      expect(counts['import']).toBe(2);
      expect(counts['function_ref']).toBe(1);
    });
  });

  describe('getMaxDepth', () => {
    it('returns current depth for leaf', () => {
      expect(mathFile.getMaxDepth(0)).toBe(0);
    });

    it('returns max depth from starting point', () => {
      expect(project.getMaxDepth(0)).toBe(3); // project -> src -> utils -> math.js
    });
  });

  describe('hasType', () => {
    it('returns true when type is set', () => {
      expect(project.hasType()).toBe(true);
    });

    it('returns false when no type', () => {
      expect(root.hasType()).toBe(false);
    });
  });

  describe('remove', () => {
    it('removes element from parent', () => {
      expect(src.children.length).toBe(2);
      helperFile.remove();
      expect(src.children.length).toBe(1);
      expect(src.getChildByName('helper.js')).toBeUndefined();
    });

    it('clears associations on removal', () => {
      const ea = new SElementAssociation(helperFile, mathFile, 'import');
      ea.initElems();
      expect(mathFile.incoming.length).toBe(1);

      helperFile.remove();
      expect(mathFile.incoming.length).toBe(0);
    });

    it('removes descendants recursively', () => {
      utils.remove();
      expect(src.children.length).toBe(1); // only helper.js left
      expect(src.getChildByName('utils')).toBeUndefined();
    });
  });

  describe('rename', () => {
    it('renames element and updates parent childrenObject', () => {
      helperFile.rename('utils.js');
      expect(helperFile.name).toBe('utils.js');
      expect(src.getChildByName('utils.js')).toBe(helperFile);
      expect(src.getChildByName('helper.js')).toBeUndefined();
    });

    it('renames root element without parent', () => {
      root.rename('newroot');
      expect(root.name).toBe('newroot');
    });
  });

  describe('removeDescendantsIf', () => {
    it('removes matching descendants', () => {
      project.removeDescendantsIf((e) => e.getType() === 'file');
      expect(utils.children.length).toBe(0);
      expect(src.getChildByName('helper.js')).toBeUndefined();
    });

    it('keeps non-matching descendants', () => {
      project.removeDescendantsIf((e) => e.name === 'helper.js');
      expect(src.children.length).toBe(1); // utils remains
      expect(utils.children.length).toBe(1); // math.js remains
    });
  });
});

describe('SElementAssociation.addAttribute', () => {
  it('adds attribute to association', () => {
    const a = new SElement('a', undefined);
    const b = new SElement('b', undefined);
    const ea = new SElementAssociation(a, b, 'import');
    ea.addAttribute('source_line', '42');
    expect(ea.getAttributes()!['source_line']).toBe('42');
  });

  it('initializes attrs if undefined', () => {
    const a = new SElement('a', undefined);
    const b = new SElement('b', undefined);
    const ea = new SElementAssociation(a, b, 'import');
    ea.attrs = undefined as any;
    ea.addAttribute('key', 'val');
    expect(ea.getAttributes()!['key']).toBe('val');
  });
});

describe('SGraph new methods', () => {
  let model: SGraph;

  beforeAll(async () => {
    const data = await readFile('test/modelfile.xml', 'utf8');
    model = SGraph.parseXml({ data });
  });

  describe('getDepth', () => {
    it('returns max depth of the graph', () => {
      const depth = model.getDepth();
      expect(depth).toBeGreaterThan(0);
    });
  });

  describe('calculateModelStats', () => {
    it('returns node count, edge count, type counts, and ratio', () => {
      const stats = model.calculateModelStats();
      expect(stats.nodesCount).toBeGreaterThan(0);
      expect(stats.dependenciesCount).toBeGreaterThanOrEqual(0);
      expect(typeof stats.depToElemRatio).toBe('number');
      expect(typeof stats.depTypeCounts).toBe('object');
    });

    it('node count matches rootNode.getNodeCount()', () => {
      const stats = model.calculateModelStats();
      expect(stats.nodesCount).toBe(model.rootNode.getNodeCount());
    });
  });
});

describe('ModelApi new methods', () => {
  let model: SGraph;
  let modelApi: ModelApi;

  beforeAll(async () => {
    const loaded = await new ModelLoader().load('test/modelfile.xml');
    if (loaded) {
      model = loaded;
      modelApi = new ModelApi({ model });
    }
  });

  describe('getElementByPath', () => {
    it('finds element by path', () => {
      const elem = modelApi.getElementByPath('mock-project/src/utils');
      expect(elem).toBeDefined();
      expect(elem!.name).toBe('utils');
    });

    it('returns undefined for non-existent path', () => {
      expect(modelApi.getElementByPath('nonexistent/path')).toBeUndefined();
    });
  });

  describe('filter', () => {
    it('filters elements by predicate', () => {
      const jsFiles = modelApi.filter((e) => e.name.endsWith('.js'));
      expect(jsFiles.length).toBeGreaterThan(0);
      jsFiles.forEach((e) => expect(e.name).toMatch(/\.js$/));
    });

    it('returns empty array when nothing matches', () => {
      const result = modelApi.filter((e) => e.name === 'nonexistent');
      expect(result).toEqual([]);
    });
  });

  describe('getChildrenByType', () => {
    it('returns children matching type', () => {
      const project = model.rootNode.children[0];
      const dirs = modelApi.getChildrenByType(project, 'dir');
      dirs.forEach((d) => expect(d.getType()).toBe('dir'));
    });

    it('returns empty array when no children match', () => {
      const project = model.rootNode.children[0];
      const result = modelApi.getChildrenByType(project, 'class');
      expect(result).toEqual([]);
    });
  });
});

describe('SElementAssociation.remove bug fix', () => {
  it('removes from toElement.incoming (not fromElement.incoming)', () => {
    const root = new SElement('', undefined);
    const a = new SElement('a', root);
    const b = new SElement('b', root);
    const ea = new SElementAssociation(a, b, 'dep');
    ea.initElems();

    expect(a.outgoing.length).toBe(1);
    expect(b.incoming.length).toBe(1);

    ea.remove();

    expect(a.outgoing.length).toBe(0);
    expect(b.incoming.length).toBe(0);
  });
});
