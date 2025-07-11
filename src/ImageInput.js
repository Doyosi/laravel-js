// ImageInput.js
// Usage: new ImageInput('#myFileInput') OR new ImageInput(document.querySelector('input[type="file"]'));

/**
 * ImageInput - auto updates preview image on file select, restores on ESC/cancel.
 * @param {string|HTMLElement} selector - file input selector or element
 */
export default class ImageInput {
    /**
     * @param {string|HTMLElement|NodeList} input - Selector, Element, or NodeList of inputs
     */
    constructor(input) {
        // Allow single or multiple
        if (typeof input === "string") {
            this.inputs = document.querySelectorAll(input);
        } else if (input instanceof HTMLElement) {
            this.inputs = [input];
        } else if (input instanceof NodeList) {
            this.inputs = Array.from(input);
        } else {
            throw new Error('ImageInput: Invalid input selector/element.');
        }
        this.inputs.forEach(fileInput => this.init(fileInput));

    }

    init(fileInput) {
        const imgSel = fileInput.closest('.form-group')?.querySelector('[data-img-preview]') ||
            (fileInput.dataset.imgPreview && document.querySelector(fileInput.dataset.imgPreview));
        if (!imgSel) return;

        const img = imgSel;
        const originalSrc = img.getAttribute('data-src') || img.src;

        // File change: show preview
        fileInput.addEventListener('change', (e) => {
            if (fileInput.files && fileInput.files[0]) {
                const reader = new FileReader();
                reader.onload = ev => img.src = ev.target.result;
                reader.readAsDataURL(fileInput.files[0]);
            }
        });

        // Cancel with ESC: restore image & clear input
        fileInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.reset(fileInput, img, originalSrc);
            }
        });

        // Optional: double-click preview image resets it
        img.addEventListener('dblclick', () => this.reset(fileInput, img, originalSrc));
    }

    reset(fileInput, img, originalSrc) {
        img.src = originalSrc;
        fileInput.value = '';
    }
}
