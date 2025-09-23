/// <reference path="./types.d.ts" />
const { error } = useContext();
const h1 = /** @type {HTMLHeadingElement} */ (document.querySelector('h1'));
const h4 = /** @type {HTMLHeadingElement} */ (document.querySelector('h4'));
h1.textContent = error.status.toString();
h4.textContent = error.message;
document.title = `${error.status} - Bio-Shield`;
