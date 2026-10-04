// Host side of ttsc.wasm. The wasm module imports these functions from
// "./ttsc-host.js" (resolved relative to the wasm URL by the WebAssembly ESM
// integration) so no string crosses the boundary except by externref.

let out = [];

/** UTF-16 length of a JS string. */
export function strLength(s) {
    return s.length;
}

/** UTF-16 code unit at `i`. */
export function charCodeAt(s, i) {
    return s.charCodeAt(i);
}

export function startOut() {
    out.length = 0;
}

export function pushCodeUnit(c) {
    out.push(c);
}

export function finishOut() {
    let result = "";
    for (let i = 0; i < out.length; i += 4096) {
        result += String.fromCharCode.apply(null, out.slice(i, i + 4096));
    }
    out.length = 0;
    return result;
}
