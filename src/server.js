import { readFileSync, existsSync, statSync, stat } from 'fs';
// @ts-ignore
import express from 'express';

const app = /** @type {import('express').Application} */ (express());

app.use((req, res, next) => {
    const path = `./routes${req.path}`;
    if (existsSync(path)) {
        const stats = statSync(path);
        if (stats.isFile()) {
            console.log(path);
            res.contentType(`.${path.split('.').at(-1) ?? 'txt'}`);
            res.sendFile(path, { root: '.'});
        } else {
            res.sendFile(`${path}index.html`, { root: '.' });
        }
    }
    // next();
});

app.listen(3000);
