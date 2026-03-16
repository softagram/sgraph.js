# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is this?

TypeScript implementation of [sgraph](https://github.com/softagram/sgraph) — a library for parsing, manipulating, and converting software dependency graph models stored in XML format. Used as an npm package (`sgraph.js`).

## Commands

```bash
npm test                        # Run all tests (Jest + ts-jest)
npx jest test/sgraph/sgraph.test.ts  # Run a single test file
npx jest --testNamePattern "finds dir"  # Run tests matching a name pattern
npm run compile                 # Build TypeScript → dist/ (rimraf + tsc)
```

CI uses `yarn install` and `yarn test` on Node 16.x and 18.x.

## Architecture

The core data model is a tree of `SElement` nodes connected by `SElementAssociation` edges:

- **SElement** (`src/selement/selement.ts`) — Tree node with `name`, `parent`, `children[]`, `childrenObject{}` (name-keyed lookup), `outgoing[]`/`incoming[]` associations, and key-value `attrs`. Uses `object-hash` for identity. Slashes in names are encoded as `__slash__`. Constructor auto-attaches to parent.
- **SElementAssociation** (`src/selement/selementAssociation.ts`) — Directed edge between two SElements with a `deptype` (e.g. `"function_ref"`) and attributes. `initElems()` must be called to wire into both elements' outgoing/incoming arrays. `createUniqueElementAssociation` prevents duplicates.
- **SGraph** (`src/sgraph/sgraph.ts`) — Wraps a root SElement. Provides `parseXml()` (in-memory string) and `parseXmlFileOrZippedXml()` (file/zip on disk). `toXml()` serializes back. `createOrGetElementFromPath()` builds tree paths on demand.
- **SGraphXMLParser** (`src/sgraph/sgraphXmlParser.ts`) — SAX-based streaming parser. XML uses `<e>` for elements (with `n=name`, `t=type`, `i=id`), `<r>` for references (with `R=target-id`, `T=type`), `<a>` for attributes. After parsing, `translateReferences()` resolves numeric ids to SElement objects.
- **ModelApi** (`src/modelapi.ts`) — Higher-level API over SGraph: `getElementsByName`, `getCalledFunctions`/`getCallingFunctions`, `filterModel` (subgraph extraction with three modes: Ignore, Direct, DirectAndIndirect), `getCyclicDependencyCycles`.
- **ModelLoader** (`src/loaders/modelLoader.ts`) — Loads model XML and optionally associated CSV attribute files from a Softagram analysis output directory structure.
- **Converters** (`src/converters/`) — `sgraphToEcharts` (graph visualization data) and `sgraphToDot` (Graphviz DOT format).

### XML model format

```xml
<model version="2.1">
  <elements>
    <e n="name" t="type" i="numeric-id">
      <r R="target-id,target-id" T="dep-type"/>
      <a N="attr-name" V="attr-value"/>
      <e n="child">...</e>
    </e>
  </elements>
</model>
```

Zipped models contain `modelfile.xml` inside the zip archive.

### Browser vs Node

`src/utils/browser.ts` detects the runtime. `SGraph.parseXmlFileOrZippedXml` and `ModelLoader` use `eval('require')` for Node-only modules (`adm-zip`, `fs/promises`) to avoid bundler issues. ModelLoader throws in browser context.

## Key patterns

- SElement constructor with a parent automatically adds itself to that parent's children. Creating duplicate child names throws.
- Associations need `initElems()` after construction to register in both elements' arrays — except when using the static `createUniqueElementAssociation`.
- Test fixtures use `test/modelfile.xml` and `test/modelfile.xml.zip`.
