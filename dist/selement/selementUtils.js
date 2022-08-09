"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lowestCommonAncestor = void 0;
const lowestCommonAncestor = (a, b) => {
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
exports.lowestCommonAncestor = lowestCommonAncestor;
