// SelectDropdown.js
export default class SelectDropdown {
    /**
     * @param {string|HTMLElement} containerSelector  #id or DOM node of <details>
     * @param {Object} config
     * @param {Function} [config.onSelect]  callback({label, value}, element)
     * @param {boolean} [config.closeOnSelect=true]
     */
    constructor(containerSelector, config = {}) {
        this.config = Object.assign({ closeOnSelect: true }, config);
        this.root = typeof containerSelector === 'string' ?
            document.querySelector(containerSelector) : containerSelector;
         //this.root.id remove _dropdown
        const inputId =  this.root.id.replace(/_dropdown$/, '');
        this.summary = this.root.querySelector('summary');
        this.optionsBox = this.root.querySelector('.options');
        this.searchInput = this.root.querySelector('.search-input');
        this.hiddenInput = document.querySelector(`input#${inputId}`);
        this.options = Array.from(this.optionsBox.querySelectorAll('.option'));
        this.selectedIndex = -1; // None selected at start

        // After collecting this.options in the constructor, add:
        const selectedValue = this.hiddenInput?.value;
        if (selectedValue) {
            const initialOpt = this.options.find(o => o.dataset.value == selectedValue);
            if (initialOpt) {
                initialOpt.setAttribute('data-selected', 'true');
                initialOpt.classList.add('bg-base-300');
                this.summary.textContent = initialOpt.dataset.label || initialOpt.textContent.trim();
            }
        }
        this.resetBtn = this.root.closest('.form-control').querySelector('.select-reset');
        // After setting initial selection
        if (this.resetBtn) {
            if (selectedValue) {
                this.resetBtn.classList.remove('hidden');
            } else {
                this.resetBtn.classList.add('hidden');
            }
        }


        if (this.resetBtn) {
            this.resetBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this._reset();
            });
        }


        this._bindEvents();
    }

    _bindEvents() {
        // Open/close with summary click
        this.summary.addEventListener('click', e => {
            // toggle handled by <details>
            setTimeout(() => this._focusSearch(), 120); // delay to open dropdown
        });

        // Option click
        this.optionsBox.addEventListener('click', e => {
            const opt = e.target.closest('.option');
            if (!opt) return;
            this._select(opt);
        });

        // Highlight on hover
        this.options.forEach((opt, idx) => {
            opt.addEventListener('mouseenter', () => this._highlight(idx));
        });

        // Keyboard navigation and selection
        this.root.addEventListener('keydown', e => {
            const open = this.root.hasAttribute('open');
            if (!open) return;
            if (e.key === "ArrowDown") {
                this._moveHighlight(1);
                e.preventDefault();
            } else if (e.key === "ArrowUp") {
                this._moveHighlight(-1);
                e.preventDefault();
            } else if (e.key === "Enter") {
                if (this.selectedIndex >= 0) {
                    this._select(this.options[this.selectedIndex]);
                }
                e.preventDefault();
            } else if (e.key === "Escape") {
                this.root.removeAttribute('open');
                this.selectedIndex = -1;
                e.preventDefault();
            }
        });

        // Filter options on search
        this.searchInput.addEventListener('input', () => this._filterOptions());

        // On blur: close dropdown if clicked outside
        document.addEventListener('mousedown', (e) => {
            if (!this.root.contains(e.target)) {
                this.root.removeAttribute('open');
            }
        });
    }

    _focusSearch() {
        if (this.searchInput) this.searchInput.focus();
    }

    _highlight(idx) {
        this.options.forEach((o, i) => o.classList.toggle('bg-base-200', i === idx));
        this.selectedIndex = idx;
    }

    _moveHighlight(step) {
        let visibleOpts = this.options.filter(o => !o.classList.contains('hidden'));
        if (!visibleOpts.length) return;
        let idx = visibleOpts.findIndex(o => o.classList.contains('bg-base-200'));
        idx = idx === -1 ? 0 : idx + step;
        if (idx < 0) idx = visibleOpts.length - 1;
        if (idx >= visibleOpts.length) idx = 0;
        visibleOpts.forEach(o => o.classList.remove('bg-base-200'));
        visibleOpts[idx].classList.add('bg-base-200');
        this.selectedIndex = this.options.indexOf(visibleOpts[idx]);
        // Scroll into view if necessary
        visibleOpts[idx].scrollIntoView({ block: 'nearest' });
    }

    _filterOptions() {
        const term = this.searchInput.value.trim().toLowerCase();
        this.options.forEach(opt => {
            const label = opt.dataset.label.toLowerCase();
            opt.classList.toggle('hidden', !label.includes(term));
        });
        // Reset highlight
        this.selectedIndex = -1;
    }

    _select(opt) {
        const value = opt.dataset.value;
        const label = opt.dataset.label || opt.textContent.trim();
        this.summary.textContent = label;
        if (this.hiddenInput) this.hiddenInput.value = value;
        this.options.forEach(o => {
            o.setAttribute('data-selected', '');
            o.classList.remove('bg-base-300');
        });
        opt.setAttribute('data-selected', 'true');
        opt.classList.add('bg-base-300');
        if (this.config.closeOnSelect) this.root.removeAttribute('open');
        if (typeof this.config.onSelect === 'function') {
            this.config.onSelect({ label, value }, opt);
        }
        // Show reset button if available
        if (this.resetBtn) this.resetBtn.classList.remove('hidden');
    }

    _reset() {
        if (this.hiddenInput) this.hiddenInput.value = '';
        this.summary.textContent =  this.summary.dataset.label || this.summary.textContent.trim();
        this.options.forEach(o => {
            o.setAttribute('data-selected', '');
            o.classList.remove('bg-base-300');
        });
        if (this.searchInput) this.searchInput.value = '';
        this.options.forEach(opt => opt.classList.remove('hidden'));
        if (typeof this.config.onSelect === 'function') {
            this.config.onSelect({ label: null, value: null }, null);
        }
        // Hide reset button if available
        if (this.resetBtn) this.resetBtn.classList.add('hidden');
    }

    selectValue(value) {
        // Find the option with the given value
        const opt = this.options.find(o => o.dataset.value == value);
        if (opt) {
            this._select(opt);
        }
    }


}
