import { SGraph } from '../sgraph';
declare class AttributeLoader {
    loadAttrFile(data: string, model: SGraph): SGraph;
    loadAllFiles(filePathOfModelRoot: string, model: SGraph): Promise<{
        model: SGraph;
        missingAttrFiles: string[];
    }>;
}
export { AttributeLoader };
