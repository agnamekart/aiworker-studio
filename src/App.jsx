import { useEffect, useMemo, useState } from "react";

const DEFAULT_NODES = [
  "send_to_aibrain",
  "wait_for_webhook",
  "save_leads",
  "apollo_enrich_contacts",
  "add_static_emails",
  "schedule_mailing"
];

const DEFAULT_STRATEGIES = ["TABLE_POLICY", "APPEND", "REPLACE", "UPSERT"];
const MERMAID_LOADER_KEY = "__langsmithStudioMermaidLoader__";

function safeJson(value) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function cleanMermaidSource(source) {
  const raw = typeof source === "string" ? source.trim() : "";
  if (!raw) {
    return "";
  }

  const fenced = raw.match(/```(?:mermaid)?\s*([\s\S]*?)```/i);
  return fenced ? fenced[1].trim() : raw;
}

function shortenId(value, keep = 8) {
  if (!value || value.length <= keep * 2 + 3) {
    return value || "";
  }
  return `${value.slice(0, keep)}...${value.slice(-keep)}`;
}

async function loadMermaidLibrary() {
  if (typeof window === "undefined") {
    throw new Error("Window is unavailable for mermaid rendering");
  }

  if (window.mermaid) {
    return window.mermaid;
  }

  if (window[MERMAID_LOADER_KEY]) {
    return window[MERMAID_LOADER_KEY];
  }

  window[MERMAID_LOADER_KEY] = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js";
    script.async = true;
    script.onload = () => {
      if (window.mermaid) {
        resolve(window.mermaid);
        return;
      }
      reject(new Error("Mermaid loaded but not available on window"));
    };
    script.onerror = () => reject(new Error("Failed to load Mermaid from CDN"));
    document.head.appendChild(script);
  });

  return window[MERMAID_LOADER_KEY];
}

function getValueType(value) {
  if (value === null) {
    return "null";
  }
  if (Array.isArray(value)) {
    return "array";
  }
  return typeof value;
}

