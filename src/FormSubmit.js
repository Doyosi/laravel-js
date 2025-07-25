export default class FormSubmit {
    constructor(config = {}) {
        this.config = Object.assign({
            method: 'axios',
            httpMethod: 'POST',
            formSelector: null,
            submitButtonSelector: null,
            action: null,
            successMessage: 'Operation completed successfully!',
            errorMessage: 'An error occurred.',
            useToast: typeof Toast !== 'undefined',
            disableOnSuccess: false,
            redirectUrl: null,
            beforeSubmit: null,
            afterSubmit: null,
            getUrl: null,
            buttonOnly: false,
        }, config);

        this.handlers = { success: [], error: [], beforeSubmit: [], afterSubmit: [] };

        this.form = this._getFormElement(this.config.formSelector);
        this.submitButton = this._getSubmitButton();
        this.isButtonOnly = !this.form || this.config.buttonOnly;

        if (!this.isButtonOnly && !this.form) throw new Error('Form element not found.');
        if (!this.submitButton) throw new Error('Submit button not found.');

        this.originalButtonText = this.submitButton.querySelector('.button-text')?.textContent || this.submitButton.textContent;
        this._setupEventListeners();
    }

    on(event, fn) {
        if (this.handlers[event]) this.handlers[event].push(fn);
        return this;
    }

    _emit(event, payload) {
        (this.handlers[event] || []).forEach(fn => fn(payload));
    }

    _getFormElement(sel) {
        if (!sel) return null;
        if (typeof sel === 'string') return document.querySelector(sel);
        if (sel instanceof HTMLFormElement) return sel;
        return null;
    }

    _getSubmitButton() {
        const sel = this.config.submitButtonSelector;
        if (!sel && this.form) return this.form.querySelector('[type="submit"]');
        if (sel instanceof HTMLElement) return sel;
        if (typeof sel === 'string') return document.querySelector(sel);
        return null;
    }

    _setupEventListeners() {
        this.submitButton.addEventListener('click', e => {
            e.preventDefault();
            this._clearErrors();
            if (this.isButtonOnly) this._handleSubmit();
            else this.form.dispatchEvent(new Event('submit', { cancelable: true }));
        });

        if (this.form && !this.isButtonOnly) {
            this.form.addEventListener('submit', e => {
                e.preventDefault();
                this._handleSubmit();
            });
        }
    }

    async _handleSubmit() {
        let formData = new FormData(this.isButtonOnly ? undefined : this.form);

        if (this.isButtonOnly && this.submitButton.dataset.data) {
            try {
                const buttonData = JSON.parse(this.submitButton.dataset.data);
                Object.entries(buttonData).forEach(([k, v]) => formData.append(k, v));
            } catch (e) {
                console.warn('Invalid JSON in button data attribute:', e);
            }
        }

        const method = this.config.httpMethod.toUpperCase();
        if (method !== 'POST' && !formData.has('_method')) formData.append('_method', method);

        const action = typeof this.config.getUrl === 'function'
            ? this.config.getUrl(this.submitButton)
            : (this.config.action || this.form?.action || window.location.href);

        try {
            if (typeof this.config.beforeSubmit === 'function') {
                const result = await this.config.beforeSubmit(formData, this.form, this.submitButton);
                if (result instanceof FormData) formData = result;
                else if (result === false) return;
            }
            this._emit('beforeSubmit', { formData, form: this.form, button: this.submitButton });
        } catch (error) {
            console.error('Error in beforeSubmit hook:', error);
            return;
        }

        this._setLoading(true);
        let response, success = false;

        try {
            if (this.config.method === 'axios' && window.axios) {
                const resp = await axios({ url: action, method: method.toLowerCase(), data: formData });
                response = resp.data ?? resp;
            } else if (this.config.method === 'xhr') {
                response = await this._sendWithXHR(action, formData, method);
            } else {
                response = await this._sendWithFetch(action, formData, method);
            }

            success = true;
            await this._handleSuccess(response);
            if (!this.config.disableOnSuccess) this._setLoading(false);
        } catch (error) {
            response = error;
            await this._handleError(error);
            this._setLoading(false);
        }

        try {
            if (typeof this.config.afterSubmit === 'function') {
                await this.config.afterSubmit(response, success, this.form, this.submitButton);
            }
            this._emit('afterSubmit', { response, success, form: this.form, button: this.submitButton });
        } catch (error) {
            console.error('Error in afterSubmit hook:', error);
        }
    }

    async _sendWithFetch(url, fd, method) {
        const res = await fetch(url, { method, body: fd, headers: { 'Accept': 'application/json' } });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw { response: { data, status: res.status } };
        return data;
    }

    _sendWithXHR(url, fd, method) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open(method, url);
            xhr.setRequestHeader('Accept', 'application/json');
            xhr.onload = () => {
                try {
                    const json = JSON.parse(xhr.responseText);
                    (xhr.status >= 200 && xhr.status < 300)
                        ? resolve(json)
                        : reject({ response: { data: json, status: xhr.status } });
                } catch (e) {
                    reject({ message: 'Invalid JSON', error: e });
                }
            };
            xhr.onerror = () => reject(new Error('Network error'));
            xhr.send(fd);
        });
    }

    _setLoading(loading) {
        if (!this.submitButton) return;
        const btnText = this.submitButton.querySelector('.button-text');
        this.submitButton.disabled = loading;
        const loadingText = this.submitButton.dataset.loadingText || 'Loading…';

        if (loading) {
            if (btnText) btnText.textContent = loadingText;
            else this.submitButton.textContent = loadingText;
        } else {
            const defaultText = btnText?.dataset.default || this.originalButtonText;
            if (btnText) btnText.textContent = defaultText;
            else this.submitButton.textContent = this.originalButtonText;
        }
    }

    async _handleSuccess(res) {
        const msg = res?.message || res?.data?.message || this.config.successMessage;
        const redirect = res?.redirect || res?.data?.redirect || this.config.redirectUrl;
        this._showMessage(msg, 'success');
        this._emit('success', res);
        if (redirect) setTimeout(() => window.location.href = redirect, 1000);
    }

    async _handleError(err) {
        console.error(err);
        const d = err.response?.data || err;
        const msg = d?.message || this.config.errorMessage;

        if (d?.errors && this.form) {
            Object.entries(d.errors).forEach(([name, messages]) => {
                const inputName = name.includes('.') ? name.replace('.', '[') + ']' : name;
                const el = this.form.querySelector(`.form-error[data-input="${inputName}"]`);
                if (el) {
                    el.textContent = Array.isArray(messages) ? messages.join(' ') : messages;
                    el.classList.remove('hidden');
                }
            });
        }

        this._showMessage(msg, 'error');
        this._emit('error', err);
    }

    _clearErrors() {
        if (!this.form) return;
        this.form.querySelectorAll('.form-error[data-input]').forEach(span => {
            span.classList.add('hidden');
            span.textContent = '';
        });
    }

    _showMessage(msg, type) {
        if (this.config.useToast && window.Toast) {
            new Toast({ message: msg, type, duration: 4000, position: 'top-center-full' });
        } else {
            alert(msg);
        }
    }

    /** PUBLIC API **/

    reset() {
        if (!this.form) {
            console.warn('FormSubmit: Cannot reset without form.');
            return;
        }
        this.form.reset();
        this._clearErrors();
        this._setLoading(false);
    }

    submit() {
        this._handleSubmit();
    }

    getFormData() {
        if (!this.form) {
            console.warn('FormSubmit: No form available.');
            return new FormData();
        }
        return new FormData(this.form);
    }

    setFieldValue(name, value) {
        const el = this.form?.querySelector(`[name="${name}"]`);
        if (el) el.value = value;
    }

    getFieldValue(name) {
        const el = this.form?.querySelector(`[name="${name}"]`);
        return el ? el.value : null;
    }
}
