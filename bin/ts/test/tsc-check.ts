import { transpile } from "qjs:ttsc";
const out = transpile("const a: number = <div x={1}/>;", "tsx");
console.log(out);
