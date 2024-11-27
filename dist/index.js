"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const routes_1 = __importDefault(require("./Nodes/HttpRequest/routes"));
const app = (0, express_1.default)();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4000;
app.use(express_1.default.json());
// Sample API route
app.get('/api/hello', (req, res) => {
    res.json({ message: 'Hello from Node API!' });
});
// Node routes
app.use('/api/nodes/http-request', routes_1.default);
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
