/**
 * AjaxDivBox - Ajax-based grid/list view with card-like div rendering
 *
 * @param {Object} options
 * @param {string} options.url - API endpoint for data (should return {data, meta})
 * @param {string|Element} options.container - The container to render the boxes into
 * @param {string} options.templateId - The div template id (default: 'box-template')
 * @param {string} options.metaKey - Key for pagination/meta (default: 'meta')
 * @param {string} options.dataKey - Key for rows/boxes (default: 'data')
 * @param {string} options.fetcher - 'axios' or 'fetch' (default: auto)
 * @param {function|null} options.onBox - Custom render function for each box
 * @param {string|Element|null} options.pagination - Pagination container
 * @param {string|Element|null} options.filterSelector - Filters form selector/container
 * @param {function|null} options.additionalParams - Function that returns additional parameters
 *
 * Usage:
 * import AjaxDivBox from './AjaxDivBox.js';
 * const grid = new AjaxDivBox({
 *    url: '/api/items',
 *    container: '#ajax-list',
 *    templateId: 'box-template'
 * });
 * grid.on('rendered', ({rows}) => console.log('Loaded', rows));
 */
export default class AjaxDivBox {
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
                    nothingFoundBlock = '.nothing-found-list',
                    errorBlock = '.list-render-error',
                    errorText = '.list-render-error-text',
                    loadingList = '.loading-list',
                    additionalParams = null,
                }) {
        this.url = url;
        this.container = typeof container === 'string' ? document.querySelector(container) : container;
        this.templateId = templateId;
        this.metaKey = metaKey;
        this.dataKey = dataKey;
        this.fetcher = fetcher;
        this.onBox = onBox;
        this.additionalParams = additionalParams;

        // The container IS the list container, not a parent of it
        this.boxList = this.container;

        // Get loading element
        this.list_loader = document.querySelector(loadingList) || null;

        this.pagination = pagination ? (
            typeof pagination === 'string' ? document.querySelector(pagination) : pagination
        ) : null;

        this._handlers = {};
        this.filterSelector = filterSelector;
        this.filters = {};

        // Get status elements
        this.nothingFoundBlock = document.querySelector(nothingFoundBlock);
        this.errorBlock = document.querySelector(errorBlock);
        this.errorText = document.querySelector(errorText);

        // Remove the alert - it was for debugging
        //alert(this.nothingFoundBlock.className);

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
        if (!this.container || !this.boxList) {
            this._showError('List or box container not found.');
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

        // Add additional parameters if provided
        if (typeof this.additionalParams === 'function') {
            const additional = this.additionalParams();
            params = { ...params, ...additional };
        }

        return Object.entries(params)
            .filter(([k, v]) => v !== null && v !== undefined && v !== '')
            .map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v))
            .join('&');
    }

    async fetchData(page = 1) {
        let paginationEl = this.pagination;
        if (paginationEl) paginationEl.classList.add('hidden');

        this._emit("start", { page });

        // Hide container and show loading
        if (this.container) this.container.classList.add('hidden');
        if (this.list_loader) this.list_loader.classList.remove('hidden');

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
                if (!res.ok) {
                    const errorData = await res.json();
                    throw errorData;
                }
                response = await res.json();
            }

            rows = response[this.dataKey] || response.data || [];
            meta = response[this.metaKey] || response.meta || {};

            this._renderBoxes(rows);
            this._renderPagination(meta);

        } catch (err) {
            console.error('AjaxDivBox fetch error:', err);
            let msg = err?.message || (typeof err === 'string' ? err : 'List Render Error!');
            this._showError(msg);

            if (this.list_loader) this.list_loader.classList.add('hidden');
            if (this.container) this.container.classList.remove('hidden');

            this._emit("rendered", { rows: [], meta: {}, page, error: msg });
            this._emit("error", { error: err, message: msg });
            return;
        }

        // Hide loading and show container
        if (this.list_loader) this.list_loader.classList.add('hidden');
        if (this.container) this.container.classList.remove('hidden');

        this._emit("rendered", { data: rows, meta, page });

        // Show nothing found if no rows
        if (!rows.length) {
            this._showNothingFound();
        }
    }

    _renderBoxes(rows) {
        if (!this.boxList) return;

        this.boxList.innerHTML = '';

        rows.forEach((row, i) => {
            let div = document.createElement('div');
            div.innerHTML = this._renderTemplate(row);

            // If template root is one element, unwrap:
            if (div.children.length === 1) {
                this.boxList.appendChild(div.children[0]);
            } else {
                this.boxList.appendChild(div);
            }
        });
    }

    _renderTemplate(row) {
        if (typeof this.onBox === 'function') return this.onBox(row);

        const tpl = document.getElementById(this.templateId);
        if (!tpl) {
            console.error(`Template with id "${this.templateId}" not found`);
            return '';
        }

        let html = tpl.innerHTML;

        // Replace nested object properties (e.g., data.user.name)
        html = html.replace(/data\.([a-zA-Z0-9_]+\.[a-zA-Z0-9_]+)/g, (match, path) => {
            const keys = path.split('.');
            let value = row;
            for (const key of keys) {
                value = value?.[key];
                if (value === undefined) break;
            }
            return value ?? '';
        });

        // Replace simple properties (e.g., data.name)
        html = html.replace(/data\.([a-zA-Z0-9_]+)/g, (_, key) => row[key] ?? '');

        return html;
    }

    _renderPagination(meta) {
        let paginationEl = this.pagination;
        if (!paginationEl) {
            paginationEl = document.createElement('div');
            paginationEl.className = "flex justify-center hidden";
            paginationEl.id = 'ajax-pagination';

            // Insert after the container
            if (this.container && this.container.parentNode) {
                this.container.parentNode.insertBefore(paginationEl, this.container.nextSibling);
            }

            this.pagination = paginationEl;
        }

        paginationEl.innerHTML = '';

        if (!meta || !meta.last_page || meta.last_page <= 1) {
            paginationEl.classList.add('hidden');
            return;
        }

        paginationEl.classList.remove('hidden');

        const joinDiv = document.createElement('div');
        joinDiv.className = "join";
        paginationEl.appendChild(joinDiv);

        if (meta.links && Array.isArray(meta.links)) {
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
    }

    _showNothingFound() {
        if (this.nothingFoundBlock) {
            this.nothingFoundBlock.classList.remove('hidden');
        }
        if (this.container) {
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
            console.error('AjaxDivBox Error:', msg);
        }

        if (this.container) {
            this.container.classList.add('hidden');
        }
    }

    _hideError() {
        if (this.errorBlock) {
            this.errorBlock.classList.add('hidden');
        }
        if (this.errorText) {
            this.errorText.textContent = '';
        }
    }

    refresh() {
        this.init();
    }
}
