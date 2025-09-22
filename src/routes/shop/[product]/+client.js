/// <reference path="./types.d.ts" />
console.log(import.meta.url);
import { add_views } from '../views.remote.js';
const { product } = useParams();
// since most of the content is rendered on the server (in `+load.js`), we just need
// to hydrate the client with event handlers
const aside = /** @type {HTMLElement} */ (document.querySelector('aside'));
const main_image = /** @type {HTMLImageElement} */ (
    document.querySelector('section > div > img')
);
for (const image of aside.querySelectorAll('.img_wrapper')) {
    const img = /** @type {HTMLImageElement} */ (image.firstElementChild);
    image.addEventListener('click', () => {
        main_image.src = img.src;
    });
}

await add_views(product);
