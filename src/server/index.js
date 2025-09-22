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
/** @typedef {{ body: InsertionManager<'body'>; title: string; head: InsertionManager<'head'> }} Body */
/** @typedef {{ request: __Request<Record<string, string>>; context: Record<string, Record<string, any>> } & Body} Route */
/** @type {Route | null} */
export let active_route = null;
/** @type {Map<string, (req: Request, res: Response) => Promise<void>>} */
export const remote_endpoints = new Map();

if (chokidar) {
    // In dev, this *should* reload the page when the corresponding HTML changes
    // it does this using a cheap copy of Server-Sent Events (since actual SSE wasn't working for me)
    // the client-side code for this can be found in {@link transform `transform`}'s return value.
    /** @type {Map<string, Array<Response>>} */
    const watchers = new Map();
    app.get('/events', (req, res) => {
        const _path = decodeURIComponent(
            /** @type {string} */ (req.query.path)
        );
        const path = join(process.cwd(), 'src', 'routes', ..._path.split('/'));

        if (!watchers.has(path)) {
            watchers.set(path, []);
            chokidar.watch(path).on('change', _path => {
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
    const parts = path.split(sep);
    let i = parts.length;
    /** @type {Record<string, string>} */
    const params = {};
    while ([...dir].filter(char => char === sep).length > 1) {
        while (
            !existsSync(dir) &&
            [...dir].filter(char => char === sep).length > 1
        ) {
            child = dir;
            ({ dir } = parse(dir));
            i--;
        }
        if ([...dir].filter(char => char === sep).length <= 1) {
            break;
        }
        const has_params = readdirSync(dir).find(
            folder =>
                statSync(join(dir, folder), {
                    throwIfNoEntry: false
                })?.isDirectory() && /^\[.+\]$/.test(folder)
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
        path: parts.join(sep)
    };
}

function generate_all_types() {
    for (const file of readdirSync(join(process.cwd(), 'src', 'routes'), {
        recursive: true
    })) {
        if (typeof file !== 'string' || parse(file).base !== 'index.html')
            continue;

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
                !existsSync(join(dir, 'types.d.ts')) ||
                types !== readFileSync(join(dir, 'types.d.ts'), 'utf-8')
            ) {
                writeFileSync(join(dir, 'types.d.ts'), types);
            }
            // because typescript always implicitly `<reference>`s ambient type declarations,
            // we have to create a tsconfig for each route :|
            if (!existsSync(join(dir, 'tsconfig.json'))) {
                writeFileSync(
                    join(dir, 'tsconfig.json'),
                    JSON.stringify(
                        {
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
                        },
                        null,
                        4
                    )
                );
            }
        } catch (err) {
            console.error(err);
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
            type_declarations += `export interface Params {\n`;
            for (const param of params) {
                type_declarations += `\treadonly ${
                    regex_is_valid_identifier.test(param)
                        ? param
                        : `['${param.replace(/\'/g, "\\'")}']`
                }: string;\n`;
            }
            type_declarations += `}\n`;
        } else {
            type_declarations += `export interface Params {}\n`;
        }
        return type_declarations;
    }
    const context = gather_all_context_types(path);
    /** @type {string[]} */
    const params = [];
    let dir = path;
    while ([...dir].filter(char => char === sep).length > 1) {
        const { base, dir: next } = parse(dir);
        if (base.match(/^\[.+\]$/)) {
            params.push(base.slice(1, -1));
        }
        dir = next;
    }
    let type_declarations = `import type {\n\t__Request,\n\t__LoadFunction,\n\t__MergeContext,\n\tMaybePromise,\n\tRemoteQuery as _RemoteQuery,\n\tRemoteCommand as _RemoteCommand,\n\tRemoteQueryFunction as _RemoteQueryFunction,\n\tRemoteQueryOverride as _RemoteQueryOverride,\n\tRemoteResource as _RemoteResource\n} from \'#__types\';\n\n`;
    if (Object.keys(context.context).length > 0) {
        const ctx = context.context;
        type_declarations += `export type Context = __MergeContext<[{\n`;
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
                    `, Awaited<ReturnType<typeof import('${load_fn.replace(
                        /\\/g,
                        '\\\\'
                    )}').default>>`
            )
            .join('')}]>;\n// @ts-ignore\ndeclare module '#server' {\n`;
        type_declarations += `\texport function useContext(): Context;\n`;
        type_declarations += `\texport function useContext<K extends keyof Context>(key: K): Context[K];\n`;
        if (params.length > 0) {
            type_declarations += `\t// @ts-ignore\n\texport function useParams<K extends keyof Params>(param: K): Params[K];\n`;
        }
        type_declarations += `\t// @ts-ignore\n\texport function useParams(): Params;\n`;
        type_declarations += `\t// @ts-ignore\n\texport function getRequest(): Request;\n`;
        type_declarations += '}\ndeclare global {\n';
        type_declarations += `\texport function useContext<K extends keyof Context>(key: K): Context[K];\n`;
    } else {
        type_declarations += `// @ts-ignore\ndeclare module '#server' {\n`;
        type_declarations += `\texport function useContext(): Context;\n`;
        if (params.length > 0) {
            type_declarations += `\t// @ts-ignore\n\texport function useParams<K extends keyof Params>(param: K): Params[K];\n`;
        }
        type_declarations += `\t// @ts-ignore\n\texport function useParams(): Params;\n`;
        type_declarations += `\t// @ts-ignore\n\texport function getRequest(): Request;\n`;
        type_declarations += `}\nexport type Context = __MergeContext<[{}${context.load_fns
            .map(
                load_fn =>
                    `, Awaited<ReturnType<typeof import('${load_fn.replace(
                        /\\/g,
                        '\\\\'
                    )}').default>>`
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
    type_declarations += `
// @ts-ignore
declare module '#remote' {
    // @ts-ignore
    export type RemoteQuery<T> = _RemoteQuery<T>;
    // @ts-ignore
    export type RemoteCommand<Input, Output> = _RemoteCommand<Input, Output>;
    // @ts-ignore
    export type RemoteQueryFunction<T extends (arg?: any) => MaybePromise<any>> = _RemoteQueryFunction<T>;
    // @ts-ignore
    export type RemoteQueryOverride = _RemoteQueryOverride;
    // @ts-ignore
    export type RemoteResource<T> = _RemoteResource<T>;
}\n`;
    return type_declarations;
}

/**
 * @param {string} path
 */
async function gather_load_functions(path) {
    let dir = path;
    /** @type {Array<(request: __Request<Record<string, string>>) => any>} */
    const load_fns = [];
    while ([...dir].filter(char => char === sep).length > 1) {
        const load_path = join(dir, '+load.js');
        if (existsSync(load_path)) {
            const { default: load } = await import(
                `file:${sep}${sep}${load_path}`
            );
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
    while ([...dir].filter(char => char === sep).length > 1) {
        const load_path = join(dir, '+load.js');
        if (existsSync(load_path)) {
            load_fns.push(`${relative}${sep}+load.js`);
        }
        ({ dir } = parse(dir));
        relative += relative === '.' ? '.' : `${sep}..`;
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

/**
 * @param {string} path
 */
async function transform_remote_module(path) {
    const res = ["import { query, command } from '#remote';"];
    let i = 0;
    const module = await import(`file:${sep}${sep}${path}`);
    for (const [key, value] of Object.entries(module)) {
        if (
            typeof value === 'function' &&
            '__remote' in value &&
            typeof value.__remote === 'object'
        ) {
            const { __remote } = value;
            if (
                __remote === null ||
                !('id' in __remote && 'type' in __remote)
            ) {
                continue;
            }
            let id = i++;
            res.push(`let x${id} = ${__remote.type}(${__remote.id});`);
            res.push(
                `export { x${id} as ${
                    regex_is_valid_identifier.test(key)
                        ? key
                        : `'${key.replace(/(\\|')/g, m => `\\${m}`)}'`
                } };`
            );
        }
    }
    return res.join('\n');
}

app.use(express.text());
app.use(async (req, res, next) => {
    if (req.path === '/:remote') {
        res.contentType('.js');
        res.sendFile(
            join(process.cwd(), 'src', 'server', 'remote', 'bundle.js')
        );
        return;
    }
    const remote = remote_endpoints.get(req.path);
    let body = '';
    req.on('data', (chunk) => {
        body += chunk;
    });
    req.on('end', () => {
        console.log(body);
    });
    console.log(remote);
    console.log(req.method);
    console.log(req.headers['remote_query']);
    if (
        typeof remote === 'function' &&
        req.headers['remote_query'] === 'true' &&
        req.method === 'POST'
    ) {
        await remote(req, res);
        return;
    }
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
    const path = join(
        process.cwd(),
        'src',
        'routes',
        ...req.path.split('/').slice(1)
    );
    const prefetching = typeof req.query.prefetching === 'string';
    if (existsSync(path)) {
        const stats = statSync(path, { throwIfNoEntry: false });
        const html_path = join(path, 'index.html');
        if (stats?.isFile()) {
            if (path.endsWith('.remote.js')) {
                res.contentType('.js');
                res.send(await transform_remote_module(path));
                return;
            }
            const type = path.split('.').at(-1);
            res.contentType(`.${type === 'ts' ? 'txt' : type ?? 'txt'}`);
            res.sendFile(path);
            return;
        } else if (
            stats &&
            existsSync(html_path) &&
            statSync(html_path).isFile()
        ) {
            if (!req.path.endsWith('/')) {
                res.redirect(
                    `${req.path}/${prefetching ? '?prefetching=true' : ''}`
                );
                return;
            }
            const template = readFileSync(html_path, 'utf-8');
            res.contentType('.html');
            try {
                res.send(
                    await transform(
                        template,
                        html_path,
                        create_request_object(req, res, {}),
                        {
                            path: html_path,
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
            return;
        }
        await error();
        return;
    } else {
        const parsed_params = params(path);
        if (existsSync(parsed_params.path)) {
            const stats = statSync(parsed_params.path, {
                throwIfNoEntry: false
            });
            const path = parsed_params.path;
            const html_path = join(path, 'index.html');
            if (stats?.isFile()) {
                const type = parsed_params.path.split('.').at(-1);
                res.contentType(`.${type === 'ts' ? 'txt' : type ?? 'txt'}`);
                res.sendFile(parsed_params.path);
                return;
            } else if (existsSync(html_path) && statSync(html_path).isFile()) {
                if (!req.path.endsWith('/')) {
                    res.redirect(
                        `${req.path}/${prefetching ? '?prefetching=true' : ''}`
                    );
                    return;
                }
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
                    await error({ err, params: parsed_params.params });
                }
                return;
            }
            await error({ params: parsed_params.params });
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
    while ([...dir].filter(char => char === sep).length > 1) {
        const contexts = readdirSync(dir).filter(
            path =>
                statSync(join(dir, path), {
                    throwIfNoEntry: false
                })?.isDirectory() && path.match(/^\(.+\)$/)
        );
        for (const folder of contexts) {
            const path = join(dir, folder);
            for (const file of readdirSync(path)) {
                const module = await import(
                    `file:${sep}${sep}${join(path, file)}`
                );
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
    while ([...dir].filter(char => char === sep).length > 1) {
        const contexts = readdirSync(dir).filter(
            path =>
                statSync(join(dir, path), {
                    throwIfNoEntry: false
                })?.isDirectory() && path.match(/^\(.+\)$/)
        );
        for (const folder of contexts) {
            const path = join(dir, folder);
            for (const file of readdirSync(path)) {
                const context_key = folder.slice(1, -1);
                const file_key = file.slice(0, -3);
                (context[context_key] ??= {})[
                    file_key
                ] = `typeof import('${`${relative}${sep}${folder}${sep}${file}`.replace(
                    /\\/g,
                    '\\\\'
                )}').default`;
            }
        }
        relative += relative === '.' ? '.' : `${sep}..`;
        ({ dir } = parse(dir));
    }
    return { context, load_fns };
}

/**
 * @param {string} error_message
 */
export function get_active_route(error_message) {
    const route = active_route;
    if (route === null) {
        throw new Error(error_message);
    }
    return route;
}

/**
 * @template T
 * @typedef {T | Promise<T>} Promisable
 */

/**
 * @template {'body' | 'head'} Type
 */
class InsertionManager {
    /** @type {Type extends 'body' ? InsertionBody : InsertionHead} */
    body;
    /** @type {string[]} */
    append = [];
    /** @type {string[]} */
    prepend = [];
    /** @type {Array<{ matcher: RegExp | string; replacement: string } | ((data: string) => Promisable<string>)>} */
    replacers = [];

    /**
     * @param {Type} key
     */
    constructor(key) {
        // not sure why i have to do so much type finagling here
        this.body =
            /** @type {Type extends 'body' ? InsertionBody : InsertionHead} */ (
                key === 'body'
                    ? new InsertionBody(
                          /** @type {InsertionManager<'body'>} */ (this)
                      )
                    : new InsertionHead(
                          /** @type {InsertionManager<'head'>} */ (this)
                      )
            );
    }
}

class InsertionBody {
    #manager;
    /**
     * Appends HTML *after* the body of the route, but before the last `+base.html` section.
     * @param {string} html
     */
    append(html) {
        get_active_route(
            `\`insert.body.append\` can only be called in a \`load\` function`
        );
        this.#manager.append.push(html);
    }
    /**
     * Prepends HTML *before* the body of the route, but after the first `+base.html` section.
     * @param {string} html
     */
    prepend(html) {
        get_active_route(
            `\`insert.body.prepend\` can only be called in a \`load\` function`
        );
        this.#manager.prepend.unshift(html);
    }
    /**
     * Replaces HTML in the `<body>`. If a function is passed, the function will *not* be called immediately.
     * @param {RegExp | string | ((data: string) => Promisable<string>)} replacer
     * @param {string} [replacement]
     */
    replace(replacer, replacement) {
        get_active_route(
            `\`insert.body.replace\` can only be called in a \`load\` function`
        );
        if (typeof replacer === 'function') {
            this.#manager.replacers.push(replacer);
        } else if (typeof replacement === 'string') {
            this.#manager.replacers.push({
                matcher: replacer,
                replacement
            });
        }
    }
    /**
     * @param {InsertionManager<'body'>} manager
     */
    constructor(manager) {
        this.#manager = manager;
    }
}

