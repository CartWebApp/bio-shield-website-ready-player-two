import { query, command } from '#remote';
import { state } from '../../lib/state.js';
import * as v from 'valibot';

export const get_views = query(v.optional(v.string()), product => {
    if (state === null) {
        return 0;
    }
    return typeof product === 'string' ? state[product] : state;
});

export const add_views = command(v.string(), product => {
    if (state === null) {
        return;
    }
    state[product]++;
});
