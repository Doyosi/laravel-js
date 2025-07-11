/**
 * EditContent.js
 *
 * Easily manage "edit" form workflows for CRUD apps.
 * - Fills form via AJAX (fetch, axios supported)
 * - Switches form to edit mode, changes button/title, reveals cancel button
 * - Handles cancel back to add mode
 * - Emits events/hooks for integration
 *
 * Example usage:
 *   import EditContent from './EditContent';
 *   const edit = new EditContent({
 *     form: '#lineForm',
 *     editButtonSelector: '.btn-edit-line',
 *     cancelButtonSelector: '.edit-cancel',
 *     submitButtonSelector: '#lineButton',
 *     addTitle: 'Add New Line',
 *     editTitle: 'Edit Line',
 *     addButtonText: 'Save',
 *     editButtonText: 'Edit',
 *     onEditStart: (data) => {},
 *     onEditEnd: () => {},
 *   });
 */
export default class EditContent {
    /**
     * @param {Object} opts
     * @param {string|HTMLElement} opts.form - Form selector or element
     * @param {string} opts.editButtonSelector - Selector for edit buttons
     * @param {string} opts.cancelButtonSelector - Selector for cancel button
     * @param {string} [opts.submitButtonSelector] - Selector for submit button (default: first [type=submit] in form)
     * @param {string} [opts.addTitle] - Default title in add mode
     * @param {string} [opts.editTitle] - Title in edit mode
     * @param {string} [opts.addButtonText] - Default button text in add mode
     * @param {string} [opts.editButtonText] - Button text in edit mode
     * @param {Function} [opts.onEditStart] - Hook after edit mode, receives loaded data
     * @param {Function} [opts.onEditEnd] - Hook after returning to add mode
     */
    constructor(opts = {}) {
        // Config/DOM
        this.form = typeof opts.form === 'string' ? document.querySelector(opts.form) : opts.form;
        this.editButtonSelector = opts.editButtonSelector;
        this.cancelButton = document.querySelector(opts.cancelButtonSelector);
        this.submitButton = opts.submitButtonSelector
            ? document.querySelector(opts.submitButtonSelector)
            : this.form.querySelector('[type="submit"]');
        this.buttonText = this.submitButton?.querySelector('.button-text') || this.submitButton;
        this.header = this.form.closest('.pcard')?.querySelector('.pcard-title');
        this.addTitle = opts.addTitle || this.header?.dataset.addTitle || this.header?.textContent || 'Add';
        this.editTitle = opts.editTitle || this.header?.dataset.editTitle || 'Edit';
        this.addButtonText = opts.addButtonText || this.buttonText?.dataset.addTitle || this.buttonText?.textContent || 'Save';
        this.editButtonText = opts.editButtonText || this.buttonText?.dataset.editTitle || 'Edit';
        this.onEditStart = opts.onEditStart;
        this.onEditEnd = opts.onEditEnd;
        this.editMode = false;

        this._bindEditButtons();
        this._bindCancelButton();
    }

    /** Listen to all edit buttons for click */
    _bindEditButtons() {
        document.body.addEventListener('click', async (e) => {
            const btn = e.target.closest(this.editButtonSelector);
            if (!btn) return;

            e.preventDefault();
            const url = btn.dataset.href;
            if (!url) return;

            try {
                let res, data;
                if (window.axios) {
                    res = await axios.get(url, { headers: { 'Accept': 'application/json' } });
                    data = res.data.data || res.data;
                } else {
                    res = await fetch(url, { headers: { 'Accept': 'application/json' } });
                    data = (await res.json()).data || {};
                }
                this._fillForm(data, {
                    action: url,
                    method: 'POST',
                    title: this.editTitle,
                    buttonText: this.editButtonText,
                });
                if (this.cancelButton) this.cancelButton.classList.remove('hidden');
                this.editMode = true;
                if (typeof this.onEditStart === 'function') this.onEditStart(data);
            } catch (err) {
                console.error(err);
                window.Toast
                    ? new Toast({ message: "Cannot fetch item.", type: "error" })
                    : alert('Fetch error');
            }
        });
    }

    /** Cancel edit, reset form to add mode */
    _bindCancelButton() {
        if (!this.cancelButton) return;
        this.cancelButton.addEventListener('click', () => this.resetToAddMode());
    }

    /**
     * Fill the form with data, and update action/title/button text
     */
    _fillForm(data = {}, config = {}) {
        ['input', 'textarea', 'select'].forEach(tag => {
            this.form.querySelectorAll(tag).forEach(input => {
                if (!input.name) return;
                if (input.type === "file") return;

                // Match title[en], description[tr] etc.
                let match = input.name.match(/^(\w+)\[(\w+)\]$/);
                if (match) {
                    let [_, parent, locale] = match;
                    // e.g. parent='title', locale='en' -> look for data.titles?.en
                    let pluralKey = parent + 's'; // title -> titles
                    if (data[pluralKey] && data[pluralKey][locale] !== undefined) {
                        input.value = data[pluralKey][locale];
                    }
                    // Fallback to e.g. data.title?.en
                    else if (data[parent] && typeof data[parent] === 'object' && data[parent][locale] !== undefined) {
                        input.value = data[parent][locale];
                    }
                } else if (data[input.name] !== undefined) {
                    console.log(input.name, data[input.name]);
                    input.value = data[input.name];
                }
            });
        });

        if (config.action) this.form.action = config.action;
        if (config.method) this.form.setAttribute('data-method', config.method);

        if (this.header && config.title) this.header.textContent = config.title;
        if (this.buttonText && config.buttonText) this.buttonText.textContent = config.buttonText;

        this.form.setAttribute('data-edit-mode', this.editMode ? 'true' : 'false');
    }


    /** Public: reset form and UI back to add mode */
    resetToAddMode(defaults = {}) {
        this.form.reset();
        this._fillForm(defaults, {
            action: this.form.dataset.action,
            method: 'POST',
            title: this.addTitle,
            buttonText: this.addButtonText,
        });
        if (this.cancelButton) this.cancelButton.classList.add('hidden');
        this.editMode = false;
        if (typeof this.onEditEnd === 'function') this.onEditEnd();
    }
}
