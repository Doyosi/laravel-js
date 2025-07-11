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
                }) {
        this.url = url;
        this.container = typeof container === 'string' ? document.querySelector(container) : container;
        this.templateId = templateId;
        this.metaKey = metaKey;
        this.dataKey = dataKey;
        this.fetcher = fetcher;
        this.onRow = onRow;
        this.table = this.container.querySelector('table');
        this.table_loader = document.querySelector('.loading-table');
        this.tbody = this.container.querySelector('tbody');
        this.pagination = pagination ? (
            typeof pagination === 'string' ? document.querySelector(pagination) : pagination
        ) : null;
        this._handlers = {};
        this.filterSelector = filterSelector;
        this.filters = {};

        // Extra: Nothing found & error blocks
        this.nothingFoundBlock = document.querySelector('.nothing-found-table');
        this.errorBlock = document.querySelector('.table-render-error');
        this.errorText = document.querySelector('.table-render-error-text');

        if (this.filterSelector) {
            this._bindFilterEvents();
        }

        this.init();
    }

    on(event, fn) {
        if (!this._handlers[event]) this._handlers[event] = [];
        this._handlers[event].push(fn);
        return this;
    }

    _emit(event, payload) {
        if (!this._handlers[event]) return;
        this._handlers[event].forEach(fn => fn(payload));
    }

    async init(page = 1) {
        if (!this.table || !this.tbody) {
            this._showError('Table or tbody element not found in the container.');
            return;
        }
        if (this.filterSelector) {
            const filterEl = typeof this.filterSelector === 'string'
                ? document.querySelector(this.filterSelector)
                : this.filterSelector;
            if (filterEl) {
                this._updateFilters(filterEl);
            }
        }
        await this.fetchData(page);
    }

    _bindFilterEvents() {
        const filterEl = typeof this.filterSelector === 'string'
            ? document.querySelector(this.filterSelector)
            : this.filterSelector;

        if (!filterEl) return;

        let debounceTimer = null;
        const debounce = (fn, delay = 300) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(fn, delay);
        };

        filterEl.querySelectorAll('input,select').forEach(input => {
            if (input.tagName.toLowerCase() !== 'select') {
                input.addEventListener('input', () => {
                    if (input.type === "search" || input.type === "text") {
                        debounce(() => {
                            this._updateFilters(filterEl);
                            this.fetchData(1);
                        });
                    }
                });
            } else {
                input.addEventListener('change', () => {
                    this._updateFilters(filterEl);
                    this.fetchData(1);
                });
            }
        });
    }


    _updateFilters(filterEl) {
        this.filters = {};
        filterEl.querySelectorAll('input,select').forEach(input => {
            if (input.value && input.name) {
                this.filters[input.name] = input.value;
            }
        });
    }

    _buildQueryString(page = 1) {
        let params = { ...this.filters, page };
        return Object.entries(params)
            .map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v))
            .join('&');
    }

    async fetchData(page = 1) {
        let paginationEl = this.pagination;
        if (paginationEl) paginationEl.classList.add('hidden');
        this._emit("start", { page });
        this.container.classList.add('hidden');
        if (this.table_loader) this.table_loader.classList.remove('hidden');

        // Hide error & nothing-found at start
        this._hideError();
        this._hideNothingFound();

        let endpoint = this.url.split('?')[0];
        let query = this._buildQueryString(page);
        endpoint += query ? ('?' + query) : '';

        let response, rows = [], meta = {};
        try {
            if (this.fetcher === 'axios' && window.axios) {
                response = await axios.get(endpoint);
                response = response.data;
            } else {
                let res = await fetch(endpoint);
                if (!res.ok) throw await res.json();
                response = await res.json();
            }
            rows = response[this.dataKey] || response.data || [];
            meta = response[this.metaKey] || {};
            this._renderRows(rows);
            this._renderPagination(meta);
        } catch (err) {
            let msg = err?.message || (typeof err === 'string' ? err : 'Table Render Error!');
            this._showError(msg);
            if (this.table_loader) this.table_loader.classList.add('hidden');
            this.container.classList.remove('hidden');
            this._emit("rendered", { rows: [], meta: {}, page, error: msg });
            return;
        }

        if (this.table_loader) this.table_loader.classList.add('hidden');
        this.container.classList.remove('hidden');
        this._emit("rendered", { rows, meta, page });

        // Show nothing found if table empty
        if (!rows.length) {
            this._showNothingFound();
        }
    }

    _renderRows(rows) {
        this.tbody.innerHTML = '';
        rows.forEach((row, i) => {
            let tr = document.createElement('tr');
            tr.innerHTML = this._renderTemplate(row);
            if (tr.children.length === 1 && tr.children[0].tagName === 'TR') {
                this.tbody.appendChild(tr.children[0]);
            } else {
                this.tbody.appendChild(tr);
            }
        });
    }

    _renderTemplate(row) {
        if (typeof this.onRow === 'function') return this.onRow(row);
        const tpl = document.getElementById(this.templateId);
        if (!tpl) return '';
        let html = tpl.innerHTML;
        html = html.replace(/data\.([a-zA-Z0-9_]+)/g, (_, key) => row[key] ?? '');
        return html;
    }

    _renderPagination(meta) {
        let paginationEl = this.pagination;
        if (!paginationEl) {
            paginationEl = document.createElement('div');
            paginationEl.className = "flex justify-center hidden";
            this.container.appendChild(paginationEl);
            this.pagination = paginationEl;
        }
        paginationEl.innerHTML = '';
        if (!meta || !meta.last_page || meta.last_page <= 1) return;
        paginationEl.classList.remove('hidden');
        const joinDiv = document.createElement('div');
        joinDiv.className = "join";
        paginationEl.appendChild(joinDiv);
        meta.links.slice(1, -1).forEach((link, i) => {
            if (link.label === '...') {
                const span = document.createElement('span');
                span.className = 'btn btn-disabled join-item';
                span.innerHTML = link.label;
                joinDiv.appendChild(span);
                return;
            }
            let btn = document.createElement('button');
            btn.className = `join-item btn ${link.active ? 'btn-active' : ''}`;
            btn.disabled = !link.url;
            btn.innerHTML = link.label.replace(/&laquo;|&raquo;/g, s => ({
                '&laquo;': '‹', '&raquo;': '›'
            })[s] || s);
            if (link.url) {
                btn.onclick = e => {
                    e.preventDefault();
                    const url = new URL(link.url, window.location.origin);
                    const page = url.searchParams.get('page') || 1;
                    paginationEl.classList.add('hidden');
                    this._emit("pageChange", { page: parseInt(page), label: link.label });
                    this.fetchData(page);
                };
            }
            joinDiv.appendChild(btn);
        });
    }

    // ===== Extra methods for state blocks =====
    _showNothingFound() {
        if (this.nothingFoundBlock) {
            this.nothingFoundBlock.classList.remove('hidden');
            this.container.classList.add('hidden');
        }
    }
    _hideNothingFound() {
        if (this.nothingFoundBlock) {
            this.nothingFoundBlock.classList.add('hidden');
        }
    }
    _showError(msg) {
        if (this.errorBlock) {
            this.errorBlock.classList.remove('hidden');
            if (this.errorText) this.errorText.textContent = msg;
        } else {
            alert(msg);
        }

        this.container.classList.remove('hidden');
    }
    _hideError() {
        if (this.errorBlock) this.errorBlock.classList.add('hidden');
        if (this.errorText) this.errorText.textContent = '';
    }

    refresh() {
        this.init();
    }
}
