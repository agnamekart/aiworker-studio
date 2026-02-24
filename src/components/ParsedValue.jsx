import {
  collectColumnsFromRows,
  getValueType,
  isPlainObject,
  isPrimitive,
  safeJson,
  summarizeValue
} from "../utils/studioUtils";

const rawJsonClass =
  "max-h-[420px] overflow-auto rounded-xl border border-slate-200 bg-slate-900 p-3 font-mono text-xs leading-6 text-slate-100";

export default function ParsedValue({ value, depth = 0 }) {
  const valueType = getValueType(value);

  if (depth > 2) {
    return <pre className={rawJsonClass}>{safeJson(value)}</pre>;
  }

  if (valueType === "null") {
    return <span className="badge border-slate-300 bg-slate-50 text-slate-700">null</span>;
  }

  if (valueType === "string" || valueType === "number" || valueType === "boolean") {
    return <span className="badge border-slate-300 bg-slate-50 text-slate-700">{String(value)}</span>;
  }

  if (valueType === "array") {
    if (value.length === 0) {
      return <p className="text-sm text-slate-500">Empty array</p>;
    }

    const allPrimitive = value.every((item) => isPrimitive(item));
    if (allPrimitive) {
      return (
        <div className="flex flex-wrap gap-1.5">
          {value.map((item, index) => (
            <span className="badge border-slate-200 bg-white text-slate-700" key={`${String(item)}_${index}`}>
              {String(item)}
            </span>
          ))}
        </div>
      );
    }

    const objectRows = value.filter((item) => isPlainObject(item));
    if (objectRows.length === value.length) {
      const columns = collectColumnsFromRows(objectRows, 8);
      const visibleRows = objectRows.slice(0, 12);

      return (
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <div className="overflow-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  {columns.map((column) => (
                    <th className="px-3 py-2 font-semibold" key={column}>
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row, rowIndex) => (
                  <tr className="border-t border-slate-100" key={`row_${rowIndex}`}>
                    {columns.map((column) => (
                      <td className="px-3 py-2 text-slate-700" key={`${rowIndex}_${column}`}>
                        {summarizeValue(row[column])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {value.length > visibleRows.length && (
            <p className="border-t border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
              Showing {visibleRows.length} of {value.length} rows
            </p>
          )}
        </div>
      );
    }

    return (
      <div className="grid gap-2 sm:grid-cols-2">
        {value.slice(0, 10).map((item, index) => (
          <div className="rounded-xl border border-slate-200 bg-white p-3" key={`item_${index}`}>
            <div className="mb-2 text-xs font-semibold text-slate-600">Item {index + 1}</div>
            <ParsedValue value={item} depth={depth + 1} />
          </div>
        ))}
      </div>
    );
  }

  if (valueType === "object") {
    const entries = Object.entries(value);
    if (entries.length === 0) {
      return <p className="text-sm text-slate-500">Empty object</p>;
    }

    return (
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {entries.map(([key, entryValue]) => (
          <div className="rounded-xl border border-slate-200 bg-white p-3" key={key}>
            <div className="text-xs font-bold text-slate-700">{key}</div>
            <div className="mt-1 text-xs text-slate-500">{summarizeValue(entryValue)}</div>
            <div className="mt-2">
              <ParsedValue value={entryValue} depth={depth + 1} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return <pre className={rawJsonClass}>{safeJson(value)}</pre>;
}