function isPrimitive(value) {
  const type = getValueType(value);
  return type === "string" || type === "number" || type === "boolean" || type === "null";
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function summarizeValue(value) {
  const type = getValueType(value);
  if (type === "string") {
    return value.length > 120 ? `${value.slice(0, 120)}...` : value;
  }
  if (type === "number" || type === "boolean") {
    return String(value);
  }
  if (type === "null") {
    return "null";
  }
  if (type === "array") {
    return `Array (${value.length})`;
  }
  if (type === "object") {
    return `Object (${Object.keys(value).length} keys)`;
  }
  return type;
}

function getStateSections(payload) {
  if (isPlainObject(payload)) {
    return [{ key: "__overview", label: "Overview" }].concat(
      Object.keys(payload).map((key) => ({ key, label: key }))
    );
  }
  return [{ key: "__overview", label: "Overview" }];
}

function getSectionValue(payload, sectionKey) {
  if (sectionKey === "__overview") {
    return payload;
  }
  if (isPlainObject(payload)) {
    return payload[sectionKey];
  }
  return payload;
}

function collectColumnsFromRows(rows, maxColumns = 8) {
  const seen = new Set();
  for (const row of rows) {
    if (!isPlainObject(row)) {
      continue;
    }
    for (const key of Object.keys(row)) {
      if (!seen.has(key)) {
        seen.add(key);
      }
      if (seen.size >= maxColumns) {
        return Array.from(seen);
      }
    }
  }
  return Array.from(seen);
}

function ParsedValue({ value, depth = 0 }) {
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

function normalizeSnapshot(raw, index) {
  const checkpoint = raw?.config?.checkpoint_id ?? raw?.checkpoint ?? raw?.id ?? null;
  const node =
    raw?.node ??
    raw?.next ??
    raw?.name ??
    raw?.metadata?.node ??
    raw?.config?.checkpoint_ns ??
    `state_${index + 1}`;

  const statePayload = raw?.state ?? raw?.data ?? raw;
  const savedAtRaw =
    raw?.saved_at ??
    raw?.savedAt ??
    raw?.timestamp ??
    raw?.created_at ??
    raw?.savedAtMs ??
    raw?.saved_at_ms ??
    null;
  const savedAtMs = toMillis(savedAtRaw);

  return {
    index,
    key: checkpoint ? `${checkpoint}_${index}` : `${node}_${index}`,
    checkpoint,
    node,
    savedAt: savedAtRaw,
    savedAtMs,
    payload: statePayload,
    raw
  };
}

function normalizeExecution(rawExecution, executionIndex) {
  const rawSnapshots = Array.isArray(rawExecution)
    ? rawExecution.map((item, idx) => normalizeSnapshot(item, idx)).reverse()
    : [];

  let phase = 1;
  const snapshots = rawSnapshots.map((snapshot, idx) => {
    if (idx > 0 && snapshot.node === "__START__") {
      phase += 1;
    }

    const payload = snapshot.payload;
    const hasResumeMarker =
      isPlainObject(payload) &&
      (payload.resume_from_node !== undefined || payload.parent_campaign_id !== undefined);

    return {
      ...snapshot,
      // Reindex after reverse so list click/select always maps to visible order.
      index: idx,
      key: snapshot.checkpoint ? `${snapshot.checkpoint}_${idx}` : `${snapshot.node}_${idx}`,
      phase,
      isResumePhase: phase > 1 || hasResumeMarker
    };
  });

  return {
    executionIndex,
    id: `execution_${executionIndex + 1}`,
    snapshots
  };
}

function extractThreadLineageFromSnapshots(snapshots) {
  if (!Array.isArray(snapshots) || snapshots.length === 0) {
    return { campaignId: null, parentCampaignId: null, runKind: "UNKNOWN" };
  }

  let campaignId = null;
  let parentCampaignId = null;
  let runKind = null;

  for (const snapshot of snapshots) {
    const payload = snapshot?.payload;
    if (!isPlainObject(payload)) {
      continue;
    }

    const campaignObj = isPlainObject(payload.campaign) ? payload.campaign : null;
    const parentCampaignObj = isPlainObject(campaignObj?.parentCampaign)
      ? campaignObj.parentCampaign
      : null;

    if (campaignId == null) {
      campaignId = firstDefined(
        payload.campaignId,
        payload.campaign_id,
        campaignObj?.campaignId,
        campaignObj?.campaign_id
      );
    }

    if (parentCampaignId == null) {
      parentCampaignId = firstDefined(
        payload.parentCampaignId,
        payload.parent_campaign_id,
        campaignObj?.parentCampaignId,
        campaignObj?.parent_campaign_id,
        parentCampaignObj?.campaignId,
        parentCampaignObj?.campaign_id
      );
    }

    if (runKind == null) {
      runKind = firstDefined(
        payload.runKind,
        payload.run_kind,
        campaignObj?.runKind,
        campaignObj?.run_kind
      );
    }
  }

  const normalizedCampaignId =
    campaignId != null && `${campaignId}`.trim() !== "" ? Number(campaignId) : null;
  const normalizedParentCampaignId =
    parentCampaignId != null && `${parentCampaignId}`.trim() !== ""
      ? Number(parentCampaignId)
      : null;

  let threadType = "NORMAL";
  if (
    String(runKind || "").toUpperCase() === "RERUN" ||
    (normalizedParentCampaignId != null &&
      normalizedCampaignId != null &&
      normalizedParentCampaignId !== normalizedCampaignId)
  ) {
    threadType = "RERUN";
  }

  return {
    campaignId: normalizedCampaignId,
    parentCampaignId: normalizedParentCampaignId,
    runKind: runKind ? String(runKind).toUpperCase() : threadType,
    threadType
  };
}

function extractThreadDomainFromSnapshots(snapshots) {
  if (!Array.isArray(snapshots) || snapshots.length === 0) {
    return null;
  }

  for (const snapshot of snapshots) {
    const payload = snapshot?.payload;
    if (!isPlainObject(payload)) {
      continue;
    }

    const domainObj = isPlainObject(payload.domain) ? payload.domain : null;
    const candidate = firstDefined(
      extractDomainNameCandidate(payload.domainName),
      extractDomainNameCandidate(payload.domain_name),
      extractDomainNameCandidate(payload.domain),
      extractDomainNameCandidate(domainObj?.domainName),
      extractDomainNameCandidate(domainObj?.domain_name),
      extractDomainNameCandidate(domainObj?.domain)
    );
    if (candidate) {
      return candidate;
    }
  }

  return null;
}

function normalizeThread(entry) {
  if (!Array.isArray(entry) || entry.length < 1) {
    return null;
  }

  const threadId = entry[0];
  const rawExecutions = Array.isArray(entry[1]) ? entry[1] : [];
  const threadMeta = isPlainObject(entry[2]) ? entry[2] : {};
  const executions = rawExecutions.map((execution, idx) => normalizeExecution(execution, idx));
  const snapshotsFlat = executions.flatMap((execution) => execution.snapshots);
  const lineage = extractThreadLineageFromSnapshots(snapshotsFlat);
  const domainName = extractThreadDomainFromSnapshots(snapshotsFlat);

  // Studio returns a placeholder thread when no persisted checkpoints exist.
  if (threadId === "default" && executions.length === 0) {
    return null;
  }

  const allSnapshots = executions.flatMap((execution) => execution.snapshots);
  const latestSnapshotByTime = allSnapshots
    .filter((snapshot) => typeof snapshot.savedAtMs === "number")
    .sort((a, b) => b.savedAtMs - a.savedAtMs)[0];
  const fallbackLatestSnapshot = executions[0]?.snapshots?.[executions[0].snapshots.length - 1] ?? null;
  const latestSnapshot = latestSnapshotByTime ?? fallbackLatestSnapshot;
  const latestSavedAtMs = toMillis(firstDefined(threadMeta.latestSavedAtMs, latestSnapshot?.savedAtMs));

  return {
    threadId,
    executions,
    campaignId: lineage.campaignId,
    domainName,
    parentCampaignId: lineage.parentCampaignId,
    runKind: lineage.runKind,
    threadType: lineage.threadType,
    latestSnapshot,
    latestSavedAtMs,
    snapshotCount: executions.reduce((sum, ex) => sum + ex.snapshots.length, 0)
  };
}

function firstDefined(...values) {
  for (const value of values) {
    if (value === null || value === undefined) {
      continue;
    }
    if (typeof value === "string" && value.trim() === "") {
      continue;
    }
    return value;
  }
  return undefined;
}

function toMillis(value) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const asNumber = Number(trimmed);
    if (Number.isFinite(asNumber)) {
      return asNumber;
    }
    const parsed = Date.parse(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function compareThreadsBySort(a, b, threadSort) {
  if (threadSort === "id_asc") {
    return a.threadId.localeCompare(b.threadId);
  }
  const diff = b.snapshotCount - a.snapshotCount;
  return diff !== 0 ? diff : a.threadId.localeCompare(b.threadId);
}

function toRequestedById(value) {
  const raw = typeof value === "string" ? value.trim() : value;
  if (raw === null || raw === undefined || raw === "") {
    return null;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function extractDomainNameCandidate(value) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  }

  if (isPlainObject(value)) {
    return firstDefined(
      extractDomainNameCandidate(value.domainName),
      extractDomainNameCandidate(value.domain_name),
      extractDomainNameCandidate(value.domain),
      extractDomainNameCandidate(value.name)
    );
  }

  return undefined;
}

function extractContextFromPayload(payload, selectedNode) {
  if (!isPlainObject(payload)) {
    return null;
  }

  const campaignObj = isPlainObject(payload.campaign) ? payload.campaign : null;
  const domainObj = isPlainObject(payload.domain) ? payload.domain : null;

  const campaignId = firstDefined(
    payload.campaignId,
    payload.campaign_id,
    campaignObj?.campaignId,
    campaignObj?.campaign_id
  );

  const parentCampaignId = firstDefined(
    payload.parentCampaignId,
    payload.parent_campaign_id,
    payload.parentCampaign,
    campaignObj?.parentCampaignId,
    campaignObj?.parent_campaign_id
  );

  const domainName = firstDefined(
    extractDomainNameCandidate(payload.domainName),
    extractDomainNameCandidate(payload.domain_name),
    extractDomainNameCandidate(payload.domain),
    extractDomainNameCandidate(domainObj?.domainName),
    extractDomainNameCandidate(domainObj?.domain_name),
    extractDomainNameCandidate(domainObj?.domain)
  );

  const strategyMode = firstDefined(
    payload.strategyMode,
    payload.strategy_mode,
    payload.strategy
  );

  const requestedBy = firstDefined(
    payload.requestedBy,
    payload.requested_by
  );

  const resumeNode = firstDefined(
    payload.resumeFromNode,
    payload.resume_from_node,
    payload.currentNode,
    payload.current_node,
    payload.lastFailedNode,
    payload.last_failed_node,
    selectedNode
  );

  return {
    campaignId,
    parentCampaignIdForRerun: firstDefined(parentCampaignId, campaignId),
    domainName,
    strategyMode,
    requestedBy,
    suggestedResumeStartNode: firstDefined(resumeNode, "save_leads"),
    suggestedRerunStartNode: firstDefined(
      payload.lastFailedNode,
      payload.last_failed_node,
      resumeNode,
      "send_to_aibrain"
    ),
    startNodes: DEFAULT_NODES
  };
}

function mergeContext(base, next) {
  return {
    campaignId: firstDefined(base?.campaignId, next?.campaignId),
    parentCampaignIdForRerun: firstDefined(
      base?.parentCampaignIdForRerun,
      next?.parentCampaignIdForRerun,
      base?.campaignId,
      next?.campaignId
    ),
    domainName: firstDefined(base?.domainName, next?.domainName),
    strategyMode: firstDefined(base?.strategyMode, next?.strategyMode),
    requestedBy: firstDefined(base?.requestedBy, next?.requestedBy),
    suggestedResumeStartNode: firstDefined(base?.suggestedResumeStartNode, next?.suggestedResumeStartNode),
    suggestedRerunStartNode: firstDefined(base?.suggestedRerunStartNode, next?.suggestedRerunStartNode),
    startNodes:
      Array.isArray(base?.startNodes) && base.startNodes.length
        ? base.startNodes
        : Array.isArray(next?.startNodes) && next.startNodes.length
          ? next.startNodes
          : DEFAULT_NODES
  };
}

function extractContextFromSnapshots(snapshots) {
  if (!Array.isArray(snapshots) || snapshots.length === 0) {
    return null;
  }

  // Newest first, because latest state is usually most relevant.
  const ordered = [...snapshots].sort((a, b) => b.index - a.index);
  let merged = null;

  for (const snapshot of ordered) {
    const ctx = extractContextFromPayload(snapshot?.payload, snapshot?.node);
    if (!ctx) {
      continue;
    }
    merged = mergeContext(merged, ctx);
  }

  return merged;
}

export default function App() {
  const [threads, setThreads] = useState([]);
  const [graphMermaid, setGraphMermaid] = useState("");
  const [graphSvg, setGraphSvg] = useState("");
  const [graphRenderError, setGraphRenderError] = useState("");
  const [loading, setLoading] = useState(false);
  const [threadFilter, setThreadFilter] = useState("");
  const [threadSort, setThreadSort] = useState("states_desc");

  const [selectedThreadId, setSelectedThreadId] = useState("");
  const [selectedStateIndex, setSelectedStateIndex] = useState(0);
  const [selectedStateSectionKey, setSelectedStateSectionKey] = useState("__overview");

  const [startNodes, setStartNodes] = useState(DEFAULT_NODES);

  const [resumeForm, setResumeForm] = useState({
    campaignId: "",
    domainName: "",
    startNode: "save_leads",
    strategyMode: "TABLE_POLICY",
    requestedBy: "admin",
    testMode: false,
    webhookData: ""
  });

  const [rerunForm, setRerunForm] = useState({
    parentCampaignId: "",
    domainName: "",
    startNode: "send_to_aibrain",
    strategyMode: "TABLE_POLICY",
    requestedBy: "admin",
    testMode: false,
    rerunReason: "manual rerun"
  });

  const [status, setStatus] = useState({ type: "neutral", message: "Ready" });
  const [controlsOpen, setControlsOpen] = useState(false);
  const [rawSnapshotOverlayOpen, setRawSnapshotOverlayOpen] = useState(false);

  const filteredThreads = useMemo(() => {
    const query = threadFilter.trim().toLowerCase();
    const filtered = !query
      ? [...threads]
      : threads.filter((thread) => {
          const campaignText =
            thread.campaignId === null || thread.campaignId === undefined
              ? ""
              : String(thread.campaignId).toLowerCase();
          const domainText = (thread.domainName ?? "").toLowerCase();
          return campaignText.includes(query) || domainText.includes(query);
        });

    filtered.sort((a, b) => compareThreadsBySort(a, b, threadSort));

    return filtered;
  }, [threads, threadFilter, threadSort]);

  const nestedThreads = useMemo(() => {
    const byCampaignId = new Map();
    for (const thread of filteredThreads) {
      if (thread.campaignId != null && !byCampaignId.has(thread.campaignId)) {
        byCampaignId.set(thread.campaignId, thread);
      }
    }

    const childrenByParentThreadId = new Map();
    const roots = [];

    for (const thread of filteredThreads) {
      if (
        thread.threadType === "RERUN" &&
        thread.parentCampaignId != null &&
        byCampaignId.has(thread.parentCampaignId)
      ) {
        const parentThread = byCampaignId.get(thread.parentCampaignId);
        if (parentThread.threadId !== thread.threadId) {
          const list = childrenByParentThreadId.get(parentThread.threadId) ?? [];
          list.push(thread);
          childrenByParentThreadId.set(parentThread.threadId, list);
          continue;
        }
      }
      roots.push(thread);
    }

    const sortedRoots = [...roots].sort((a, b) => compareThreadsBySort(a, b, threadSort));

    const out = [];
    for (const root of sortedRoots) {
      out.push({ thread: root, depth: 0 });
      const children = [...(childrenByParentThreadId.get(root.threadId) ?? [])].sort((a, b) =>
        compareThreadsBySort(a, b, threadSort)
      );
      for (const child of children) {
        out.push({ thread: child, depth: 1 });
      }
    }
    return out;
  }, [filteredThreads, threadSort]);

  const selectedThread = useMemo(
    () => threads.find((thread) => thread.threadId === selectedThreadId),
    [threads, selectedThreadId]
  );

  const totalExecutions = useMemo(
    () => threads.reduce((sum, thread) => sum + thread.executions.length, 0),
    [threads]
  );

  const totalStates = useMemo(
    () => threads.reduce((sum, thread) => sum + thread.snapshotCount, 0),
    [threads]
  );

  const selectedExecution = useMemo(() => {
    if (!selectedThread) {
      return null;
    }
    return selectedThread.executions[0] ?? null;
  }, [selectedThread]);

  const selectedState = useMemo(() => {
    if (!selectedExecution) {
      return null;
    }
    return selectedExecution.snapshots[selectedStateIndex] ?? selectedExecution.snapshots[0] ?? null;
  }, [selectedExecution, selectedStateIndex]);

  const executionSnapshots = selectedExecution?.snapshots ?? [];

  const selectedStatePosition = useMemo(() => {
    if (!selectedState || executionSnapshots.length === 0) {
      return 0;
    }
    const index = executionSnapshots.findIndex((snapshot) => snapshot.key === selectedState.key);
    return index >= 0 ? index + 1 : 0;
  }, [selectedState, executionSnapshots]);

  const selectedExecutionUniqueNodeCount = useMemo(
    () => new Set(executionSnapshots.map((snapshot) => snapshot.node)).size,
    [executionSnapshots]
  );

  function applyContextToForms(context) {
    if (!context) {
      return;
    }

    const nodes =
      Array.isArray(context.startNodes) && context.startNodes.length
        ? context.startNodes
        : DEFAULT_NODES;
    setStartNodes(nodes);

    setResumeForm((prev) => ({
      ...prev,
      campaignId: firstDefined(context.campaignId, prev.campaignId, ""),
      domainName: firstDefined(context.domainName, prev.domainName, ""),
      startNode: firstDefined(context.suggestedResumeStartNode, context.startNode, prev.startNode),
      strategyMode: firstDefined(context.strategyMode, prev.strategyMode, "TABLE_POLICY"),
      requestedBy: firstDefined(context.requestedBy, prev.requestedBy, "")
    }));

    setRerunForm((prev) => ({
      ...prev,
      parentCampaignId: firstDefined(
        context.parentCampaignIdForRerun,
        context.parentCampaignId,
        context.campaignId,
        prev.parentCampaignId,
        ""
      ),
      domainName: firstDefined(context.domainName, prev.domainName, ""),
      startNode: firstDefined(context.suggestedRerunStartNode, context.startNode, prev.startNode),
      strategyMode: firstDefined(context.strategyMode, prev.strategyMode, "TABLE_POLICY"),
      requestedBy: firstDefined(context.requestedBy, prev.requestedBy, "")
    }));
  }

  const stateSections = useMemo(
    () => getStateSections(selectedState?.payload),
    [selectedState]
  );

  const selectedSectionValue = useMemo(
    () => getSectionValue(selectedState?.payload, selectedStateSectionKey),
    [selectedState, selectedStateSectionKey]
  );

  const stateOverview = useMemo(() => {
    if (!selectedState) {
      return [];
    }
    const payload = selectedState.payload;
    if (isPlainObject(payload)) {
      return Object.entries(payload).map(([key, value]) => ({
        key,
        type: getValueType(value),
        summary: summarizeValue(value)
      }));
    }
    return [
      {
        key: "payload",
        type: getValueType(payload),
        summary: summarizeValue(payload)
      }
    ];
  }, [selectedState]);

  async function fetchGraphMermaid() {
    try {
      const response = await fetch("/api/langgraph/graph/domain");
      if (!response.ok) {
        throw new Error(`Graph API failed (${response.status})`);
      }
      const mermaid = await response.text();
      setGraphMermaid(mermaid);
    } catch (error) {
      setStatus({ type: "error", message: error.message || "Failed to fetch graph" });
    }
  }

  async function loadStudioState() {
    setLoading(true);
    setStatus({ type: "neutral", message: "Loading threads and state history..." });

    try {
      const response = await fetch("/init");
      if (!response.ok) {
        throw new Error(`/init failed (${response.status})`);
      }

      const payload = await response.json();
      const normalizedThreads = (Array.isArray(payload.threads) ? payload.threads : [])
        .map(normalizeThread)
        .filter(Boolean);

      setThreads(normalizedThreads);

      if (normalizedThreads.length > 0) {
        const preferred = normalizedThreads.some((thread) => thread.threadId === selectedThreadId)
          ? selectedThreadId
          : normalizedThreads[0].threadId;

        setSelectedThreadId(preferred);
        setSelectedStateIndex(0);

        setStatus({
          type: "success",
          message: `Loaded ${normalizedThreads.length} thread(s) from studio checkpoint history.`
        });
      } else {
        setSelectedThreadId("");
        setStatus({ type: "neutral", message: "No persisted threads found." });
      }
    } catch (error) {
      setStatus({ type: "error", message: error.message || "Failed to load studio state" });
    } finally {
      setLoading(false);
    }
  }

  async function hydrateFromSelectedThread() {
    if (!selectedThreadId) {
      setStatus({ type: "error", message: "Select a thread before loading execution context." });
      return;
    }

    setStatus({ type: "neutral", message: `Loading execution context for ${selectedThreadId}...` });

    try {
      const response = await fetch(
        `/api/langgraph/execution-context?threadId=${encodeURIComponent(selectedThreadId)}`
      );
      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data?.error || `Context fetch failed (${response.status})`);
      }

      applyContextToForms(data);

      setStatus({
        type: "success",
        message: `Context loaded for ${selectedThreadId}. Resume and rerun forms are pre-filled.`
      });
    } catch (error) {
      // Fallback: derive context from selected execution history and selected payload.
      const fromExecution = extractContextFromSnapshots(selectedExecution?.snapshots);
      const fromSelected = extractContextFromPayload(selectedState?.payload, selectedState?.node);
      const fallbackContext = mergeContext(fromExecution, fromSelected);

      if (fallbackContext) {
        applyContextToForms(fallbackContext);

        const hasCore = Boolean(fallbackContext.campaignId) && Boolean(fallbackContext.domainName);
        const missing = [];
        if (!fallbackContext.campaignId) {
          missing.push("campaignId");
        }
        if (!fallbackContext.domainName) {
          missing.push("domainName");
        }
        if (!fallbackContext.parentCampaignIdForRerun) {
          missing.push("parentCampaignId");
        }

        setStatus({
          type: hasCore ? "success" : "neutral",
          message: hasCore
            ? "Context loaded from checkpoint state history."
            : `Context partially loaded from state history (missing: ${missing.join(", ")}).`
        });
        return;
      }

      setStatus({
        type: "error",
        message:
          (error.message || "Failed to load execution context") +
          ". Common causes: backend not restarted, thread has no domain_graph_execution row, or placeholder thread selected."
      });
    }
  }

  async function submitResume() {
    if (!resumeForm.campaignId || !resumeForm.domainName) {
      setStatus({ type: "error", message: "Resume requires campaignId and domainName." });
      return;
    }

    let webhookData = null;
    if (resumeForm.webhookData.trim()) {
      try {
        webhookData = JSON.parse(resumeForm.webhookData);
      } catch {
        setStatus({ type: "error", message: "Webhook JSON is invalid." });
        return;
      }
    }

    const payload = {
      campaignId: Number(resumeForm.campaignId),
      domainName: resumeForm.domainName.trim().toLowerCase(),
      startNode: resumeForm.startNode,
      strategyMode: resumeForm.strategyMode,
      testMode: resumeForm.testMode
    };

    const requestedById = toRequestedById(resumeForm.requestedBy);
    if (requestedById !== null) {
      payload.requestedBy = requestedById;
    }
    if (webhookData) {
      payload.webhookData = webhookData;
    }

    setStatus({ type: "neutral", message: "Sending resume request..." });

    try {
      const response = await fetch("/api/langgraph/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok || data.success === false) {
        throw new Error(data.error || `Resume failed (${response.status})`);
      }

      setStatus({
        type: "success",
        message: `Resume started. executionId=${data.executionId}, campaignId=${data.campaignId}, domainId=${data.domainId}`
      });

      await loadStudioState();
    } catch (error) {
      setStatus({ type: "error", message: error.message || "Resume failed" });
    }
  }

  async function submitRerun() {
    if (!rerunForm.parentCampaignId || !rerunForm.domainName) {
      setStatus({ type: "error", message: "Rerun requires parentCampaignId and domainName." });
      return;
    }

    const payload = {
      parentCampaignId: Number(rerunForm.parentCampaignId),
      domainName: rerunForm.domainName.trim().toLowerCase(),
      startNode: rerunForm.startNode,
      strategyMode: rerunForm.strategyMode,
      testMode: rerunForm.testMode,
      rerunReason: rerunForm.rerunReason?.trim() || "manual rerun"
    };

    const requestedById = toRequestedById(rerunForm.requestedBy);
    if (requestedById !== null) {
      payload.requestedBy = requestedById;
    }

    setStatus({ type: "neutral", message: "Sending rerun request..." });

    try {
      const response = await fetch("/api/langgraph/rerun", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok || data.success === false) {
        throw new Error(data.error || `Rerun failed (${response.status})`);
      }

      setStatus({
        type: "success",
        message: `Rerun started. executionId=${data.executionId}, newCampaignId=${data.campaignId}`
      });

      await loadStudioState();
    } catch (error) {
      setStatus({ type: "error", message: error.message || "Rerun failed" });
    }
  }

  useEffect(() => {
    loadStudioState();
    fetchGraphMermaid();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function renderGraph() {
      const mermaidSource = cleanMermaidSource(graphMermaid);
      if (!mermaidSource) {
        setGraphSvg("");
        setGraphRenderError("");
        return;
      }

      try {
        const mermaid = await loadMermaidLibrary();
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "loose",
          theme: "base",
          themeVariables: {
            primaryColor: "#e7f4fb",
            primaryBorderColor: "#3b7fa8",
            primaryTextColor: "#12334a",
            lineColor: "#2f6f93",
            tertiaryColor: "#edf9f6"
          }
        });

        const renderId = `domain_graph_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
        const output = await mermaid.render(renderId, mermaidSource);
        if (!cancelled) {
          setGraphSvg(output.svg);
          setGraphRenderError("");
        }
      } catch (error) {
        if (!cancelled) {
          setGraphSvg("");
          setGraphRenderError(error.message || "Graph rendering failed");
        }
      }
    }

    renderGraph();

    return () => {
      cancelled = true;
    };
  }, [graphMermaid]);

  useEffect(() => {
    setSelectedStateSectionKey("__overview");
  }, [selectedState?.key]);

  useEffect(() => {
    if (!controlsOpen && !rawSnapshotOverlayOpen) {
      return undefined;
    }

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        if (rawSnapshotOverlayOpen) {
          setRawSnapshotOverlayOpen(false);
          return;
        }
        setControlsOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [controlsOpen, rawSnapshotOverlayOpen]);

  useEffect(() => {
    if (!controlsOpen && !rawSnapshotOverlayOpen) {
      document.body.style.overflow = "";
      return undefined;
    }

    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [controlsOpen, rawSnapshotOverlayOpen]);

  return (
    <div className="shell">
      <header className="topbar">
        <div className="hero-copy">
          <div className="hero-kicker-row">
            <span className="hero-kicker">LangGraph Runtime</span>
            <span className="hero-sep" />
            <span className="hero-kicker subtle">Observability + Control</span>
          </div>

          <h1>AI Worker Studio</h1>
          <p>Operational dashboard for thread history, state inspection, and execution control.</p>

          <div className="metric-row">
            <span className="metric-pill">Threads {threads.length}</span>
            <span className="metric-pill">Executions {totalExecutions}</span>
            <span className="metric-pill">States {totalStates}</span>
            <span className="metric-pill soft">
              Selected {selectedThreadId ? selectedThreadId : "none"}
            </span>
          </div>
        </div>

        <div className="toolbar-card">
          <div className="toolbar">
            <button className="primary topbar-btn" onClick={loadStudioState} disabled={loading}>
              Refresh Data
            </button>
            <button className="ghost topbar-btn" onClick={fetchGraphMermaid}>Refresh Graph</button>
            <button className="ghost topbar-btn" onClick={() => setControlsOpen(true)}>Execution Controls</button>
          </div>
          <p className="toolbar-note">Live data from <code>/init</code> and <code>/api/langgraph/*</code></p>
        </div>
      </header>

      <main className="workspace">
        <section className="panel thread-panel panel-sky">
          <div className="panel-head">
            <h2>Threads</h2>
            <input
              value={threadFilter}
              onChange={(e) => setThreadFilter(e.target.value)}
              placeholder="Search campaign ID or domain"
            />
          </div>

          <div className="thread-tools">
            <label>
              Sort
              <select
                value={threadSort}
                onChange={(e) => setThreadSort(e.target.value)}
              >
                <option value="states_desc">Most states</option>
                <option value="id_asc">Thread ID A-Z</option>
              </select>
            </label>
            <span className="thread-count-chip">{filteredThreads.length} shown</span>
          </div>

          {selectedThread && (
            <div className="thread-selected-summary">
              <div>
                <p className="thread-selected-title">Selected Thread</p>
                <p className="thread-selected-id">{selectedThread.threadId}</p>
              </div>
              <div className="thread-selected-stats">
                <span>{selectedThread.snapshotCount} states</span>
                <span className="campaign-text">campaign {selectedThread.campaignId ?? "unknown"}</span>
                <span className="domain-text">domain {selectedThread.domainName ?? "unknown"}</span>
                <span>{selectedThread.latestSnapshot?.node ?? "unknown"}</span>
                <span>{selectedThread.threadType}</span>
              </div>
            </div>
          )}

          <div className="thread-list">
            {nestedThreads.map(({ thread, depth }, index) => (
              <div
                key={thread.threadId}
                className={`thread-item ${thread.threadId === selectedThreadId ? "active" : ""}`}
                style={{ animationDelay: `${Math.min(index * 30, 360)}ms` }}
                data-depth={depth}
                role="button"
                tabIndex={0}
                onClick={() => {
                  setSelectedThreadId(thread.threadId);
                  setSelectedStateIndex(0);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelectedThreadId(thread.threadId);
                    setSelectedStateIndex(0);
                  }
                }}
              >
                <div className="thread-item-top">
                  <strong title={thread.threadId}>{shortenId(thread.threadId, 10)}</strong>
                  <span className={`thread-type-badge ${thread.threadType === "RERUN" ? "rerun" : "normal"}`}>
                    {thread.threadType}
                  </span>
                </div>
                <span>{thread.snapshotCount} state(s)</span>
                <span className="campaign-text">Campaign: {thread.campaignId ?? "unknown"}</span>
                <span className="domain-text">Domain: {thread.domainName ?? "unknown"}</span>
                <button
                  type="button"
                  className="thread-copy-btn"
                  onClick={(event) => {
                    event.stopPropagation();
                    navigator.clipboard?.writeText(thread.threadId);
                    setStatus({ type: "success", message: `Copied thread ID: ${thread.threadId}` });
                  }}
                >
                  Copy ID
                </button>
              </div>
            ))}
            {nestedThreads.length === 0 && <p className="empty">No threads found</p>}
          </div>
        </section>

        <section className="panel states-panel panel-slate">
          <div className="panel-head">
            <h2>State Timeline</h2>
          </div>

          <div className="timeline-summary">
            <span className="timeline-chip">States: {executionSnapshots.length}</span>
            <span className="timeline-chip">Nodes: {selectedExecutionUniqueNodeCount}</span>
            <span className="timeline-chip">
              Position: {selectedStatePosition || 0}/{executionSnapshots.length || 0}
            </span>
            <div className="timeline-progress-track" aria-hidden>
              <div
                className="timeline-progress-fill"
                style={{
                  width:
                    executionSnapshots.length > 0
                      ? `${Math.round((selectedStatePosition / executionSnapshots.length) * 100)}%`
                      : "0%"
                }}
              />
            </div>
          </div>

          <div className="timeline-grid">
            <aside className="state-list">
              <div className="state-list-head">
                <strong>Execution States</strong>
                <span>{executionSnapshots.length} total</span>
              </div>

              {executionSnapshots.map((snapshot, index) => (
                <button
                  key={snapshot.key}
                  className={`state-item ${selectedState?.key === snapshot.key ? "active" : ""}`}
                  onClick={() => setSelectedStateIndex(snapshot.index)}
                >
                  <span className="node">{snapshot.node}</span>
                  <span className="state-item-meta">
                    <span className="state-step">Step {index + 1}</span>
                    <span className={`state-phase ${snapshot.isResumePhase ? "resume" : "base"}`}>
                      {snapshot.isResumePhase ? `RESUME P${snapshot.phase}` : `BASE P${snapshot.phase}`}
                    </span>
                    <span className="state-cp">{shortenId(snapshot.checkpoint || "no-checkpoint", 6)}</span>
                  </span>
                  <span className="checkpoint">{snapshot.checkpoint || "no-checkpoint"}</span>
                </button>
              ))}

              {!selectedExecution && <p className="empty">Select a thread to inspect state</p>}
            </aside>

            <article className="state-viewer">
              <div className="state-viewer-head">
                <h3>{selectedState?.node || "State Payload"}</h3>
                <span>Checkpoint: {selectedState?.checkpoint || "none"}</span>
              </div>

              {selectedState ? (
                <>
                  <div className="state-section-toolbar">
                    <label>State Section</label>
                    <select
                      value={selectedStateSectionKey}
                      onChange={(e) => setSelectedStateSectionKey(e.target.value)}
                    >
                      {stateSections.map((section) => (
                        <option key={section.key} value={section.key}>
                          {section.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedStateSectionKey === "__overview" ? (
                    <div className="overview-grid">
                      {stateOverview.map((entry) => (
                        <div className="overview-card" key={entry.key}>
                          <div className="overview-key">{entry.key}</div>
                          <div className="overview-type">{entry.type}</div>
                          <div className="overview-value">{entry.summary}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <ParsedValue value={selectedSectionValue} />
                  )}

                  <div className="raw-json-actions">
                    <button
                      type="button"
                      className="ghost raw-json-btn"
                      onClick={() => setRawSnapshotOverlayOpen(true)}
                    >
                      View Raw Snapshot JSON
                    </button>
                  </div>
                </>
              ) : (
                <p className="empty">No state selected</p>
              )}
            </article>
          </div>
        </section>

      </main>

      {!controlsOpen && (
        <button
          className="floating-controls-btn"
          onClick={() => setControlsOpen(true)}
        >
          Open Execution Controls
        </button>
      )}

      {controlsOpen && (
        <div
          className="controls-overlay"
          onClick={() => setControlsOpen(false)}
        >
          <section
            className="panel actions-panel panel-sand controls-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="panel-head">
              <div className="controls-title-wrap">
                <h2>Execution Controls</h2>
                <p className="controls-subtitle">Resume paused runs or launch reruns with validated runtime parameters.</p>
              </div>
              <div className="controls-head-actions">
                <button className="ghost controls-ghost" onClick={hydrateFromSelectedThread}>Load Selected Thread Context</button>
                <button className="ghost close-btn controls-ghost" onClick={() => setControlsOpen(false)}>Close</button>
              </div>
            </div>

            <div className="form-grid">
              <div className="card resume-card">
                <div className="card-head">
                  <h3>Resume</h3>
                  <span className="mode-badge">Continue Existing Flow</span>
                </div>
                <div className="field-grid">
                  <div className="field">
                    <label>Campaign ID</label>
                    <input
                      value={resumeForm.campaignId}
                      onChange={(e) => setResumeForm((prev) => ({ ...prev, campaignId: e.target.value }))}
                    />
                  </div>

                  <div className="field">
                    <label>Domain Name</label>
                    <input
                      value={resumeForm.domainName}
                      onChange={(e) => setResumeForm((prev) => ({ ...prev, domainName: e.target.value }))}
                    />
                  </div>

                  <div className="field">
                    <label>Start Node</label>
                    <select
                      value={resumeForm.startNode}
                      onChange={(e) => setResumeForm((prev) => ({ ...prev, startNode: e.target.value }))}
                    >
                      {startNodes.map((node) => (
                        <option value={node} key={node}>{node}</option>
                      ))}
                    </select>
                  </div>

                  <div className="field">
                    <label>Strategy Mode</label>
                    <select
                      value={resumeForm.strategyMode}
                      onChange={(e) => setResumeForm((prev) => ({ ...prev, strategyMode: e.target.value }))}
                    >
                      {DEFAULT_STRATEGIES.map((mode) => (
                        <option value={mode} key={mode}>{mode}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="field">
                  <label>Requested By</label>
                  <input
                    value={resumeForm.requestedBy}
                    onChange={(e) => setResumeForm((prev) => ({ ...prev, requestedBy: e.target.value }))}
                  />
                </div>

                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={resumeForm.testMode}
                    onChange={(e) => setResumeForm((prev) => ({ ...prev, testMode: e.target.checked }))}
                  />
                  Test Mode
                </label>

                <div className="field">
                  <label>Webhook JSON (optional)</label>
                  <textarea
                    value={resumeForm.webhookData}
                    onChange={(e) => setResumeForm((prev) => ({ ...prev, webhookData: e.target.value }))}
                    placeholder='{"domain":"example.com","campaignId":123,"leads":[]}'
                  />
                </div>

                <div className="card-actions">
                  <button className="controls-submit resume-submit" onClick={submitResume}>Resume</button>
                </div>
              </div>

              <div className="card rerun-card">
                <div className="card-head">
                  <h3>Rerun</h3>
                  <span className="mode-badge">Create New Attempt</span>
                </div>
                <div className="field-grid">
                  <div className="field">
                    <label>Parent Campaign ID</label>
                    <input
                      value={rerunForm.parentCampaignId}
                      onChange={(e) => setRerunForm((prev) => ({ ...prev, parentCampaignId: e.target.value }))}
                    />
                  </div>

                  <div className="field">
                    <label>Domain Name</label>
                    <input
                      value={rerunForm.domainName}
                      onChange={(e) => setRerunForm((prev) => ({ ...prev, domainName: e.target.value }))}
                    />
                  </div>

                  <div className="field">
                    <label>Start Node</label>
                    <select
                      value={rerunForm.startNode}
                      onChange={(e) => setRerunForm((prev) => ({ ...prev, startNode: e.target.value }))}
                    >
                      {startNodes.map((node) => (
                        <option value={node} key={node}>{node}</option>
                      ))}
                    </select>
                  </div>

                  <div className="field">
                    <label>Strategy Mode</label>
                    <select
                      value={rerunForm.strategyMode}
                      onChange={(e) => setRerunForm((prev) => ({ ...prev, strategyMode: e.target.value }))}
                    >
                      {DEFAULT_STRATEGIES.map((mode) => (
                        <option value={mode} key={mode}>{mode}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="field">
                  <label>Requested By</label>
                  <input
                    value={rerunForm.requestedBy}
                    onChange={(e) => setRerunForm((prev) => ({ ...prev, requestedBy: e.target.value }))}
                  />
                </div>

                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={rerunForm.testMode}
                    onChange={(e) => setRerunForm((prev) => ({ ...prev, testMode: e.target.checked }))}
                  />
                  Test Mode
                </label>

                <div className="field">
                  <label>Rerun Reason</label>
                  <input
                    value={rerunForm.rerunReason}
                    onChange={(e) => setRerunForm((prev) => ({ ...prev, rerunReason: e.target.value }))}
                  />
                </div>

                <div className="card-actions">
                  <button className="teal controls-submit rerun-submit" onClick={submitRerun}>Rerun</button>
                </div>
              </div>
            </div>

            <div className={`status ${status.type}`}>
              <strong>Status</strong>
              <p>{status.message}</p>
            </div>

            <details className="graph-view">
              <summary>Domain Graph (Mermaid)</summary>

              <div className="graph-canvas-wrap">
                {graphSvg ? (
                  <div
                    className="graph-canvas"
                    dangerouslySetInnerHTML={{ __html: graphSvg }}
                  />
                ) : (
                  <p className="empty">Graph preview unavailable.</p>
                )}
              </div>

              {graphRenderError && (
                <p className="graph-error">
                  {graphRenderError}. Raw source is still available below.
                </p>
              )}

              <details className="raw-json-toggle">
                <summary>Mermaid Source</summary>
                <pre className="raw-json">{graphMermaid || "No graph payload loaded."}</pre>
              </details>
            </details>
          </section>
        </div>
      )}

      {rawSnapshotOverlayOpen && (
        <div
          className="json-overlay"
          onClick={() => setRawSnapshotOverlayOpen(false)}
        >
          <section
            className="panel json-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="panel-head">
              <div className="json-head-content">
                <h2>Raw Snapshot JSON</h2>
                <div className="json-head-meta">
                  <span className="json-meta-chip">Node: {selectedState?.node ?? "unknown"}</span>
                  <span className="json-meta-chip">
                    Checkpoint: {shortenId(selectedState?.checkpoint || "none", 8)}
                  </span>
                </div>
              </div>
              <div className="json-head-actions">
                <button
                  type="button"
                  className="ghost raw-json-copy-btn"
                  onClick={() => {
                    const text = selectedState ? safeJson(selectedState.raw) : "";
                    if (!text) {
                      return;
                    }
                    navigator.clipboard?.writeText(text);
                    setStatus({ type: "success", message: "Raw snapshot JSON copied." });
                  }}
                >
                  Copy JSON
                </button>
                <button
                  type="button"
                  className="ghost close-btn"
                  onClick={() => setRawSnapshotOverlayOpen(false)}
                >
                  Close
                </button>
              </div>
            </div>
            <pre className="raw-json raw-json-full">
              {selectedState ? safeJson(selectedState.raw) : "No snapshot selected."}
            </pre>
          </section>
        </div>
      )}
    </div>
  );
}
