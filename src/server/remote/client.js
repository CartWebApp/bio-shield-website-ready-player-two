// this is the client version of remote functions.
// when `.remote.js` modules are transformed, the arguments to `query` and `command`
// in each export are replaced with the endpoint at which the remote function
// can be called.
// so, this has to `fetch` that endpoint and deal with most of work that comes with
// single-flight mutations.
/** @import { __RemoteFunctionRequestBody, __RemoteFunctionResponseBody, RemoteCommand, RemoteQuery, RemoteQueryOverride } from '#__types' */
// @ts-check
import { parse, stringify } from 'devalue';
/** @typedef {{ current: any; error: any }} RemoteQueryContext */
/** @typedef {{ query: RemoteQuery<any>; set(context: RemoteQueryContext): void }} RemoteQueryEntry */
/** @type {Map<number, Map<any, RemoteQueryEntry>>} */
const remote_queries = new Map();
/** @type {Map<RemoteQuery<any>, { id: number; arg: any }>} */
const remote_queries_dictionary = new Map();
/** @type {Map<RemoteQueryOverride, { id: number; arg: any }>} */
const overrides = new Map();
/** @type {Set<{ id: number }>} */
const pending = new Set();
/**
 * @param {number} id
 * @returns {(arg: any) => RemoteQuery<any>}
 */
export function query(id) {
    if (typeof id !== 'number') {
        throw new Error('remote functions must be exported');
    }
    if (!remote_queries.has(id)) {
        remote_queries.set(id, new Map());
    }
    const queries = /** @type {Map<any, RemoteQueryEntry>} */ (
        remote_queries.get(id)
    );

    return arg => {
        const cached = queries.get(arg);
        if (typeof cached === 'object') {
            return /** @type {RemoteQuery<any>} */ (cached.query);
        }
        /** @type {any} */
        let current;
        /** @type {any} */
        let error;
        let ready = false;
        let loading = true;
        const create_promise = () =>
            new Promise(async (resolve, reject) => {
                loading = true;
                try {
                    resolve(
                        (current = await (async () => {
                            const body =
                                /** @type {__RemoteFunctionRequestBody} */ ({
                                    argument: stringify(arg)
                                });
                            const res = await fetch(`/:${id}`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'text/plain',
                                    'remote_query': 'true'
                                },
                                body: JSON.stringify(body)
                            });
                            const json =
                                /** @type {__RemoteFunctionResponseBody} */ (
                                    await res.json()
                                );
                            if (json.success) {
                                return parse(json.result);
                            } else {
                                throw parse(json.error);
                            }
                        })())
                    );
                    error = undefined;
                } catch (err) {
                    reject((error = err));
                }
                loading = false;
                ready = true;
            });
        create_promise().catch(() => {});
        /** @type {RemoteQuery<any>} */
        const query = {
            get then() {
                const promise = create_promise();
                return promise.then.bind(promise);
            },
            get catch() {
                const promise = create_promise();
                return promise.catch.bind(promise);
            },
            get finally() {
                const promise = create_promise();
                return promise.finally.bind(promise);
            },
            get error() {
                return error;
            },
            get loading() {
                return loading;
            },
            get ready() {
                return ready;
            },
            get current() {
                return current;
            },
            set(value) {
                current = value;
                loading = false;
                ready = true;
                error = undefined;
            },
            refresh() {
                return create_promise().then(
                    () => {},
                    () => {}
                );
            },
            withOverride(fn) {
                const prev = current;
                current = fn(current);
                const override = {
                    release() {
                        current = prev;
                    }
                };
                overrides.set(override, {
                    id,
                    arg
                });
                return override;
            }
        };
        queries.set(arg, {
            query,
            set(context) {
                current = context.current;
                error = context.error;
            }
        });
        remote_queries_dictionary.set(query, {
            id,
            arg
        });
        return query;
    };
}

/**
 * @param {number} id
 * @returns {RemoteCommand<any, any>}
 */
export function command(id) {
    if (typeof id !== 'number') {
        throw new Error('remote functions must be exported');
    }
    /**
     * @param {any} arg
     * @returns {ReturnType<RemoteCommand<any, any>>}
     */
    const res = arg => {
        /** @type {Array<{ id: number; arg: any}> | undefined} */
        let updates = undefined;
        const create_promise = () =>
            (promise = new Promise(async (resolve, reject) => {
                const instance = { id, arg };
                pending.add(instance);
                try {
                    resolve(
                        await (async () => {
                            const body =
                                /** @type {__RemoteFunctionRequestBody} */ ({
                                    argument: stringify(arg),
                                    queries:
                                        typeof updates === 'object'
                                            ? updates.map(({ id, arg }) => ({
                                                  id,
                                                  argument: stringify(arg)
                                              }))
                                            : [
                                                  ...remote_queries_dictionary.values()
                                              ].map(({ id, arg }) => ({
                                                  id,
                                                  argument: stringify(arg)
                                              }))
                                });
                            const res = await fetch(`/:${id}`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'text/plain',
                                    'remote_query': 'true'
                                },
                                body: JSON.stringify(body)
                            });
                            const json =
                                /** @type {__RemoteFunctionResponseBody} */ (
                                    await res.json()
                                );
                            const { queries } = json;
                            if (typeof queries === 'object') {
                                for (const query of queries) {
                                    const map = remote_queries.get(query.id);
                                    if (map === undefined) {
                                        continue;
                                    }
                                    const entry = map.get(
                                        parse(query.argument)
                                    );
                                    if (entry === undefined) {
                                        continue;
                                    }
                                    entry.set({
                                        current: parse(json.result),
                                        error: parse(json.error)
                                    });
                                }
                            }
                            if (json.success) {
                                return parse(json.result);
                            } else {
                                throw parse(json.error);
                            }
                        })()
                    );
                } catch (err) {
                    reject(err);
                }
                updates = undefined;
                pending.delete(instance);
            }));
        /** @type {Promise<any>} */
        let promise;
        /** @type {ReturnType<RemoteCommand<any, any>>} */
        const command = {
            get then() {
                const promise = create_promise();
                return promise.then.bind(promise);
            },
            get catch() {
                const promise = create_promise();
                return promise.catch.bind(promise);
            },
            get finally() {
                const promise = create_promise();
                return promise.finally.bind(promise);
            },
            updates(...queries) {
                updates = [];
                /** @type {Array<{ id: number; arg: any }>} */
                const _queries = [];
                for (const query of queries) {
                    if ('release' in query) {
                        _queries.push(
                            /** @type {{ id: number; arg: any }} */ (
                                overrides.get(query)
                            )
                        );
                    } else {
                        _queries.push(
                            /** @type {{ id: number; arg: any }} */ (
                                remote_queries_dictionary.get(query)
                            )
                        );
                    }
                }
                updates = _queries;
                return promise;
            }
        };
        return command;
    };
    Object.defineProperty(res, 'pending', {
        get() {
            return [...pending].filter(({ id: _id }) => _id === id).length;
        }
    });
    return /** @type {RemoteCommand<any, any>} */ (res);
}
