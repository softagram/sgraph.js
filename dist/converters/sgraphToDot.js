"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sgraphToDot = void 0;
const tab = '\t';
const sgraphToDot = (graph) => {
    const dot = [];
    const deps = [];
    dot.push('digraph G {');
    const handleElement = (e, indent) => {
        if (e.children.length > 0) {
            const subgraphHash = e.getHash();
            dot.push(`${tab.repeat(indent)}subgraph "cluster${subgraphHash}" {`);
            e.children.forEach((child) => {
                if (child.children.length > 0)
                    return handleElement(child, indent + 1);
                const childHash = child.getHash();
                child.outgoing.forEach((ea) => {
                    const to = ea.toElement;
                    if (to.children.length > 0)
                        return;
                    deps.push([childHash, to.getHash(), ea.deptype]);
                });
                dot.push(`${tab.repeat(indent + 1)}"${childHash}" [label="${child.name}"];`);
            });
            if (e.name) {
                dot.push(`${tab.repeat(indent + 1)}label = "${e.name}";`);
            }
            dot.push(`${tab.repeat(indent)}}`);
        }
    };
    handleElement(graph.rootNode, 1);
    dot.push('');
    deps.forEach(([from, to, type]) => {
        dot.push(`${tab}"${from}" -> "${to}" [label="${type}"];`);
    });
    dot.push('}');
    return dot.join('\n');
};
exports.sgraphToDot = sgraphToDot;
