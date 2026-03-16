import { SElement, NOT_KNOWN_TYPE } from '../selement/selement';
import { SElementAssociation } from '../selement/selementAssociation';

export interface NodeData {
  id: number;
  labels: Set<string>;
  properties: Record<string, any>;
}

export interface EdgeData {
  id: number;
  type: string;
  properties: Record<string, any>;
  src: number;
  dst: number;
}

export class CypherGraph {
  private nodeData: Map<number, NodeData> = new Map();
  private edgeData: Map<number, EdgeData> = new Map();
  private nodeOutEdges: Map<number, number[]> = new Map();
  private nodeInEdges: Map<number, number[]> = new Map();
  private pathToNode: Map<string, number> = new Map();
  private nodeToElem: Map<number, SElement> = new Map();
  private elemToNode: Map<SElement, number> = new Map();
  private edgeToAssoc: Map<number, SElementAssociation | null> = new Map();

  constructor(root: SElement, includeHierarchy = true) {
    this.buildIndex(root, includeHierarchy);
  }

  private static normalizePath(p: string): string {
    return p.startsWith('/') ? p.slice(1) : p;
  }

  private buildIndex(root: SElement, includeHierarchy: boolean): void {
    let nextNodeId = 0;
    let nextEdgeId = 0;

    // Pass 1 -- Nodes
    root.traverseElements((element: SElement) => {
      const id = nextNodeId++;
      const type = element.getType();
      const labels = new Set<string>();
      if (type !== NOT_KNOWN_TYPE) {
        labels.add(type);
      }

      const attrs = element.getAttributes();
      const properties: Record<string, any> = {};
      for (const [key, value] of Object.entries(attrs)) {
        if (key === 'type') continue;
        if (Array.isArray(value) && value.length === 1) {
          properties[key] = value[0];
        } else {
          properties[key] = value;
        }
      }
      const path = CypherGraph.normalizePath(element.getPath());
      properties.name = element.name;
      properties.path = path;

      const node: NodeData = { id, labels, properties };
      this.nodeData.set(id, node);
      this.nodeToElem.set(id, element);
      this.elemToNode.set(element, id);
      this.nodeOutEdges.set(id, []);
      this.nodeInEdges.set(id, []);
      this.pathToNode.set(path, id);
    });

    // Pass 2 -- Edges (associations)
    const seenAssocs = new Set<SElementAssociation>();

    root.traverseElements((element: SElement) => {
      for (const assoc of element.outgoing) {
        if (seenAssocs.has(assoc)) continue;
        seenAssocs.add(assoc);

        const srcId = this.elemToNode.get(assoc.fromElement);
        const dstId = this.elemToNode.get(assoc.toElement);
        if (srcId === undefined || dstId === undefined) continue;

        const edgeId = nextEdgeId++;
        const edge: EdgeData = {
          id: edgeId,
          type: assoc.deptype || 'unknown',
          properties: { ...(assoc.attrs || {}) },
          src: srcId,
          dst: dstId,
        };

        this.edgeData.set(edgeId, edge);
        this.edgeToAssoc.set(edgeId, assoc);
        this.nodeOutEdges.get(srcId)!.push(edgeId);
        this.nodeInEdges.get(dstId)!.push(edgeId);
      }
    });

    // Pass 3 -- Hierarchy edges (CONTAINS)
    if (includeHierarchy) {
      root.traverseElements((element: SElement) => {
        const parentId = this.elemToNode.get(element);
        if (parentId === undefined) return;

        for (const child of element.children) {
          const childId = this.elemToNode.get(child);
          if (childId === undefined) continue;

          const edgeId = nextEdgeId++;
          const edge: EdgeData = {
            id: edgeId,
            type: 'CONTAINS',
            properties: {},
            src: parentId,
            dst: childId,
          };

          this.edgeData.set(edgeId, edge);
          this.edgeToAssoc.set(edgeId, null);
          this.nodeOutEdges.get(parentId)!.push(edgeId);
          this.nodeInEdges.get(childId)!.push(edgeId);
        }
      });
    }
  }

  get nodeCount(): number {
    return this.nodeData.size;
  }

  get edgeCount(): number {
    return this.edgeData.size;
  }

  getAllNodes(): NodeData[] {
    return Array.from(this.nodeData.values());
  }

  getAllEdges(): EdgeData[] {
    return Array.from(this.edgeData.values());
  }

  getNode(id: number): NodeData {
    return this.nodeData.get(id)!;
  }

  getEdge(id: number): EdgeData {
    return this.edgeData.get(id)!;
  }

  getOutEdges(nodeId: number): number[] {
    return this.nodeOutEdges.get(nodeId) || [];
  }

  getInEdges(nodeId: number): number[] {
    return this.nodeInEdges.get(nodeId) || [];
  }

  getEdgeSrc(edgeId: number): number {
    return this.edgeData.get(edgeId)!.src;
  }

  getEdgeDst(edgeId: number): number {
    return this.edgeData.get(edgeId)!.dst;
  }

  getNodeByPath(path: string): NodeData | undefined {
    const id = this.pathToNode.get(CypherGraph.normalizePath(path));
    return id !== undefined ? this.nodeData.get(id) : undefined;
  }

  getElemForNode(nodeId: number): SElement | undefined {
    return this.nodeToElem.get(nodeId);
  }

  getAssocForEdge(edgeId: number): SElementAssociation | null | undefined {
    return this.edgeToAssoc.get(edgeId);
  }
}
