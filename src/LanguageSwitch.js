/**
 * LanguageSwitch
 * Usage:
 *   new LanguageSwitch({
 *     root: document, // Or any parent node
 *     localeDropdownSelector: '.dropdown',
 *     buttonSelector: '.btn-locale',
 *     defaultLocale: 'en'
 *   });
 */
export default class LanguageSwitch {
    /**
     * @param {Object} params
     * @param {HTMLElement|Document} [params.root]
     * @param {string} params.localeDropdownSelector
     * @param {string} params.buttonSelector
     * @param {string} [params.defaultLocale]
     */
    constructor({
                    root = document,
                    localeDropdownSelector = '.dropdown',
                    buttonSelector = '.btn-locale',
                    defaultLocale = null
                } = {}) {
        this.root = root;
        this.dropdown = this.root.querySelector(localeDropdownSelector);
        this.buttonSelector = buttonSelector;

        // Use summary's data-default-locale or fallback
        this.defaultLocale =
            defaultLocale ||
            (this.dropdown?.querySelector('summary[data-default-locale]')
                ?.dataset.defaultLocale ?? 'en');
        this.currentLocale = this.defaultLocale;

        this.init();
    }

    init() {
        // Click listeners for dropdown
        this.dropdown?.querySelectorAll(this.buttonSelector).forEach(btn => {
            btn.addEventListener('click', e => {
                e.preventDefault();
                const newLocale = btn.dataset.locale;
                if (!newLocale) return;
                this.switchLocale(newLocale);
            });
        });
        this.switchLocale(this.currentLocale);
    }

    switchLocale(locale) {
        this.currentLocale = locale;
        // Optionally update dropdown summary
        const summary = this.dropdown?.querySelector('summary');
        if (summary) {
            const clickedBtn = this.dropdown.querySelector(
                `${this.buttonSelector}[data-locale="${locale}"]`
            );
            if (clickedBtn) {
                summary.innerHTML = clickedBtn.innerHTML;
                summary.setAttribute('data-default-locale', locale);
                this.dropdown.removeAttribute('open');
            }
        }

        // 1. Toggle input labels (by data-locale)
        document.querySelectorAll('[data-locale-form]').forEach(el => {
            el.classList.toggle('hidden', el.dataset.localeForm !== locale);
            el.style.display = el.classList.contains('hidden') ? 'none' : '';
        });
    }
}
