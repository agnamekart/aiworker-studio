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
    const message =
      data?.error ||
      data?.message ||
      `${method} ${url} failed (${response.status})`;
    throw new Error(message);
  }

  if (data && typeof data === "object" && data.success === false) {
    throw new Error(data.error || data.message || `${method} ${url} failed`);
  }

  return data;
}

export const studioApi = {
  loadStudioState() {
    return request("/init", { method: "GET" });
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
  }
};
