// WHATWG URL implementation, bundled separately from the core web globals
// because whatwg-url runs code at import time that expects TextDecoder and
// friends to already exist.

import { URL, URLSearchParams } from "whatwg-url";

globalThis.URL = URL;
globalThis.URLSearchParams = URLSearchParams;
