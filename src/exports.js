import { STATUS_CODES } from 'http';
import { active_context } from './server.js';

/**
 * @param {number} status
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
            '`useContext` can only be called on the server in a load function'
        );
    }
    return typeof key === 'string' ? context[key] : context;
}
