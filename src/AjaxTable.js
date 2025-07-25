export default class AjaxTable {
    constructor({
        url,
        container,
        templateId = 'row-template',
        metaKey = 'meta',
        dataKey = 'data',
        fetcher = window.axios ? 'axios' : 'fetch',
        onRow = null,
        pagination = null,
        filterSelector = null,
        loadingIndicator = '.loading-table',
        nothingFoundBlock = '.nothing-found-table',
        errorBlock = '.table-render-error',
        additionalParams = null,
        autoInit = true,
        debounceTime = 300
    }) {
        this.url = url;
        this.config = { templateId, metaKey, dataKey, fetcher, onRow, additionalParams, debounceTime };
        this.filters = {};
        this._handlers = {};
        this.debounceTimer = null;

        const getEl = (sel) => typeof sel === 'string' ? document.querySelector(sel) : sel;

        this.elements = {
            container: getEl(container),
            table: getEl(container)?.querySelector('table'),
            tbody: getEl(container)?.querySelector('tbody'),
            pagination: getEl(pagination),
            filters: getEl(filterSelector),
            loader: getEl(loadingIndicator),
            nothingFound: getEl(nothingFoundBlock),
            error: getEl(errorBlock),
        };

        if (!this.elements.table || !this.elements.tbody) {
            throw new Error('AjaxTable: Table or tbody element not found.');
        }

        this._bindFilterEvents();

        if (autoInit) this.init();
    }

    on(event, fn) {
        if (!this._handlers[event]) this._handlers[event] = [];
        this._handlers[event].push(fn);
        return this;
    }

    _emit(event, payload) {
        (this._handlers[event] || []).forEach(fn => fn(payload));
    }

    init() {
        if (this.elements.filters) this._updateFilters();
        return this.fetchData(1);
    }

    refresh() {
        const currentPage = this.lastMeta?.current_page || 1;
        return this.fetchData(currentPage);
    }

    _bindFilterEvents() {
        if (!this.elements.filters) return;

        const handler = () => {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = setTimeout(() => {
                this._updateFilters();
                this.fetchData(1);
            }, this.config.debounceTime);
        };

        this.elements.filters.querySelectorAll('input, select').forEach(input => {
            const type = input.tagName.toLowerCase();
            if (type === 'input') {
                input.addEventListener('input', handler);
            } else {
                input.addEventListener('change', handler);
            }
        });
    }

    _updateFilters() {
        this.filters = {};
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

    _buildQueryString(page = 1) {
        let params = { ...this.filters, page };
        if (typeof this.config.additionalParams === 'function') {
            params = { ...params, ...this.config.additionalParams() };
        }
        return new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== '')).toString();
    }

    _setState(state, errorMessage = 'An error occurred.') {
        const { container, loader, nothingFound, error } = this.elements;
        const all = [container, loader, nothingFound, error];
        all.forEach(el => el?.classList.add('hidden'));

        if (state === 'loading' && loader) loader.classList.remove('hidden');
        else if (state === 'content' && container) container.classList.remove('hidden');
        else if (state === 'empty' && nothingFound) nothingFound.classList.remove('hidden');
        else if (state === 'error' && error) {
            error.classList.remove('hidden');
            const errorTextField = error.querySelector('.table-render-error-text') || error;
            errorTextField.textContent = errorMessage;
        }
    }

    async fetchData(page = 1) {
        this._setState('loading');
        this._emit('start', { page });
        const pagEl = this.elements.pagination;
        if (pagEl) {
            pagEl.innerHTML = '';
            pagEl.classList.add('hidden');
        }
        const endpoint = `${this.url.split('?')[0]}?${this._buildQueryString(page)}`;

        try {
            const response = this.config.fetcher === 'axios'
                ? (await window.axios.get(endpoint)).data
                : await (await fetch(endpoint)).json();

            const meta = response[this.config.metaKey] || {};
            this.lastMeta = meta;

            const data = response[this.config.dataKey] || [];

            this._renderRows(data);
            this._renderPagination(meta);

            this._setState(data.length > 0 ? 'content' : 'empty');
            this._emit('rendered', { data, meta, page });

        } catch (err) {
            console.error('AjaxTable fetch error:', err);
            const msg = err?.message || 'Failed to load data.';
            this._setState('error', msg);
            this._emit('error', { error: err, message: msg });
        }
    }

    _renderRows(data) {
        if (!this.elements.tbody) return;
        this.elements.tbody.innerHTML = '';

        const fragment = document.createDocumentFragment();
        data.forEach(row => {
            const tr = document.createElement('tr');
            tr.innerHTML = this._renderTemplate(row);
            fragment.appendChild(tr.children.length === 1 && tr.children[0].tagName === 'TR'
                ? tr.children[0]
                : tr);
        });

        this.elements.tbody.appendChild(fragment);
    }

    _renderTemplate(row) {
        if (typeof this.config.onRow === 'function') return this.config.onRow(row);
        if (row.html) return row.html;

        const tpl = document.getElementById(this.config.templateId);
        if (!tpl) return '';
        let html = tpl.innerHTML;

        html = html.replace(/data\.([a-zA-Z0-9_]+\.[a-zA-Z0-9_]+)/g, (_, path) => {
            const keys = path.split('.');
            let value = row;
            for (const key of keys) {
                value = value?.[key];
                if (value === undefined) break;
            }
            return value ?? '';
        });

        html = html.replace(/data\.([a-zA-Z0-9_]+)/g, (_, key) => row[key] ?? '');
        return html;
    }

    _renderPagination(meta) {
        const pagEl = this.elements.pagination;
        if (!pagEl || !meta?.links || meta.last_page <= 1) {
            pagEl?.classList.add('hidden');
            return;
        }

        pagEl.classList.remove('hidden');
        pagEl.innerHTML = '';

        const fragment = document.createDocumentFragment();
        meta.links.forEach(link => {
            const pageNum = new URL(link.url || '', window.location.origin).searchParams.get('page');
            const btn = document.createElement('button');

            btn.className = `join-item btn ${link.active ? 'btn-active' : ''}`;
            btn.disabled = !link.url || link.active;
            btn.innerHTML = link.label.replace(/&laquo;|&raquo;/g, '');

            if (link.url) {
                btn.onclick = e => {
                    e.preventDefault();
                    this._emit('pageChange', { page: parseInt(pageNum), label: link.label });
                    this.fetchData(pageNum);
                };
            }

            fragment.appendChild(link.label.includes('...') ? Object.assign(document.createElement('span'), {
                className: 'btn btn-disabled join-item',
                textContent: '...'
            }) : btn);
        });

        const joinDiv = document.createElement('div');
        joinDiv.className = 'join';
        joinDiv.appendChild(fragment);
        pagEl.appendChild(joinDiv);
    }
}
