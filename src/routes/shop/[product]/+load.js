/// <reference path="./types.d.ts" />
/** @import { Product } from '#types' */
/** @import { Context, LoadFunction } from './types.js' */
import { error, escape, insert, useContext } from '#server';

/** @type {LoadFunction<{ product: Product }>} */
export default function load(request) {
    const { products } = useContext();
    const { product: key } = request.params;
    if (!Object.hasOwn(products, key)) {
        error(404);
    }
    const product = products[/** @type {keyof Context['products']} */ (key)];
    insert.title(`${product.name} - Bio-Shield Shop`);
    insert.body.replace(body => {
        body = body.replace('[[name]]', escape(product.name));
        body = body.replace('[[price]]', product.price.toString());
        body = body.replace(
            '[[image]]',
            `<div><img src="${product.images[0]}" /></div>`
        );
        const carousel = product.images
            .map(
                image => `<div class="img_wrapper"><img src="${image}" /></div>`
            )
            .join('\n');
        body = body.replace('[[carousel]]', carousel);
        return body;
    });
    return {
        product
    };
}
