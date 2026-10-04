import ts, { transpileModule, createProgram } from "typescript";
import * as ts2 from "typescript";
console.log("default is namespace:", typeof ts.transpileModule === "function");
console.log("named import:", typeof transpileModule === "function", typeof createProgram === "function");
console.log("namespace import:", ts2.version === ts.version, ts.version);
console.log(transpileModule("let x: number = 1", { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText.trim());
