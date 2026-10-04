/* Translation unit used by build.zig to expose the SQLite and zstd C APIs
 * to Zig without @cImport (removed in Zig 0.17). */
#include "sqlite3.h"
#include "zstd.h"
#include "zdict.h"
