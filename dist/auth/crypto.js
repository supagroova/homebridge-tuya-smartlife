"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formToJson = formToJson;
exports.md5HashKey = md5HashKey;
exports.generateSecret = generateSecret;
exports.encryptAesGcm = encryptAesGcm;
exports.decryptAesGcm = decryptAesGcm;
exports.restfulSign = restfulSign;
const node_crypto_1 = require("node:crypto");
const NONCE_ALPHABET = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678';
const SIGNED_HEADER_ORDER = ['X-appKey', 'X-requestId', 'X-sid', 'X-time', 'X-token'];
function formToJson(content) {
    return JSON.stringify(content);
}
function md5HashKey(requestId, refreshToken) {
    return (0, node_crypto_1.createHash)('md5').update(requestId + refreshToken, 'utf8').digest('hex');
}
function generateSecret(requestId, sessionId, hashKey) {
    let message = hashKey;
    if (sessionId !== '') {
        const length = Math.min(sessionId.length, 16);
        let ecode = '';
        for (let index = 0; index < length; index += 1) {
            ecode += sessionId[sessionId.charCodeAt(index) % 16];
        }
        message += `_${ecode}`;
    }
    return (0, node_crypto_1.createHmac)('sha256', Buffer.from(requestId, 'utf8'))
        .update(message, 'utf8')
        .digest('hex')
        .slice(0, 16);
}
function encryptAesGcm(rawData, secret, nonce = randomNonce()) {
    const cipher = (0, node_crypto_1.createCipheriv)('aes-128-gcm', Buffer.from(secret, 'utf8'), Buffer.from(nonce, 'utf8'));
    const encrypted = Buffer.concat([cipher.update(rawData, 'utf8'), cipher.final(), cipher.getAuthTag()]);
    return Buffer.from(nonce, 'utf8').toString('base64') + encrypted.toString('base64');
}
function decryptAesGcm(cipherData, secret) {
    const decoded = Buffer.from(cipherData, 'base64');
    const nonce = decoded.subarray(0, 12);
    const cipherTextWithTag = decoded.subarray(12);
    const authTag = cipherTextWithTag.subarray(cipherTextWithTag.length - 16);
    const cipherText = cipherTextWithTag.subarray(0, cipherTextWithTag.length - 16);
    const decipher = (0, node_crypto_1.createDecipheriv)('aes-128-gcm', Buffer.from(secret, 'utf8'), nonce);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(cipherText), decipher.final()]).toString('utf8');
}
function restfulSign(hashKey, queryEncdata, bodyEncdata, headers) {
    let headerSignString = '';
    for (const header of SIGNED_HEADER_ORDER) {
        const value = headers[header] ?? '';
        if (value !== '') {
            headerSignString += `${header}=${value}||`;
        }
    }
    let signString = headerSignString.slice(0, -2);
    if (queryEncdata !== '') {
        signString += queryEncdata;
    }
    if (bodyEncdata !== '') {
        signString += bodyEncdata;
    }
    return (0, node_crypto_1.createHmac)('sha256', Buffer.from(hashKey, 'utf8')).update(signString, 'utf8').digest('hex');
}
function randomNonce() {
    let nonce = '';
    for (let index = 0; index < 12; index += 1) {
        nonce += NONCE_ALPHABET[(0, node_crypto_1.randomInt)(0, NONCE_ALPHABET.length)];
    }
    return nonce;
}
