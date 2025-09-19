/// <reference path="./types.d.ts" />
/** @import { Product } from '#types' */
/** @import { LoadFunction } from './types.js' */
import { error, useContext } from '#server';

/** @type {LoadFunction<{ item: Product }>} */
export default function load(request) {
    const { products } = useContext();
    error(500);
    return {
        item: products[
            /** @type {keyof typeof products} */ (request.params.item)
        ]
    };
}
