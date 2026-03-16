import { SElement } from '../selement/selement';
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
export declare class CypherGraph {
    private nodeData;
    private edgeData;
    private nodeOutEdges;
    private nodeInEdges;
    private pathToNode;
    private nodeToElem;
    private elemToNode;
    private edgeToAssoc;
    constructor(root: SElement, includeHierarchy?: boolean);
    private static normalizePath;
    private buildIndex;
    get nodeCount(): number;
    get edgeCount(): number;
    getAllNodes(): NodeData[];
    getAllEdges(): EdgeData[];
    getNode(id: number): NodeData;
    getEdge(id: number): EdgeData;
    getOutEdges(nodeId: number): number[];
    getInEdges(nodeId: number): number[];
    getEdgeSrc(edgeId: number): number;
    getEdgeDst(edgeId: number): number;
    getNodeByPath(path: string): NodeData | undefined;
    getElemForNode(nodeId: number): SElement | undefined;
    getAssocForEdge(edgeId: number): SElementAssociation | null | undefined;
}
