/// <reference path="./types.d.ts" />
/** @import { Product } from '#types' */
/** @import { LoadFunction } from './types.js' */
import { error, useContext } from '#server';

/** @type {LoadFunction<{ item: Product }>} */
export default function load(request) {
    const { products } = useContext();
    const product = /** @type {keyof typeof products} */ (
        request.params.product
    );
    if (!Object.hasOwn(products, product)) {
        error(404);
    }
    return {
        item: products[product]
    };
}
