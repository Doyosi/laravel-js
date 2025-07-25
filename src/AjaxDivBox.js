/**
 * AjaxDivBox - Ajax-based grid/list view with card-like div rendering.
 *
 * @param {Object} options - Configuration options.
 * @see constructor for all available options.
 *
 * @example
 * import AjaxDivBox from './AjaxDivBox.js';
 * const grid = new AjaxDivBox({
 * url: '/api/items',
 * container: '#ajax-list',
 * templateId: 'box-template',
 * filterSelector: '#filters',
 * pagination: '#pagination-container'
 * });
 * grid.init(); // Fetch initial data
 * grid.on('rendered', ({ data }) => console.log('Loaded', data.length, 'items'));
 */
export default class AjaxDivBox {
    /**
     * @param {Object} options
     * @param {string} options.url - API endpoint for data.
     * @param {string|Element} options.container - The container to render the items into.
     * @param {string} [options.templateId='box-template'] - The ID of the script template for rendering items.
     * @param {string} [options.metaKey='meta'] - The key in the API response for pagination metadata.
     * @param {string} [options.dataKey='data'] - The key in the API response for the array of items.
     * @param {string} [options.fetcher='axios'|'fetch'] - The HTTP client to use. Auto-detects Axios.
     * @param {function|null} [options.onBox=null] - A custom function to render an item, overrides templateId.
     * @param {string|Element|null} [options.pagination=null] - The container for pagination links.
     * @param {string|Element|null} [options.filterSelector=null] - The form or div containing filter inputs.
     * @param {string|Element|null} [options.loadingIndicator='.loading-list'] - Selector for the loading element.
     * @param {string|Element|null} [options.nothingFoundBlock='.nothing-found-list'] - Element to show when no results are found.
     * @param {string|Element|null} [options.errorBlock='.list-render-error'] - Element to show on fetch error.
     * @param {function|null} [options.additionalParams=null] - Function that returns an object of extra query parameters.
     */
    constructor({
                    url,
                    container,
                    templateId = 'box-template',
                    metaKey = 'meta',
                    dataKey = 'data',
                    fetcher = window.axios ? 'axios' : 'fetch',
                    onBox = null,
                    pagination = null,
                    filterSelector = null,
                    loadingIndicator = '.loading-list',
                    nothingFoundBlock = '.nothing-found-list',
                    errorBlock = '.list-render-error',
                    additionalParams = null,
                }) {
        this.url = url;
        this.config = { templateId, metaKey, dataKey, fetcher, onBox, additionalParams };
        this.filters = {};
        this._handlers = {};
        this.debounceTimer = null;

        // --- UPDATE: Centralized DOM element querying ---
        // Query all elements once and store them.
        const getElement = (selector) => {
            if (selector instanceof HTMLElement) return selector;
            if (typeof selector === 'string') return document.querySelector(selector);
            return null;
        };

        this.elements = {
            container: getElement(container),
            pagination: getElement(pagination),
            filters: getElement(filterSelector),
            loader: getElement(loadingIndicator),
            nothingFound: getElement(nothingFoundBlock),
            error: getElement(errorBlock),
        };

        if (!this.elements.container) {
            throw new Error('AjaxDivBox: The main container element is required and was not found.');
        }

        // --- UPDATE: Event listeners are bound once in the constructor ---
        this._bindFilterEvents();
        if (this.config.autoInit !== false) {
            this.init();
        }
    }

    /**
     * Registers an event handler.
     * @param {'start'|'rendered'|'error'|'pageChange'} event - The event name.
     * @param {Function} fn - The callback function.
     * @returns {this}
     */
    on(event, fn) {
        if (!this._handlers[event]) this._handlers[event] = [];
        this._handlers[event].push(fn);
        return this;
    }

    /**
     * Emits an event to all registered handlers.
     * @private
     */
    _emit(event, payload) {
        (this._handlers[event] || []).forEach(fn => fn(payload));
    }

    /**
     * Initializes the component by fetching the first page of data.
     * This should be called after instantiation.
     */
    init() {
        if (this.elements.filters) {
            this._updateFilters();
        }
        return this.fetchData(1);
    }

    /**
     * Refreshes the data using the current filters and page.
     */
    refresh() {
        // UPDATE: More descriptive name than init() for a refresh action.
        const currentPage = this.lastMeta?.current_page || 1;
        return this.fetchData(currentPage);
    }

    /**
     * Binds change/input events to filter elements.
     * @private
     */
    _bindFilterEvents() {
        if (!this.elements.filters) return;

        this.elements.filters.addEventListener('input', e => {
            const target = e.target;
            if (target.matches('input, select')) {
                // UPDATE: Simplified debounce logic.
                clearTimeout(this.debounceTimer);
                this.debounceTimer = setTimeout(() => {
                    this._updateFilters();
                    this.fetchData(1);
                }, 300);
            }
        });
    }

    /**
     * Reads the current values from the filter inputs.
     * @private
     */
    _updateFilters() {
        this.filters = {};
        if (!this.elements.filters) return;

        const formData = new FormData(this.elements.filters.tagName === 'FORM' ? this.elements.filters : undefined);
        if (this.elements.filters.tagName !== 'FORM') {
            this.elements.filters.querySelectorAll('input, select').forEach(input => {
                if (input.name) formData.append(input.name, input.value);
            });
        }

        for (const [key, value] of formData.entries()) {
            if (value) this.filters[key] = value;
        }
    }

