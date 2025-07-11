export default class CodeInput {
    constructor(selector, hiddenName) {
        this.inputs = Array.from(document.querySelectorAll(`${selector}[data-id="${hiddenName}"]`));
        this.hidden = document.querySelector(`input[type=hidden][name="${hiddenName}"]`);
        this._bindEvents();
        this._updateHidden();
    }

    _bindEvents() {
        this.inputs.forEach((inpt, idx) => {
            inpt.setAttribute('maxlength', 1);
            inpt.addEventListener('input', e => this._onInput(e, idx));
            inpt.addEventListener('keydown', e => this._onKeyDown(e, idx));
            inpt.addEventListener('paste', e => this._onPaste(e, idx));
        });
    }

    _onInput(e, idx) {
        const val = e.target.value.replace(/[^0-9]/g, '').charAt(0);
        e.target.value = val;
        this._updateHidden();
        if (val && this.inputs[idx + 1]) {
            this.inputs[idx + 1].focus();
        }
    }

    _onKeyDown(e, idx) {
        if (e.key === 'Backspace' && !e.target.value && this.inputs[idx - 1]) {
            this.inputs[idx - 1].focus();
        }
    }

    _onPaste(e, idx) {
        e.preventDefault();
        const paste = e.clipboardData.getData('text').trim().replace(/\s+/g, '');
        const vals = paste.split('').slice(0, this.inputs.length - idx);
        vals.forEach((ch, i) => {
            this.inputs[idx + i].value = ch;
        });
        this.inputs[Math.min(this.inputs.length - 1, idx + vals.length - 1)].focus();
        this._updateHidden();
    }

    _updateHidden() {
        const code = this.inputs.map(i => i.value || '').join('');
        if (this.hidden) this.hidden.value = code;
    }
}
