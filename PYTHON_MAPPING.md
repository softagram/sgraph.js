# Python sgraph ↔ TypeScript sgraph.js Mapping

This document maps the Python `sgraph` library (`../sgraph/src/sgraph/`) to the TypeScript `sgraph.js` implementation, to keep the two in sync.

## Naming conventions

| Python | TypeScript |
|--------|-----------|
| `snake_case` methods | `camelCase` methods |
| `childrenDict` | `childrenObject` |
| `attrs` (direct) | `attrs` (private, via `getAttributes()`/`setAttributes()`) |
| `human_readable_name` | `humanReadableName` |
| `SElementAssociation` | `SElementAssociation` |

---

## SElement

**Source:** Python `selement.py` → TypeScript `src/selement/selement.ts`

### Constructor & Children

| Python | TypeScript | Notes |
|--------|-----------|-------|
| `__init__(parent, name)` | `constructor(name, parent?)` | Arg order differs |
| `addChild(child)` | `addChild(child)` | |
| `detachChild(child)` | `detachChild(child)` | |
| `addChildIgnoreWithSameName(child, elem)` | — | Not ported |

### Attributes

| Python | TypeScript | Notes |
|--------|-----------|-------|
| `addAttribute(name, value)` | `addAttribute(name, value)` | |
| `setType(t)` | `setType(t)` | |
| `getType()` | `getType()` | |
| `hasType()` | `hasType()` | |
| `typeEquals(t)` | `typeEquals(t)` | |
| `getAttributes()` (via `.attrs`) | `getAttributes()` | |
| `setAttributes(attrs)` (via `.attrs =`) | `setAttributes(attrs)` | |
| `createAttributesFrom(attrs)` | — | Not ported (batch set, use `setAttributes`) |
| `equalsAttributes(e)` | — | Not ported |
| `cumulateAttribute(name, value)` | — | Not ported (numeric accumulation) |
| `cumulateListAttribute(name, value, avoid_dup)` | — | Not ported |
| `cumulateIntAttribute(name, value)` | — | Not ported |

### Hierarchy navigation

| Python | TypeScript | Notes |
|--------|-----------|-------|
| `getPath()` | `getPath()` | |
| `getPathAsList()` | `getPathAsList()` | |
| `getLevel()` | `getLevel()` | |
| `getRoot()` | `getRoot()` | |
| `getAncestors()` | `getAncestors()` | |
| `getAncestorOfType(t)` | `getAncestorOfType(type)` | |
| `getAncestorOfTypes(types)` | `getAncestorOfTypes(types)` | Accepts `string[]` or `Set<string>` |
| `getAncestorOfLevel(level)` | `getAncestorOfLevel(level)` | |
| `isDescendantOf(ancestor)` | `isDescendantOf(ancestor)` | |
| `getChildByName(name)` | `getChildByName(name)` | |
| `findElement(path)` | `findElement(name)` | |
| `createOrGetElement(path)` | `createOrGetElement(n)` | |
| `create_or_get_element(path)` | — | Use `createOrGetElement` (no `isNew` variant on SElement) |
| `get_ancestor_names_list()` | — | Not ported (use `getAncestors().map(a => a.name)`) |
| `getElementsByNameOnLevel(name, level, cur)` | — | Not ported |

### Traversal & descendants

| Python | TypeScript | Notes |
|--------|-----------|-------|
| `traverseElements(visit)` | `traverseElements(visit)` | |
| `getDescendants(list)` | `getDescendants()` | TS returns new array instead of mutating |
| `getNodeCount()` | `getNodeCount()` | |
| `getMaxDepth(cur_depth)` | `getMaxDepth(currentDepth)` | |
| `traverseIncoming(visited)` | — | Not ported |
| `getAllUsers(outside_level)` | — | Not ported |
| `recurseIncomingDependencies(...)` | — | Not ported |
| `hasSiblingsRecursive()` | — | Not ported |
| `getNextSiblingRecursive()` | — | Not ported |

### Association queries

| Python | TypeScript | Notes |
|--------|-----------|-------|
| `getEACount()` | `getEACount()` | |
| `getEATypes(theSet)` | `getEATypes(typeSet)` | |
| `getEATypeCounts(d)` | `getEATypeCounts(counts)` | |
| `getCyclicDependencies()` | `getCyclicDependencies()` | |

