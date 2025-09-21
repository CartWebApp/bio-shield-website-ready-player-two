/// <reference path="./types.d.ts" />
/** @import { Context, LoadFunction } from './types.js' */
import { element, escape, insert, useContext } from '#server';

/** @type {LoadFunction<void>} */
export default function load(request) {
    // while the replacement here won't affect the individual product pages,
    // it doesn't help TTFB
    if (request.path !== '/shop') {
        return;
    }
    const { products } = useContext();
    insert.body.replace(body => {
        const list = [];
        for (const [endpoint, { images, name, price }] of Object.entries(
            products
        )) {
            list.push(
                element(
                    'a',
                    {
                        href: `/shop/${endpoint}`
                    },
                    element(
                        'div',
                        {
                            class: 'product'
                        },
                        element('img', {
                            src: images[0],
                            alt: name
                        }),
                        element('br'),
                        escape(name),
                        element(
                            'span',
                            {
                                class: 'price'
                            },
                            price
                        )
                    )
                )
            );
        }
        return body.replace('[[products]]', list.join('\n'));
    });
    const keys = /** @type {Array<keyof Context['products']>}*/ (
        Object.keys(products)
    );
    if (keys.length > 0) {
        const { images } = products[keys[0]];
        insert.head.append(
            element('link', {
                rel: 'preload',
                fetchpriority: 'high',
                as: 'image',
                href: images[0],
                type: `image/${images[0].split('.').at(-1)}`
            })
        );
    }
}
