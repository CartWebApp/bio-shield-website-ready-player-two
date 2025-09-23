/// <reference path="./types.d.ts" />
/** @import { Product } from '#types' */
/** @import { Context, LoadFunction } from './types.js' */
import { element, error, escape, insert, useContext } from '#server';

/** @type {LoadFunction<{ product: Product }>} */
export default function load(request) {
    const { products } = useContext();
    const { product: key } = request.params;
    if (!Object.hasOwn(products, key)) {
        error(404);
    }
    const product = products[/** @type {keyof Context['products']} */ (key)];
    const { name, images, price } = product;
    insert.title(`${name} - Bio-Shield Shop`);
    insert.body.replace(body => {
        const carousel = images.map(image =>
            element(
                'div',
                { class: 'img_wrapper' },
                element('img', { src: image, alt: name })
            )
        );
        const related = Object.entries(products)
            .filter(([_key]) => _key !== key)
            .map(([endpoint, { images, name, price }]) =>
                element(
                    'a',
                    {
                        href: `/shop/${endpoint}/`
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
        return body
            .replace('[[name]]', escape(name))
            .replace('[[price]]', price.toString())
            .replace(
                '[[image]]',
                element(
                    'div',
                    null,
                    element('img', { src: images[0], alt: name })
                )
            )
            .replace('[[description]]', escape(product.description))
            .replace('[[carousel]]', carousel.join('\n'))
            .replace('[[related]]', related.join('\n'));
    });
    insert.head.append(
        element('link', {
            rel: 'preload',
            fetchpriority: 'high',
            as: 'image',
            href: images[0],
            type: `image/${images[0].split('.').at(-1)}`
        })
    );
    return {
        product
    };
}
