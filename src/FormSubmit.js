/**
 * FormSubmit - Modern async form handler for AJAX-based forms with lifecycle hooks.
 *
 * Usage:
 *   const form = new FormSubmit({
 *     formSelector: '#myForm',
 *     submitButtonSelector: '#submitBtn',
 *     method: 'axios', // 'fetch', 'axios', or 'xhr'
 *     httpMethod: 'POST', // 'POST', 'PUT', etc.
 *     successMessage: 'Done!',
 *     errorMessage: 'Failed!',
 *     useToast: true,
 *     beforeSubmit: (formData, form) => {
 *       // Modify formData before submission
 *       formData.append('custom_field', 'value');
 *       return formData; // Must return formData
 *     },
 *     afterSubmit: (response, success) => {
 *       // Perform actions after submission
 *       if (success) console.log('Success:', response);
 *     }
 *   });
 *
 *   form.on('success', res => { ... });
 *   form.on('error', err => { ... });
 */
export default class FormSubmit {
    /**
     * @param {Object} config - Configuration options for the form.
     */
    constructor(config = {}) {
        // --- Default configuration ---
        this.config = Object.assign({
            method: 'axios',
            httpMethod: 'POST',
            formSelector: null,
            submitButtonSelector: null,
            action: null,
            successMessage: 'Operation completed successfully!',
            errorMessage: 'An error occurred.',
            successTitle: 'Success!',
            errorTitle: 'Error!',
            useToast: typeof Toast !== 'undefined',
            disableOnSuccess: false,
            redirectUrl: null,
            beforeSubmit: null,
            afterSubmit: null,
            getUrl: null,
            buttonOnly: false,  // New option for button-only mode
        }, config);

        /** @type {Object.<string, Function[]>} */
        this.handlers = { success: [], error: [], beforeSubmit: [], afterSubmit: [] };

        // --- Element references ---
        this.form = this._getFormElement(this.config.formSelector);
        this.submitButton = this._getSubmitButton();

        // Determine if we're in button-only mode
        this.isButtonOnly = !this.form || this.config.buttonOnly;

        // Only require form if not in button-only mode
        if (!this.isButtonOnly && !this.form) {
            throw new Error('Form element not found.');
        }

        // Require submit button for button-only mode
        if (this.isButtonOnly && !this.submitButton) {
            throw new Error('Submit button not found for button-only mode.');
        }

        // --- Button text cache for restoring original ---
        this.originalText = this.submitButton ? this.submitButton.innerHTML : '';

        // --- Setup event listeners ---
        this._setupEventListeners();
    }

    _setupEventListeners() {
        if (this.submitButton) {
            this.submitButton.addEventListener('click', e => {
                e.preventDefault();
                this._clearErrors();

                if (this.isButtonOnly) {
                    // For button-only mode, directly handle submission
                    this._handleSubmit();
                } else {
                    // For form mode, trigger form submit event
                    this.form.dispatchEvent(new Event('submit', { cancelable: true }));
                }
            });
        }

        // Only bind form submit if we have a form
        if (this.form && !this.isButtonOnly) {
            this._bindSubmit();
        }
    }
    /** Add event listener (success, error, beforeSubmit, afterSubmit) */
    on(event, fn) {
        if (this.handlers[event]) this.handlers[event].push(fn);
        return this;
    }

    /** Internal: emit an event */
    _emit(event, payload) {
        (this.handlers[event] || []).forEach(fn => fn(payload));
    }

    /** Get the form element from selector or element */
    _getFormElement(sel) {
        if (!sel) return null;
        if (typeof sel === 'string') return document.querySelector(sel);
        if (sel instanceof HTMLFormElement) return sel;
        return null;
    }

    /** Get the submit button element */
    /** Get the submit button element */
    _getSubmitButton() {
        if (!this.config.submitButtonSelector) return null;

        // If it's already a DOM element, return it directly
        if (this.config.submitButtonSelector instanceof HTMLElement) {
            return this.config.submitButtonSelector;
        }

        // If it's a string selector, query for it
        if (typeof this.config.submitButtonSelector === 'string') {
            return document.querySelector(this.config.submitButtonSelector);
        }

        // If we have a form, look for submit button within it
        if (this.form) {
            return this.form.querySelector('[type="submit"]');
        }

        return null;
    }

    /** Bind native form submit */
    _bindSubmit() {
        this.form.addEventListener('submit', e => {
            e.preventDefault();
            this._clearErrors();
            this._handleSubmit();
        });
    }

