/// <reference path="./types.d.ts" />
const product = useContext('product');
const h1 = /** @type {HTMLHeadingElement} */ (document.querySelector('h1'));
h1.textContent = product.name;
const image_section = /** @type {HTMLDivElement} */ (
    document.querySelector('.images')
);
const aside = /** @type {HTMLElement} */ (document.querySelector('aside'));
const price = /** @type {HTMLHeadingElement} */ (document.querySelector('h2'));
price.textContent = product.price.toString();
const wrapper = document.createElement('div');
const main_image = document.createElement('img');
main_image.src = product.images[0];
wrapper.append(main_image);
image_section.append(wrapper);
for (const image of product.images) {
    const wrapper = document.createElement('div');
    wrapper.className = 'img_wrapper';
    const img = document.createElement('img');
    img.src = image;
    wrapper.append(img);
    wrapper.addEventListener('click', () => {
        main_image.src = image;
    });
    aside.append(wrapper);
}
