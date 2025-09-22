/** @import { Product } from '#types' */
/** @import { Context } from './types.js' */
// @ts-check
/// <reference path="./types.d.ts" />
import { get_views } from './views.remote.js';
const products = useContext('products');
const list = /** @type {HTMLDivElement} */ (
    document.querySelector('.products')
);
/**
 * @template {string[]} Keys
 * @param {Keys} keys
 * @returns {Readonly<Record<Keys[number], symbol>>}
 */
function Enum(...keys) {
    return Object.freeze(
        /** @type {Record<Keys[number], symbol>} */ (
            Object.fromEntries(
                keys.map(
                    key =>
                        /** @type {[Keys[number], symbol]} */ ([key, Symbol()])
                )
            )
        )
    );
}
const SORT_TYPES = Enum(
    'Popularity',
    'A - Z',
    'Z - A',
    'Asc. Price',
    'Desc. Price'
);
/**
 * @template {keyof HTMLElementTagNameMap} Tag
 * @param {Tag} type
 * @param {Record<string, any> | null} [props]
 * @param {Array<Node | string | number | null | boolean>} children
 * @returns {HTMLElementTagNameMap[Tag]}
 */
function element(type, props = null, ...children) {
    const elem = document.createElement(type);
    if (props !== null) {
        for (const [key, value] of Object.entries(props)) {
            if (key.slice(0, 2) === 'on') {
                elem.addEventListener(key.slice(2), value);
            } else if (key === 'class') {
                elem.className = value;
            } else if (key === 'style') {
                elem.style.cssText = value;
            } else if (key in elem) {
                elem[/** @type {keyof typeof elem} */ (key)] = value;
            } else {
                elem.setAttribute(key, value);
            }
        }
    }
    elem.append(
        ...children
            .filter(child => child !== null)
            .map(child =>
                typeof child === 'number' || typeof child === 'boolean'
                    ? child.toString()
                    : child
            )
    );
    return elem;
}

const views = get_views(undefined);

/**
 * @param {Context['products']} products
 * @param {(typeof SORT_TYPES)[keyof typeof SORT_TYPES]} type
 * @returns {Promise<Record<string, Product>>}
 */
async function sort(products, type) {
    const entries = Object.entries(products);
    switch (type) {
        case SORT_TYPES['A - Z']: {
            return Object.fromEntries(entries);
        }
        case SORT_TYPES['Z - A']: {
            return Object.fromEntries(entries.toReversed());
        }
        case SORT_TYPES['Asc. Price']: {
            return Object.fromEntries(
                entries.toSorted(
                    ([, { price: a_price }], [, { price: b_price }]) =>
                        a_price - b_price
                )
            );
        }
        case SORT_TYPES['Desc. Price']: {
            return Object.fromEntries(
                entries.toSorted(
                    ([, { price: a_price }], [, { price: b_price }]) =>
                        b_price - a_price
                )
            );
        }
        case SORT_TYPES['Popularity']: {
            await views.refresh();
            const { current } = views;
            if (typeof current !== 'object') return products;
            return Object.fromEntries(
                entries.toSorted(([a], [b]) => current[b] - current[a])
            );
        }
    }
    return products;
}

/**
 * @param {Readonly<Record<string, Readonly<Product>>>} products
 */
function render(products) {
    list.replaceChildren();
    for (const [endpoint, product] of Object.entries(products)) {
        list.append(
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
                        src: product.images[0]
                    }),
                    element('br'),
                    product.name,
                    element(
                        'span',
                        {
                            class: 'price'
                        },
                        product.price
                    )
                )
            )
        );
    }
}
const sorter = /** @type {HTMLSelectElement} */ (
    document.querySelector('select')
);
sorter.addEventListener('input', async () => {
    render(
        await sort(
            products,
            SORT_TYPES[/** @type {keyof typeof SORT_TYPES} */ (sorter.value)]
        )
    );
});
