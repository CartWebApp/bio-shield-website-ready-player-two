/** @import { Response } from 'express' */
// this regex came from
// https://github.com/sveltejs/svelte/blob/461642283285fdbe854a1dce5000cf4c882e566e/packages/svelte/src/compiler/phases/patterns.js#L17
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
import { parse, sep } from 'path';
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

/**
 *
 * @param {string} path
 */
function params(path) {
    let dir = path;
    let child = path;
    let end = path.split('/');
    let i = end.length;
    /** @type {Record<string, string>} */
    const params = {};
    while (dir.length > 1) {
        while (!existsSync(dir) && dir.length > 1) {
            child = dir;
            ({ dir } = parse(dir));
            i--;
        }
        if (dir.length <= 1) {
            break;
        }
        const has_params = readdirSync(dir).find(
            folder =>
                statSync(`${dir}/${folder}`).isDirectory() &&
                /^\[.+\]$/.test(folder)
        );
        if (typeof has_params === 'string') {
            const param = has_params.slice(1, -1);
            params[param] = parse(child).base;
            child = dir;
            ({ dir } = parse(dir));
            end[i--] = has_params;
        } else {
            child = dir;
            ({ dir } = parse(dir));
            i--;
        }
    }
    return {
        params,
        path: end.join('/')
    };
}

function generate_all_types() {
    for (const file of readdirSync('./routes', { recursive: true })) {
        if (typeof file !== 'string') continue;
        if (file.endsWith('index.html')) {
            const dir = `./routes/${file.split(sep).slice(0, -1).join('/')}`;
            writeFileSync(`${dir}/types.d.ts`, generate_types(dir));
        }
    }
}
generate_all_types();

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
    const params = [];
    let dir = path;
    while (dir.length > 0) {
        const { base, dir: next } = parse(dir);
        if (base.match(/^\[.+\]$/)) {
            params.push(base.slice(1, -1));
        }
        dir = next;
    }
    type_declarations += `\tinterface Params {\n`;
    for (const param of params) {
        type_declarations += `\t\t${
            regex_is_valid_identifier.test(param) ? param : `['${param}']`
        }: string;\n`;
    }
    type_declarations += `\t};\n`;
    type_declarations += `\texport function useParams<P extends keyof Params>(param: P): Params[P];\n`;
    type_declarations += `\texport function useParams(): Params;\n`;
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
            const html_path = `${
                path + (path.charAt(path.length - 1) === '/' ? '' : '/')
            }index.html`;
            const template = readFileSync(html_path, 'utf-8');
            res.contentType('.html');
            res.send(await convert(template, html_path, {}));
        }
    } else {
        const parsed_params = params(path);
        console.log(parsed_params.path);
        if (existsSync(parsed_params.path)) {
            const stats = statSync(parsed_params.path);
            if (stats.isFile()) {
                res.contentType(
                    `.${parsed_params.path.split('.').at(-1) ?? 'txt'}`
                );
            } else {
                const path = parsed_params.path;
                const html_path = `${
                    path + (path.charAt(path.length - 1) === '/' ? '' : '/')
                }index.html`;
                const template = readFileSync(html_path, 'utf-8');
                res.contentType('.html');
                res.send(
                    await convert(template, html_path, parsed_params.params)
                );
            }
        }
    }
});

/**
 * @param {string} template
 * @param {string} url
 * @param {Record<string, string>} [params]
 */
async function convert(template, url, params = {}) {
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
                globalThis.useParams = function useParams(param = empty) {
                    const params = ${uneval(params)};
                    return param === empty ? params : params[param];
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
