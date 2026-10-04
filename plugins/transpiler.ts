import type { MiddlewareHandler } from "hono";
import ts from "@typescript/typescript6";
import { createMiddleware } from "hono/factory";

type BunTranspilerOptions = {
    extensions?: string[];
    headers?: Record<string, string | string[]>;
    transpilerOptions?: ts.TranspileOptions;
};

export const defaultOptions: Required<BunTranspilerOptions> = {
    extensions: [".ts", ".tsx"],
    headers: { "content-type": "application/javascript" },
    transpilerOptions: {
        compilerOptions: {
            module: ts.ModuleKind.NodeNext,
            target: ts.ScriptTarget.ESNext,
            types: [],
            noEmit: true,
            sourceMap: true,
            declaration: true,
            declarationMap: true,
            noUncheckedIndexedAccess: true,
            exactOptionalPropertyTypes: true,
            rewriteRelativeImportExtensions: true,
            strict: true,
            verbatimModuleSyntax: true,
            isolatedModules: true,
            noUncheckedSideEffectImports: true,
            skipLibCheck: true,
        },
        // minifyWhitespace: true,
        // target: 'browser',
    },
};

function transpile(code: string): string {
    const r = ts.transpileModule(code, defaultOptions.transpilerOptions);
    return r.outputText;
}

export const TsTranspiler = (
    options?: BunTranspilerOptions,
): MiddlewareHandler => {
    return createMiddleware(async (c, next) => {
        await next();
        const url = new URL(c.req.url);
        const extensions = options?.extensions ?? defaultOptions.extensions;
        const headers = options?.headers ?? defaultOptions.headers;

        if (extensions?.every((ext) => !url.pathname.endsWith(ext))) {
            return;
        }

        try {
            const transpiledCode = transpile(await c.req.text());
            c.res = c.newResponse(transpiledCode, 200, headers);
        } catch (error) {
            console.warn(`Error transpiling ${url.pathname}: ${error}`);
            const errorHeaders = {
                ...headers,
                "content-type": "text/plain",
            };
            if (error instanceof Error) {
                c.res = c.newResponse(error.message, 500, errorHeaders);
            } else {
                c.res = c.newResponse("Malformed Input", 500, errorHeaders);
            }
        }
    });
};
