const std = @import("std");

pub const ExternRef = *addrspace(.externref) anyopaque;

extern "wasm:js-string" fn length(s: ExternRef) i32;
extern "wasm:js-string" fn charCodeAt(s: ExternRef, i: i32) i32;
extern "wasm:js-string" fn fromCharCode(c: i32) ExternRef;
extern "wasm:js-string" fn concat(a: ExternRef, b: ExternRef) ExternRef;

var buf: [4096]u16 = undefined;

export fn default(a: ExternRef, b: ExternRef) ExternRef {
    _ = b;
    const n = @min(length(a), 4096);
    var i: i32 = 0;
    while (i < n) : (i += 1) {
        buf[@intCast(i)] = @intCast(charCodeAt(a, i));
    }
    var out: ExternRef = fromCharCode(0);
    i = 0;
    while (i < n) : (i += 1) {
        out = concat(out, fromCharCode(@intCast(buf[@intCast(i)])));
    }
    return out;
}
