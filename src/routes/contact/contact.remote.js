import { command } from '#remote';
import * as v from 'valibot';

export const message = command(
    v.object({
        email: v.string(),
        message: v.string()
    }),
    ({ email, message }) => {
        console.log(`from ${email}:`);
        console.log(message);
    }
);
