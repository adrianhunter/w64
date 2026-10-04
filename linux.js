import { WTerm } from "@wterm/dom";
import { GhosttyCore } from "@wterm/ghostty";

const TERM_PALETTE = [
    0x000000, 0xaa0000, 0x00aa00, 0xaa5500,
    0x0000aa, 0xaa00aa, 0x00aaaa, 0xaaaaaa,
    0x555555, 0xff5555, 0x55ff55, 0xffff55,
    0x5555ff, 0xff55ff, 0x55ffff, 0xffffff,
];

const corePromise = GhosttyCore.load();

class Term {
    constructor(options = {}) {
        this.w = options.cols || 80;
        this.h = options.rows || 25;
        this.font_size = options.fontSize || 15;
        this.handler = () => {};
        this.term_el = null;
        this.wterm = null;
        this.term_width = 0;
        this.term_height = 0;
        this._cell_w = 9;
        this._cell_h = 17;
        this._ready = false;
        this._queue = [];
    }

    setKeyHandler(handler) {
        this.handler = handler || (() => {});
    }

    open(parent_el) {
        const el = document.createElement("div");
        el.className = "term wterm";
        el.style.fontSize = this.font_size + "px";
        el.style.setProperty("--term-font-size", this.font_size + "px");
        el.style.boxSizing = "border-box";
        parent_el.appendChild(el);
        this.term_el = el;

        const cell = this._measureCell();
        this._cell_w = cell.w || 9;
        this._cell_h = cell.h || 17;
        const pad = this._padding();
        this.term_width = Math.ceil(this.w * this._cell_w + pad.x);
        this.term_height = Math.ceil(this.h * this._cell_h + pad.y);
        el.style.width = this.term_width + "px";
        el.style.height = this.term_height + "px";

        this._boot();
    }

    _measureCell() {
        const row = document.createElement("div");
        row.className = "term-row";
        row.style.visibility = "hidden";
        row.style.position = "absolute";
        const probe = document.createElement("span");
        probe.style.width = "auto";
        probe.textContent = "W";
        row.appendChild(probe);
        this.term_el.appendChild(row);
        const rect = probe.getBoundingClientRect();
        const rowRect = row.getBoundingClientRect();
        row.remove();
        return { w: rect.width, h: rowRect.height };
    }

    _padding() {
        const cs = getComputedStyle(this.term_el);
        const px = (v) => parseFloat(v) || 0;
        return {
            x: px(cs.paddingLeft) + px(cs.paddingRight) +
               px(cs.borderLeftWidth) + px(cs.borderRightWidth),
            y: px(cs.paddingTop) + px(cs.paddingBottom) +
               px(cs.borderTopWidth) + px(cs.borderBottomWidth),
        };
    }

    async _boot() {
        try {
            const core = await corePromise;
            const wterm = new WTerm(this.term_el, {
                core,
                cols: this.w,
                rows: this.h,
                autoResize: true,
                onData: (data) => this._sendInput(data),
            });
            this.wterm = wterm;
            await wterm.init();
            wterm.setThemeColors({
                foreground: 0xd4d4d4,
                background: 0x000000,
                cursor: 0x00ff00,
                palette: TERM_PALETTE,
            });
            this.w = wterm.cols;
            this.h = wterm.rows;
            this._ready = true;
            const pending = this._queue.join("");
            this._queue.length = 0;
            if (pending) wterm.write(pending);
        } catch (err) {
            console.error("term: failed to start", err);
        }
    }

    _sendInput(data) {
        const bytes = new TextEncoder().encode(data);
        for (let i = 0; i < bytes.length; i += 4096) {
            this.handler(String.fromCharCode(...bytes.subarray(i, i + 4096)));
        }
    }

    write(str) {
        if (this._ready) this.wterm.write(str);
        else this._queue.push(str);
    }

    writeln(str) {
        this.write(str);
        this.write("\r\n");
    }

    getSize() {
        return [this.w, this.h];
    }

    resizePixel(new_width, new_height) {
        if (new_width === this.term_width && new_height === this.term_height)
            return false;
        this.term_width = new_width;
        this.term_height = new_height;
        if (!this.term_el) return false;
        this.term_el.style.width = new_width + "px";
        this.term_el.style.height = new_height + "px";
        if (!this._ready) return true;
        const old_w = this.w;
        const old_h = this.h;
        this.wterm.fit();
        this.w = this.wterm.cols;
        this.h = this.wterm.rows;
        return this.w !== old_w || this.h !== old_h;
    }
}

globalThis.Term = Term;

const script = document.createElement("script");
script.src = "/static/linux/jslinux.js";
document.head.appendChild(script);
