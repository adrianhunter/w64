// JavaScript half of the qjs `node:sqlite` module.
//
// Backed by the native SQLite compiled into this runtime
// (`globalThis.__qjs_sqlite`). The API mirrors Node's node:sqlite
// (DatabaseSync/StatementSync) closely enough for the cache middleware and
// general use, and adds transparent zstd table compression modeled after
// https://github.com/phiresky/sqlite-zstd.

(() => {
  const natives = globalThis.__qjs_sqlite;
  if (!natives) throw new Error("qjs sqlite natives are not installed");

  const kDb = Symbol("db");
  const kStmt = Symbol("stmt");
  const kSql = Symbol("sql");
  const kBigInts = Symbol("bigints");
  const kReturnArrays = Symbol("arrays");

  const ROW = 100;
  const DONE = 101;

  function normalizeParam(value) {
    if (value instanceof Uint8Array) return value;
    if (value instanceof ArrayBuffer) return new Uint8Array(value);
    if (ArrayBuffer.isView(value)) {
      return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    }
    return value;
  }

  class StatementSync {
    constructor(db, handle, sql) {
      this[kDb] = db;
      this[kStmt] = handle;
      this[kSql] = sql;
      this[kBigInts] = false;
      this[kReturnArrays] = false;
    }

    get sourceSQL() {
      return this[kSql];
    }

    get expandedSQL() {
      return this[kSql];
    }

    setReadBigInts(enabled) {
      this[kBigInts] = Boolean(enabled);
      return this;
    }

    setReturnArrays(enabled) {
      this[kReturnArrays] = Boolean(enabled);
      return this;
    }

    setAllowBareNamedParameters(enabled) {
      this._allowBareNamed = Boolean(enabled);
      return this;
    }

    columns() {
      const count = natives.columnCount(this[kStmt]);
      const out = [];
      for (let i = 0; i < count; i++) {
        const name = natives.columnName(this[kStmt], i);
        out.push({ column: name, name, table: null, database: null, type: null });
      }
      return out;
    }

    _bind(params) {
      const stmt = this[kStmt];
      natives.reset(stmt);
      if (
        params.length === 1 &&
        params[0] !== null &&
        typeof params[0] === "object" &&
        !(params[0] instanceof Uint8Array) &&
        !(params[0] instanceof ArrayBuffer) &&
        !ArrayBuffer.isView(params[0])
      ) {
        const record = params[0];
        for (const key of Object.keys(record)) {
          natives.bindName(stmt, key, normalizeParam(record[key]));
        }
        return;
      }
      for (let i = 0; i < params.length; i++) {
        natives.bind(stmt, i + 1, normalizeParam(params[i]));
      }
    }

    _row() {
      const count = natives.columnCount(this[kStmt]);
      if (this[kReturnArrays]) {
        const row = [];
        for (let i = 0; i < count; i++) {
          row.push(natives.columnValue(this[kStmt], i));
        }
        return row;
      }
      const row = {};
      for (let i = 0; i < count; i++) {
        row[natives.columnName(this[kStmt], i)] =
          natives.columnValue(this[kStmt], i);
      }
      return row;
    }

    run(...params) {
      this._bind(params);
      const rc = natives.step(this[kStmt]);
      if (rc !== ROW && rc !== DONE) {
        throw new Error(natives.errmsg(this[kDb][kDb]));
      }
      return {
        changes: natives.changes(this[kDb][kDb]),
        lastInsertRowid: natives.lastInsertRowid(this[kDb][kDb]),
      };
    }

    get(...params) {
      this._bind(params);
      const rc = natives.step(this[kStmt]);
      if (rc === ROW) return this._row();
      if (rc === DONE) return undefined;
      throw new Error(natives.errmsg(this[kDb][kDb]));
    }

    all(...params) {
      const rows = [];
      for (const row of this.iterate(...params)) rows.push(row);
      return rows;
    }

    *iterate(...params) {
      this._bind(params);
      while (true) {
        const rc = natives.step(this[kStmt]);
        if (rc === ROW) {
          yield this._row();
        } else if (rc === DONE) {
          break;
        } else {
          throw new Error(natives.errmsg(this[kDb][kDb]));
        }
      }
    }
  }

  class DatabaseSync {
    constructor(path, options = {}) {
      const location = String(path);
      const memory = location === ":memory:" || location.startsWith("file::memory:");
      const vfs = options.vfs ?? (memory ? "mem" : "opfs");
      const handle = natives.open(location, vfs);
      this[kDb] = handle;
      this._open = true;
    }

    exec(sql) {
      natives.exec(this[kDb], sql);
      return this;
    }

    prepare(sql) {
      const handle = natives.prepare(this[kDb], sql);
      return new StatementSync(this, handle, sql);
    }

    close() {
      if (this._open) {
        natives.close(this[kDb]);
        this._open = false;
      }
    }

    get isOpen() {
      return this._open;
    }

    // -- zstd ---------------------------------------------------------------

    zstdCompress(data, level = 3) {
      return natives.zstdCompress(
        data instanceof Uint8Array ? data : new Uint8Array(data),
        level,
      );
    }

    zstdDecompress(data) {
      return natives.zstdDecompress(data);
    }

    /// Converts `table` into a transparently zstd-compressed view, like
    /// sqlite-zstd's `zstd_enable_transparent`.
    enableZstdCompression(config) {
      const table = config.table;
      const column = config.column ?? "data";
      const level = config.compressionLevel ?? 3;
      const dictChooser = config.dictChooser ?? "'a'";
      const backing = `_${table}_zstd`;
      const dictColumn = `_${column}_dict`;

      this.exec(`
        CREATE TABLE IF NOT EXISTS _qjs_zstd_config(
          "table" TEXT PRIMARY KEY,
          "column" TEXT NOT NULL,
          compression_level INTEGER NOT NULL,
          dict_chooser TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS _qjs_zstd_dicts(
          id INTEGER PRIMARY KEY,
          dict BLOB NOT NULL,
          created INTEGER NOT NULL
        );
      `);

      const columns = this.prepare(`PRAGMA table_info("${table}")`).all();
      if (columns.length === 0) {
        throw new Error(`table ${table} does not exist`);
      }
      const columnNames = columns.map((entry) => entry.name);
      const columnInfo = columns.find((entry) => entry.name === column);
      const textColumn = /TEXT|CHAR|CLOB|STRING/i.test(columnInfo?.type ?? "");
      const decompressExpression = (name) => {
        const core = `CASE
               WHEN "${dictColumn}" IS NULL THEN "${name}"
               WHEN "${dictColumn}" = 0 THEN qjs_zstd_decompress("${name}")
               ELSE qjs_zstd_decompress_dict_id("${name}", "${dictColumn}")
             END`;
        return textColumn ? `CAST(${core} AS TEXT)` : core;
      };

      this.exec(`ALTER TABLE "${table}" RENAME TO "${backing}"`);
      this.exec(`ALTER TABLE "${backing}" ADD COLUMN "${dictColumn}" INTEGER DEFAULT NULL`);

      const pkColumns = columns
        .filter((entry) => entry.pk > 0)
        .sort((a, b) => a.pk - b.pk)
        .map((entry) => entry.name);
      if (pkColumns.length === 0) {
        throw new Error(
          `enableZstdCompression requires a primary key on ${table}`,
        );
      }
      const pkMatch = (prefix) =>
        pkColumns
          .map((name) => `"${name}" = ${prefix}."${name}"`)
          .join(" AND ");

      const projections = columnNames.map((name) =>
        name === column
          ? `${decompressExpression(name)} AS "${name}"`
          : `"${name}"`
      );

      this.exec(`
        CREATE VIEW "${table}" AS
          SELECT ${projections.join(", ")}
          FROM "${backing}"
      `);

      const insertColumns = [...columnNames, dictColumn];
      const insertValues = columnNames.map((name) => `new."${name}"`);
      insertValues.push("NULL");
      this.exec(`
        CREATE TRIGGER "${table}_insert" INSTEAD OF INSERT ON "${table}"
        BEGIN
          INSERT INTO "${backing}"(${insertColumns
            .map((name) => `"${name}"`)
            .join(", ")})
          VALUES (${insertValues.join(", ")});
        END
      `);

      const updateAssignments = columnNames
        .map((name) => `"${name}" = new."${name}"`)
        .join(", ");
      this.exec(`
        CREATE TRIGGER "${table}_update" INSTEAD OF UPDATE ON "${table}"
        BEGIN
          UPDATE "${backing}"
          SET ${updateAssignments}, "${dictColumn}" = NULL
          WHERE ${pkMatch("old")};
        END
      `);

      this.exec(`
        CREATE TRIGGER "${table}_delete" INSTEAD OF DELETE ON "${table}"
        BEGIN
          DELETE FROM "${backing}" WHERE ${pkMatch("old")};
        END
      `);

      const config_statement = this.prepare(
        `INSERT OR REPLACE INTO _qjs_zstd_config
           ("table", "column", compression_level, dict_chooser)
         VALUES (?1, ?2, ?3, ?4)`,
      );
      config_statement.run(table, column, level, dictChooser);

      return this;
    }

    /// Compresses every uncompressed row of a zstd-enabled table in chunks.
    runZstdMaintenance(options = {}) {
      const maxRows = options.maxRows ?? 100000;
      const configs = this.prepare(`SELECT * FROM _qjs_zstd_config`).all();
      let compressed = 0;

      for (const config of configs) {
        const table = config.table;
        const column = config.column;
        const level = config.compression_level;
        const backing = `_${table}_zstd`;
        const dictColumn = `_${column}_dict`;

        const backingColumns = this.prepare(
          `PRAGMA table_info("${backing}")`,
        ).all();
        const pkColumns = backingColumns
          .filter((entry) => entry.pk > 0)
          .sort((a, b) => a.pk - b.pk)
          .map((entry) => entry.name);

        const pkSelect = pkColumns
          .map((name) => `"${name}"`)
          .join(", ");
        const rowIds = this.prepare(
          `SELECT ${pkSelect}, "${column}" AS data,
                  (${config.dict_chooser}) AS dict_key
           FROM "${backing}"
           WHERE "${dictColumn}" IS NULL
           LIMIT ?1`,
        ).all(maxRows);
        if (rowIds.length === 0) continue;

        const groups = new Map();
        for (const row of rowIds) {
          const key = String(row.dict_key ?? "");
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key).push(row);
        }

        for (const [key, rows] of groups) {
          let dictId = null;
          let dictBytes = null;
          if (key !== "" && key !== "null" && rows.length >= 8) {
            const samples = rows.map((row) =>
              row.data instanceof Uint8Array
                ? row.data
                : natives.utf8Encode(String(row.data)),
            );
            const dictSize = Math.min(131072, Math.max(1024, samples.length * 64));
            try {
              dictBytes = natives.zstdTrainDict(samples, dictSize);
              const insert = this.prepare(
                `INSERT INTO _qjs_zstd_dicts(dict, created)
                 VALUES (?1, strftime('%s','now'))`,
              );
              const info = insert.run(dictBytes);
              dictId = info.lastInsertRowid;
            } catch {
              dictId = null;
              dictBytes = null;
            }
          }

          this.exec("BEGIN");
          try {
            const pkWhere = pkColumns
              .map((name) => `"${name}" = ?`)
              .join(" AND ");
            const update = this.prepare(
              `UPDATE "${backing}" SET "${column}" = ?, "${dictColumn}" = ?
               WHERE ${pkWhere}`,
            );
            for (const row of rows) {
              const bytes =
                row.data instanceof Uint8Array
                  ? row.data
                  : natives.utf8Encode(String(row.data));
              const compressedBytes =
                dictBytes === null
                  ? natives.zstdCompress(bytes, level)
                  : natives.zstdCompressDict(bytes, dictBytes, level);
              update.run(
                compressedBytes,
                dictId ?? 0,
                ...pkColumns.map((name) => row[name]),
              );
            }
            this.exec("COMMIT");
            compressed += rows.length;
          } catch (error) {
            this.exec("ROLLBACK");
            throw error;
          }
        }
      }
      return compressed;
    }
  }

  globalThis.__qjs_sqlite_exports = {
    DatabaseSync,
    StatementSync,
    default: { DatabaseSync, StatementSync },
  };
})();
