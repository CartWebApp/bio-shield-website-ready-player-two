// @ts-check
/** @import { Request, Response } from 'express' */
import { remote_endpoints } from './index.js';
import { parse, stringify } from 'devalue';
let remote_id = 0;

export function query(fn) {
    const id = remote_id++;
    /**
     * @param {Request} req
     * @param {Response} res
     */
    async function handle(req, res) {
        if (req.method !== 'POST') {
            return;
        }
        const { body } = req;
        const argument = parse(body);
        const result = await fn(argument);
        res.json({
            result: stringify(result)
        });
    }
    remote_endpoints.set(`/:${id}`, handle);
}

query(() => 'Hello!');

export function command(fn) {

}
