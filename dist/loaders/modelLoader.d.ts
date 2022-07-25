import { SGraph } from '../sgraph';
declare class ModelLoader {
    load(filePath: string, depTypes?: string[], ignoredAttributes?: string[]): Promise<SGraph | undefined>;
}
export { ModelLoader };
