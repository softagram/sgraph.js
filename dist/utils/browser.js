"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isBrowser = void 0;
const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';
exports.isBrowser = isBrowser;
