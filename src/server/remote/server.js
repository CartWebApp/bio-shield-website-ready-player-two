// this is the server version of remote functions.
// the module that exports remote functions, `#remote`, is different
// based on whether the code is running on the server or client.
// so, this makes endpoints for each remote function
// @ts-check
/** @import { __RemoteFunctionResponseBody, RemoteQuery, RemoteCommand, __RemoteFunctionRequestBody, RemoteQueryFunction, MaybePromise } from '../types.js' */
/** @import { Request, Response } from 'express' */
/** @import { StandardSchemaV1 } from '@standard-schema/spec' */
import app, { remote_endpoints, remote_functions } from '../index.js';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { parse, stringify } from 'devalue';
import { join } from 'path';
let remote_json = existsSync('/tmp')
    ? '/tmp/remote.json'
    : join(process.cwd(), 'src', 'server', 'remote', 'remote.json');
if (existsSync('/tmp')) {
    console.log('tmp exists!');
    writeFileSync('/tmp/remote.json', '0');
}
let remote_id = JSON.parse(
    readFileSync(
        remote_json,
        'utf-8'
    )
);
/** @type {Array<{ promise: Promise<void>; id: number; argument: any; resolved: boolean; error: string; result: string; success: boolean }> | null} */
let pending_refreshers = null;

// these types were modified
// but originally came from
// https://github.com/sveltejs/kit/blob/e1772285ac1005cb59fcfb7c705d9f15376bb366/packages/kit/src/runtime/app/server/remote/query.js
/**
 * @template Output
 * @overload
 * @param {() => MaybePromise<Output>} fn
 * @returns {RemoteQueryFunction<() => Output>}
 */
/**
 * @template Input
 * @template Output
 * @overload
 * @param {'unchecked'} validate
 * @param {(arg: Input) => MaybePromise<Output>} fn
 * @returns {RemoteQueryFunction<(arg: Input) => Output>}
 */
/**
 * @template {StandardSchemaV1} Schema
 * @template Output
 * @overload
 * @param {Schema} schema
 * @param {(arg: StandardSchemaV1.InferOutput<Schema>) => MaybePromise<Output>} fn
 * @returns {RemoteQueryFunction<(arg: StandardSchemaV1.InferInput<Schema>) => Output>}
 */
/**
 * @template Input
 * @template Output
 * @param {any} validate_or_fn
 * @param {(args?: Input) => MaybePromise<Output>} [maybe_fn]
 * @returns {RemoteQueryFunction<(arg: Input) => Output>}
 */
export function query(validate_or_fn, maybe_fn) {
    /** @typedef {(arg: Input) => Output} T */
    /** @type {(args: Parameters<RemoteQueryFunction<T>>['0']) => Promise<StandardSchemaV1.Result<Parameters<RemoteQueryFunction<T>>['0']>>} */
    const validate =
        typeof validate_or_fn === 'object'
            ? async (...args) =>
                  await validate_or_fn['~standard'].validate(args[0])
            : async (...args) => ({ value: args[0], issues: undefined });
    const fn =
        typeof maybe_fn === 'function'
            ? maybe_fn
            : /** @type {T} */ (validate_or_fn);
    const id = remote_id++;
    writeFileSync(
        remote_json,
        id.toString()
    );
    console.log(id);
    /**
     * @param {Request} req
     * @param {Response} res
     */
    async function handle(req, res) {
        /** @type {__RemoteFunctionRequestBody} */
        const body = JSON.parse(req.body);
        const argument =
            /** @type {Parameters<RemoteQueryFunction<T>>['0']} */ (
                parse(body.argument)
            );
        try {
            const validated = await validate(argument);
            if (validated.issues !== undefined) {
                res.status(500).json({
                    success: false
                });
                return;
            }
            const result = await fn(validated.value);
            /** @type {__RemoteFunctionResponseBody} */
            const response = {
                success: true,
                error: stringify(null),
                result: stringify(result)
            };
            res.json(response);
        } catch (err) {
            /** @type {__RemoteFunctionResponseBody} */
            const response = {
                success: false,
                error: stringify(err),
                result: stringify(null)
            };
            res.json(response);
        }
    }
    app.post(`/%${id}`, handle);
    remote_endpoints.set(`/:${id}`, handle);
    console.log([...remote_endpoints.keys()]);
    const res = /** @type {RemoteQueryFunction<T>} */ (
        Object.assign(
            /** @type {RemoteQueryFunction<T>} */ (
                arg => {
                    /** @type {Awaited<ReturnType<T>> | undefined} */
                    let current;
                    /** @type {any} */
                    let error;
                    let ready = false;
                    const promise = new Promise(async (resolve, reject) => {
                        try {
                            resolve((current = await fn(arg)));
                            error = undefined;
                            ready = true;
                        } catch (err) {
                            current = undefined;
                            reject((error = err));
                        }
                    });
                    return /** @type {RemoteQuery<ReturnType<T>>} */ ({
                        get then() {
                            return promise.then.bind(promise);
                        },
                        get catch() {
                            return promise.catch.bind(promise);
                        },
                        get finally() {
                            return promise.finally.bind(promise);
                        },
                        get error() {
                            return error;
                        },
                        get loading() {
                            return true;
                        },
                        get ready() {
                            return ready;
                        },
                        get current() {
                            return current;
                        },
                        set(value) {
                            (pending_refreshers ??= []).push({
                                id,
                                promise: Promise.resolve(),
                                resolved: true,
                                argument: stringify(arg),
                                success: true,
                                result: stringify(value),
                                error: stringify(undefined)
                            });
                        },
                        refresh() {
                            const refresher = {
                                id,
                                argument: stringify(arg),
                                promise: promise.then(
                                    res => {
                                        refresher.success = false;
                                        refresher.resolved = true;
                                        refresher.result = stringify(res);
                                    },
                                    err => {
                                        refresher.success = false;
                                        refresher.resolved = true;
                                        refresher.error = stringify(err);
                                    }
                                ),
                                resolved: false,
                                result: stringify(undefined),
                                success: false,
                                error: stringify(undefined)
                            };
                            (pending_refreshers ??= []).push(refresher);
                            return refresher.promise;
                        },
                        withOverride() {
                            throw new Error(
                                'cannot call `query.withOverride` on the server'
                            );
                        }
                    });
                }
            ),
            { __remote: { id, type: 'query' } }
        )
    );
    remote_functions.set(res, handle);
    return res;
}

