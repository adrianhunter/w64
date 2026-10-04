//! A port of babel-plugin-jsx-dom-expressions 1.9.15 in its "universal"
//! generate mode, plus the bits of @babel/preset-typescript a browser needs.
//! Text in, text out: JSX is rewritten to calls into @gpuix/solid, then the
//! result is re-parsed and printed with TypeScript syntax stripped by yuku.

const std = @import("std");
const parser = @import("parser");
const ast = parser.ast;
const traverser = parser.traverser;
const basic = traverser.basic;

const Buf = std.ArrayList(u8);
const Allocator = std.mem.Allocator;
const Error = Allocator.Error;

pub const Options = struct {
    module_name: []const u8 = "@gpuix/solid",
    /// `babel-preset-solid`'s builtIns list.
    built_ins: []const []const u8 = &.{
        "For",         "Show", "Switch",  "Match",   "Suspense",
        "SuspenseList", "Portal", "Index", "Dynamic", "ErrorBoundary",
    },
};

pub const Transformer = struct {
    gpa: Allocator,
    options: Options,

    imports: Buf = .empty,
    import_map: std.StringHashMap([]const u8),
    used: std.StringHashMap(void),
    counts: std.StringHashMap(u32),
    namespace_imports: std.StringHashMap(void),
    declared: std.StringHashMap(void),
    const_names: std.StringHashMap(void),
    const_values: std.StringHashMap(StaticValue),

    tree: *ast.Tree = undefined,
    source: []const u8 = "",

    pub fn init(gpa: Allocator, options: Options) Transformer {
        return .{
            .gpa = gpa,
            .options = options,
            .import_map = std.StringHashMap([]const u8).init(gpa),
            .used = std.StringHashMap(void).init(gpa),
            .counts = std.StringHashMap(u32).init(gpa),
            .namespace_imports = std.StringHashMap(void).init(gpa),
            .declared = std.StringHashMap(void).init(gpa),
            .const_names = std.StringHashMap(void).init(gpa),
            .const_values = std.StringHashMap(StaticValue).init(gpa),
        };
    }

    pub fn deinit(self: *Transformer) void {
        self.imports.deinit(self.gpa);
        self.import_map.deinit();
        self.used.deinit();
        self.counts.deinit();
        self.namespace_imports.deinit();
        self.declared.deinit();
        self.const_names.deinit();
        self.const_values.deinit();
    }

    // ------------------------------------------------------------------
    // small helpers
    // ------------------------------------------------------------------

    fn fmt(self: *Transformer, comptime f: []const u8, args: anytype) Error![]const u8 {
        return std.fmt.allocPrint(self.gpa, f, args);
    }

    fn cat(self: *Transformer, parts: []const []const u8) Error![]const u8 {
        var n: usize = 0;
        for (parts) |p| n += p.len;
        const out = try self.gpa.alloc(u8, n);
        var i: usize = 0;
        for (parts) |p| {
            @memcpy(out[i..][0..p.len], p);
            i += p.len;
        }
        return out;
    }

    fn join(self: *Transformer, parts: []const []const u8, sep: []const u8) Error![]const u8 {
        var out: Buf = .empty;
        for (parts, 0..) |p, i| {
            if (i != 0) try out.appendSlice(self.gpa, sep);
            try out.appendSlice(self.gpa, p);
        }
        return out.toOwnedSlice(self.gpa);
    }

    fn data(self: *Transformer, idx: ast.NodeIndex) ast.NodeData {
        return self.tree.data(idx);
    }

    fn slice(self: *Transformer, idx: ast.NodeIndex) []const u8 {
        const s = self.tree.span(idx);
        return self.source[s.start..s.end];
    }

    fn identName(self: *Transformer, idx: ast.NodeIndex) []const u8 {
        return switch (self.data(idx)) {
            .identifier_reference => |i| self.tree.string(i.name),
            .identifier_name => |i| self.tree.string(i.name),
            .binding_identifier => |i| self.tree.string(i.name),
            .jsx_identifier => |i| self.tree.string(i.name),
            .label_identifier => |i| self.tree.string(i.name),
            else => "",
        };
    }

    fn isIdentifier(self: *Transformer, idx: ast.NodeIndex) bool {
        return switch (self.data(idx)) {
            .identifier_reference, .identifier_name, .binding_identifier => true,
            else => false,
        };
    }

    fn isValidIdentifier(name: []const u8) bool {
        if (name.len == 0) return false;
        if (std.ascii.isDigit(name[0])) return false;
        for (name) |c| {
            if (!std.ascii.isAlphanumeric(c) and c != '_' and c != '$') return false;
        }
        return true;
    }

    /// Babel's `scope.generateUid`: "_" + base, then 2..9, 0, 1, 10, ...
    fn uid(self: *Transformer, base_in: []const u8) Error![]const u8 {
        var name = base_in;
        while (name.len > 0 and name[0] == '_') name = name[1..];
        var end = name.len;
        while (end > 0 and std.ascii.isDigit(name[end - 1])) end -= 1;
        name = name[0..end];
        if (name.len == 0) name = "temp";

        var i: u32 = self.counts.get(name) orelse 0;
        while (true) : (i += 1) {
            var buf: [256]u8 = undefined;
            const suffix: []const u8 = switch (i) {
                0 => "",
                1...8 => std.fmt.bufPrint(&buf, "{d}", .{i + 1}) catch unreachable,
                9, 10 => std.fmt.bufPrint(&buf, "{d}", .{i - 9}) catch unreachable,
                else => std.fmt.bufPrint(&buf, "{d}", .{i - 1}) catch unreachable,
            };
            const candidate = try self.fmt("_{s}{s}", .{ name, suffix });
            if (!self.used.contains(candidate)) {
                try self.used.put(candidate, {});
                try self.counts.put(name, i + 1);
                return candidate;
            }
        }
    }

    fn regImport(self: *Transformer, name: []const u8) Error![]const u8 {
        if (self.import_map.get(name)) |local| return local;
        const local = try self.uid(try self.fmt("${s}", .{name}));
        try self.import_map.put(name, local);
        // helper-module-imports unshifts each import, so the newest is first
        const line = try self.fmt("import {{ {s} as {s} }} from \"{s}\";\n", .{ name, local, self.options.module_name });
        try self.imports.insertSlice(self.gpa, 0, line);
        return local;
    }

    fn imp(self: *Transformer, name: []const u8) Error![]const u8 {
        return self.regImport(name);
    }

    // ------------------------------------------------------------------
    // whitespace / text helpers
    // ------------------------------------------------------------------

    fn trimWhitespace(self: *Transformer, text_in: []const u8) Error![]const u8 {
        const text = try std.mem.replaceOwned(u8, self.gpa, text_in, "\r", "");
        defer self.gpa.free(text);
        if (std.mem.indexOfScalar(u8, text, '\n') == null) {
            return try collapseSpaces(self.gpa, text);
        }
        var lines: Buf = .empty;
        defer lines.deinit(self.gpa);
        var it = std.mem.splitScalar(u8, text, '\n');
        var i: usize = 0;
        while (it.next()) |line| : (i += 1) {
            const trimmed = if (i == 0) line else std.mem.trimStart(u8, line, " \t");
            if (std.mem.trim(u8, trimmed, " \t").len == 0) continue;
            try lines.appendSlice(self.gpa, trimmed);
            try lines.append(self.gpa, '\n');
        }
        var out: Buf = .empty;
        for (lines.items, 0..) |c, j| {
            if (c == '\n') {
                if (j != lines.items.len - 1) try out.append(self.gpa, ' ');
            } else try out.append(self.gpa, c);
        }
        return try collapseSpaces(self.gpa, out.items);
    }

    fn collapseSpaces(alloc: Allocator, text: []const u8) Error![]const u8 {
        var out: Buf = .empty;
        var in_space = false;
        for (text) |c| {
            if (c == ' ' or c == '\t' or c == '\n' or c == '\r') {
                if (!in_space) {
                    try out.append(alloc, ' ');
                    in_space = true;
                }
            } else {
                try out.append(alloc, c);
                in_space = false;
            }
        }
        return out.toOwnedSlice(alloc);
    }

    fn escapeHtml(self: *Transformer, s: []const u8, attr: bool) Error![]const u8 {
        const delim: u8 = if (attr) '"' else '<';
        const esc: []const u8 = if (attr) "&quot;" else "&lt;";
        if (std.mem.indexOfScalar(u8, s, delim) == null and std.mem.indexOfScalar(u8, s, '&') == null)
            return s;
        var out: Buf = .empty;
        for (s) |c| {
            if (c == delim) {
                try out.appendSlice(self.gpa, esc);
            } else if (c == '&') {
                try out.appendSlice(self.gpa, "&amp;");
            } else try out.append(self.gpa, c);
        }
        return out.toOwnedSlice(self.gpa);
    }

    fn escapeStringForTemplate(self: *Transformer, s: []const u8) Error![]const u8 {
        var out: Buf = .empty;
        for (s) |c| {
            switch (c) {
                '{' => try out.appendSlice(self.gpa, "\\{"),
                '`' => try out.appendSlice(self.gpa, "\\`"),
                '\\' => try out.appendSlice(self.gpa, "\\\\"),
                '\n' => try out.appendSlice(self.gpa, "\\n"),
                '\t' => try out.appendSlice(self.gpa, "\\t"),
                8 => try out.appendSlice(self.gpa, "\\b"),
                12 => try out.appendSlice(self.gpa, "\\f"),
                else => try out.append(self.gpa, c),
            }
        }
        return out.toOwnedSlice(self.gpa);
    }

    // ------------------------------------------------------------------
    // names and bindings
    // ------------------------------------------------------------------

    const NameCollector = struct {
        t: *Transformer,

        pub fn enter_node(self: *NameCollector, d: ast.NodeData, _: ast.NodeIndex, _: *basic.Ctx) traverser.Action {
            switch (d) {
                .binding_identifier => |b| self.t.putName(&self.t.declared, self.t.tree.string(b.name)),
                .identifier_reference => |b| self.t.putName(&self.t.used, self.t.tree.string(b.name)),
                .identifier_name => |b| self.t.putName(&self.t.used, self.t.tree.string(b.name)),
                .jsx_identifier => |b| self.t.putName(&self.t.used, self.t.tree.string(b.name)),
                .import_namespace_specifier => |s| {
                    const name = self.t.identName(s.local);
                    self.t.putName(&self.t.namespace_imports, name);
                    self.t.putName(&self.t.declared, name);
                },
                .variable_declaration => |v| {
                    if (v.kind == .@"const") {
                        self.t.collectPatternNames(v.declarators);
                        self.t.collectConstValues(v.declarators);
                    }
                },
                else => {},
            }
            return .proceed;
        }
    };

    fn putName(self: *Transformer, map: *std.StringHashMap(void), name: []const u8) void {
        if (name.len == 0) return;
        const owned = self.gpa.dupe(u8, name) catch return;
        map.put(owned, {}) catch {};
    }

    fn collectConstValues(self: *Transformer, declarators: ast.IndexRange) void {
        for (self.tree.extra(declarators)) |decl| {
            const d = self.data(decl);
            if (d != .variable_declarator) continue;
            const vd = d.variable_declarator;
            if (vd.init == .null) continue;
            if (self.data(vd.id) != .binding_identifier) continue;
            const value = self.evaluate(vd.init) orelse continue;
            const name = self.gpa.dupe(u8, self.identName(vd.id)) catch continue;
            const owned = switch (value) {
                .string => |s| StaticValue{ .string = self.gpa.dupe(u8, s) catch continue },
                else => value,
            };
            self.const_values.put(name, owned) catch {};
        }
    }

    fn collectPatternNames(self: *Transformer, declarators: ast.IndexRange) void {
        for (self.tree.extra(declarators)) |decl| {
            const d = self.data(decl);
            if (d != .variable_declarator) continue;
            self.collectPatternName(d.variable_declarator.id);
        }
    }

    fn collectPatternName(self: *Transformer, idx: ast.NodeIndex) void {
        if (idx == .null) return;
        switch (self.data(idx)) {
            .binding_identifier => |b| self.putName(&self.const_names, self.tree.string(b.name)),
            .array_pattern => |p| for (self.tree.extra(p.elements)) |e| {
                if (e != .null) self.collectPatternName(e);
            },
            .object_pattern => |p| for (self.tree.extra(p.properties)) |e| {
                if (e == .null) continue;
                switch (self.data(e)) {
                    .binding_property => |bp| self.collectPatternName(bp.value),
                    else => self.collectPatternName(e),
                }
            },
            .assignment_pattern => |p| self.collectPatternName(p.left),
            else => {},
        }
    }

    // ------------------------------------------------------------------
    // tree walking helpers
    // ------------------------------------------------------------------

    const JsxCollector = struct {
        t: *Transformer,
        jsx: std.ArrayList(ast.NodeIndex) = .empty,
        imports: std.ArrayList(ast.NodeIndex) = .empty,

        pub fn enter_jsx_element(self: *JsxCollector, _: ast.JSXElement, index: ast.NodeIndex, _: *basic.Ctx) traverser.Action {
            self.jsx.append(self.t.gpa, index) catch return .stop;
            return .skip;
        }

        pub fn enter_jsx_fragment(self: *JsxCollector, _: ast.JSXFragment, index: ast.NodeIndex, _: *basic.Ctx) traverser.Action {
            self.jsx.append(self.t.gpa, index) catch return .stop;
            return .skip;
        }

        pub fn enter_import_declaration(self: *JsxCollector, d: ast.ImportDeclaration, index: ast.NodeIndex, _: *basic.Ctx) traverser.Action {
            if (d.attributes.len > 0) self.imports.append(self.t.gpa, index) catch return .stop;
            return .proceed;
        }
    };

    fn traverseSubtree(self: *Transformer, comptime V: type, root: ast.NodeIndex, visitor: *V) Error!void {
        var tmp = self.tree.*;
        tmp.root = root;
        try basic.traverse(V, &tmp, visitor);
    }

    // ------------------------------------------------------------------
    // isDynamic
    // ------------------------------------------------------------------

    const DynOpts = struct {
        check_member: bool = false,
        check_tags: bool = false,
        check_calls: bool = true,
        native: bool = false,
    };

    const DynVisitor = struct {
        t: *Transformer,
        opts: DynOpts,
        dynamic: bool = false,

        pub fn enter_arrow_function_expression(self: *DynVisitor, _: ast.ArrowFunctionExpression, _: ast.NodeIndex, _: *basic.Ctx) traverser.Action {
            _ = self;
            return .skip;
        }

        pub fn enter_function(self: *DynVisitor, _: ast.Function, _: ast.NodeIndex, _: *basic.Ctx) traverser.Action {
            _ = self;
            return .skip;
        }

        pub fn enter_object_property(self: *DynVisitor, p: ast.ObjectProperty, _: ast.NodeIndex, _: *basic.Ctx) traverser.Action {
            const value_d = self.t.data(p.value);
            if (!value_d.isCallable()) return .proceed;
            if (p.computed and self.opts.check_member) {
                if (self.t.isDynamic(p.key, .{ .check_member = self.opts.check_member, .check_tags = self.opts.check_tags, .check_calls = self.opts.check_calls }) catch false) {
                    self.dynamic = true;
                    return .stop;
                }
            }
            return .skip;
        }

        pub fn enter_call_expression(self: *DynVisitor, _: ast.CallExpression, _: ast.NodeIndex, _: *basic.Ctx) traverser.Action {
            if (self.opts.check_calls) {
                self.dynamic = true;
                return .stop;
            }
            return .proceed;
        }

        pub fn enter_tagged_template_expression(self: *DynVisitor, _: ast.TaggedTemplateExpression, _: ast.NodeIndex, _: *basic.Ctx) traverser.Action {
            if (self.opts.check_calls) {
                self.dynamic = true;
                return .stop;
            }
            return .proceed;
        }

        pub fn enter_member_expression(self: *DynVisitor, m: ast.MemberExpression, _: ast.NodeIndex, _: *basic.Ctx) traverser.Action {
            if (!self.opts.check_member) return .proceed;
            if (m.optional) {
                self.dynamic = true;
                return .stop;
            }
            self.dynamic = true;
            return .stop;
        }

        pub fn enter_chain_expression(self: *DynVisitor, _: ast.ChainExpression, _: ast.NodeIndex, _: *basic.Ctx) traverser.Action {
            if (self.opts.check_member) {
                self.dynamic = true;
                return .stop;
            }
            return .proceed;
        }

        pub fn enter_spread_element(self: *DynVisitor, _: ast.SpreadElement, _: ast.NodeIndex, _: *basic.Ctx) traverser.Action {
            if (self.opts.check_member) {
                self.dynamic = true;
                return .stop;
            }
            return .proceed;
        }

        pub fn enter_binary_expression(self: *DynVisitor, b: ast.BinaryExpression, _: ast.NodeIndex, _: *basic.Ctx) traverser.Action {
            if (self.opts.check_member and b.operator == .@"in") {
                self.dynamic = true;
                return .stop;
            }
            return .proceed;
        }

        pub fn enter_jsx_element(self: *DynVisitor, _: ast.JSXElement, _: ast.NodeIndex, _: *basic.Ctx) traverser.Action {
            if (self.opts.check_tags) {
                self.dynamic = true;
                return .stop;
            }
            return .skip;
        }

        pub fn enter_jsx_fragment(self: *DynVisitor, f: ast.JSXFragment, _: ast.NodeIndex, _: *basic.Ctx) traverser.Action {
            if (self.opts.check_tags and f.children.len > 0) {
                self.dynamic = true;
                return .stop;
            }
            return .skip;
        }
    };

    fn isDynamic(self: *Transformer, idx: ast.NodeIndex, opts: DynOpts) Error!bool {
        if (idx == .null) return false;
        const d = self.data(idx);
        if (d.isCallable()) return false;
        const o = opts;
        if (o.check_calls and (d == .call_expression or d == .tagged_template_expression)) return true;
        if (o.check_member and d == .member_expression) {
            const m = d.member_expression;
            var prop_dynamic = false;
            if (m.computed) prop_dynamic = try self.isDynamic(m.property, o);
            const obj_d = self.data(m.object);
            if (obj_d == .identifier_reference and !prop_dynamic) {
                const name = self.tree.string(obj_d.identifier_reference.name);
                if (self.namespace_imports.contains(name)) return false;
            }
            return true;
        }
        if (o.check_member and (d == .chain_expression or d == .spread_element)) return true;
        if (o.check_member and d == .binary_expression and d.binary_expression.operator == .@"in") return true;
        if (o.check_tags and (d == .jsx_element or (d == .jsx_fragment and d.jsx_fragment.children.len > 0))) return true;

        var v = DynVisitor{ .t = self, .opts = o };
        try self.traverseSubtree(DynVisitor, idx, &v);
        return v.dynamic;
    }

    // ------------------------------------------------------------------
    // static expression evaluation
    // ------------------------------------------------------------------

    /// babel's `getStaticExpression`, only for expression containers of
    /// intrinsic elements.
    fn staticExpression(self: *Transformer, container_idx: ast.NodeIndex, parent_element: ast.NodeIndex) Error!?[]const u8 {
        const d = self.data(container_idx);
        if (d != .jsx_expression_container) return null;
        if (parent_element == .null) return null;
        const pd = self.data(parent_element);
        if (pd != .jsx_element) return null;
        const opening = pd.jsx_element.opening_element;
        const od = self.data(opening);
        if (od != .jsx_opening_element) return null;
        if (isComponentName(self.nameText(od.name))) return null;
        const expr = d.jsx_expression_container.expression;
        if (self.data(expr) == .sequence_expression) return null;
        const value = self.evaluate(expr) orelse return null;
        switch (value) {
            .string => |s| return s,
            .number => |n| {
                if (n == 0) return null; // value falsy => babel returns falsy value
                return try self.fmt("{d}", .{n});
            },
            else => return null,
        }
    }

    const StaticValue = union(enum) {
        string: []const u8,
        number: f64,
        boolean: bool,
    };

    /// Very small constant evaluator: literals, unary minus/plus/!, string
    /// and number arithmetic on literals, template literals with no
    /// substitutions, and `undefined`/`NaN`/`Infinity` identifiers.
    fn evaluate(self: *Transformer, idx: ast.NodeIndex) ?StaticValue {
        if (idx == .null) return null;
        switch (self.data(idx)) {
            .string_literal => |s| return .{ .string = self.tree.string(s.value) },
            .numeric_literal => |n| return .{ .number = n.value(self.tree) },
            .boolean_literal => |b| return .{ .boolean = b.value },
            .null_literal => return null,
            .template_literal => |t| {
                const quasis = self.tree.extra(t.quasis);
                const exprs = self.tree.extra(t.expressions);
                if (exprs.len != 0) return null;
                if (quasis.len != 1) return null;
                const q = self.data(quasis[0]);
                if (q != .template_element) return null;
                return .{ .string = self.tree.string(q.template_element.cooked) };
            },
            .unary_expression => |u| {
                const v = self.evaluate(u.argument) orelse return null;
                return switch (u.operator) {
                    .negate => switch (v) {
                        .number => |n| .{ .number = -n },
                        else => null,
                    },
                    .positive => switch (v) {
                        .number => |n| .{ .number = n },
                        else => null,
                    },
                    .logical_not => switch (v) {
                        .boolean => |b| .{ .boolean = !b },
                        .number => |n| .{ .boolean = n == 0 },
                        .string => |s| .{ .boolean = s.len == 0 },
                    },
                    else => null,
                };
            },
            .binary_expression => |b| {
                const l = self.evaluate(b.left) orelse return null;
                const r = self.evaluate(b.right) orelse return null;
                switch (b.operator) {
                    .add => switch (l) {
                        .string => |ls| switch (r) {
                            .string => |rs| {
                                const joined = std.fmt.allocPrint(self.gpa, "{s}{s}", .{ ls, rs }) catch return null;
                                return .{ .string = joined };
                            },
                            else => return null,
                        },
                        .number => |ln| switch (r) {
                            .number => |rn| return .{ .number = ln + rn },
                            else => return null,
                        },
                        else => return null,
                    },
                    else => return null,
                }
            },
            .identifier_reference => |i| {
                const name = self.tree.string(i.name);
                if (self.const_values.get(name)) |v| return v;
                return null;
            },
            else => return null,
        }
    }

    // ------------------------------------------------------------------
    // JSX generation
    // ------------------------------------------------------------------

    const Info = struct {
        top_level: bool = false,
        component_child: bool = false,
        fragment_child: bool = false,
        last_element: bool = false,
        do_not_escape: bool = false,
        skip_id: bool = false,
    };

    const Dynamic = struct { elem: []const u8, key: []const u8, value: []const u8 };

    const Result = struct {
        id: ?[]const u8 = null,
        declarations: std.ArrayList([]const u8) = .empty,
        exprs: std.ArrayList([]const u8) = .empty,
        dynamics: std.ArrayList(Dynamic) = .empty,
        post_exprs: std.ArrayList([]const u8) = .empty,
        text: []const u8 = "",
        is_text: bool = false,
        dynamic: bool = false,
        component: bool = false,
        tag_name: ?[]const u8 = null,
    };

    fn nameText(self: *Transformer, idx: ast.NodeIndex) []const u8 {
        const s = self.tree.span(idx);
        return self.source[s.start..s.end];
    }

    fn isComponentName(tag: []const u8) bool {
        if (tag.len == 0) return false;
        if (std.mem.indexOfScalar(u8, tag, '.') != null) return true;
        return !std.ascii.isLower(tag[0]);
    }

    fn genNode(self: *Transformer, idx: ast.NodeIndex, info: Info) Error!?Result {
        switch (self.data(idx)) {
            .jsx_element => return try self.genElement(idx, info),
            .jsx_fragment => return try self.genFragment(idx, info),
            .jsx_text => {
                const raw = self.slice(idx);
                const text = try self.trimWhitespace(raw);
                if (text.len == 0) return null;
                var res = Result{ .text = text, .is_text = true };
                if (!info.skip_id) res.id = try self.uid("el$");
                return res;
            },
            .jsx_expression_container => return try self.genExpressionContainer(idx, info, .null),
            .jsx_spread_child => {
                const sc = self.data(idx).jsx_spread_child;
                if (!try self.isDynamic(sc.expression, .{ .check_member = true, .native = !info.component_child }))
                    return Result{ .exprs = try one(self.gpa, try self.exprText(sc.expression)) };
                return Result{
                    .exprs = try one(self.gpa, try self.fmt("() => {s}", .{try self.exprText(sc.expression)})),
                    .dynamic = true,
                };
            },
            else => {
                // statically-evaluable expression container (not applicable)
                return null;
            },
        }
    }

    fn one(alloc: Allocator, item: []const u8) Error!std.ArrayList([]const u8) {
        var list: std.ArrayList([]const u8) = .empty;
        try list.append(alloc, item);
        return list;
    }

    fn appendList(dst: *std.ArrayList([]const u8), src: std.ArrayList([]const u8), alloc: Allocator) Error!void {
        try dst.appendSlice(alloc, src.items);
    }

    fn appendDyn(dst: *std.ArrayList(Dynamic), src: std.ArrayList(Dynamic), alloc: Allocator) Error!void {
        try dst.appendSlice(alloc, src.items);
    }

    fn genElement(self: *Transformer, idx: ast.NodeIndex, info: Info) Error!?Result {
        _ = info;
        const el = self.data(idx).jsx_element;
        const od = self.data(el.opening_element);
        if (od != .jsx_opening_element) return null;
        const opening = od.jsx_opening_element;
        const tag = self.nameText(opening.name);
        if (isComponentName(tag)) return try self.genComponent(idx);
        return try self.genIntrinsic(idx, tag, opening.attributes, el.children);
    }

    fn genIntrinsic(self: *Transformer, idx: ast.NodeIndex, tag: []const u8, attrs: ast.IndexRange, children: ast.IndexRange) Error!Result {
        _ = idx;
        var res = Result{
            .id = try self.uid("el$"),
            .tag_name = tag,
        };
        const create_element = try self.imp("createElement");
        try res.declarations.append(self.gpa, try self.fmt("{s} = {s}(\"{s}\")", .{ res.id.?, create_element, tag }));

        try self.transformAttributes(&res, attrs, children.len > 0);
        try self.transformChildren(&res, children);
        return res;
    }

    fn transformAttributes(self: *Transformer, res: *Result, attrs: ast.IndexRange, has_children: bool) Error!void {
        _ = has_children;
        for (self.tree.extra(attrs)) |attr_idx| {
            switch (self.data(attr_idx)) {
                .jsx_spread_attribute => |sp| {
                    const spread = try self.imp("spread");
                    const arg_text = try self.exprText(sp.argument);
                    try res.exprs.append(self.gpa, try self.fmt("{s}({s}, {s}, false)", .{
                        spread, res.id.?, arg_text,
                    }));
                },
                .jsx_attribute => |a| {
                    const key = try self.attrName(a.name);
                    if (a.value == .null) {
                        const set_prop = try self.imp("setProp");
                        try res.exprs.append(self.gpa, try self.fmt("{s}({s}, \"{s}\", true)", .{ set_prop, res.id.?, key }));
                        continue;
                    }
                    switch (self.data(a.value)) {
                        .string_literal => {
                            const set_prop = try self.imp("setProp");
                            try res.exprs.append(self.gpa, try self.fmt("{s}({s}, \"{s}\", {s})", .{
                                set_prop, res.id.?, key, self.slice(a.value),
                            }));
                        },
                        .jsx_expression_container => |c| {
                            if (self.data(c.expression) == .jsx_empty_expression) {
                                const set_prop = try self.imp("setProp");
                                try res.exprs.append(self.gpa, try self.fmt("{s}({s}, \"{s}\", true)", .{ set_prop, res.id.?, key }));
                                continue;
                            }
                            if (std.mem.eql(u8, key, "ref")) {
                                try self.transformRef(res, c.expression);
                            } else if (std.mem.startsWith(u8, key, "use:")) {
                                const use = try self.imp("use");
                                const ns = key[4..];
                                try res.exprs.append(self.gpa, try self.fmt("{s}({s}, {s}, () => {s})", .{
                                    use, ns, res.id.?, try self.inlineAttrExpr(c.expression),
                                }));
                            } else if (std.mem.eql(u8, key, "children")) {
                                // handled by children
                            } else if (try self.isDynamic(c.expression, .{ .check_member = true })) {
                                try res.dynamics.append(self.gpa, .{
                                    .elem = res.id.?,
                                    .key = key,
                                    .value = try self.inlineAttrExpr(c.expression),
                                });
                            } else {
                                const set_prop = try self.imp("setProp");
                                try res.exprs.append(self.gpa, try self.fmt("{s}({s}, \"{s}\", {s})", .{
                                    set_prop, res.id.?, key, try self.inlineAttrExpr(c.expression),
                                }));
                            }
                        },
                        else => {
                            const set_prop = try self.imp("setProp");
                            try res.exprs.append(self.gpa, try self.fmt("{s}({s}, \"{s}\", {s})", .{
                                set_prop, res.id.?, key, try self.exprText(a.value),
                            }));
                        },
                    }
                },
                else => {},
            }
        }
    }

    /// babel's `evaluateAndInline` for an intrinsic element's attribute value:
    /// conservative constant folding, recursing through object literals.
    fn inlineAttrExpr(self: *Transformer, idx: ast.NodeIndex) Error![]const u8 {
        switch (self.data(idx)) {
            .object_expression => |o| {
                var parts: std.ArrayList([]const u8) = .empty;
                for (self.tree.extra(o.properties)) |prop| {
                    const pd = self.data(prop);
                    if (pd != .object_property) {
                        try parts.append(self.gpa, try self.exprText(prop));
                        continue;
                    }
                    const p = pd.object_property;
                    const key_text = if (p.computed) blk: {
                        break :blk try self.fmt("[{s}]", .{try self.exprText(p.key)});
                    } else self.slice(p.key);
                    const value_text = try self.inlineAttrExpr(p.value);
                    if (p.shorthand and std.mem.eql(u8, key_text, value_text)) {
                        try parts.append(self.gpa, key_text);
                    } else {
                        try parts.append(self.gpa, try self.fmt("{s}: {s}", .{ key_text, value_text }));
                    }
                }
                if (parts.items.len == 0) return "{}";
                return self.fmt("{{ {s} }}", .{try self.join(parts.items, ", ")});
            },
            .string_literal,
            .numeric_literal,
            .boolean_literal,
            .null_literal,
            .bigint_literal,
            .regexp_literal,
            .template_literal,
            .function,
            .arrow_function_expression,
            => return self.exprText(idx),
            else => {
                if (self.evaluate(idx)) |v| {
                    switch (v) {
                        .string => |s| return self.fmt("\"{s}\"", .{try escapeQuotes(self.gpa, s)}),
                        .number => |n| return self.fmt("{d}", .{n}),
                        .boolean => |b| return if (b) "true" else "false",
                    }
                }
                return self.exprText(idx);
            },
        }
    }

    fn attrName(self: *Transformer, idx: ast.NodeIndex) Error![]const u8 {
        switch (self.data(idx)) {
            .jsx_identifier => |i| return self.tree.string(i.name),
            .jsx_namespaced_name => |n| {
                const ns = self.identName(n.namespace);
                const name = self.identName(n.name);
                return self.fmt("{s}:{s}", .{ ns, name });
            },
            else => return self.slice(idx),
        }
    }

    fn transformRef(self: *Transformer, res: *Result, expr: ast.NodeIndex) Error!void {
        const use = try self.imp("use");
        const elem = res.id.?;
        var e = expr;
        while (true) {
            switch (self.data(e)) {
                .ts_non_null_expression => |x| e = x.expression,
                .ts_as_expression => |x| e = x.expression,
                .ts_satisfies_expression => |x| e = x.expression,
                else => break,
            }
        }
        const is_const = blk: {
            if (self.data(e) == .identifier_reference) {
                const name = self.identName(e);
                break :blk self.const_names.contains(name);
            }
            break :blk false;
        };
        if (!is_const and self.isLVal(e)) {
            const ref_id = try self.uid("ref$");
            const text = try self.exprText(e);
            try res.exprs.append(self.gpa, try self.fmt(
                "var {s} = {s}; typeof {s} === \"function\" ? {s}({s}, {s}) : {s} = {s};",
                .{ ref_id, text, ref_id, use, ref_id, elem, text, elem },
            ));
        } else if (is_const or self.data(e).isCallable()) {
            try res.exprs.append(self.gpa, try self.fmt("{s}({s}, {s});", .{ use, try self.exprText(e), elem }));
        } else {
            const ref_id = try self.uid("ref$");
            const text = try self.exprText(e);
            try res.exprs.append(self.gpa, try self.fmt(
                "var {s} = {s}; typeof {s} === \"function\" && {s}({s}, {s});",
                .{ ref_id, text, ref_id, use, ref_id, elem },
            ));
        }
    }

    fn isLVal(self: *Transformer, idx: ast.NodeIndex) bool {
        return switch (self.data(idx)) {
            .identifier_reference, .member_expression, .array_pattern, .object_pattern, .assignment_pattern => true,
            else => false,
        };
    }

    fn transformChildren(self: *Transformer, res: *Result, children: ast.IndexRange) Error!void {
        const filtered = try self.filterChildren(children);
        const multi = checkLength(self, filtered.items);
        var child_nodes: std.ArrayList(?Result) = .empty;
        for (filtered.items) |c| {
            const child = try self.genNode(c, .{});
            if (child == null) continue;
            const cr = child.?;
            const i = child_nodes.items.len;
            if (cr.is_text and i > 0) {
                if (child_nodes.items[i - 1]) |*prev| {
                    if (prev.is_text) {
                        prev.text = try self.cat(&.{ prev.text, cr.text });
                        continue;
                    }
                }
            }
            try child_nodes.append(self.gpa, cr);
        }

        var appends: std.ArrayList([]const u8) = .empty;
        for (child_nodes.items, 0..) |maybe_child, index| {
            if (maybe_child == null) continue;
            const child = maybe_child.?;
            if (child.tag_name != null and !child.component) {
                // unsupported non-universal renderer element; keep going
            }
            if (child.id) |child_id| {
                const insert_node = try self.imp("insertNode");
                var insert: []const u8 = child_id;
                if (child.is_text) {
                    const create_text_node = try self.imp("createTextNode");
                    const escaped = try self.escapeStringForTemplate(child.text);
                    if (multi) {
                        try res.declarations.append(self.gpa, try self.fmt("{s} = {s}(`{s}`)", .{ child_id, create_text_node, escaped }));
                    } else {
                        insert = try self.fmt("{s}(`{s}`)", .{ create_text_node, escaped });
                    }
                }
                try appends.append(self.gpa, try self.fmt("{s}({s}, {s});", .{ insert_node, res.id.?, insert }));
                try appendList(&res.declarations, child.declarations, self.gpa);
                try appendList(&res.exprs, child.exprs, self.gpa);
                try appendDyn(&res.dynamics, child.dynamics, self.gpa);
            } else if (child.exprs.items.len > 0) {
                const insert = try self.imp("insert");
                if (multi) {
                    const next = try nextChild(self, child_nodes.items, index) orelse "null";
                    try res.exprs.append(self.gpa, try self.fmt("{s}({s}, {s}, {s});", .{ insert, res.id.?, child.exprs.items[0], next }));
                } else {
                    try res.exprs.append(self.gpa, try self.fmt("{s}({s}, {s});", .{ insert, res.id.?, child.exprs.items[0] }));
                }
            }
        }
        var merged: std.ArrayList([]const u8) = .empty;
        try merged.appendSlice(self.gpa, appends.items);
        try merged.appendSlice(self.gpa, res.exprs.items);
        res.exprs = merged;
    }

    fn nextChild(self: *Transformer, children: []?Result, index: usize) Error!?[]const u8 {
        if (index + 1 >= children.len) return null;
        if (children[index + 1]) |c| {
            if (c.id) |id| return id;
        }
        return self.nextChild(children, index + 1);
    }

    fn filterChildren(self: *Transformer, children: ast.IndexRange) Error!std.ArrayList(ast.NodeIndex) {
        var out: std.ArrayList(ast.NodeIndex) = .empty;
        for (self.tree.extra(children)) |c| {
            switch (self.data(c)) {
                .jsx_expression_container => |x| {
                    if (self.data(x.expression) == .jsx_empty_expression) continue;
                },
                .jsx_text => {
                    const raw = self.slice(c);
                    if (isJsxBlankText(raw)) continue;
                },
                else => {},
            }
            try out.append(self.gpa, c);
        }
        return out;
    }

    fn isJsxBlankText(raw: []const u8) bool {
        if (raw.len == 0) return true;
        if (raw[0] != '\n' and raw[0] != '\r') return false;
        for (raw) |c| {
            if (c != '\n' and c != '\r' and c != ' ' and c != '\t') return false;
        }
        return true;
    }

    fn genExpressionContainer(self: *Transformer, idx: ast.NodeIndex, info: Info, parent_element: ast.NodeIndex) Error!?Result {
        _ = parent_element;
        const c = self.data(idx).jsx_expression_container;
        if (self.data(c.expression) == .jsx_empty_expression) return null;
        const expr = c.expression;
        if (!try self.isDynamic(expr, .{
            .check_member = true,
            .check_tags = info.component_child,
            .native = !info.component_child,
        })) {
            return Result{ .exprs = try one(self.gpa, try self.exprText(expr)) };
        }
        if (self.isConditional(expr)) {
            const modified = try self.conditionText(expr, info.component_child or info.fragment_child);
            return Result{ .exprs = try one(self.gpa, try self.fmt("() => {s}", .{modified})), .dynamic = true };
        }
        const d = self.data(expr);
        if (!info.component_child and d == .call_expression) {
            const call = d.call_expression;
            const callee_d = self.data(call.callee);
            if (call.arguments.len == 0 and callee_d != .call_expression and callee_d != .member_expression and callee_d != .chain_expression) {
                return Result{ .exprs = try one(self.gpa, try self.exprText(call.callee)), .dynamic = true };
            }
        }
        return Result{ .exprs = try one(self.gpa, try self.fmt("() => {s}", .{try self.exprText(expr)})), .dynamic = true };
    }

    fn isConditional(self: *Transformer, idx: ast.NodeIndex) bool {
        return switch (self.data(idx)) {
            .conditional_expression, .logical_expression => true,
            else => false,
        };
    }

    /// Inline condition transform: rewrites the dynamic test to a memo call
    /// and returns the modified expression text (babel's `transformCondition`
    /// with `inline = true`, unwrapped from its arrow).
    fn conditionText(self: *Transformer, idx: ast.NodeIndex, deep_in: bool) Error![]const u8 {
        _ = deep_in;
        const memo = try self.imp("memo");
        _ = memo;
        const d = self.data(idx);
        if (d == .conditional_expression) {
            const ce = d.conditional_expression;
            const cons_dyn = try self.isDynamic(ce.consequent, .{ .check_tags = true, .check_member = true });
            const alt_dyn = try self.isDynamic(ce.alternate, .{ .check_tags = true, .check_member = true });
            var test_text = try self.exprText(ce.@"test");
            if (cons_dyn or alt_dyn) {
                if (try self.isDynamic(ce.@"test", .{ .check_member = true })) {
                    test_text = try self.fmt("{s}(() => {s})()", .{ try self.imp("memo"), try self.notNot(ce.@"test") });
                }
            }
            var cons_text = try self.exprText(ce.consequent);
            var alt_text = try self.exprText(ce.alternate);
            if (self.isConditional(ce.consequent)) cons_text = try self.conditionText(ce.consequent, true);
            if (self.isConditional(ce.alternate)) alt_text = try self.conditionText(ce.alternate, true);
            return self.fmt("{s} ? {s} : {s}", .{ test_text, cons_text, alt_text });
        }
        if (d == .logical_expression) {
            var next = idx;
            while (true) {
                const nd = self.data(next);
                if (nd != .logical_expression) break;
                const le = nd.logical_expression;
                if (le.operator == .@"and") break;
                if (self.data(le.left) != .logical_expression) break;
                next = le.left;
            }
            const nd = self.data(next);
            if (nd == .logical_expression) {
                const le = nd.logical_expression;
                if (le.operator == .@"and" and
                    try self.isDynamic(le.right, .{ .check_tags = true, .check_member = true }) and
                    try self.isDynamic(le.left, .{ .check_member = true }))
                {
                    const left_text = try self.fmt("{s}(() => {s})()", .{ try self.imp("memo"), try self.notNot(le.left) });
                    const right_text = try self.exprText(le.right);
                    const wrapped = try self.fmt("{s} && {s}", .{ left_text, right_text });
                    // rebuild the chain above `next`
                    return try self.rebuildLogical(idx, next, wrapped);
                }
            }
            return self.renderLogical(idx);
        }
        return self.exprText(idx);
    }

    fn rebuildLogical(self: *Transformer, top: ast.NodeIndex, target: ast.NodeIndex, target_text: []const u8) Error![]const u8 {
        if (top == target) return target_text;
        const d = self.data(top);
        if (d != .logical_expression) return target_text;
        const le = d.logical_expression;
        const left_text = try self.rebuildLogical(le.left, target, target_text);
        const op: []const u8 = switch (le.operator) {
            .@"and" => "&&",
            .@"or" => "||",
            .nullish_coalescing => "??",
        };
        return self.fmt("{s} {s} {s}", .{ left_text, op, try self.exprText(le.right) });
    }

    fn renderLogical(self: *Transformer, idx: ast.NodeIndex) Error![]const u8 {
        const d = self.data(idx);
        if (d != .logical_expression) return self.exprText(idx);
        const le = d.logical_expression;
        const op: []const u8 = switch (le.operator) {
            .@"and" => "&&",
            .@"or" => "||",
            .nullish_coalescing => "??",
        };
        return self.fmt("{s} {s} {s}", .{ try self.renderLogical(le.left), op, try self.exprText(le.right) });
    }

    fn notNot(self: *Transformer, idx: ast.NodeIndex) Error![]const u8 {
        const text = try self.exprText(idx);
        if (self.data(idx) == .binary_expression) return text;
        return self.fmt("!!({s})", .{text});
    }

    fn genComponent(self: *Transformer, idx: ast.NodeIndex) Error!Result {
        const el = self.data(idx).jsx_element;
        const od = self.data(el.opening_element);
        if (od != .jsx_opening_element) return .{};
        const opening = od.jsx_opening_element;
        var tag = self.nameText(opening.name);
        if (std.mem.indexOfScalar(u8, tag, '.') == null and std.mem.indexOfScalar(u8, tag, ':') == null) {
            for (self.options.built_ins) |bi| {
                if (std.mem.eql(u8, tag, bi) and !self.declared.contains(tag)) {
                    tag = try self.imp(tag);
                    break;
                }
            }
        }

        var running_members: std.ArrayList([]const u8) = .empty;
        var props: std.ArrayList([]const u8) = .empty;
        const has_children = el.children.len > 0;
        var dynamic_spread = false;

        for (self.tree.extra(opening.attributes)) |attr_idx| {
            switch (self.data(attr_idx)) {
                .jsx_spread_attribute => |sp| {
                    if (running_members.items.len > 0) {
                        try props.append(self.gpa, try self.objectLiteral(running_members.items));
                        running_members.clearRetainingCapacity();
                    }
                    if (try self.isDynamic(sp.argument, .{ .check_member = true })) {
                        dynamic_spread = true;
                        try props.append(self.gpa, try self.fmt("() => {s}", .{try self.exprText(sp.argument)}));
                    } else {
                        try props.append(self.gpa, try self.exprText(sp.argument));
                    }
                },
                .jsx_attribute => |a| {
                    const key = try self.attrName(a.name);
                    if (has_children and std.mem.eql(u8, key, "children")) continue;
                    if (a.value != .null and self.data(a.value) == .jsx_expression_container) {
                        const c = self.data(a.value).jsx_expression_container;
                        if (std.mem.eql(u8, key, "ref")) {
                            try self.componentRef(&running_members, c.expression);
                            continue;
                        }
                        if (try self.isDynamic(c.expression, .{ .check_member = true, .check_tags = true })) {
                            var body: []const u8 = undefined;
                            if (self.isConditional(c.expression)) {
                                body = try self.conditionText(c.expression, true);
                            } else if (self.data(c.expression) == .call_expression and self.isZeroArgArrow(self.data(c.expression).call_expression.callee)) {
                                const callee = self.data(c.expression).call_expression.callee;
                                const arrow = self.data(callee).arrow_function_expression;
                                body = try self.arrowBodyText(&arrow);
                            } else {
                                body = try self.exprText(c.expression);
                            }
                            try running_members.append(self.gpa, try self.getter(key, try self.fmt("return {s};", .{body})));
                        } else {
                            try running_members.append(self.gpa, try self.property(key, try self.exprText(c.expression)));
                        }
                    } else {
                        const value_text: []const u8 = if (a.value == .null) "true" else try self.exprText(a.value);
                        try running_members.append(self.gpa, try self.property(key, value_text));
                    }
                },
                else => {},
            }
        }

        const child = try self.componentChildren(el.children);
        if (child) |ch| {
            if (ch.dynamic) {
                const body = if (ch.body_is_block) ch.body else try self.fmt("return {s};", .{ch.body});
                try running_members.append(self.gpa, try self.getter("children", body));
            } else {
                try running_members.append(self.gpa, try self.property("children", ch.body));
            }
        }

        if (running_members.items.len > 0 or props.items.len == 0) {
            try props.append(self.gpa, try self.objectLiteral(running_members.items));
        }
        if (props.items.len > 1 or dynamic_spread) {
            const merged = try self.join(props.items, ", ");
            const merge_props = try self.imp("mergeProps");
            props.clearAndFree(self.gpa);
            try props.append(self.gpa, try self.fmt("{s}({s})", .{ merge_props, merged }));
        }
        const create_component = try self.imp("createComponent");
        const expr = try self.fmt("{s}({s}, {s})", .{ create_component, tag, props.items[0] });
        var res = Result{ .component = true };
        try res.exprs.append(self.gpa, expr);
        return res;
    }

    fn isZeroArgArrow(self: *Transformer, idx: ast.NodeIndex) bool {
        const d = self.data(idx);
        if (d != .arrow_function_expression) return false;
        const params = self.data(d.arrow_function_expression.params);
        if (params != .formal_parameters) return false;
        for (self.tree.extra(params.formal_parameters.items)) |p| {
            if (p != .null) return false;
        }
        return true;
    }

    fn arrowBodyText(self: *Transformer, arrow: *const ast.ArrowFunctionExpression) Error![]const u8 {
        return self.exprText(arrow.body);
    }

    fn objectLiteral(self: *Transformer, members: []const []const u8) Error![]const u8 {
        if (members.len == 0) return "{}";
        const joined = try self.join(members, ", ");
        return self.fmt("{{ {s} }}", .{joined});
    }

    fn property(self: *Transformer, key: []const u8, value: []const u8) Error![]const u8 {
        if (isValidIdentifier(key)) return self.fmt("{s}: {s}", .{ key, value });
        return self.fmt("\"{s}\": {s}", .{ key, value });
    }

    fn getter(self: *Transformer, key: []const u8, body: []const u8) Error![]const u8 {
        if (isValidIdentifier(key)) return self.fmt("get {s}() {{ {s} }}", .{ key, body });
        return self.fmt("get [\"{s}\"]() {{ {s} }}", .{ key, body });
    }

    fn componentRef(self: *Transformer, members: *std.ArrayList([]const u8), expr_in: ast.NodeIndex) Error!void {
        var expr = expr_in;
        while (true) {
            switch (self.data(expr)) {
                .ts_non_null_expression => |x| expr = x.expression,
                .ts_as_expression => |x| expr = x.expression,
                .ts_satisfies_expression => |x| expr = x.expression,
                else => break,
            }
        }
        const is_const = blk: {
            if (self.data(expr) == .identifier_reference) {
                const name = self.identName(expr);
                break :blk self.const_names.contains(name);
            }
            break :blk false;
        };
        if (!is_const and self.isLVal(expr)) {
            const ref_id = try self.uid("ref$");
            const text = try self.exprText(expr);
            try members.append(self.gpa, try self.fmt(
                "ref(r$) {{ var {s} = {s}; typeof {s} === \"function\" ? {s}(r$) : {s} = r$; }}",
                .{ ref_id, text, ref_id, ref_id, text },
            ));
        } else if (is_const or self.data(expr).isCallable()) {
            try members.append(self.gpa, try self.fmt("ref: {s}", .{try self.exprText(expr)}));
        } else {
            const ref_id = try self.uid("ref$");
            const text = try self.exprText(expr);
            try members.append(self.gpa, try self.fmt(
                "ref(r$) {{ var {s} = {s}; typeof {s} === \"function\" && {s}(r$); }}",
                .{ ref_id, text, ref_id, ref_id },
            ));
        }
    }

    const ChildResult = struct {
        body: []const u8,
        body_is_block: bool,
        dynamic: bool,
    };

    fn componentChildren(self: *Transformer, children: ast.IndexRange) Error!?ChildResult {
        const filtered = try self.filterChildren(children);
        if (filtered.items.len == 0) return null;
        const multi = filtered.items.len > 1;

        var texts: std.ArrayList([]const u8) = .empty;
        var first_is_expr = false;
        var first_is_text = false;
        var any_dynamic = false;
        var single_result: ?Result = null;

        for (filtered.items, 0..) |c, i| {
            switch (self.data(c)) {
                .jsx_text => {
                    const text = try self.trimWhitespace(try self.escapeHtml(self.slice(c), false));
                    if (text.len == 0) continue;
                    try texts.append(self.gpa, try self.fmt("\"{s}\"", .{try escapeQuotes(self.gpa, text)}));
                    if (i == 0) first_is_text = true;
                },
                .jsx_expression_container => |x| {
                    if (self.data(x.expression) == .jsx_empty_expression) continue;
                    if (i == 0) first_is_expr = true;
                    var child = (try self.genNode(c, .{ .top_level = true, .component_child = true, .last_element = true })).?;
                    any_dynamic = any_dynamic or child.dynamic;
                    const t = try self.createTemplate(&child, multi);
                    try texts.append(self.gpa, t);
                },
                else => {
                    var child = (try self.genNode(c, .{ .top_level = true, .component_child = true, .last_element = true })).?;
                    any_dynamic = any_dynamic or child.dynamic;
                    single_result = child;
                    const t = try self.createTemplate(&child, multi);
                    try texts.append(self.gpa, t);
                },
            }
        }
        if (texts.items.len == 0) return null;

        if (texts.items.len == 1) {
            const t = texts.items[0];
            if (!first_is_expr and !first_is_text) {
                // element/fragment single child
                if (single_result) |*sr| {
                    if (sr.id != null and (sr.exprs.items.len > 0 or sr.dynamics.items.len > 0 or sr.post_exprs.items.len > 0)) {
                        const body = try self.iifeBody(sr);
                        return .{ .body = body, .body_is_block = true, .dynamic = true };
                    }
                }
                return .{ .body = t, .body_is_block = false, .dynamic = true };
            }
            return .{ .body = bodyOf(t), .body_is_block = false, .dynamic = any_dynamic };
        }

        const arr = try self.fmt("[{s}]", .{try self.join(texts.items, ", ")});
        return .{ .body = arr, .body_is_block = false, .dynamic = true };
    }

    fn genFragment(self: *Transformer, idx: ast.NodeIndex, info: Info) Error!Result {
        _ = info;
        const f = self.data(idx).jsx_fragment;
        var res = Result{};
        const filtered = try self.filterChildren(f.children);
        var parts: std.ArrayList([]const u8) = .empty;
        for (filtered.items) |c| {
            switch (self.data(c)) {
                .jsx_text => {
                    const text = try self.trimWhitespace(try self.escapeHtml(self.slice(c), false));
                    if (text.len == 0) continue;
                    try parts.append(self.gpa, try self.fmt("\"{s}\"", .{try escapeQuotes(self.gpa, text)}));
                },
                else => {
                    var child = (try self.genNode(c, .{ .top_level = true, .fragment_child = true, .last_element = true })).?;
                    const t = try self.createTemplate(&child, true);
                    try parts.append(self.gpa, t);
                },
            }
        }
        const expr = if (parts.items.len == 1) parts.items[0] else try self.fmt("[{s}]", .{try self.join(parts.items, ", ")});
        try res.exprs.append(self.gpa, expr);
        return res;
    }

    fn iifeBody(self: *Transformer, res: *Result) Error![]const u8 {
        var body: Buf = .empty;
        if (res.declarations.items.len > 0) {
            try body.appendSlice(self.gpa, "var ");
            try body.appendSlice(self.gpa, try self.join(res.declarations.items, ", "));
            try body.appendSlice(self.gpa, "; ");
        }
        for (res.exprs.items) |e| {
            try body.appendSlice(self.gpa, e);
            if (e.len > 0 and (e[e.len - 1] == ';' or e[e.len - 1] == '}')) try body.append(self.gpa, ' ') else try body.appendSlice(self.gpa, "; ");
        }
        if (try self.wrapDynamics(res)) |dyn| {
            try body.appendSlice(self.gpa, dyn);
            if (dyn.len > 0 and dyn[dyn.len - 1] != ';') try body.append(self.gpa, ';');
            try body.append(self.gpa, ' ');
        }
        for (res.post_exprs.items) |e| {
            try body.appendSlice(self.gpa, e);
            if (e.len > 0 and e[e.len - 1] != ';') try body.append(self.gpa, ';');
            try body.append(self.gpa, ' ');
        }
        try body.appendSlice(self.gpa, "return ");
        try body.appendSlice(self.gpa, res.id.?);
        try body.append(self.gpa, ';');
        return body.toOwnedSlice(self.gpa);
    }

    fn createTemplate(self: *Transformer, res: *Result, wrap: bool) Error![]const u8 {
        if (res.id) |id| {
            if (res.exprs.items.len == 0 and res.dynamics.items.len == 0 and res.post_exprs.items.len == 0 and res.declarations.items.len == 1) {
                const decl = res.declarations.items[0];
                if (std.mem.indexOfScalar(u8, decl, '=')) |eq| {
                    return std.mem.trim(u8, decl[eq + 1 ..], " ");
                }
                return id;
            }
            const body = try self.iifeBody(res);
            return self.fmt("(() => {{ {s} }})()", .{body});
        }
        if (res.exprs.items.len == 0) return "";
        if (wrap and res.dynamic) {
            const memo = try self.imp("memo");
            return self.fmt("{s}({s})", .{ memo, res.exprs.items[0] });
        }
        return res.exprs.items[0];
    }

    fn wrapDynamics(self: *Transformer, res: *Result) Error!?[]const u8 {
        const dynamics = res.dynamics.items;
        if (dynamics.len == 0) return null;
        const effect = try self.imp("effect");
        const set_prop = try self.imp("setProp");
        if (dynamics.len == 1) {
            const d = dynamics[0];
            return try self.fmt("{s}(_$p => {s}({s}, \"{s}\", {s}, _$p))", .{ effect, set_prop, d.elem, d.key, d.value });
        }
        var decls: std.ArrayList([]const u8) = .empty;
        var stmts: std.ArrayList([]const u8) = .empty;
        var props: std.ArrayList([]const u8) = .empty;
        for (dynamics, 0..) |d, index| {
            const var_id = try self.uid("v$");
            const prop_id = try numberedId(self.gpa, index);
            try props.append(self.gpa, try self.fmt("{s}: undefined", .{prop_id}));
            try decls.append(self.gpa, try self.fmt("{s} = {s}", .{ var_id, d.value }));
            try stmts.append(self.gpa, try self.fmt("{s} !== _p$.{s} && (_p$.{s} = {s}({s}, \"{s}\", {s}, _p$.{s}));", .{
                var_id, prop_id, prop_id, set_prop, d.elem, d.key, var_id, prop_id,
            }));
        }
        return try self.fmt(
            "{s}(_p$ => {{ var {s}; {s} return _p$; }}, {{ {s} }})",
            .{
                effect,
                try self.join(decls.items, ", "),
                try self.join(stmts.items, " "),
                try self.join(props.items, ", "),
            },
        );
    }

    /// Text of an expression with any JSX inside it transformed.
    fn exprText(self: *Transformer, idx: ast.NodeIndex) Error![]const u8 {
        const s = self.tree.span(idx);
        const text = self.source[s.start..s.end];
        return self.nested(text);
    }

    fn nested(self: *Transformer, text: []const u8) Error![]const u8 {
        if (!self.tree.isJsx()) return text;
        if (!mayContainJsx(text)) return text;
        const saved_tree = self.tree;
        const saved_src = self.source;
        defer {
            self.tree = saved_tree;
            self.source = saved_src;
        }
        return self.transformText(text, .tsx);
    }

    fn mayContainJsx(text: []const u8) bool {
        var i: usize = 0;
        while (i < text.len) : (i += 1) {
            if (text[i] != '<') continue;
            if (i + 1 >= text.len) return false;
            const c = text[i + 1];
            if (c == '/' or c == '>' or std.ascii.isAlphabetic(c) or c == '_' or c == '$') return true;
        }
        return false;
    }

    // ------------------------------------------------------------------
    // whole-text driver
    // ------------------------------------------------------------------

    pub fn transformText(self: *Transformer, text: []const u8, lang: ast.Lang) Error![]const u8 {
        var tree = parser.parse(self.gpa, text, .{
            .lang = lang,
            .source_type = .module,
            .comments = .both,
        }) catch return text;
        defer tree.deinit();
        self.tree = &tree;
        self.source = text;

        if (lang == .dts) return text;

        var names = NameCollector{ .t = self };
        try basic.traverse(NameCollector, &tree, &names);

        var collector = JsxCollector{ .t = self };
        try basic.traverse(JsxCollector, &tree, &collector);

        var replacements: std.ArrayList(Replacement) = .empty;
        for (collector.jsx.items) |jsx_idx| {
            const span = tree.span(jsx_idx);
            const res_opt = try self.genNode(jsx_idx, .{ .top_level = true, .last_element = true });
            if (res_opt == null) continue;
            var res = res_opt.?;
            const repl = try self.createTemplate(&res, false);
            try replacements.append(self.gpa, .{ .start = span.start, .end = span.end, .text = repl });
        }
        for (collector.imports.items) |imp_idx| {
            const span = tree.span(imp_idx);
            const repl = try self.rewriteImport(imp_idx);
            try replacements.append(self.gpa, .{ .start = span.start, .end = span.end, .text = repl });
        }

        if (replacements.items.len == 0) return text;

        std.mem.sort(Replacement, replacements.items, {}, struct {
            fn lt(_: void, a: Replacement, b: Replacement) bool {
                return a.start < b.start;
            }
        }.lt);

        var out: Buf = .empty;
        var pos: u32 = 0;
        for (replacements.items) |r| {
            if (r.start < pos) continue;
            try out.appendSlice(self.gpa, text[pos..r.start]);
            try out.appendSlice(self.gpa, r.text);
            pos = r.end;
        }
        try out.appendSlice(self.gpa, text[pos..]);
        return out.toOwnedSlice(self.gpa);
    }

    const Replacement = struct { start: u32, end: u32, text: []const u8 };

    fn rewriteImport(self: *Transformer, idx: ast.NodeIndex) Error![]const u8 {
        const d = self.data(idx).import_declaration;
        var attr_type: ?[]const u8 = null;
        for (self.tree.extra(d.attributes)) |a| {
            if (self.data(a) != .import_attribute) continue;
            const at = self.data(a).import_attribute;
            if (std.mem.eql(u8, self.identName(at.key), "type")) {
                if (self.data(at.value) == .string_literal) {
                    attr_type = self.tree.string(self.data(at.value).string_literal.value);
                }
            }
        }
        const source_text: []const u8 = if (self.data(d.source) == .string_literal)
            self.slice(d.source)
        else
            "\"\"";

        if (attr_type != null and std.mem.eql(u8, attr_type.?, "file")) {
            // import url from "./x.wasm" with { type: "file" };
            //   => const url = new URL("./x.wasm", import.meta.url).href;
            var decl_text: []const u8 = "";
            for (self.tree.extra(d.specifiers)) |spec| {
                switch (self.data(spec)) {
                    .import_default_specifier => |s| {
                        const local = self.identName(s.local);
                        decl_text = try self.fmt("const {s} = new URL({s}, import.meta.url).href;", .{ local, source_text });
                    },
                    .import_namespace_specifier => |s| {
                        const local = self.identName(s.local);
                        decl_text = try self.fmt("const {s} = new URL({s}, import.meta.url).href;", .{ local, source_text });
                    },
                    else => {},
                }
            }
            if (decl_text.len > 0) return decl_text;
        }
        return self.slice(idx);
    }

};

