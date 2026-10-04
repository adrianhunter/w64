const E1 = *addrspace(.externref) anyopaque;
const E2 = ?*addrspace(.externref) anyopaque;

extern "wasm:js-string" fn fromCharCode(code: i32) E1;
extern "wasm:js-string" fn concat(x: E1, y: E1) E1;

export fn mk(code: i32) E1 { return fromCharCode(code); }
export fn join(x: E1, y: E1) E1 { return concat(x, y); }
export fn maybe(flag: bool) E2 { if (flag) return null; return fromCharCode(65); }