// these types were modified
// but originally came from
// https://github.com/sveltejs/kit/blob/e1772285ac1005cb59fcfb7c705d9f15376bb366/packages/kit/src/runtime/app/server/remote/command.js
/**
 * @template Output
 * @overload
 * @param {() => Output} fn
 * @returns {RemoteCommand<void, Output>}
 */
/**
 * @template Input
 * @template Output
 * @overload
 * @param {'unchecked'} validate
 * @param {(arg: Input) => Output} fn
 * @returns {RemoteCommand<Input, Output>}
 */
/**
 * @template {StandardSchemaV1} Schema
 * @template Output
 * @overload
 * @param {Schema} validate
 * @param {(arg: StandardSchemaV1.InferOutput<Schema>) => Output} fn
 * @returns {RemoteCommand<StandardSchemaV1.InferInput<Schema>, Output>}
 */
/**
 * @template Input
 * @template Output
 * @param {any} validate_or_fn
 * @param {(arg?: Input) => Output} [maybe_fn]
 * @returns {RemoteCommand<Input, Output>}
 */
export function command(validate_or_fn, maybe_fn) {
    /** @typedef {(arg: Input) => Output} T */
    /** @type {(args: Input) => Promise<StandardSchemaV1.Result<Input>>} */
    const validate =
        typeof validate_or_fn === 'object'
            ? async (...args) =>
                  await validate_or_fn['~standard'].validate(args[0])
            : async (...args) => ({ value: args[0], issues: undefined });
    const fn =
        typeof maybe_fn === 'function'
            ? maybe_fn
            : /** @type {T} */ (validate_or_fn);
    const id = remote_id++;

    /**
     * @param {Request} req
     * @param {Response} res
     */
    async function handle(req, res) {
        /** @type {__RemoteFunctionRequestBody} */
        const body = JSON.parse(req.body);
        const argument = parse(body.argument);
        const updates = [];
        try {
            const validated = await validate(argument);
            if (validated.issues !== undefined) {
                res.status(500).json({
                    success: false
                });
                return;
            }
            const result = await fn(validated.value);
            if (pending_refreshers !== null) {
                for (const refresher of pending_refreshers) {
                    if (refresher.resolved) {
                        const { resolved, promise, ...res } = refresher;
                        updates.push(res);
                    } else {
                        await refresher.promise;
                        const { resolved, promise, ...res } = refresher;
                        updates.push(res);
                    }
                }
            }
            /** @type {__RemoteFunctionResponseBody} */
            const response = {
                success: true,
                error: stringify(undefined),
                result: stringify(result),
                queries: updates
            };
            res.json(response);
        } catch (err) {
            if (pending_refreshers !== null) {
                for (const refresher of pending_refreshers) {
                    if (refresher.resolved) {
                        const { resolved, promise, ...res } = refresher;
                        updates.push(res);
                    } else {
                        await refresher.promise;
                        const { resolved, promise, ...res } = refresher;
                        updates.push(res);
                    }
                }
            }
            /** @type {__RemoteFunctionResponseBody} */
            const response = {
                success: false,
                error: stringify(err),
                result: stringify(undefined),
                queries: updates
            };
            res.json(response);
        }
        pending_refreshers = null;
    }
    // remote_endpoints.set(`/:${id}`, handle);
    app.post(`/%${id}`, handle);
    const res = /** @type {RemoteCommand<Input, Output>} */ (
        Object.assign(
            /** @type {RemoteCommand<Input, Output>} */ (
                arg => {
                    const promise = new Promise(async (resolve, reject) => {
                        try {
                            resolve(await fn(arg));
                        } catch (err) {
                            reject(err);
                        }
                    });
                    return /** @type {ReturnType<RemoteCommand<Input, Output>>} */ ({
                        get then() {
                            return promise.then.bind(promise);
                        },
                        get catch() {
                            return promise.catch.bind(promise);
                        },
                        get finally() {
                            return promise.finally.bind(promise);
                        },
                        get pending() {
                            return 0;
                        },
                        async updates() {
                            throw new Error(
                                '`command.updates` cannot be called on the server'
                            );
                        }
                    });
                }
            ),
            { __remote: { id, type: 'command' } }
        )
    );
    remote_functions.set(res, handle);
    return res;
}
