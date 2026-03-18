function buildQuery(params = {}) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

function getApiBaseUrl() {
  const raw = import.meta.env.VITE_API_BASE_URL;
  if (!raw || typeof raw !== "string") {
    return "";
  }
  return raw.trim().replace(/\/+$/, "");
}

function buildUrl(path) {
  const base = getApiBaseUrl();
  if (!base) {
    return path;
  }
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

async function parseResponse(response, responseType = "json") {
  if (responseType === "text") {
    return response.text();
  }
  const text = await response.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Invalid JSON response from server");
  }
}

async function request(path, options = {}) {
  const { method = "GET", body, responseType = "json" } = options;

  const fetchOptions = {
    method,
    headers: {}
  };

  if (body !== undefined) {
    fetchOptions.headers["Content-Type"] = "application/json";
    fetchOptions.body = JSON.stringify(body);
  }

  const url = buildUrl(path);
  const response = await fetch(url, fetchOptions);
  const data = await parseResponse(response, responseType);

  if (!response.ok) {
    throw createApiError({
      data,
      fallbackMessage: `${method} ${url} failed (${response.status})`,
      responseStatus: response.status
    });
  }

  if (data && typeof data === "object" && data.success === false) {
    throw createApiError({
      data,
      fallbackMessage: `${method} ${url} failed`,
      responseStatus: response.status
    });
  }

  return data;
}

function createApiError({ data, fallbackMessage, responseStatus }) {
  const structuredError =
    data && typeof data === "object" && data.error && typeof data.error === "object"
      ? data.error
      : null;
  const flatError = data?.error;
  const message =
    structuredError?.message ||
    (typeof flatError === "string" ? flatError : null) ||
    data?.message ||
    fallbackMessage;
  const error = new Error(message);
  error.status = responseStatus;
  error.code = structuredError?.code || data?.code || null;
  error.details = structuredError || null;
  error.allowedStartNodes = Array.isArray(structuredError?.allowedStartNodes)
    ? structuredError.allowedStartNodes
    : [];
  return error;
}

export const studioApi = {
  loadStudioState(params = {}) {
    return request(`/init${buildQuery(params)}`, { method: "GET" });
  },

  fetchGraphMermaid() {
    return request("/api/langgraph/graph/domain", {
      method: "GET",
      responseType: "text"
    });
  },

  fetchExecutionContext(threadId) {
    return request(`/api/langgraph/execution-context${buildQuery({ threadId })}`, {
      method: "GET"
    });
  },

  submitResume(payload) {
    return request("/api/langgraph/resume", {
      method: "POST",
      body: payload
    });
  },

  submitRerun(payload) {
    return request("/api/langgraph/rerun", {
      method: "POST",
      body: payload
    });
  },

  precheckRerun(payload) {
    return request("/api/langgraph/rerun/precheck", {
      method: "POST",
      body: payload
    });
  },

  cancelExecution(executionId, payload) {
    return request(`/api/langgraph/execution/${encodeURIComponent(executionId)}/cancel`, {
      method: "POST",
      body: payload
    });
  }
};
