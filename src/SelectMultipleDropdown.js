// SelectMultipleDropdown.js
export default class SelectMultipleDropdown {
    /**
     * @param {string|HTMLElement} containerSelector  #id or DOM node of <details>
     * @param {Object} config
     * @param {Function} [config.onSelect]  callback({selections}, element)
     * @param {Function} [config.onRemove]  callback({removedValue, selections}, element)
     * @param {number} [config.maxSelections]  maximum number of selections allowed
     * @param {boolean} [config.closeOnSelect=false]
     */
    constructor(containerSelector, config = {}) {
        this.config = Object.assign({
            closeOnSelect: false,
            maxSelections: null
        }, config);

        this.root = typeof containerSelector === 'string' ?
            document.querySelector(containerSelector) : containerSelector;

        const inputId = this.root.id.replace(/_dropdown$/, '');
        this.summary = this.root.querySelector('summary');
        this.optionsBox = this.root.querySelector('.options');
        this.searchInput = this.root.querySelector('.search-input');
        this.hiddenInputsContainer = this.root.closest('.form-control').querySelector('.hidden-inputs');
        this.selectedDisplay = this.root.querySelector('.selected-display');
        this.placeholderText = this.root.querySelector('.placeholder-text');
        this.selectionCountSpan = this.root.querySelector('.selection-count');
        this.options = Array.from(this.optionsBox.querySelectorAll('.option'));
        this.checkboxes = Array.from(this.optionsBox.querySelectorAll('.option-checkbox'));
        this.resetBtn = this.root.closest('.form-control').querySelector('.select-reset');

        this.selections = new Set();
        this.disabledOptions = new Set(); // Track disabled options

        // Initialize with existing selections
        this._initializeSelections();
        this._updateDisplay();
        this._updateResetButton();

        this._bindEvents();
    }

    _initializeSelections() {
        this.checkboxes.forEach(checkbox => {
            if (checkbox.checked) {
                this.selections.add(checkbox.value);
            }
        });
    }