### Mutation

| Python | TypeScript | Notes |
|--------|-----------|-------|
| `merge(other, ignore_type, ignore_attrs)` | `merge(other, ignoreType?, ignoreAttrs?)` | |
| `remove(leaveParentUntouched)` | `remove(leaveParentUntouched?)` | |
| `rename(new_name)` | `rename(newName)` | |
| `removeDescendantsIf(checker)` | `removeDescendantsIf(checker)` | |
| `removeElements(path)` | — | Not ported (use `findElement` + `remove`) |
| `removeElementsWithList(splitted)` | — | Not ported |
| `update_children_dict()` | — | Not ported |
| `clean_duplicate_associations()` | — | Not ported |

### Element creation

| Python | TypeScript | Notes |
|--------|-----------|-------|
| `createElementChain(elemid)` | `createElementChain(id)` | |
| `createElements(elems, startFrom)` | `createElements(elements, startFrom)` | |

### Identity & comparison

| Python | TypeScript | Notes |
|--------|-----------|-------|
| `__eq__` (identity) | `equals(other)` | TS uses hash comparison |
| `getHash()` (not in Python) | `getHash()` | TS-specific, uses `object-hash` |
| `updateHash()` (not in Python) | `updateHash()` | TS-specific |
| `sibling_with(elem)` | — | Not ported |
| `elem_location_matches(elem)` | — | Not ported |
| `isExternalElement()` | — | Not ported |
| `enclosingFilenameEndswith(postfix)` | — | Not ported |
| `verify(elems, i)` | — | Not ported |

---

## SElementAssociation

**Source:** Python `selementassociation.py` → TypeScript `src/selement/selementAssociation.ts`

| Python | TypeScript | Notes |
|--------|-----------|-------|
| `__init__(from, to, deptype, depattrs)` | `constructor(from, to, deptype?, depattrs?)` | |
| `create_unique_element_association(...)` | `createUniqueElementAssociation(...)` | Static method |
| `initElems()` | `initElems()` | |
| `remove()` | `remove()` | |
| `getFromPath()` | `getFromPath()` | |
| `getToPath()` | `getToPath()` | |
| `getType()` | `getType()` | |
| `getAttributes()` | `getAttributes()` | |
| `addAttribute(name, value)` | `addAttribute(name, value)` | |
| `setAttrMap(attrmap)` | `setAttrs(a)` | |
| `get_dependency_length()` | `getDependencyLength()` | |
| `calculateCompareStatus()` | `calculateCompareStatus()` | |
| `check_attr(attr, val)` | — | Not ported |
| `getHashNum()` | — | Not ported |
| `initOrExtendListAttribute(a, v)` | — | Not ported |
| `match_ea_from_other_sgraph(ea, ea_list)` | — | Not ported |

---

## SGraph

**Source:** Python `sgraph.py` → TypeScript `src/sgraph/sgraph.ts`

### Parsing & loading

| Python | TypeScript | Notes |
|--------|-----------|-------|
| `parse_xml(filename_or_stream, ...)` | `parseXml({data, ...})` | TS takes string data |
| `parse_xml_or_zipped_xml(path, ...)` | `parseXmlFileOrZippedXml({filePath, ...})` | Async, Node-only |
| `parse_xml_string(xml_string, ...)` | `parseXml({data})` | Same as parseXml in TS |
| `parse_xml_file_or_stream(stream, ...)` | — | Not ported (use parseXml with data) |
| `parse_deps(filename)` | — | Not ported (deps format) |
| `parse_deps_lines(content)` | — | Not ported (deps format) |

### Element access

| Python | TypeScript | Notes |
|--------|-----------|-------|
| `findElementFromPath(path)` | `findElementFromPath(path)` | |
| `createOrGetElementFromPath(path)` | `createOrGetElementFromPath(path)` | |
| `createOrGetElement(elem)` | `createOrGetElement(elem)` | |
| `create_or_get_element(elem)` | `createOrGetElementWithNew(element)` | Returns `{element, isNew}` |
| `getElement(elem)` | — | Not ported |

### Serialization

