/// <reference path="./types.d.ts" />
import { message } from './contact.remote.js';

const input = /** @type {HTMLInputElement} */ (document.querySelector('input'));
const textarea = /** @type {HTMLTextAreaElement} */ (
    document.querySelector('textarea')
);
const button = /** @type {HTMLButtonElement} */ (
    document.querySelector('button')
);

button.addEventListener('click', async () => {
    if (input.validity.valid) {
        const email = input.value;
        const content = textarea.value;
        await message({
            email,
            message: content
        });
        input.value = '';
        textarea.value = '';
    }
});

input.addEventListener('input', () => {
    button.disabled = !input.validity.valid;
});
