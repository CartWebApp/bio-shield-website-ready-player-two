/** @import { Response } from 'express' */
const regex_is_valid_identifier = /^[a-zA-Z_$][a-zA-Z_$0-9]*$/;
import {
    readFileSync,
    existsSync,
    statSync,
    readdirSync,
    writeFileSync
} from 'fs';
import { DEV } from 'esm-env';
import express from 'express';
import { uneval } from 'devalue';
import { join, parse } from 'path';
const chokidar = DEV && (await import('chokidar'));

const app = express();

if (chokidar) {
    // In dev, this *should* reload the page when the corresponding HTML changes
    // it does this using a cheap copy of Server-Sent Events (since actual SSE wasn't working for me)
    // the client-side code for this can be found in `routes/dev.js`
    /** @type {Map<string, Array<Response>>} */
    const watchers = new Map();
    app.get('/events', (req, res) => {
        const _path = decodeURIComponent(
            /** @type {string} */ (req.query.path)
        );
        const path = `routes${
            _path + (_path.charAt(_path.length - 1) === '/' ? '' : '/')
        }index.html`;

        if (!watchers.has(path)) {
            watchers.set(path, []);
            chokidar.watch(`./${path}`).on('change', () => {
                console.log(`updated ${path}`);
                var update;
                while ((update = arr.shift())) {
                    update.write('_');
                    update.end();
                }
            });
        }
        const arr = /** @type {Array<Response>} */ (watchers.get(path));
        res.writeHead(200, {
            'cache-control': 'no-cache',
            'access-control-allow-origin': '*',
            Connection: 'keep-alive'
        });
        arr.push(res);
    });
}

function params() {}

/**
 * we do some hacky string concatenation to generate the types for `useContext`.
 * @param {string} path
 */
function generate_types(path) {
    let type_declarations =
        'export {};\ndeclare global {\n\tinterface Context {\n';
    const context = readdirSync(path).filter(
        folder =>
            statSync(`${path}/${folder}`).isDirectory() &&
            folder.match(/^\(.+\)$/)
    );
    if (context.length > 0) {
        for (const folder of context) {
            type_declarations += `\t\t${
                regex_is_valid_identifier.test(folder.slice(1, -1))
                    ? folder.slice(1, -1)
                    : `['${folder.slice(1, -1)}']`
            }: {\n`;
            for (const file of readdirSync(`${path}/${folder}`)) {
                type_declarations += `\t\t\t['${file.slice(
                    0,
                    -3
                )}']: typeof import(\'./${folder}/${file}\').default;\n`;
            }
            type_declarations += `\t\t};\n`;
        }
    }
    type_declarations += '\t};\n';
    type_declarations += `\texport function useContext<K extends keyof Context>(key: K): Context[K];\n`;
    type_declarations += `\texport function useContext(): Context;\n`;
    type_declarations += '};';
    return type_declarations;
}

app.use(async (req, res, next) => {
    const path = `./routes${req.path}`;
    if (existsSync(path)) {
        const stats = statSync(path);
        if (stats.isFile()) {
            res.contentType(`.${path.split('.').at(-1) ?? 'txt'}`);
            res.sendFile(path, { root: '.' });
        } else {
            const template = readFileSync(
                `${
                    path + (path.charAt(path.length - 1) === '/' ? '' : '/')
                }index.html`,
                'utf-8'
            );
            res.contentType('.html');
            res.send(
                await convert(
                    template,
                    `${
                        path + (path.charAt(path.length - 1) === '/' ? '' : '/')
                    }index.html`
                )
            );
        }
    }
});

/**
 * @param {string} template
 * @param {string} url
 */
async function convert(template, url) {
    const [title, ...lines] = template.split(/\r?\n/g);
    const body = lines.join('\n');
    /** @type {Record<string, Record<string, any>>} */
    const context_injection = {};
    let context_script = '';
    const dir = parse(url).dir;
    const context = readdirSync(dir).filter(
        path =>
            statSync(`${dir}/${path}`).isDirectory() && path.match(/^\(.+\)$/)
    );
    if (context.length > 0) {
        for (const folder of context) {
            for (const file of readdirSync(`${dir}/${folder}`)) {
                const module = await import(`${dir}/${folder}/${file}`);
                if (module?.default) {
                    (context_injection[folder] ??= {})[file.slice(0, -3)] =
                        module.default;
                }
            }
            context_script += `\t\t\t\t\tcontext['${folder.slice(
                1,
                -1
            )}'] = ${uneval(context_injection[folder])};\n`;
        }
    }
    writeFileSync(join(dir, 'types.d.ts'), generate_types(dir));
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
        <script>
            (function() {
                const empty = Symbol();
                globalThis.useContext = function useContext(key = empty) {
                    const context = {};
${context_script}
                    return key === empty ? context : context[key];
                };
            }());
        </script>
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
        ${body}
    </body>
</html>`;
}

app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});