| Python | TypeScript | Notes |
|--------|-----------|-------|
| `to_xml(fname, stdout)` | `toXml()` | Returns string (no file write) |
| `to_deps(fname)` | — | Not ported (deps format) |
| `to_plantuml(fname)` | — | Not ported |
| `save(filename)` | — | Not ported |
| `produce_deps_tuples()` | — | Not ported |

### Analysis

| Python | TypeScript | Notes |
|--------|-----------|-------|
| `getDepth()` | `getDepth()` | |
| `calculate_model_stats()` | `calculateModelStats()` | Returns `{dependenciesCount, nodesCount, depTypeCounts, depToElemRatio}` |
| `verify(i)` | — | Not ported |
| `traverse(traverser)` | — | Use `rootNode.traverseElements()` |
| `groupea(eas)` | — | Internal use via `sgraph-utils.ts` |

### Converters (via methods)

| Python | TypeScript | Notes |
|--------|-----------|-------|
| — | `toEcharts()` | TS-specific |

### Metadata

| Python | TypeScript | Notes |
|--------|-----------|-------|
| `modelAttrs` | `modelAttrs` | |
| `set_model_path(filepath)` | `setModelPath(filePath)` | |
| `metaAttrs` | — | Not ported |
| `setMetaAttrs(m)` | — | Not ported |
| `setModelAttrs(m)` | — | Not ported |
| `addPropagateAction(a, v)` | — | Not ported |
| `propagateActions` | — | Not ported |
| `totalModel` | — | Not ported |
| `__deepcopy__(memo)` | — | Not ported |
| `copy_ea_attrs_from_other_models(...)` | — | Not ported |
| `recurse_three_models(...)` | — | Not ported |
| `calculate_model_stats_delta(...)` | — | Not ported |

---

## ModelApi

**Source:** Python `modelapi.py` → TypeScript `src/modelapi.ts`

| Python | TypeScript | Notes |
|--------|-----------|-------|
| constructor (model or data) | `constructor({data} \| {model})` | |
| `getElementByPath(filepath)` | `getElementByPath(path)` | |
| `getElementsByName(name)` | `getElementsByName(name)` | |
| `filter(filterfunc)` | `filter(filterFunc)` | |
| `getChildrenByType(element, elemType)` | `getChildrenByType(element, elemType)` | |
| `getCalledFunctions(funcElem)` | `getCalledFunctions(element)` | |
| `getCallingFunctions(funcElem)` | `getCallingFunctions(element)` | |
| `getUsedElements(elem)` | `getUsedElements(element)` | |
| `getUserElements(elem)` | `getUserElements(element)` | |
| `filter_model(src_elem, src_graph, ...)` | `filterModel(sourceElement, sourceGraph, ...)` | |
| `create_descendants(related, new_elem, ...)` | `createDescendants(related, newOrExisting)` | |
| `getCyclicDependencyCycles()` | `getCyclicDependencyCycles()` | |
| `query_dependencies(...)` | — | Not ported |
| `query_dependencies_between(...)` | — | Not ported |
| `add_if_matches(...)` | — | Not ported |
| `matches_with_descendant(...)` | — | Not ported |
| `intra_file(ea)` | — | Not ported |
| `not_a_sibling_ref(ea)` | — | Not ported |

### FilterAssociations enum

| Python | TypeScript |
|--------|-----------|
| `FilterAssocations.Ignore` | `FilterAssociations.Ignore` |
| `FilterAssocations.Direct` | `FilterAssociations.Direct` |
| `FilterAssocations.DirectAndIndirect` | `FilterAssociations.DirectAndIndirect` |

---

## Converters

**Source:** Python `converters/` → TypeScript `src/converters/`

| Python | TypeScript | Notes |
|--------|-----------|-------|
| `xml_to_dot.graph_to_dot(g)` | `sgraphToDot(graph)` | |
| — | `sgraphToEcharts(sg)` | TS-specific |
| `sgraph_to_cytoscape.graph_to_cyto(g)` | — | Not ported |
| `xml_to_json.XmlToNodesAndEdges` | — | Not ported |
| `xml_to_graphml` | — | Not ported |
| `xml_to_plantuml` | — | Not ported |
| `xml_to_deps` | — | Not ported |
| `xml_to_3dforcegraph` | — | Not ported |
| `xml_to_hierarchical_json` | — | Not ported |
| `graphml.sgraph_to_graphml_file(...)` | — | Not ported |
| `sbom_cyclonedx_generator.generate_from_sgraph(...)` | — | Not ported |

