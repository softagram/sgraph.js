"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelApi = exports.FilterAssociations = void 0;
const selement_1 = require("./selement");
const sgraph_1 = require("./sgraph");
var FilterAssociations;
(function (FilterAssociations) {
    FilterAssociations[FilterAssociations["Ignore"] = 1] = "Ignore";
    FilterAssociations[FilterAssociations["Direct"] = 2] = "Direct";
    FilterAssociations[FilterAssociations["DirectAndIndirect"] = 3] = "DirectAndIndirect";
})(FilterAssociations = exports.FilterAssociations || (exports.FilterAssociations = {}));
class ModelApi {
    constructor(options) {
        this.getCalledFunctions = (element) => element.outgoing
            .filter((ea) => ea.deptype === 'function_ref')
            .map((ea) => ea.toElement);
        this.getCallingFunctions = (element) => element.incoming
            .filter((ea) => ea.deptype === 'function_ref')
            .map((ea) => ea.fromElement);
        this.getUsedElements = (element) => element.outgoing.map((ea) => ea.fromElement);
        this.getUserElements = (element) => element.incoming.map((ea) => ea.fromElement);
        this.createDescendants = (relatedElement, newOrExistingReferredElement) => {
            const stack = [{ relatedElement, newOrExistingReferredElement }];
            while (stack.length > 0) {
                const { relatedElement, newOrExistingReferredElement } = stack.splice(0, 1)[0];
                if (relatedElement.children) {
                    for (const child of relatedElement.children) {
                        const newChild = newOrExistingReferredElement.createOrGetElement(child.name);
                        stack.push({
                            relatedElement: child,
                            newOrExistingReferredElement: newChild,
                        });
                    }
                }
            }
        };
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
        this.filterModel = (sourceElement, sourceGraph, filterOutgoing = FilterAssociations.Direct, filterIncoming = FilterAssociations.Direct) => {
            const subGraph = new sgraph_1.SGraph(new selement_1.SElement('', undefined));
            subGraph.createOrGetElementWithNew(sourceElement);
            const stack = [sourceElement];
            const isDescendantOfSourceElement = (element) => {
                let ancestor = element;
                while (ancestor !== undefined && ancestor.parent != undefined) {
                    ancestor = ancestor.parent;
                    if (ancestor === sourceElement) {
                        return true;
                    }
                }
            };
            const createAssociation = (x, other, isOutgoing, elementAssociation) => {
                const { element: newOrExistingReferredElement, isNew } = subGraph.createOrGetElementWithNew(x);
                if (isOutgoing) {
                    new selement_1.SElementAssociation(other, newOrExistingReferredElement, elementAssociation.deptype, elementAssociation.attrs).initElems();
                }
                else {
                    new selement_1.SElementAssociation(newOrExistingReferredElement, other, elementAssociation.deptype, elementAssociation.attrs).initElems();
                }
                return {
                    newOrExistingReferredElement,
                    isNew,
                };
            };
            const handleAssociation = (newElement, elementAssociation, relatedElement, filterSetting, isOutgoing, stack, handled) => {
                const descendantOfSrc = isDescendantOfSourceElement(relatedElement);
                if (!descendantOfSrc && filterSetting == FilterAssociations.Ignore) {
                    return;
                }
                const { newOrExistingReferredElement, isNew } = createAssociation(relatedElement, newElement, isOutgoing, elementAssociation);
                if (descendantOfSrc) {
                    // No need to create descendants since those will be anyway created later as part of
                    // the main iteration.
                    return;
                }
                else if (filterSetting == FilterAssociations.Direct) {
                    if (isNew) {
                        // Avoid creating descendants multiple times.
                        this.createDescendants(relatedElement, newOrExistingReferredElement);
                    }
                }
                else if (filterSetting == FilterAssociations.DirectAndIndirect) {
                    // Get all indirectly and directly used elements into the subgraph, including
                    // their descendant elements.
                    if (!handled.has(relatedElement)) {
                        stack.push(relatedElement);
                    }
                }
            };
            const handled = new Set();
            // Traverse related elements from the source graph using stack
            while (stack.length > 0) {
                const element = stack.splice(0, 1)[0];
                handled.add(element);
                if (element) {
                    const newElememt = subGraph.createOrGetElement(element);
                    newElememt.setAttributes(Object.assign({}, element.getAttributes()));
                    for (const outgoingAssociation of element.outgoing) {
                        handleAssociation(newElememt, outgoingAssociation, outgoingAssociation.toElement, filterOutgoing, true, stack, handled);
                    }
                    for (const incomingAssociation of element.incoming) {
                        handleAssociation(newElememt, incomingAssociation, incomingAssociation.fromElement, filterIncoming, false, stack, handled);
                    }
                    stack.push(...element.children);
                }
            }
            // Now that elements have been created, copy attribute data from the whole graph, via
            // traversal using two stacks.
            const subGraphStack = [subGraph.rootNode];
            const wholeGraphStack = [sourceGraph.rootNode];
            while (subGraphStack.length > 0) {
                const elem = subGraphStack.splice(0, 1)[0];
                const correspondingSourceElement = wholeGraphStack.splice(0, 1)[0];
                if (elem) {
                    if (correspondingSourceElement) {
                        elem.setAttributes(Object.assign({}, correspondingSourceElement.getAttributes()));
                    }
                    for (const child of elem.children) {
                        subGraphStack.push(child);
                        if (correspondingSourceElement) {
                            wholeGraphStack.push(correspondingSourceElement.getChildByName(elem.name));
                        }
                    }
                }
            }
            return subGraph;
        };
        if (options.data) {
            this.model = sgraph_1.SGraph.parseXml({ data: options.data });
        }
        else {
            this.model = options.model;
        }
        this.egm = this.model;
    }
    getElementsByName(name) {
        if (!this.model.rootNode)
            return [];
        const matching = [];
        const recursiveTraverse = (elem) => {
            if (elem.name === name)
                matching.push(elem);
            for (const child of elem.children) {
                recursiveTraverse(child);
            }
        };
        recursiveTraverse(this.model.rootNode);
        return matching;
    }
}
exports.ModelApi = ModelApi;
