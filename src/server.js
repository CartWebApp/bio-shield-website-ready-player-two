import { readFileSync } from 'fs';
// @ts-ignore
import express from 'express';

const app = express();

app.use(express.static('routes'));

app.listen(3000);