    _bindEvents() {
        // Open/close with summary click
        this.summary.addEventListener('click', e => {
            // Prevent checkbox clicks from bubbling up
            if (e.target.closest('.remove-selection')) {
                e.preventDefault();
                e.stopPropagation();
                return;
            }
            setTimeout(() => this._focusSearch(), 120);
        });

        // Checkbox change
        this.optionsBox.addEventListener('change', e => {
            if (e.target.classList.contains('option-checkbox')) {
                this._toggleSelection(e.target);
            }
        });

        // Remove selection from badge
        this.selectedDisplay.addEventListener('click', e => {
            const removeBtn = e.target.closest('.remove-selection');
            if (removeBtn) {
                e.preventDefault();
                e.stopPropagation();
                const value = removeBtn.dataset.value;
                this._removeSelection(value);
            }
        });

        // Reset button
        if (this.resetBtn) {
            this.resetBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this._reset();
            });
        }

        // Filter options on search
        if (this.searchInput) {
            this.searchInput.addEventListener('input', () => this._filterOptions());
        }

        // Keyboard navigation
        this.root.addEventListener('keydown', e => {
            const open = this.root.hasAttribute('open');
            if (!open) return;

            if (e.key === "Escape") {
                this.root.removeAttribute('open');
                e.preventDefault();
            }
        });

        // Close dropdown when clicking outside
        document.addEventListener('mousedown', (e) => {
            if (!this.root.contains(e.target)) {
                this.root.removeAttribute('open');
            }
        });
    }

    _focusSearch() {
        if (this.searchInput) this.searchInput.focus();
    }

    _toggleSelection(checkbox) {
        const value = checkbox.value;
        const isChecked = checkbox.checked;

        // Check if option is disabled
        if (this.disabledOptions.has(value)) {
            checkbox.checked = false;
            return;
        }

        if (isChecked) {
            // Check max selections limit
            if (this.config.maxSelections && this.selections.size >= this.config.maxSelections) {
                checkbox.checked = false;
                this._showMaxSelectionWarning();
                return;
            }
            this._addSelection(value);
        } else {
            this._removeSelection(value);
        }
    }

    _addSelection(value) {
        this.selections.add(value);
        const checkbox = this.checkboxes.find(cb => cb.value === value);
        const option = checkbox?.closest('.option');

        if (checkbox) checkbox.checked = true;
        if (option) option.classList.add('bg-base-300');

        this._updateDisplay();
        this._updateHiddenInputs();
        this._updateResetButton();
        this._updateSelectionCount();

        if (typeof this.config.onSelect === 'function') {
            this.config.onSelect({
                selections: Array.from(this.selections),
                added: value
            }, option);
        }
    }

    _removeSelection(value) {
        this.selections.delete(value);
        const checkbox = this.checkboxes.find(cb => cb.value === value);
        const option = checkbox?.closest('.option');

        if (checkbox) checkbox.checked = false;
        if (option) option.classList.remove('bg-base-300');

        this._updateDisplay();
        this._updateHiddenInputs();
        this._updateResetButton();
        this._updateSelectionCount();

        if (typeof this.config.onRemove === 'function') {
            this.config.onRemove({
                selections: Array.from(this.selections),
                removed: value
            }, option);
        }
    }

    _updateDisplay() {
        if (this.selections.size === 0) {
            this.selectedDisplay.innerHTML = `<span class="placeholder-text text-gray-500">${this.summary.dataset.label || 'Select items'}</span>`;
        } else {
            const badges = Array.from(this.selections).map(value => {
                const option = this.options.find(opt => opt.dataset.value === value);
                const label = option?.dataset.label || value;
                return `<span class="badge badge-primary badge-sm">
                    ${label}
                    <button type="button" class="ml-1 remove-selection" data-value="${value}">
                        <svg class="size-3" viewBox="0 0 24 24"><path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/></svg>
                    </button>
                </span>`;
            }).join('');

            this.selectedDisplay.innerHTML = `<div class="flex flex-wrap gap-1">${badges}</div>`;
        }
    }

    _updateHiddenInputs() {
        this.hiddenInputsContainer.innerHTML = '';
        this.selections.forEach(value => {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = `${this.root.id.replace(/_dropdown$/, '')}[]`;
            input.value = value;
            this.hiddenInputsContainer.appendChild(input);
        });
    }

    _updateResetButton() {
        if (this.resetBtn) {
            this.resetBtn.classList.toggle('hidden', this.selections.size === 0);
        }
    }

    _updateSelectionCount() {
        if (this.selectionCountSpan) {
            this.selectionCountSpan.textContent = this.selections.size;
        }
    }

    _filterOptions() {
        const term = this.searchInput.value.trim().toLowerCase();
        this.options.forEach(opt => {
            const label = opt.dataset.label.toLowerCase();
            const isDisabled = this.disabledOptions.has(opt.dataset.value);
            // Hide if doesn't match search OR if disabled
            opt.classList.toggle('hidden', !label.includes(term) || isDisabled);
        });
    }

    _updateOptionVisualState(value) {
        const checkbox = this.checkboxes.find(cb => cb.value === value);
        const option = checkbox?.closest('.option');

        if (checkbox && option) {
            const isDisabled = this.disabledOptions.has(value);

            // Update checkbox state
            checkbox.disabled = isDisabled;

            // Update visual styling
            if (isDisabled) {
                option.classList.add('opacity-50', 'cursor-not-allowed');
                option.classList.remove('hover:bg-base-200', 'cursor-pointer');
                // If currently selected and being disabled, remove selection
                if (this.selections.has(value)) {
                    this._removeSelection(value);
                }
            } else {
                option.classList.remove('opacity-50', 'cursor-not-allowed');
                option.classList.add('hover:bg-base-200', 'cursor-pointer');
            }
        }
    }

    _reset() {
        this.selections.clear();
        this.checkboxes.forEach(checkbox => {
            checkbox.checked = false;
            checkbox.closest('.option').classList.remove('bg-base-300');
        });

        this._updateDisplay();
        this._updateHiddenInputs();
        this._updateResetButton();
        this._updateSelectionCount();

        if (this.searchInput) this.searchInput.value = '';
        this.options.forEach(opt => opt.classList.remove('hidden'));

        if (typeof this.config.onSelect === 'function') {
            this.config.onSelect({
                selections: [],
                cleared: true
            }, null);
        }
    }

    _showMaxSelectionWarning() {
        // You can customize this notification
        console.warn(`Maximum ${this.config.maxSelections} selections allowed`);
        // Or show a toast notification if available
        // new Toast({ message: `Maximum ${this.config.maxSelections} selections allowed`, type: 'warning' });
    }

    // Public methods
    selectValues(values) {
        values.forEach(value => {
            if (!this.selections.has(value) && !this.disabledOptions.has(value)) {
                this._addSelection(value);
            }
        });
    }

    getSelections() {
        return Array.from(this.selections);
    }

    clearSelections() {
        this._reset();
    }

    /**
     * Disable specific option(s)
     * @param {string|string[]} values - Single value or array of values to disable
     */
    disableOption(values) {
        const valueArray = Array.isArray(values) ? values : [values];

        valueArray.forEach(value => {
            this.disabledOptions.add(value);
            this._updateOptionVisualState(value);
        });

        // Re-apply filter to hide disabled options if search is active
        if (this.searchInput && this.searchInput.value.trim()) {
            this._filterOptions();
        }
    }

    /**
     * Enable specific option(s)
     * @param {string|string[]} values - Single value or array of values to enable
     */
    enableOption(values) {
        const valueArray = Array.isArray(values) ? values : [values];

        valueArray.forEach(value => {
            this.disabledOptions.delete(value);
            this._updateOptionVisualState(value);
        });

        // Re-apply filter to show enabled options if search is active
        if (this.searchInput && this.searchInput.value.trim()) {
            this._filterOptions();
        }
    }

    /**
     * Check if option is disabled
     * @param {string} value - Value to check
     * @returns {boolean}
     */
    isOptionDisabled(value) {
        return this.disabledOptions.has(value);
    }

    /**
     * Get all disabled options
     * @returns {string[]}
     */
    getDisabledOptions() {
        return Array.from(this.disabledOptions);
    }

    /**
     * Clear all disabled options
     */
    clearDisabledOptions() {
        const allDisabled = Array.from(this.disabledOptions);
        this.disabledOptions.clear();

        allDisabled.forEach(value => {
            this._updateOptionVisualState(value);
        });

        // Re-apply filter if search is active
        if (this.searchInput && this.searchInput.value.trim()) {
            this._filterOptions();
        }
    }
}
