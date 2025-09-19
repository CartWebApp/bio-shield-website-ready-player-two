/** @import { Request, Response } from 'express' */
import app from '../src/server.js';

/**
 * @param {Request} req
 * @param {Response} res
 */
export default function handler(req, res) {
    return app(req, res);
}
