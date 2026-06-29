"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileTokenStore = void 0;
const promises_1 = require("node:fs/promises");
const node_path_1 = require("node:path");
class FileTokenStore {
    path;
    constructor(path) {
        this.path = path;
    }
    async load() {
        try {
            return JSON.parse(await (0, promises_1.readFile)(this.path, 'utf8'));
        }
        catch (error) {
            if (isRecoverableReadError(error)) {
                return null;
            }
            throw error;
        }
    }
    async save(token) {
        await (0, promises_1.mkdir)((0, node_path_1.dirname)(this.path), { recursive: true });
        const tempPath = `${this.path}.tmp`;
        await (0, promises_1.writeFile)(tempPath, `${JSON.stringify(token, null, 2)}\n`, 'utf8');
        await (0, promises_1.rename)(tempPath, this.path);
    }
}
exports.FileTokenStore = FileTokenStore;
function isRecoverableReadError(error) {
    return (error instanceof SyntaxError ||
        (typeof error === 'object' &&
            error !== null &&
            'code' in error &&
            error.code === 'ENOENT'));
}
