import {
  collectColumnsFromRows,
  getValueType,
  isPlainObject,
  isPrimitive,
  safeJson,
  summarizeValue
} from "../utils/studioUtils";

export default function ParsedValue({ value, depth = 0 }) {
  const valueType = getValueType(value);

  if (depth > 2) {
    return <pre className="raw-json">{safeJson(value)}</pre>;
  }

  if (valueType === "null") {
    return <span className="value-pill">null</span>;
  }

  if (valueType === "string" || valueType === "number" || valueType === "boolean") {
    return <span className="value-pill">{String(value)}</span>;
  }

  if (valueType === "array") {
    if (value.length === 0) {
      return <p className="empty">Empty array</p>;
    }

    const allPrimitive = value.every((item) => isPrimitive(item));
    if (allPrimitive) {
      return (
        <div className="chip-wrap">
          {value.map((item, index) => (
            <span className="chip" key={`${String(item)}_${index}`}>
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
        <div className="parsed-table-wrap">
          <table className="parsed-table">
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column}>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row, rowIndex) => (
                <tr key={`row_${rowIndex}`}>
                  {columns.map((column) => (
                    <td key={`${rowIndex}_${column}`}>{summarizeValue(row[column])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {value.length > visibleRows.length && (
            <p className="empty">Showing {visibleRows.length} of {value.length} rows</p>
          )}
        </div>
      );
    }

    return (
      <div className="kv-grid">
        {value.slice(0, 10).map((item, index) => (
          <div className="kv-card" key={`item_${index}`}>
            <div className="kv-key">Item {index + 1}</div>
            <div className="kv-value">
              <ParsedValue value={item} depth={depth + 1} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (valueType === "object") {
    const entries = Object.entries(value);
    if (entries.length === 0) {
      return <p className="empty">Empty object</p>;
    }

    return (
      <div className="kv-grid">
        {entries.map(([key, entryValue]) => (
          <div className="kv-card" key={key}>
            <div className="kv-key">{key}</div>
            <div className="kv-preview">{summarizeValue(entryValue)}</div>
            <div className="kv-value">
              <ParsedValue value={entryValue} depth={depth + 1} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return <pre className="raw-json">{safeJson(value)}</pre>;
}