    /**
     * Constructs the query string from current filters and additional params.
     * @private
     */
    _buildQueryString(page = 1) {
        let params = { ...this.filters, page };

        if (typeof this.config.additionalParams === 'function') {
            params = { ...params, ...this.config.additionalParams() };
        }

        return new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v != null)).toString();
    }

    /**
     * Manages the visibility of elements based on the current state.
     * @private
     * @param {'loading'|'content'|'error'|'empty'} state - The state to display.
     * @param {string} [errorMessage] - An optional error message.
     */
    _setState(state, errorMessage = 'An error occurred.') {
        const { container, loader, nothingFound, error } = this.elements;
        const all = [container, loader, nothingFound, error];

        all.forEach(el => el?.classList.add('hidden'));

        if (state === 'loading' && loader) loader.classList.remove('hidden');
        else if (state === 'content' && container) container.classList.remove('hidden');
        else if (state === 'empty' && nothingFound) nothingFound.classList.remove('hidden');
        else if (state === 'error' && error) {
            error.classList.remove('hidden');
            const errorTextField = error.querySelector('.list-render-error-text') || error;
            errorTextField.textContent = errorMessage;
        }
    }

    /**
     * Fetches data from the API endpoint.
     * @param {number} [page=1] - The page number to fetch.
     */
    async fetchData(page = 1) {
        this._setState('loading');
        this._emit("start", { page });

        const endpoint = `${this.url.split('?')[0]}?${this._buildQueryString(page)}`;

        try {
            const response = this.config.fetcher === 'axios'
                ? (await window.axios.get(endpoint)).data
                : await (await fetch(endpoint, { headers: { 'Accept': 'application/json' } })).json();

            if (response.ok === false) throw response; // Handle API-level errors

            const meta = response[this.config.metaKey] || {};
            this.lastMeta = meta; // Cache for refresh

            // Check for pre-rendered HTML in the response
            if (response.html !== undefined && response.html !== null) {
                // If API returns pre-rendered HTML, use it directly
                this.elements.container.innerHTML = response.html;
                this._renderPagination(meta);

                const hasContent = response.html.trim().length > 0;
                this._setState(hasContent ? 'content' : 'empty');
                this._emit("rendered", { html: response.html, meta, page });
            } else {
                // Otherwise, use the standard template rendering
                const data = response[this.config.dataKey] || [];
                this._renderBoxes(data);
                this._renderPagination(meta);

                this._setState(data.length > 0 ? 'content' : 'empty');
                this._emit("rendered", { data, meta, page });
            }

        } catch (err) {
            console.error('AjaxDivBox fetch error:', err);
            const message = err?.message || 'Failed to load data.';
            this._setState('error', message);
            this._emit("error", { error: err, message });
        }
    }

    /**
     * Renders the items into the container.
     * @private
     */
    _renderBoxes(data) {
        if (!this.elements.container) return;
        this.elements.container.innerHTML = ''; // Clear previous content

        const fragment = document.createDocumentFragment();
        data.forEach(item => {
            const itemHtml = this._renderTemplate(item);
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = itemHtml;
            // Append all children from the temp div to the fragment
            while (tempDiv.firstChild) {
                fragment.appendChild(tempDiv.firstChild);
            }
        });
        this.elements.container.appendChild(fragment);
    }

    /**
     * Renders a single item using either the custom onBox function or the template.
     * @private
     */
    _renderTemplate(item) {
        // UPDATE: Prioritize per-item HTML if it exists.
        if (item.html !== undefined && item.html !== null) {
            return item.html;
        }

        if (typeof this.config.onBox === 'function') {
            return this.config.onBox(item);
        }

        const tpl = document.getElementById(this.config.templateId);
        if (!tpl) {
            console.error(`Template with id "${this.config.templateId}" not found.`);
            return '';
        }


        let html = tpl.innerHTML;

        // Replace nested object properties (e.g., data.user.name)
        html = html.replace(/data\.([a-zA-Z0-9_]+\.[a-zA-Z0-9_]+)/g, (match, path) => {
            const keys = path.split('.');
            let value = item;
            for (const key of keys) {
                value = value?.[key];
                if (value === undefined) break;
            }
            return value ?? '';
        });

        // Replace simple properties (e.g., data.name)
        html = html.replace(/data\.([a-zA-Z0-9_]+)/g, (_, key) => item[key] ?? '');

        return html;
    }

    /**
     * Renders pagination links based on metadata.
     * @private
     */
    _renderPagination(meta) {
        const pagEl = this.elements.pagination;
        if (!pagEl) return;

        pagEl.innerHTML = '';
        if (!meta?.links || meta.last_page <= 1) {
            pagEl.classList.add('hidden');
            return;
        }

        pagEl.classList.remove('hidden');

        const fragment = document.createDocumentFragment();
        meta.links.forEach(link => {
            const pageNum = new URL(link.url || '', window.location.origin).searchParams.get('page');

            if (link.label.includes('...')) {
                const span = document.createElement('span');
                span.className = 'btn btn-disabled join-item';
                span.textContent = '...';
                fragment.appendChild(span);
                return;
            }

            const btn = document.createElement('button');
            btn.className = `join-item btn ${link.active ? 'btn-active' : ''}`;
            btn.disabled = !link.url || link.active;
            btn.innerHTML = link.label.replace(/&laquo;|&raquo;/g, '');

            if (link.url) {
                btn.onclick = (e) => {
                    e.preventDefault();
                    this._emit("pageChange", { page: parseInt(pageNum), label: link.label });
                    this.fetchData(pageNum);
                };
            }
            fragment.appendChild(btn);
        });

        const joinDiv = document.createElement('div');
        joinDiv.className = "join";
        joinDiv.appendChild(fragment);
        pagEl.appendChild(joinDiv);
    }
}