/// Babel reads `.body` from the thunk an expression child produces: strip the
/// `() => ` wrapper so a getter returns the expression directly.
fn bodyOf(text: []const u8) []const u8 {
    if (std.mem.startsWith(u8, text, "() => ")) return text["() => ".len..];
    return text;
}

fn checkLength(t: *Transformer, children: []const ast.NodeIndex) bool {
    var i: usize = 0;
    for (children) |c| {
        switch (t.data(c)) {
            .jsx_expression_container => |x| {
                if (t.data(x.expression) == .jsx_empty_expression) continue;
                i += 1;
            },
            .jsx_text => {
                const raw = t.slice(c);
                if (isAllWhitespace(raw) and !isAllSpaces(raw)) continue;
                i += 1;
            },
            else => i += 1,
        }
    }
    return i > 1;
}

fn isAllWhitespace(s: []const u8) bool {
    for (s) |c| {
        if (c != ' ' and c != '\t' and c != '\n' and c != '\r') return false;
    }
    return true;
}

fn isAllSpaces(s: []const u8) bool {
    for (s) |c| {
        if (c != ' ') return false;
    }
    return true;
}

const numbered_chars = "etaoinshrdlucwmfygpbTAOISWCBvkxjqzPHFMDRELNGUKVYJQZX_$";

fn numberedId(alloc: Allocator, num_in: usize) Error![]const u8 {
    const base = numbered_chars.len;
    var num = num_in;
    var out: Buf = .empty;
    while (true) {
        const digit = num % base;
        num = num / base;
        try out.insert(alloc, 0, numbered_chars[digit]);
        if (num == 0) break;
    }
    return out.toOwnedSlice(alloc);
}

fn escapeQuotes(alloc: Allocator, s: []const u8) Error![]const u8 {
    var out: Buf = .empty;
    for (s) |c| {
        if (c == '"') try out.appendSlice(alloc, "\\\"") else if (c == '\\') try out.appendSlice(alloc, "\\\\") else if (c == '\n') try out.appendSlice(alloc, "\\n") else try out.append(alloc, c);
    }
    return out.toOwnedSlice(alloc);
}
