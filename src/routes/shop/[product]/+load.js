/// <reference path="./types.d.ts" />
/** @import { Product } from '#types' */
/** @import { Context, LoadFunction } from './types.js' */
import { error, insert, useContext } from '#server';

/** @type {LoadFunction<{ product: Product }>} */
export default function load(request) {
    const { products } = useContext();
    const { product: name } = request.params;
    if (!Object.hasOwn(products, name)) {
        error(404);
    }
    const product = products[/** @type {keyof Context['products']} */ (name)];
    insert.title(`${product.name} - Bio-Shield Shop`);
    return {
        product
    };
}
