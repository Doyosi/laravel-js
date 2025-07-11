// DeleteContent.js
export default class DeleteContent {
    /**
     * @param {string|NodeList|HTMLElement[]} selector   Buttons selector, e.g. ".delete-btn" or a NodeList
     * @param {Object} options
     * @param {string} [options.confirmText] Modal header text
     * @param {string} [options.message] Confirmation message
     * @param {string} [options.successText] Success modal header
     * @param {string} [options.successMessage] Success description
     * @param {string} [options.errorText] Error modal header
     * @param {string} [options.errorMessage] Error description
     * @param {Function} [options.onDelete] Callback after delete: (success, data, button) => {}
     */
    constructor(selector, options = {}) {
        this.options = Object.assign({
            confirmText: "Are you sure?",
            message: "This action cannot be undone!",
            successText: "Deleted!",
            successMessage: "Your item has been successfully deleted.",
            errorText: "Error!",
            errorMessage: "Delete failed.",
            successTimeout: null,
            errorTimeout: null,
        }, options);


        this.buttons = typeof selector === 'string'
            ? document.querySelectorAll(selector)
            : selector;

        this._initModals();
        this._bindEvents();
    }

    // Initializes modals (creates them if they don't exist in the DOM)
    _initModals() {
        // Confirm Modal
        if (!document.getElementById('delete_modal')) {
            document.body.insertAdjacentHTML('beforeend', `
            <dialog id="delete_modal" class="modal">
              <div class="modal-box bg-red-800/90 text-white">
                <h3 class="font-bold text-lg text-white flex items-center gap-2 justify-center">
                  <svg class="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                  <span id="delete_modal_title">${this.options.confirmText}</span>
                </h3>
                <p class="py-1 text-sm text-center" id="delete_modal_message">${this.options.message}</p>
                <div class="modal-action flex gap-2 justify-center">
                  <button class="btn btn-sm shadow-none" type="button" id="cancelDeleteBtn">Cancel</button>
                  <button class="btn btn-sm btn-error shadow-none" type="button" id="confirmDeleteBtn">Delete</button>
                </div>
              </div>
            </dialog>`);
        }
        // Success Modal
        if (!document.getElementById('success_modal')) {
            document.body.insertAdjacentHTML('beforeend', `
            <dialog id="success_modal" class="modal">
              <div class="modal-box bg-green-800/90 text-white">
               <div class="flex items-center justify-between gap-1 border-b border-gray-200 py-2">
                    <h3 class="text-lg font-bold">
                        <span id="success_modal_title">${this.options.successText}</span>
                    </h3>
                    <form method="dialog">
                        <button class="btn btn-xs btn-ghost rounded-full btn-circle" type="submit"> <svg class="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
                    </form>
                </div>
                <p class="py-4" id="success_modal_message">${this.options.successMessage}</p>
              </div>
            </dialog>`);
        }
        // Error Modal
        if (!document.getElementById('error_modal')) {
            document.body.insertAdjacentHTML('beforeend', `
            <dialog id="error_modal" class="modal">
              <div class="modal-box bg-red-800/90 text-white">
              <div class="flex items-center justify-between gap-1 border-b border-gray-200 py-2">
                    <h3 class="text-lg font-bold">
                        <span id="error_modal_title">${this.options.errorText}</span>
                    </h3>
                    <form method="dialog">
                        <button class="btn btn-xs btn-ghost rounded-full btn-circle" type="submit"> <svg class="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
                    </form>
                </div>
                <p class="py-4" id="error_modal_message">${this.options.errorMessage}</p>
              </div>
            </dialog>`);
        }

        // Cache modal elements for later use
        this.deleteModal = document.getElementById('delete_modal');
        this.successModal = document.getElementById('success_modal');
        this.errorModal = document.getElementById('error_modal');
        this.confirmBtn = document.getElementById('confirmDeleteBtn');
        this.cancelBtn = document.getElementById('cancelDeleteBtn');
    }

    _bindEvents() {
        // For keeping track of which button was clicked
        this.currentBtn = null;

        // Open the confirmation modal on delete button click
        this.buttons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.currentBtn = btn;
                document.getElementById('delete_modal_title').textContent = this.options.confirmText;
                document.getElementById('delete_modal_message').textContent = this.options.message;
                this.confirmBtn.disabled = false;
                this.cancelBtn.disabled = false;
                this.deleteModal.showModal();
            });
        });

        // Cancel delete
        this.cancelBtn.addEventListener('click', () => {
            this.deleteModal.close();
            this.currentBtn = null;
        });

        // Confirm delete
        this.confirmBtn.addEventListener('click', async () => {
            if (!this.currentBtn) return;
            const url = this.currentBtn.dataset.href;
            // Disable both buttons to prevent multiple clicks
            this.confirmBtn.disabled = true;
            this.cancelBtn.disabled = true;

            try {
                let resp;
                if (window.axios) {
                    resp = await axios.delete(url, {
                        headers: {'X-Requested-With': 'XMLHttpRequest', 'Accept': 'application/json'}
                    });
                    if (resp.status === 200 || resp.status === 204) {
                        this._showSuccess();
                        this._afterDelete(true, resp.data);
                    } else throw resp;
                } else {
                    const res = await fetch(url, { method: 'DELETE', headers: {'X-Requested-With': 'XMLHttpRequest', 'Accept': 'application/json'} });
                    if (res.ok) {
                        this._showSuccess();
                        let data = await res.json().catch(() => ({}));
                        this._afterDelete(true, data);
                    } else {
                        throw res;
                    }
                }
            } catch (err) {
                this._showError(err);
                this._afterDelete(false, err);
            } finally {
                this.deleteModal.close();
                this.currentBtn = null;
                // Always re-enable buttons when modal re-opens
                setTimeout(() => {
                    this.confirmBtn.disabled = false;
                    this.cancelBtn.disabled = false;
                }, 300);
            }
        });
    }


    // Shows the success modal
    _showSuccess() {
        document.getElementById('success_modal_title').textContent = this.options.successText;
        document.getElementById('success_modal_message').textContent = this.options.successMessage;
        this.successModal.showModal();
        // Only auto-close if timeout is set and > 0
        if (this.options.successTimeout && this.options.successTimeout > 0) {
            setTimeout(() => {
                this.successModal.close();
            }, this.options.successTimeout);
        }
    }

    _showError(err) {
        document.getElementById('error_modal_title').textContent = this.options.errorText;
        let msg = this.options.errorMessage;
        if (err && err.response && err.response.data && err.response.data.message)
            msg = err.response.data.message;
        document.getElementById('error_modal_message').textContent = msg;
        this.errorModal.showModal();
        // Only auto-close if timeout is set and > 0
        if (this.options.errorTimeout && this.options.errorTimeout > 0) {
            setTimeout(() => {
                this.errorModal.close();
            }, this.options.errorTimeout);
        }
    }


    /**
     * Hook that fires after delete request completes
     * @param {boolean} success Was the delete successful?
     * @param {object} data Response data or error
     * @param {HTMLElement} button The button that triggered the delete
     */
    _afterDelete(success, data) {
        if (typeof this.options.onDelete === 'function') {
            this.options.onDelete(success, data, this.currentBtn);
        }
    }
}
