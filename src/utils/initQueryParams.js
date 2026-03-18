export const DEFAULT_INIT_QUERY = Object.freeze({
  instance: "default",
  page: 0,
  size: 25,
  historySize: 10,
  executionSize: 5
});

export const FIXED_INIT_PAGE_SIZE = DEFAULT_INIT_QUERY.size;

const INIT_QUERY_KEYS = ["instance", "page", "size", "historySize", "executionSize"];

function parseInteger(value, fallback, { min = 0 } = {}) {
  const parsed = Number.parseInt(String(value ?? "").trim(), 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(min, parsed);
}

export function normalizeInitQuery(partial = {}) {
  return {
    instance:
      typeof partial.instance === "string" && partial.instance.trim()
        ? partial.instance.trim()
        : DEFAULT_INIT_QUERY.instance,
    page: parseInteger(partial.page, DEFAULT_INIT_QUERY.page, { min: 0 }),
    size: FIXED_INIT_PAGE_SIZE,
    historySize: parseInteger(partial.historySize, DEFAULT_INIT_QUERY.historySize, { min: 1 }),
    executionSize: parseInteger(partial.executionSize, DEFAULT_INIT_QUERY.executionSize, { min: 1 })
  };
}

export function parseInitQuery(search = "") {
  const params = new URLSearchParams(search);
  return normalizeInitQuery({
    instance: params.get("instance"),
    page: params.get("page"),
    size: params.get("size"),
    historySize: params.get("historySize"),
    executionSize: params.get("executionSize")
  });
}

export function mergeInitQueryIntoSearch(search = "", query = {}) {
  const params = new URLSearchParams(search);
  const normalized = normalizeInitQuery(query);

  for (const key of INIT_QUERY_KEYS) {
    params.set(key, String(normalized[key]));
  }

  const nextSearch = params.toString();
  return nextSearch ? `?${nextSearch}` : "";
}
