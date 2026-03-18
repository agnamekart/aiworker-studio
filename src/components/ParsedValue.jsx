import {
  collectColumnsFromRows,
  getValueType,
  isPlainObject,
  isPrimitive,
  safeJson,
  summarizeValue
} from "../utils/studioUtils";

const rawJsonClass =
  "scrollbar-dark max-h-[420px] overflow-auto rounded-xl border border-slate-200 bg-slate-900 p-3 font-mono text-xs leading-6 text-slate-100";

function isTableValue(v) {
  return Array.isArray(v) && v.length > 0 && v.every(isPlainObject);
}

/* ─── Table ─────────────────────────────────────────────────── */
function DataTable({ rows, columns }) {
  const visibleRows = rows.slice(0, 50);
  return (
    <div className="rounded-xl border border-slate-200">
      <div className="overflow-x-auto">
        <table className="w-max min-w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-gradient-to-b from-slate-100 to-slate-50">
              <th className="w-8 px-2 py-2 text-center text-[9px] font-bold uppercase tracking-wide text-slate-400">#</th>
              {columns.map((col) => (
                <th key={col} className="whitespace-nowrap px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-600">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visibleRows.map((row, rowIndex) => (
              <tr key={`row_${rowIndex}`} className="transition-colors hover:bg-sky-50/50">
                <td className="px-2 py-2 text-center text-[10px] font-semibold tabular-nums text-slate-300">
                  {rowIndex + 1}
                </td>
                {columns.map((col) => (
                  <td key={`${rowIndex}_${col}`} className="max-w-[200px] px-3 py-2 text-slate-700" title={String(row[col] ?? "")}>
                    <span className="block truncate text-xs">{summarizeValue(row[col])}</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > visibleRows.length && (
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-3 py-1.5">
          <span className="text-[11px] text-slate-500">
            Showing <strong>{visibleRows.length}</strong> of <strong>{rows.length}</strong> rows
          </span>
          <span className="badge border-slate-200 bg-white text-slate-400">{rows.length - visibleRows.length} hidden</span>
        </div>
      )}
    </div>
  );
}

/* ─── Primitive pill ─────────────────────────────────────────── */
function PrimitivePill({ value }) {
  const type = getValueType(value);
  const str = String(value);

  if (value === null || value === undefined) {
    return <span className="badge border-slate-300 bg-slate-100 font-mono text-slate-400">null</span>;
  }
  if (type === "boolean") {
    return (
      <span className={`badge font-mono ${value ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-600"}`}>
        {str}
      </span>
    );
  }
  if (type === "number") {
    return <span className="badge border-orange-200 bg-orange-50 font-mono text-orange-700">{str}</span>;
  }
  // string — if long, show as a styled block
  if (str.length > 40) {
    return (
      <span className="block break-all rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-mono text-xs text-slate-700">
        {str}
      </span>
    );
  }
  return <span className="badge border-slate-200 bg-white font-mono text-slate-700">{str}</span>;
}

/* ─── Main component ─────────────────────────────────────────── */
export default function ParsedValue({ value, depth = 0 }) {
  const valueType = getValueType(value);

  if (depth > 2) {
    return <pre className={rawJsonClass}>{safeJson(value)}</pre>;
  }

  /* Null */
  if (valueType === "null") {
    return <span className="badge border-slate-300 bg-slate-100 font-mono text-slate-400">null</span>;
  }

  /* Primitives */
  if (valueType === "string" || valueType === "number" || valueType === "boolean") {
    return <PrimitivePill value={value} />;
  }

  /* Arrays */
  if (valueType === "array") {
    if (value.length === 0) {
      return (
        <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-400">
          <span className="font-mono">[ ]</span> empty array
        </span>
      );
    }

    /* All primitives → tag cloud */
    if (value.every((item) => isPrimitive(item))) {
      return (
        <div className="flex flex-wrap gap-1.5">
          {value.map((item, i) => (
            <PrimitivePill key={`${String(item)}_${i}`} value={item} />
          ))}
        </div>
      );
    }

    /* All objects → table */
    const objectRows = value.filter((item) => isPlainObject(item));
    if (objectRows.length === value.length) {
      const columns = collectColumnsFromRows(objectRows, 10);
      return <DataTable rows={objectRows} columns={columns} />;
    }

    /* Mixed → cards */
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        {value.slice(0, 10).map((item, i) => (
          <div key={`item_${i}`} className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Item {i + 1}</div>
            <ParsedValue value={item} depth={depth + 1} />
          </div>
        ))}
      </div>
    );
  }

  /* Objects */
  if (valueType === "object") {
    const entries = Object.entries(value);
    if (entries.length === 0) {
      return (
        <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-400">
          <span className="font-mono">{ }</span> empty object
        </span>
      );
    }

    return (
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {entries.map(([key, entryValue]) => {
          const spansAll = isTableValue(entryValue);
          const vtype = getValueType(entryValue);
          return (
            <div
              key={key}
              className={[
                "rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/60 p-3 transition hover:border-slate-300 hover:shadow-sm",
                spansAll ? "sm:col-span-2 xl:col-span-3" : ""
              ].join(" ")}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-700">{key}</span>
                <span className="badge border-slate-200 bg-slate-100 text-[9px] text-slate-500">
                  {vtype}{Array.isArray(entryValue) ? ` [${entryValue.length}]` : ""}
                </span>
              </div>
              <ParsedValue value={entryValue} depth={depth + 1} />
            </div>
          );
        })}
      </div>
    );
  }

  return <pre className={rawJsonClass}>{safeJson(value)}</pre>;
}
