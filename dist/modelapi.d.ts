import { SElement } from './selement';
import { SGraph } from './sgraph';
interface ModelApiOptions {
    data: string;
}
declare class ModelApi {
    model: SGraph;
    egm: SGraph;
    constructor(options: ModelApiOptions);
    getElementsByName(name: string): SElement[];
    getCalledFunctions: (element: SElement) => SElement[];
    getCallingFunctions: (element: SElement) => SElement[];
    getUsedElements: (element: SElement) => SElement[];
    getUserElements: (element: SElement) => SElement[];
}
export { ModelApi };
