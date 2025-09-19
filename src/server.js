/** @import { Response, Request } from 'express' */
/** @import { OutgoingHttpHeaders } from 'http' */
/** @import { __Request } from './types.js' */
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
import { uneval, parse as deserialize, stringify } from 'devalue';
import { parse, sep, join } from 'path';
import kleur from 'kleur';
import { STATUS_CODES } from 'http';
import { minify } from 'terser';
const chokidar = DEV && (await import('chokidar'));
const app = express();
/** @type {Record<string, Record<string, any>> | null} */
export let active_context = null;
/** @type {Record<string, string> | null} */
export let active_params = null;

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
        const path = join(process.cwd(), 'src', 'routes', ..._path.split('/'));

        if (!watchers.has(path)) {
            watchers.set(path, []);
            chokidar.watch(`./${path}`).on('change', _path => {
                if (_path.match(/(tsconfig\.json)|(types\.d\.ts)$/)) return;
                const time = new Date()
                    .toLocaleTimeString('en-US', { hour12: false })
                    .replace(/:[0-9]{2}$/, '');
                console.log(
                    `${kleur.bold(kleur.blue(time))} ${kleur.gray(
                        'updated '
                    )}${kleur.bold(path)}`
                );
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
    chokidar.watch('./src/routes').on('all', (event, path) => {
        if (path.endsWith('types.d.ts')) return;
        // TODO do fine-grained type updates if possible
        generate_all_types();
    });
}

/**
 * Checks if a path has params, and if so what its params are.
 * For example, if `path` is `organization/repository` and you have a route at `src/routes/[org]/[repo]`,
 * the result would be `{ path: './routes/[org]/[repo]', params: { org: 'organization', repo: 'repository' } }`.
 * @param {string} path
 * @returns {{ path: string; params: Record<string, string> }}
 */
function params(path) {
    let dir = path;
    let child = path;
    const parts = path.split('/');
    let i = parts.length;
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
            parts[i--] = has_params;
        } else {
            child = dir;
            ({ dir } = parse(dir));
            i--;
        }
    }
    return {
        params,
        path: parts.join('/')
    };
}

function generate_all_types() {
    for (const file of readdirSync(join(process.cwd(), 'src', 'routes'), {
        recursive: true
    })) {
        if (typeof file !== 'string') continue;
        if (parse(file).base === 'index.html') {
            // i've found that `fs.writeFileSync` fails randomly after ~5 mins of inactivity
            // so this'll stop that from crashing the server
            try {
                const dir = join(
                    process.cwd(),
                    'src',
                    'routes',
                    ...file.split(sep).slice(0, -1)
                );
                const types = generate_types(dir);
                if (
                    !existsSync(join(dir, 'index.html')) ||
                    types !== readFileSync(join(dir, 'index.html'), 'utf-8')
                ) {
                    writeFileSync(join(dir, 'index.html'), types);
                }
                // because typescript always implicitly `<reference>`s ambient type declarations,
                // we have to create a tsconfig for each route :|
                if (!existsSync(`${dir}/tsconfig.json`)) {
                    writeFileSync(
                        `${dir}/tsconfig.json`,
                        JSON.stringify({
                            compilerOptions: {
                                target: 'ES2024',
                                checkJs: true,
                                allowJs: true,
                                strict: true,
                                moduleResolution: 'nodenext',
                                module: 'nodenext',
                                resolveJsonModule: true,
                                noEmit: true
                            },
                            include: ['*', '*/*'],
                            exclude: []
                        })
                    );
                }
            } catch {}
        }
    }
}
if (DEV) {
    generate_all_types();
}

/**
 * Generates type declarations for a certain path.
 * This includes ambient declarations for `useContext` and `useParams`.
 * @param {string} path
 */