    /** Main form submission handler */
    async _handleSubmit() {
        let formData;

        if (this.isButtonOnly) {
            // For button-only mode, create empty FormData or use custom data
            formData = new FormData();

            // Add button-specific data if available
            if (this.submitButton.dataset.data) {
                try {
                    const buttonData = JSON.parse(this.submitButton.dataset.data);
                    Object.entries(buttonData).forEach(([key, value]) => {
                        formData.append(key, value);
                    });
                } catch (e) {
                    console.warn('Invalid JSON in button data attribute:', e);
                }
            }
        } else {
            // For form mode, use form data
            formData = new FormData(this.form);
        }

        // Get action URL
        let action;
        if (this.config.getUrl && typeof this.config.getUrl === 'function') {
            action = this.config.getUrl(this.submitButton);
        } else {
            action = this.config.action ||
                (this.form ? this.form.action : null) ||
                window.location.href;
        }

        const method = this.config.httpMethod.toUpperCase();

        // Add _method for Laravel style PUT/PATCH/DELETE
        if (method !== 'POST' && !formData.has('_method')) {
            formData.append('_method', method);
        }

        // --- beforeSubmit hooks ---
        try {
            if (this.config.beforeSubmit && typeof this.config.beforeSubmit === 'function') {
                const result = await this.config.beforeSubmit(formData, this.form, this.submitButton);
                if (result instanceof FormData) {
                    formData = result;
                } else if (result === false) {
                    return;
                }
            }

            this._emit('beforeSubmit', { formData, form: this.form, button: this.submitButton });
        } catch (error) {
            console.error('Error in beforeSubmit hook:', error);
            return;
        }

        this._setLoading(true);

        let response;
        let success = false;

        try {
            if (this.config.method === 'axios' && window.axios) {
                const axiosConfig = {
                    url: action,
                    method: this.config.httpMethod.toLowerCase(),
                    data: formData,
                };
                const resp = await axios(axiosConfig);
                response = resp.data ?? resp;
            } else if (this.config.method === 'xhr') {
                response = await this._sendWithXHR(action, formData, this.config.httpMethod);
            } else {
                response = await this._sendWithFetch(action, formData, this.config.httpMethod);
            }

            success = true;
            await this._handleSuccess(response);
            if (!this.config.disableOnSuccess) this._setLoading(false);
        } catch (error) {
            response = error;
            await this._handleError(error);
            this._setLoading(false);
        }

        // --- afterSubmit hooks ---
        try {
            if (this.config.afterSubmit && typeof this.config.afterSubmit === 'function') {
                await this.config.afterSubmit(response, success, this.form, this.submitButton);
            }

            this._emit('afterSubmit', { response, success, form: this.form, button: this.submitButton });
        } catch (error) {
            console.error('Error in afterSubmit hook:', error);
        }
    }

    /** Fetch with Fetch API */
    async _sendWithFetch(url, fd, httpMethod) {
        const res = await fetch(url, { method: httpMethod, body: fd });
        const data = await res.json();
        if (!res.ok) throw { response: { data } };
        return data;
    }

    /** Fetch with XMLHttpRequest */
    _sendWithXHR(url, fd, httpMethod) {
        return new Promise((res, rej) => {
            const xhr = new XMLHttpRequest();
            xhr.open(httpMethod, url);
            xhr.onload = () => {
                try {
                    const json = JSON.parse(xhr.responseText);
                    xhr.status >= 200 && xhr.status < 300
                        ? res(json)
                        : rej({ response: { data: json } });
                } catch (e) {
                    rej(e);
                }
            };
            xhr.onerror = () => rej(new Error('Network error'));
            xhr.send(fd);
        });
    }

    /** Set button loading state */
    _setLoading(loading) {
        if (!this.submitButton) return;
        const buttonText = this.submitButton.querySelector('.button-text');
        if (loading) {
            this._origBtnText = buttonText ? buttonText.textContent : this.submitButton.textContent;
            this.submitButton.disabled = true;
            if (buttonText) buttonText.textContent = 'Loading…';
            else this.submitButton.textContent = 'Loading…';
        } else {
            this.submitButton.disabled = false;
            if (buttonText) {
                // Try to restore last value or dataset, fallback to cache
                buttonText.textContent = buttonText.dataset.default || this._origBtnText;
            } else {
                this.submitButton.textContent = this._origBtnText;
            }
        }
    }

    /** Handle success, show message, emit event */
    async _handleSuccess(res) {
        const msg = res?.message || res?.data?.message || this.config.successMessage;
        const url = res?.redirect || res?.data?.redirect || this.config.redirectUrl;
        await this._showMessage(msg, 'success');
        this._emit('success', res);
        if (url) setTimeout(() => { window.location.href = url; }, 1000);
    }

    /** Handle error, show validation, emit event */
    async _handleError(err) {
        console.error(err);
        const d = err.response?.data || err;
        const msg = d?.message || d?.data?.message || this.config.errorMessage;

        if (d.errors) {
            Object.entries(d.errors).forEach(([name, msgs]) => {
                const nameHasDot = name.includes('.');

                if (nameHasDot) {
                    // Convert "title.en" → "title[en]"
                    const [field, locale] = name.split('.');
                    const inputName = `${field}[${locale}]`;

                    const span = this.form.querySelector(`.form-error[data-input="${inputName}"]`);
                    // Now you can show or hide:
                    if (span) {
                        span.classList.remove('hidden');
                        span.textContent = msgs.join(' ');
                    }
                } else {
                    const span = this.form.querySelector(`.form-error[data-input="${name}"]`);
                    if (span) {
                        span.classList.remove('hidden');
                        span.textContent = msgs.join(' ');
                    }
                }
            });
        }
        await this._showMessage(msg, 'error');
        this._emit('error', err);
    }

    /** Clear validation errors from form */
    _clearErrors() {
        // Only clear form errors if we have a form
        if (this.form) {
            this.form.querySelectorAll('.form-error[data-input]').forEach(s => {
                s.classList.add('hidden');
                s.textContent = '';
            });
        }
    }

    /** Show toast or alert */
    async _showMessage(msg, type) {
        if (this.config.useToast && window.Toast) {
            new Toast({ message: msg, type, duration: 4000, position: 'top-center-full' });
        } else {
            alert(msg);
        }
    }

    /** Reset form to initial state */
    reset() {
        this.form.reset();
        this._clearErrors();
        this._setLoading(false);
    }

    /** Manually trigger form submission */
    submit() {
        this._handleSubmit();
    }

    /** Get current form data */
    getFormData() {
        return new FormData(this.form);
    }

    /** Set form field value */
    setFieldValue(name, value) {
        const field = this.form.querySelector(`[name="${name}"]`);
        if (field) {
            field.value = value;
        }
    }

    /** Get form field value */
    getFieldValue(name) {
        const field = this.form.querySelector(`[name="${name}"]`);
        return field ? field.value : null;
    }
}
