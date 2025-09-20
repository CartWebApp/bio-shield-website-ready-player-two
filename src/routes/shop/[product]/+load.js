/// <reference path="./types.d.ts" />
/** @import { Product } from '#types' */
/** @import { Context, LoadFunction } from './types.js' */
import { error, useContext } from '#server';

/** @type {LoadFunction<{ product: Product }>} */
export default function load(request) {
    const { products } = useContext();
    const { product } = request.params;
    if (!Object.hasOwn(products, product)) {
        error(404);
    }
    return {
        product: products[/** @type {keyof Context['products']} */ (product)]
    };
}
