import { transformAsync } from "@babel/core";
import typescript from "@babel/preset-typescript";
import solid from "babel-preset-solid";
import { readFileSync, writeFileSync } from "node:fs";

const file = process.argv[2];
const out = process.argv[3];
const code = readFileSync(file, "utf8");
const presets = [];
if (/\.[cm]?[jt]sx$/.test(file)) presets.push([solid, { generate: "universal", moduleName: "@gpuix/solid" }]);
if (/\.[cm]?tsx?$/.test(file)) presets.push([typescript]);
const result = await transformAsync(code, { filename: file, configFile: false, babelrc: false, presets });
writeFileSync(out, result?.code ?? code);
console.log("wrote", out, (result?.code ?? "").length, "bytes");
