/** @import { __Request } from '#__types'  */
import { STATUS_CODES } from 'http';
import { get_active_route } from './server.js';
/** @typedef {__Request<Record<string, string>>} Request */

/**
 * Triggers an HTTP error when used in a `load` function.
 * @param {number} status
 * @param {string} [message]
 * @returns {never}
 */
export function error(status, message = STATUS_CODES[status]) {
    throw {
        status,
        message
    };
}

/**
 * @param {string} [key]
 */
export function useContext(key) {
    const route = get_active_route(
        '`useContext` can only be called in a `load` function'
    );
    return typeof key === 'string' ? route.context[key] : route.context;
}

/**
 * @param {string} [param]
 */
export function useParams(param) {
    const route = get_active_route(
        '`useParams` can only be called in a `load` function'
    );
    return typeof param === 'string'
        ? route.request.params[param]
        : route.request.params;
}

/**
 * @returns {Request}
 */
export function getRequest() {
    const route = get_active_route(
        '`getRequest` can only be called in a `load` function'
    );
    return route.request;
}

import { escape } from './server.js';
export { escape };

/**
 * `insert` provides some SSR functions that allow you to insert
 * HTML into a route's page in a `load` function.
 */
export const insert = {
    /**
     * `insert.head` provides utilities to append and prepend HTML to
     * the `<head>` of your route.
     */
    get head() {
        return get_active_route(
            `\`insert.head\` can only be accessed in a \`load\` function`
        ).head.body;
    },
    /**
     * `insert.body` provides utilities to append, prepend,
     * and replace HTML in the `<body>` of your route.
     */
    get body() {
        return get_active_route(
            `\`insert.body\` can only be accessed in a \`load\` function`
        ).body.body;
    },
    /**
     * Sets the `<title>`. This takes precendence over the hardcoded title.
     * `title` is escaped to avoid XSS.
     * @param {string} title
     */
    title(title) {
        const route = get_active_route(
            `\`insert.head\` can only be accessed in a \`load\` function`
        );
        route.title = escape(title);
    }
};
