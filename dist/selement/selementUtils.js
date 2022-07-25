"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lowestComonAncestor = void 0;
const lowestComonAncestor = (a, b) => {
    const aAncestors = a.getAncestors().reverse();
    const bAncestors = b.getAncestors().reverse();
    let lca;
    for (let i = 0; i < aAncestors.length; i++) {
        if (bAncestors.length > i) {
            if (aAncestors[i].equals(bAncestors[i]))
                lca = aAncestors[i];
            else
                break;
        }
    }
    return lca;
};
exports.lowestComonAncestor = lowestComonAncestor;
