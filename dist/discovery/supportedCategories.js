"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSupportedCategory = isSupportedCategory;
const SUPPORTED_CATEGORIES = new Set([
    'kg',
    'cz',
    'pc',
    'tdq',
    'wsdcg',
    'mcs',
    'pir',
    'sj',
    'ywbj',
    'wk',
]);
function isSupportedCategory(category) {
    return SUPPORTED_CATEGORIES.has(category);
}
