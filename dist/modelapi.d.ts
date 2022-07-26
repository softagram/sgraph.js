import { SElement } from './selement';
import { SGraph } from './sgraph';
declare class ModelApi {
    model: SGraph;
    egm: SGraph;
    constructor(options: {
        data: string;
    } | {
        model: SGraph;
    });
    getElementsByName(name: string): SElement[];
    getCalledFunctions: (element: SElement) => SElement[];
    getCallingFunctions: (element: SElement) => SElement[];
    getUsedElements: (element: SElement) => SElement[];
    getUserElements: (element: SElement) => SElement[];
}
export { ModelApi };
