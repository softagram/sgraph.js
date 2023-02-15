import { SElement } from './selement';
import { SGraph } from './sgraph';
export declare enum FilterAssociations {
    Ignore = 1,
    Direct = 2,
    DirectAndIndirect = 3
}
declare class ModelApi {
    model: SGraph;
    egm: SGraph;
    constructor(options: {
        data: string;
        model?: never;
    } | {
        model: SGraph;
        data?: never;
    });
    getElementsByName(name: string): SElement[];
    getCalledFunctions: (element: SElement) => SElement[];
    getCallingFunctions: (element: SElement) => SElement[];
    getUsedElements: (element: SElement) => SElement[];
    getUserElements: (element: SElement) => SElement[];
    createDescendants: (relatedElement: SElement, newOrExistingReferredElement: SElement) => void;
    /**
        Filter a sub graph from source graph related to source element.
        When executing filterModel for element e with "Ignore" mode, it ignores elements
        that are external to e.
        "Direct" mode changes this behavior: it picks also external elements associated
        with descendants of e. However, it is limited to direct assocations.
        "DirectAndIndirect" mode selects all directly and indirectly associated elements
        and their descendants.
        Traversal of "DirectAndIndirect" is not directed, i.e. it goes in undirected mode,
        leading into situations where you have the dependencies of your users also included.
        @param {SElement} sourceElement element for filtering (descendants of it)
        @param {SGraph} sourceGraph the overall graph to be filtered
        @param {FilterAssociations} filterOutgoing filtering mode for outgoing dependencies
        @param {FilterAssociations} filterIncoming filtering mode for incoming dependencies
        @returns {SGraph} new graph, that contains independent new SElement objects with same
        topology as in the source graph
        */
    filterModel: (sourceElement: SElement, sourceGraph: SGraph, filterOutgoing?: FilterAssociations, filterIncoming?: FilterAssociations) => SGraph;
    getCyclicDependencyCycles(): SElement[][];
}
export { ModelApi };