class InsertionHead {
    #manager;
    /**
     * Appends HTML after the `+head.html` content.
     * @param {string} html
     */
    append(html) {
        get_active_route(
            `\`insert.head.append\` can only be called in a \`load\` function`
        );
        this.#manager.append.push(html);
    }
    /**
     * Prepends HTML before the `+head.html` content.
     * @param {string} html
     */
    prepend(html) {
        get_active_route(
            `\`insert.head.prepend\` can only be called in a \`load\` function`
        );
        this.#manager.prepend.unshift(html);
    }
    /**
     * @param {InsertionManager<'head'>} manager
     */
    constructor(manager) {
        this.#manager = manager;
    }
}

/**
 * Escapes the `string` passed to it to prevent XSS.
 * @param {string} data
 */
export function escape(data) {
    return data.replace(/["<&]/g, m =>
        m === '"' ? '&quot;' : m === '<' ? '&lt;' : '&amp;'
    );
}

const base = existsSync(join(process.cwd(), 'src', 'routes', '+base.html'))
    ? readFileSync(join(process.cwd(), 'src', 'routes', '+base.html'), 'utf-8')
    : '';
const css = existsSync(join(process.cwd(), 'src', 'routes', '+base.css'))
    ? readFileSync(join(process.cwd(), 'src', 'routes', '+base.css'), 'utf-8')
    : '';

const main_script = existsSync(join(process.cwd(), 'src', 'routes', '+base.js'))
    ? (
          await minify(
              readFileSync(
                  join(process.cwd(), 'src', 'routes', '+base.js'),
                  'utf-8'
              ),
              { module: true }
          )
      ).code
    : '';

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
    /**
     * @param {string} body
     * @param {InsertionManager<'body'>} manager
     */
    async function build_body(body, manager) {
        let res = body;
        for (const replacer of manager.replacers) {
            if (typeof replacer === 'function') {
                res = await replacer(res);
            } else {
                res = res.replace(replacer.matcher, replacer.replacement);
            }
        }
        return manager.prepend.join('') + res + manager.append.join('');
    }
    const dir = parse(url).dir;
    const context = await gather_all_contexts(dir, error);
    // we clone the context to (1) assert that its valid and (2) avoid mutation during `load` functions
    const active_context = /** @type {Record<string, Record<string, any>>} */ (
        deserialize(stringify(context))
    );
    let active_params = structuredClone(params.params);
    const route = (active_route = {
        context: active_context,
        request,
        title: '',
        head: new InsertionManager('head'),
        body: new InsertionManager('body')
    });
    active_route.request.params = active_params;
    const load_fns = await gather_load_functions(dir);
    for (const load of load_fns) {
        const res = (await load(request)) ?? {};
        if (typeof res !== 'object') {
            throw new Error(
                'the return value of each `load` function must be an object or nullish value'
            );
        }
        active_route.context =
            /** @type {Record<string, Record<string, any>>} */ (
                deserialize(stringify(Object.assign(context, res)))
            );
        active_route.request.params = structuredClone(
            active_route.request.params
        );
    }
    const [title, ...lines] = template.split(/\r?\n/g);
    const body = await build_body(lines.join('\n\t\t'), route.body);
    active_route = null;
    const script = existsSync(join(dir, '+client.js'))
        ? (
              await minify(readFileSync(join(dir, '+client.js'), 'utf-8'), {
                  module: true
              })
          ).code
        : '';
    const head =
        route.head.prepend.join('') +
        (existsSync(join(process.cwd(), 'src', 'routes', '+head.html'))
            ? readFileSync(
                  join(process.cwd(), 'src', 'routes', '+head.html'),
                  'utf-8'
              )
            : '') +
        route.head.append.join('');
    return `<!DOCTYPE html>
<html lang="en">
    <head>
        ${
            prefetching
                ? ''
                : `<script type="importmap">
            {
                "imports": {
                    "#remote": "/:remote"
                }
            }
        </script>`
        }
        ${head}
        <title>${route.title !== '' ? route.title : escape(title)}</title>
        ${
            prefetching ||
            typeof main_script !== 'string' ||
            main_script.length === 0
                ? ''
                : `<script type="module">${main_script}</script>`
        }
        ${
            typeof script === 'string' && script.length > 0
                ? `<script type="module">${script}</script>`
                : ''
        }${
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
        ${css !== '' ? `<style>${css}</style>` : ''}
    </head>
    <body>
        ${base.split(/\n{4}/)[0]}
        ${body}
        ${base.split(/\n{4}/)[1] ?? ''}
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
