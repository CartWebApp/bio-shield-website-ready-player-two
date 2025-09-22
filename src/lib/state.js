/** @type {Record<string, number> | null} */
export let state = null;

/**
 * @param {Record<string, number>} initial
 */
export function init(initial) {
    state ??= initial;
}