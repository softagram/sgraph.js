"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sgraphToEcharts = void 0;
const sgraphToEcharts = (sg) => {
    const categories = [];
    const nodes = [];
    const links = [];
    const hashToElemIndex = {};
    sg.rootNode.traverseElements((e) => {
        const type = e.getType();
        let categoryIndex = categories.findIndex((c) => c.name === type);
        if (categoryIndex === -1) {
            categoryIndex =
                categories.push({
                    name: type,
                }) - 1;
        }
        const nodeIndex = nodes.push({
            id: nodes.length,
            name: e.name,
            category: categoryIndex,
        }) - 1;
        hashToElemIndex[e.getHash()] = nodeIndex;
        if (e.parent) {
            links.push({
                source: hashToElemIndex[e.parent.getHash()],
                target: nodeIndex,
            });
        }
    });
    sg.rootNode.traverseElements((e) => {
        for (let ea of e.outgoing) {
            links.push({
                source: hashToElemIndex[ea.fromElement.getHash()],
                target: hashToElemIndex[ea.toElement.getHash()],
                lineStyle: {
                    type: 'dashed',
                },
            });
        }
    });
    return {
        categories,
        nodes,
        links,
    };
};
exports.sgraphToEcharts = sgraphToEcharts;
