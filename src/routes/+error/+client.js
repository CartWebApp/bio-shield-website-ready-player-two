/// <reference path="./types.d.ts" />
const { error } = useContext();
const h1 = /** @type {HTMLHeadingElement} */ (document.querySelector('h1'));
const h5 = /** @type {HTMLHeadingElement} */ (document.querySelector('h5'));
h1.textContent = error.status.toString();
h5.textContent = error.message;
