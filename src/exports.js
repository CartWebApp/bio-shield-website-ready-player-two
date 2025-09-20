/** @import { __Request } from '#__types'  */
import { STATUS_CODES } from 'http';
import { active_route } from './server.js';
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
 * @param {string} error_message
 */
function get_active_route(error_message) {
    const route = active_route;
    if (route === null) {
        throw new Error(error_message);
    }
    return route;
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

/**
 * `insert` provides some SSR functions that allow you to insert
 * HTML into a route's page in a `load` function.
 */
export const insert = {
    /**
     * Inserts HTML into the `<head>`.
     * @param {string} head
     */
    head(head) {
        const route = get_active_route(
            '`insert.head` can only be called in a `load` function'
        );
        route.head += head;
    },
    /**
     * Inserts HTML into the `<body>`, after the first `+base.html` section.
     * @param {string} body
     */
    body(body) {
        const route = get_active_route(
            '`insert.body` can only be called in a `load` function'
        );
        route.body += body;
    },
    /**
     * Sets the `<title>`.
     * This takes precedence over the hardcoded title.
     * @param {string} title
     */
    title(title) {
        const route = get_active_route(
            '`insert.title` can only be called in a `load` function'
        );
        route.title = title;
    }
};
