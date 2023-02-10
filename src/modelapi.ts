import { SElement, SElementAssociation } from './selement';
import { SGraph } from './sgraph';
export enum FilterAssociations {
  Ignore = 1,
  Direct = 2,
  DirectAndIndirect = 3,
}
class ModelApi {
  model: SGraph;
  egm: SGraph;

  constructor(
    options:
      | {
          data: string;
          model?: never;
        }
      | {
          model: SGraph;
          data?: never;
        }
  ) {
    if (options.data) {
      this.model = SGraph.parseXml({ data: options.data });
    } else {
      this.model = options.model!;
    }

    this.egm = this.model;
  }

  getElementsByName(name: string): SElement[] {
    if (!this.model.rootNode) return [];

    const matching: SElement[] = [];

    const recursiveTraverse = (elem: SElement) => {
      if (elem.name === name) matching.push(elem);
      for (const child of elem.children) {
        recursiveTraverse(child);
      }
    };

    recursiveTraverse(this.model.rootNode);

    return matching;
  }

  getCalledFunctions = (element: SElement) =>
    element.outgoing
      .filter((ea) => ea.deptype === 'function_ref')
      .map((ea) => ea.toElement);

  getCallingFunctions = (element: SElement) =>
    element.incoming
      .filter((ea) => ea.deptype === 'function_ref')
      .map((ea) => ea.fromElement);

  getUsedElements = (element: SElement) =>
    element.outgoing.map((ea) => ea.fromElement);

  getUserElements = (element: SElement) =>
    element.incoming.map((ea) => ea.fromElement);

  createDescendants = (
    relatedElement: SElement,
    newOrExistingReferredElement: SElement
  ) => {
    const stack = [{ relatedElement, newOrExistingReferredElement }];
    while (stack.length > 0) {
      const { relatedElement, newOrExistingReferredElement } = stack.splice(
        0,
        1
      )[0];

      if (relatedElement.children) {
        for (const child of relatedElement.children) {
          const newChild = newOrExistingReferredElement.createOrGetElement(
            child.name
          );
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
  filterModel = (
    sourceElement: SElement,
    sourceGraph: SGraph,
    filterOutgoing = FilterAssociations.Direct,
    filterIncoming = FilterAssociations.Direct
  ) => {
    const subGraph = new SGraph(new SElement('', undefined));
    subGraph.createOrGetElementWithNew(sourceElement);
    const stack = new Set<SElement>([sourceElement]);

    const isDescendantOfSourceElement = (element: SElement) => {
      let ancestor = element;
      while (ancestor !== undefined && ancestor.parent != undefined) {
        ancestor = ancestor.parent;
        if (ancestor === sourceElement) {
          return true;
        }
      }
    };
    const createAssociation = (
      x: SElement,
      other: SElement,
      isOutgoing: boolean,
      elementAssociation: SElementAssociation
    ) => {
      const { element: newOrExistingReferredElement, isNew } =
        subGraph.createOrGetElementWithNew(x);

      if (isOutgoing) {
        SElementAssociation.createUniqueElementAssociation(
          other,
          newOrExistingReferredElement,
          elementAssociation.deptype,
          elementAssociation.attrs
        );
      } else {
        SElementAssociation.createUniqueElementAssociation(
          newOrExistingReferredElement,
          other,
          elementAssociation.deptype,
          elementAssociation.attrs
        );
      }
      return {
        newOrExistingReferredElement,
        isNew,
      };
    };

    const handleAssociation = (
      newElement: SElement,
      elementAssociation: SElementAssociation,
      relatedElement: SElement,
      filterSetting: FilterAssociations,
      isOutgoing: boolean,
      stack: Set<SElement>,
      handled: Set<SElement>
    ) => {
      const descendantOfSrc = isDescendantOfSourceElement(relatedElement);

      if (!descendantOfSrc && filterSetting == FilterAssociations.Ignore) {
        return;
      }

      const { newOrExistingReferredElement, isNew } = createAssociation(
        relatedElement,
        newElement,
        isOutgoing,
        elementAssociation
      );

      if (descendantOfSrc) {
        // No need to create descendants since those will be anyway created later as part of
        // the main iteration.
        return;
      } else if (filterSetting == FilterAssociations.Direct) {
        if (isNew) {
          // Avoid creating descendants multiple times.
          this.createDescendants(relatedElement, newOrExistingReferredElement);
        }
      } else if (filterSetting == FilterAssociations.DirectAndIndirect) {
        // Get all indirectly and directly used elements into the subgraph, including
        // their descendant elements.
        if (!handled.has(relatedElement)) {
          stack.add(relatedElement);
        }
      }
    };

    const handled = new Set<SElement>();
    // Traverse related elements from the source graph using stack
    for (const element of stack) {
      handled.add(element);
      if (element) {
        const newElememt = subGraph.createOrGetElement(element);
        newElememt.setAttributes({ ...element.getAttributes() });

        for (const outgoingAssociation of element.outgoing) {
          handleAssociation(
            newElememt,
            outgoingAssociation,
            outgoingAssociation.toElement,
            filterOutgoing,
            true,
            stack,
            handled
          );
        }
        for (const incomingAssociation of element.incoming) {
          handleAssociation(
            newElememt,
            incomingAssociation,
            incomingAssociation.fromElement,
            filterIncoming,
            false,
            stack,
            handled
          );
        }
        for (let i = 0; i < element.children.length; i++) {
          if (!handled.has(element.children[i])) stack.add(element.children[i]);
        }
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
          elem.setAttributes({ ...correspondingSourceElement.getAttributes() });
        }
        for (const child of elem.children) {
          subGraphStack.push(child);
          if (correspondingSourceElement) {
            wholeGraphStack.push(
              correspondingSourceElement.getChildByName(child.name)
            );
          }
        }
      }
    }
    return subGraph;
  };
}

export { ModelApi };
