"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CypherGraph = void 0;
const selement_1 = require("../selement/selement");
class CypherGraph {
    constructor(root, includeHierarchy = true) {
        this.nodeData = new Map();
        this.edgeData = new Map();
        this.nodeOutEdges = new Map();
        this.nodeInEdges = new Map();
        this.pathToNode = new Map();
        this.nodeToElem = new Map();
        this.elemToNode = new Map();
        this.edgeToAssoc = new Map();
        this.buildIndex(root, includeHierarchy);
    }
    static normalizePath(p) {
        return p.startsWith('/') ? p.slice(1) : p;
    }
    buildIndex(root, includeHierarchy) {
        let nextNodeId = 0;
        let nextEdgeId = 0;
        // Pass 1 -- Nodes
        root.traverseElements((element) => {
            const id = nextNodeId++;
            const type = element.getType();
            const labels = new Set();
            if (type !== selement_1.NOT_KNOWN_TYPE) {
                labels.add(type);
            }
            const attrs = element.getAttributes();
            const properties = {};
            for (const [key, value] of Object.entries(attrs)) {
                if (key === 'type')
                    continue;
                if (Array.isArray(value) && value.length === 1) {
                    properties[key] = value[0];
                }
                else {
                    properties[key] = value;
                }
            }
            const path = CypherGraph.normalizePath(element.getPath());
            properties.name = element.name;
            properties.path = path;
            const node = { id, labels, properties };
            this.nodeData.set(id, node);
            this.nodeToElem.set(id, element);
            this.elemToNode.set(element, id);
            this.nodeOutEdges.set(id, []);
            this.nodeInEdges.set(id, []);
            this.pathToNode.set(path, id);
        });
        // Pass 2 -- Edges (associations)
        const seenAssocs = new Set();
        root.traverseElements((element) => {
            for (const assoc of element.outgoing) {
                if (seenAssocs.has(assoc))
                    continue;
                seenAssocs.add(assoc);
                const srcId = this.elemToNode.get(assoc.fromElement);
                const dstId = this.elemToNode.get(assoc.toElement);
                if (srcId === undefined || dstId === undefined)
                    continue;
                const edgeId = nextEdgeId++;
                const edge = {
                    id: edgeId,
                    type: assoc.deptype || 'unknown',
                    properties: Object.assign({}, (assoc.attrs || {})),
                    src: srcId,
                    dst: dstId,
                };
                this.edgeData.set(edgeId, edge);
                this.edgeToAssoc.set(edgeId, assoc);
                this.nodeOutEdges.get(srcId).push(edgeId);
                this.nodeInEdges.get(dstId).push(edgeId);
            }
        });
        // Pass 3 -- Hierarchy edges (CONTAINS)
        if (includeHierarchy) {
            root.traverseElements((element) => {
                const parentId = this.elemToNode.get(element);
                if (parentId === undefined)
                    return;
                for (const child of element.children) {
                    const childId = this.elemToNode.get(child);
                    if (childId === undefined)
                        continue;
                    const edgeId = nextEdgeId++;
                    const edge = {
                        id: edgeId,
                        type: 'CONTAINS',
                        properties: {},
                        src: parentId,
                        dst: childId,
                    };
                    this.edgeData.set(edgeId, edge);
                    this.edgeToAssoc.set(edgeId, null);
                    this.nodeOutEdges.get(parentId).push(edgeId);
                    this.nodeInEdges.get(childId).push(edgeId);
                }
            });
        }
    }
    get nodeCount() {
        return this.nodeData.size;
    }
    get edgeCount() {
        return this.edgeData.size;
    }
    getAllNodes() {
        return Array.from(this.nodeData.values());
    }
    getAllEdges() {
        return Array.from(this.edgeData.values());
    }
    getNode(id) {
        return this.nodeData.get(id);
    }
    getEdge(id) {
        return this.edgeData.get(id);
    }
    getOutEdges(nodeId) {
        return this.nodeOutEdges.get(nodeId) || [];
    }
    getInEdges(nodeId) {
        return this.nodeInEdges.get(nodeId) || [];
    }
    getEdgeSrc(edgeId) {
        return this.edgeData.get(edgeId).src;
    }
    getEdgeDst(edgeId) {
        return this.edgeData.get(edgeId).dst;
    }
    getNodeByPath(path) {
        const id = this.pathToNode.get(CypherGraph.normalizePath(path));
        return id !== undefined ? this.nodeData.get(id) : undefined;
    }
    getElemForNode(nodeId) {
        return this.nodeToElem.get(nodeId);
    }
    getAssocForEdge(edgeId) {
        return this.edgeToAssoc.get(edgeId);
    }
}
exports.CypherGraph = CypherGraph;
