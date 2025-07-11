export default class Toast {
    constructor({ message = '', title = '', type = 'info', duration = 4000, position = 'top-center', icon = null } = {}) {
        Object.assign(this, { message, title, type, duration, position, icon });
        this._show();
    }

    _show() {
        const toast = document.createElement('div');
        toast.className = [
            'fixed', 'z-50', 'transform', '-translate-y-full', 'pointer-events-none',
            ...this._posClass().split(' '),
            'w-full', 'mx-auto',
        ].filter(Boolean).join(' ');

        const bgMap = {
            success: 'bg-green-600',
            error: 'bg-red-600',
            warning: 'bg-yellow-500',
            info: 'bg-blue-600',
        };
        const bg = bgMap[this.type];

        toast.innerHTML = `
<div class="flex flex-col items-center justify-center w-full ${bg} bg-opacity-80 ">
      <div class="text-white p-4 flex items-center space-x-2 pointer-events-auto justify-center">
        ${this.icon ? `<img src="${this.icon}" class="size-[30px] flex-shrink-0"/>` : ''}
        <div class="flex-1 text-left">
          ${this.title ? `<h4 class="font-semibold">${this.title}</h4>` : ''}
          <p class="text-sm">${this.message}</p>
        </div>
      </div>
      <div class="${bg} h-1 overflow-hidden w-full">
        <div class="toast-bar h-full bg-white w-full"></div>
      </div>
      </div>
    `;

        document.body.appendChild(toast);

        // Açılış animasyonu
        requestAnimationFrame(() => {
            toast.classList.add('animate-toast-in');
            toast.classList.remove('-translate-y-full');
        });

        // Bar animasyonu
        const bar = toast.querySelector('.toast-bar');
        const startTime = performance.now();

        const tick = now => {
            const elapsed = now - startTime;
            const pct = Math.max(0, 1 - elapsed / this.duration);
            bar.style.width = pct * 100 + '%';
            if (elapsed < this.duration) requestAnimationFrame(tick);
            else {
                toast.classList.replace('animate-toast-in', 'animate-toast-out');
                toast.addEventListener('animationend', () => toast.remove());
            }
        };
        requestAnimationFrame(tick);
    }

    _posClass() {
        const map = {
            'top-left': 'top-4 left-4',
            'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
            'top-center-full': 'top-0 left-1/2 transform -translate-x-1/2',
            'bottom-center-full': 'bottom-0 left-1/2 transform -translate-x-1/2',
            'top-right': 'top-4 right-4',
            'bottom-left': 'bottom-4 left-4',
            'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2',
            'bottom-right': 'bottom-4 right-4',
        };
        return map[this.position] || map['top-center'];
    }
}
