/** @import { __Request } from './types.js'  */
import { STATUS_CODES } from 'http';
import { get_active_route } from './index.js';
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

import { escape } from './index.js';
export { escape };

// https://github.com/sveltejs/svelte/blob/ded13b825d7efcdf064fd65a5aa9e7e61293a48b/packages/svelte/src/utils.js#L16
const VOID_ELEMENT_NAMES = [
    'area',
    'base',
    'br',
    'col',
    'command',
    'embed',
    'hr',
    'img',
    'input',
    'keygen',
    'link',
    'meta',
    'param',
    'source',
    'track',
    'wbr'
];

/**
 * Renders an HTML element.
 * Can be used with the `insert` namespace to server-side-render HTML content.
 * @param {keyof HTMLElementTagNameMap} tag
 * @param {Record<string, string> | null} [props]
 * @param {Array<string | number | null>} children
 * @returns {string}
 */
export function element(tag, props = null, ...children) {
    let res = `<${tag}`;
    if (props !== null) {
        const attrs = [];
        for (const [key, value] of Object.entries(props)) {
            attrs.push(`${key}="${escape(value)}"`);
        }
        res += ' ' + attrs.join(' ');
    }
    if (VOID_ELEMENT_NAMES.includes(tag)) {
        return res + ' />';
    }
    res += `>\n${children
        .map(child => {
            const text = (child ?? '').toString();
            if (text === '') return text;
            return `\t${text}\n`;
        })
        .join('')}</${tag}>`;
    return res;
}

/**
 * `insert` provides some SSR primitives that allow you to modify
 * HTML in a route's page via `load` functions.
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
     * The title is escaped to avoid cross-site-scripting.
     * @param {string} title
     */
    title(title) {
        const route = get_active_route(
            `\`insert.head\` can only be accessed in a \`load\` function`
        );
        route.title = escape(title);
    }
};