---

## Loaders

**Source:** Python `loader/` → TypeScript `src/loaders/`

| Python | TypeScript | Notes |
|--------|-----------|-------|
| `ModelLoader.load_model(...)` | `ModelLoader.load(...)` | |
| `AttributeLoader.load_attrfile(...)` | `AttributeLoader.loadAttrFile(...)` | |
| `AttributeLoader.load_all_files(...)` | `AttributeLoader.loadAllFiles(...)` | |

---

## Modules only in Python (not ported)

| Module | Purpose | Porting notes |
|--------|---------|---------------|
| `algorithms/pagerank.py` | PageRank node importance | Separate algorithm, add when needed |
| `algorithms/generalizer.py` | Model abstraction to higher levels | Separate algorithm |
| `algorithms/sgraphanalysis.py` | Dynamic dep generation, flattening | Separate algorithm |
| `algorithms/sgraphfiltering.py` | Remove deps by type/path | Separate algorithm |
| `algorithms/sgraphmetrics.py` | Association density calculation | Separate algorithm |
| `compare/modelcompare.py` | Model version comparison/delta | Separate module |
| ~~`cypher.py`~~ | ~~Cypher query interface~~ | **Ported** — see Cypher section below |
| `graphdataservice.py` | High-level graph data extraction | Server-side utility |
| `metricsapi.py` | Metrics queries (LOC, tech debt) | Separate concern |
| `definitions.py` | `HaveAttributes` enum | Port when `filterModel` needs it |
| `exceptions.py` | `ModelNotFoundException` | Port when needed |
| `analyzers/` | Analyzer framework | Separate concern |

---

## Cypher Query Support

**Source:** Python `cypher.py` → TypeScript `src/cypher/`

The TypeScript implementation uses a hand-written parser+executor instead of Python's sPyCy dependency.

| Python (`cypher.py`) | TypeScript (`src/cypher/`) | Notes |
|---|---|---|
| `SGraphCypherBackend` | `CypherGraph` in `graph.ts` | Same 3-pass indexing |
| `cypher_query(model, query, include_hierarchy)` | `cypherQuery(model, query, {includeHierarchy})` | |
| `SGraphCypherExecutor` (sPyCy) | `CypherExecutor` in `executor.ts` | Hand-written Cypher subset |
| sPyCy parser | `parse()` in `parser.ts` | Recursive descent |
| Result: `pd.DataFrame` | Result: `CypherResult {columns, rows}` | |
| CLI: `python -m sgraph.cypher` | CLI: `node dist/cypher/cli.js` | |
| `_extract_subgraph()` | — | Not ported |
| Graph output formats (xml, dot, plantuml, graphml, cytoscape) | — | Not ported (use existing converters) |
| Full openCypher via sPyCy | Subset: MATCH, WHERE, RETURN, ORDER BY, LIMIT | No OPTIONAL MATCH, UNION, WITH, variable-length paths |

### Supported Cypher subset (TypeScript)

- MATCH with node patterns (labels, inline properties)
- MATCH with relationship patterns (directed, undirected, typed)
- WHERE: `=`, `<>`, `<`, `>`, `<=`, `>=`, `CONTAINS`, `STARTS WITH`, `ENDS WITH`, `AND`, `OR`, `NOT`
- RETURN with property access, variables, aliases, DISTINCT
- Functions: `COUNT()`, `COLLECT()`, `type()`
- ORDER BY (ASC/DESC), LIMIT

---

## TypeScript-only features

| Feature | Location | Notes |
|---------|----------|-------|
| `SElement.getHash()` / `updateHash()` | `selement.ts` | Hash-based identity using `object-hash` |
| `SElement.humanReadableName` | `selement.ts` | Used in hash |
| `SGraph.toEcharts()` | `sgraph.ts` | ECharts visualization converter |
| `sgraphToEcharts()` | `converters/sgraphToEcharts.ts` | ECharts format output |
| `isBrowser` detection | `utils/browser.ts` | Browser/Node runtime detection |
| `SGraphXMLParser.onlyRoot` | `sgraphXmlParser.ts` | Abort after root element |
| `lowestCommonAncestor()` | `selementUtils.ts` | Exists in Python as `algorithms/selementutils.py` |