function generate_types(path) {
    /**
     * @param {string[]} params
     */
    function generate_param_type(params) {
        let type_declarations = '';
        if (params.length > 0) {
            type_declarations += `interface Params {\n`;
            for (const param of params) {
                type_declarations += `\t${
                    regex_is_valid_identifier.test(param)
                        ? param
                        : `['${param.replace(/\'/g, "\\'")}']`
                }: string;\n`;
            }
            type_declarations += `}\n`;
        } else {
            type_declarations += `interface Params {}\n`;
        }
        return type_declarations;
    }
    const context = gather_all_context_types(path);
    /** @type {string[]} */
    const params = [];
    let dir = path;
    while (dir.length > 0) {
        const { base, dir: next } = parse(dir);
        if (base.match(/^\[.+\]$/)) {
            params.push(base.slice(1, -1));
        }
        dir = next;
    }
    let type_declarations = `import type { __Request, __LoadFunction, __MergeContext } from \'#__types\';\nexport {};\n`;
    if (Object.keys(context.context).length > 0) {
        const ctx = context.context;
        type_declarations += `type Context = __MergeContext<[{\n`;
        for (const key in ctx) {
            type_declarations += `\t${
                regex_is_valid_identifier.test(key)
                    ? key
                    : `['${key.replace(/\'/g, "\\'")}']`
            }: {\n`;
            for (const subkey in ctx[key]) {
                type_declarations += `\t\t${
                    regex_is_valid_identifier.test(subkey)
                        ? subkey
                        : `['${subkey.replace(/\'/g, "\\'")}']`
                }: ${ctx[key][subkey]};\n`;
            }
            type_declarations += `\t};\n`;
        }
        type_declarations += `}${context.load_fns
            .map(
                load_fn =>
                    `, Awaited<ReturnType<typeof import('${load_fn}').default>>`
            )
            .join('')}]>;\n// @ts-ignore\ndeclare module '#server' {\n`;
        type_declarations += `\texport function useContext(): Context;\n`;
        type_declarations += `\texport function useContext<K extends keyof Context>(key: K): Context[K];\n`;
        if (params.length > 0) {
            type_declarations += `\t// @ts-ignore\n\texport function useParams<K extends keyof Params>(param: K): Params[K];\n`;
        }
        type_declarations += `\t// @ts-ignore\n\texport function useParams(): Params;\n`;
        type_declarations += '}\ndeclare global {\n';
        type_declarations += `\texport function useContext<K extends keyof Context>(key: K): Context[K];\n`;
    } else {
        type_declarations += `// @ts-ignore\ndeclare module '#server' {\n`;
        type_declarations += `\texport function useContext(): Context;\n`;
        if (params.length > 0) {
            type_declarations += `\t// @ts-ignore\n\texport function useParams<K extends keyof Params>(param: K): Params[K];\n`;
        }
        type_declarations += `\t// @ts-ignore\n\texport function useParams(): Params;\n`;
        type_declarations += `}\ntype Context = __MergeContext<[{}${context.load_fns
            .map(
                load_fn =>
                    `, Awaited<ReturnType<typeof import('${load_fn}').default>>`
            )
            .join('')}]>;\ndeclare global {\n`;
    }
    type_declarations += `\texport function useContext(): Context;\n`;
    if (params.length > 0) {
        type_declarations +=
            '\texport function useParams<K extends keyof Params>(key: K): Params[K];\n';
    }
    type_declarations += '\texport function useParams(): Params;\n';
    type_declarations += '}\n';
    type_declarations += generate_param_type(params);
    type_declarations += `export type Request = __Request<Params>;\n`;
    type_declarations += `export type LoadFunction<T extends {} | null | void> = __LoadFunction<Request, T>;\n`;
    return type_declarations;
}

/**
 * @param {string} path
 */
async function gather_load_functions(path) {
    let dir = path;
    /** @type {Array<(request: __Request<Record<string, string>>) => any>} */
    const load_fns = [];
    while (dir.length > 1) {
        const load_path = join(dir, '+load.js');
        if (existsSync(load_path)) {
            const { default: load } = await import(load_path);
            load_fns.push(load);
        }
        ({ dir } = parse(dir));
    }
    return load_fns;
}

/**
 * @param {string} path
 */
function gather_load_function_paths(path) {
    let dir = path;
    /** @type {string[]} */
    const load_fns = [];
    let relative = '.';
    while (dir.length > 1) {
        const load_path = join(dir, '+load.js');
        if (existsSync(load_path)) {
            load_fns.push(`${relative}/+load.js`);
        }
        ({ dir } = parse(dir));
        relative += relative === '.' ? '.' : '/..';
    }
    return load_fns;
}

/**
 * @param {Request} req
 * @param {Response} res
 * @param {Record<string, string>} params
 * @returns {__Request<Record<string, string>>}
 */
function create_request_object(req, res, params) {
    return {
        request: req,
        params: params,
        path: req.path,
        setHeaders(headers) {
            res.set(headers);
        }
    };
}

/**
 * @template T
 * @param {T} err
 * @returns {T is { message: string; status: number }}
 */
function is_error_object(err) {
    if (typeof err !== 'object' || err === null) return false;
    if (Object.keys(err).length !== 2) return false;
    if (!('message' in err) || !('status' in err)) return false;
    if (typeof err.message !== 'string' || typeof err.status !== 'number')
        return false;
    return true;
}

app.use(async (req, res, next) => {
    console.log('running');
    /**
     * @param {{ err?: { message: string; status: number; }; params?: Record<string, string> }} [data]
     */
    async function error({
        err = {
            message: 'Not found',
            status: 404
        },
        params = {}
    } = {}) {
        const error_path = find_closest_error_path(path);
        if (error_path !== null) {
            const template = readFileSync(error_path, 'utf-8');
            res.status(err.status).send(
                await transform(
                    template,
                    error_path,
                    create_request_object(req, res, params),
                    {
                        path: error_path,
                        params: params
                    },
                    err,
                    prefetching
                )
            );
            return;
        } else {
            res.status(err.status);
        }
    }
    if (req.path === 'events' && DEV) return next();
    const path = join(process.cwd(), 'src', 'routes', ...req.path.split('/'));
    const prefetching = typeof req.query.prefetching === 'string';
    console.log(path);
    if (existsSync(path)) {
        console.log('exists');
        const stats = statSync(path);
        if (stats.isFile()) {
            const type = path.split('.').at(-1);
            res.contentType(`.${type === 'ts' ? 'txt' : type ?? 'txt'}`);
            res.sendFile(path, { root: '.' });
        } else {
            const html_path = join(path, 'index.html');
            const template = readFileSync(join(path, 'index.html'), 'utf-8');
            res.contentType('.html');
            try {
                res.send(
                    await transform(
                        template,
                        join(path, 'index.html'),
                        create_request_object(req, res, {}),
                        {
                            path: join(path, 'index.html'),
                            params: {}
                        },
                        null,
                        prefetching
                    )
                );
            } catch (_err) {
                const err = /** @type {{ message: string; status: number }} */ (
                    is_error_object(_err)
                        ? _err
                        : { message: STATUS_CODES[500], status: 500 }
                );
                await error({ err });
            }
        }
        return;
    } else {
        const parsed_params = params(join(...path.split('/')));
        if (existsSync(parsed_params.path)) {
            const stats = statSync(parsed_params.path);
            if (stats.isFile()) {
                const type = parsed_params.path.split('.').at(-1);
                res.contentType(`.${type === 'ts' ? 'txt' : type ?? 'txt'}`);
            } else {
                const path = parsed_params.path;
                const html_path = join(...path.split('/'), 'index.html');
                const template = readFileSync(html_path, 'utf-8');
                res.contentType('.html');
                try {
                    res.send(
                        await transform(
                            template,
                            html_path,
                            create_request_object(
                                req,
                                res,
                                parsed_params.params
                            ),
                            parsed_params,
                            null,
                            prefetching
                        )
                    );
                } catch (_err) {
                    const err =
                        /** @type {{ message: string; status: number }} */ (
                            is_error_object(_err)
                                ? _err
                                : { message: STATUS_CODES[500], status: 500 }
                        );
                    await error({ err });
                }
            }
            return;
        } else {
            await error({ params: parsed_params.params });
        }
    }
});

/**
 * @param {string} path
 */
function find_closest_error_path(path) {
    let dir = path;
    while (dir.length > 1) {
        const error_path = join(dir, '+error', 'index.html');
        if (existsSync(error_path)) {
            return error_path;
        }
        ({ dir } = parse(dir));
    }
    return null;
}

/**
 * @param {string} path
 * @param {{ message: string; status: number } | null} [error]
 */
async function gather_all_contexts(path, error = null) {
    let dir = path;
    /** @type {Record<string, Record<string, any>>} */
    const context = {};
    if (parse(path).base === '+error' && error !== null) {
        context.error = error;
    }
    while (dir.length > 1) {
        const contexts = readdirSync(dir).filter(
            path =>
                statSync(join(dir, path)).isDirectory() &&
                path.match(/^\(.+\)$/)
        );
        for (const folder of contexts) {
            const path = join(dir, folder);
            for (const file of readdirSync(path)) {
                const module = await import(join(path, file));
                if (module?.default) {
                    (context[folder.slice(1, -1)] ??= {})[file.slice(0, -3)] =
                        module.default;
                }
            }
        }
        ({ dir } = parse(dir));
    }
    return context;
}

/**
 * @param {string} path
 */
function gather_all_context_types(path) {
    let dir = path;
    /** @type {Record<string, Record<string, string>>} */
    const context = {};
    if (parse(path).base === '+error') {
        context.error = { message: 'string', status: 'number' };
    }
    const load_fns = gather_load_function_paths(path);
    let relative = '.';
    while (dir.length > 1) {
        const contexts = readdirSync(dir).filter(
            path =>
                statSync(`${dir}/${path}`).isDirectory() &&
                path.match(/^\(.+\)$/)
        );
        for (const folder of contexts) {
            const path = `${dir}/${folder}`;
            for (const file of readdirSync(path)) {
                const context_key = folder.slice(1, -1);
                const file_key = file.slice(0, -3);
                (context[context_key] ??= {})[
                    file_key
                ] = `typeof import('${relative}/${folder}/${file}').default`;
            }
        }
        relative += relative === '.' ? '.' : '/..';
        ({ dir } = parse(dir));
    }
    return { context, load_fns };
}

/**
 * Transforms the template to include `<head>` content and context/params injection.
 * @param {string} template
 * @param {string} url
 * @param {__Request<Record<string, string>>} request
 * @param {ReturnType<typeof params>} [params]
 * @param {{ message: string; status: number } | null} [error]
 * @param {boolean} [prefetching]
 */
async function transform(
    template,
    url,
    request,
    params = { path: '', params: {} },
    error = null,
    prefetching = false
) {
    const dir = parse(url).dir;
    const context = await gather_all_contexts(dir, error);
    // we clone the context to (1) assert that its valid and (2) avoid mutation during `load` functions
    active_context = deserialize(stringify(context));
    active_params = structuredClone(params.params);
    const load_fns = await gather_load_functions(dir);
    for (const load of load_fns) {
        const res = (await load(request)) ?? {};
        if (typeof res !== 'object') {
            throw new Error(
                'the return value of each `load` function must be an object or nullish value'
            );
        }
        active_context = deserialize(stringify(Object.assign(context, res)));
        active_params = structuredClone(params.params);
    }
    const [title, ...lines] = template.split(/\r?\n/g);
    const body = lines.join('\n');
    let main_script = existsSync(
        join(process.cwd(), 'src', 'routes', '+client.js')
    )
        ? (
              await minify(
                  readFileSync(
                      join(process.cwd(), 'src', 'routes', '+client.js'),
                      'utf-8'
                  )
              )
          ).code
        : '';
    let script =
        existsSync(join(dir, '+client.js')) &&
        dir !== join(process.cwd(), 'src', 'routes')
            ? (await minify(readFileSync(join(dir, '+client.js'), 'utf-8')))
                  .code
            : '';
    active_context = active_params = null;
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
        ${prefetching ? '' : `<script type="module">${main_script}</script>`}
        <script type="module">${script}</script>${
        DEV
            ? `
        <script>
            fetch(\`/events?path=${encodeURIComponent(
                params.path.replace(/^\.\/routes\//, '')
            )}\`)
                .then(res => res.text())
                .then(() => {
                    console.log('reloading');
                    location.reload();
                });
        </script>`
            : ''
    }
        <script>
            (function() {
                const empty = Symbol();
                globalThis.useContext = function useContext(key = empty) {
                    const context = ${uneval(context)};
                    return key === empty ? context : context[key];
                };
                globalThis.useParams = function useParams(param = empty) {
                    const params = ${uneval(params.params)};
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

if (DEV) {
    app.listen(3000, () => {
        console.log(
            `${kleur.gray('Server running at ')}${kleur.green(
                kleur.bold('http://localhost:3000')
            )}`
        );
    });
}

export default app;
