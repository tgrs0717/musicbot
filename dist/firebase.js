"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const base64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
if (!base64) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_BASE64 が .env に定義されていません。');
}
const serviceAccount = JSON.parse(Buffer.from(base64, 'base64').toString('utf-8'));
if (!firebase_admin_1.default.apps.length) {
    firebase_admin_1.default.initializeApp({
        credential: firebase_admin_1.default.credential.cert(serviceAccount),
    });
}
exports.db = firebase_admin_1.default.firestore();
