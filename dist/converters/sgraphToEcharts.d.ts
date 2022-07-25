import { SGraph } from '../sgraph';
interface Category {
    name: string;
}
interface Node {
    id: number;
    name: string;
    category: number;
}
interface Link {
    source: number;
    target: number;
    lineStyle?: any;
}
export interface EChartsOptions {
    categories: Category[];
    nodes: Node[];
    links: Link[];
}
declare const sgraphToEcharts: (sg: SGraph) => {
    categories: Category[];
    nodes: Node[];
    links: Link[];
};
export { sgraphToEcharts };
