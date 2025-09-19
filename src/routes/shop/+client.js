// @ts-check
/// <reference path="./types.d.ts" />
const products = useContext('products');
const list = /** @type {HTMLDivElement} */ (
    document.querySelector('.products')
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
for (const [endpoint, product] of Object.entries(products)) {
    list.append(
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
