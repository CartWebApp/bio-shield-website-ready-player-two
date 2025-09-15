/** @import { Response } from 'express' */
import { readFileSync, existsSync, statSync } from 'fs';
import { DEV } from 'esm-env';
import express from 'express';
const chokidar = DEV ? await import('chokidar') : null;

const app = express();

if (DEV && chokidar !== null) {
    // In dev, this *should* reload the page when the corresponding HTML changes
    // it does this using Server-Sent Events
    // the client-side code for this can be found in `routes/dev.js`
    /** @type {Map<string, Array<Response>>} */
    const watchers = new Map();
    chokidar.watch('./routes').on('change', _path => {
        const path = _path.replace(/\\/g, '/');
        const updates = watchers.get(path);
        if (updates !== undefined) {
            console.log(`updated ${path}`);
            var update;
            while ((update = updates.shift())) {
                update.end();
            }
        }
    });
    app.get('/events', (req, res) => {
        const _path = decodeURIComponent(
            /** @type {string} */ (req.query.path)
        );
        const path = `routes${
            _path + (_path.charAt(_path.length - 1) === '/' ? '' : '/')
        }index.html`;
        if (!watchers.has(path)) {
            watchers.set(path, []);
        }
        const arr = /** @type {Array<Response>} */ (watchers.get(path));
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders(); // flush the headers to establish SSE with client
        arr.push(res);
    });
}

app.use((req, res, next) => {
    const path = `./routes${req.path}`;
    if (existsSync(path)) {
        const stats = statSync(path);
        if (stats.isFile()) {
            // console.log(path);
            res.contentType(`.${path.split('.').at(-1) ?? 'txt'}`);
            res.sendFile(path, { root: '.' });
        } else {
            // res.sendFile(`${path}index.html`, { root: '.' });
            // console.log(path);
            const template = readFileSync(
                `${
                    path + (path.charAt(path.length - 1) === '/' ? '' : '/')
                }index.html`,
                'utf-8'
            );
            res.contentType('.html');
            res.send(convert(template));
        }
    }
    // next();
    // console.log('hi', path);
});

/**
 * @param {string} template
 */
function convert(template) {
    const [title, ...lines] = template.split(/\r?\n/g);
    return `<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${title}</title>
        <link rel="apple-touch-icon" sizes="180x180" href="/static/icons/apple-touch-icon.png">
        <link rel="icon" type="image/png" sizes="32x32" href="/static/icons/favicon-32x32.png">
        <link rel="icon" type="image/png" sizes="16x16" href="/static/icons/favicon-16x16.png">
        <link rel="manifest" href="/static/icons/site.webmanifest">
        <link rel="stylesheet" href="/styles.css" />
        <script src="/script.js" type="module"></script>${
            DEV
                ? `
        <script src="/dev.js"></script>`
                : ''
        }
        <link rel="preconnect" href="https://rsms.me/" />
        <link rel="stylesheet" href="https://rsms.me/inter/inter.css" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
        <link
            href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&display=swap"
            rel="stylesheet"
        />
    </head>
    <body>
        <!-- Navigation Bar -->
        <nav>
            <a href="/"><img src="/static/logo.svg" alt="Company Logo" /></a>
            <span class="links"
                ><a href="/about">About</a>
                <a href="/shop">Our Products</a>
                <a href="/contact">Contact</a></span
            >
        </nav>
        ${lines.join('\n')}
    </body>
</html>`;
}

app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});
