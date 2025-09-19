import { STATUS_CODES } from 'http';
import { active_context, active_params } from './server.js';

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
    const context = active_context;
    if (context === null) {
        throw new Error(
            '`useContext` can only be called on the server in a `load` function'
        );
    }
    return typeof key === 'string' ? context[key] : context;
}

/**
 * @param {string} [param]
 */
export function useParams(param) {
    const params = active_params;
    if (params === null) {
        throw new Error(
            '`useParams` can only be called on the server in a `load` function'
        );
    }
    return typeof param === 'string' ? params[param] : params;
}