export const DEFAULT_NODES = [
  "send_to_aibrain",
  "wait_for_webhook",
  "save_leads",
  "apollo_enrich_contacts",
  "add_static_emails",
  "schedule_mailing"
];

export const DEFAULT_STRATEGIES = ["TABLE_POLICY", "APPEND", "REPLACE", "UPSERT"];
const MERMAID_LOADER_KEY = "__langsmithStudioMermaidLoader__";

export function safeJson(value) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function cleanMermaidSource(source) {
  const raw = typeof source === "string" ? source.trim() : "";
  if (!raw) {
    return "";
  }

  const fenced = raw.match(/```(?:mermaid)?\s*([\s\S]*?)```/i);
  return fenced ? fenced[1].trim() : raw;
}

export function shortenId(value, keep = 8) {
  if (!value || value.length <= keep * 2 + 3) {
    return value || "";
  }
  return `${value.slice(0, keep)}...${value.slice(-keep)}`;
}

export async function loadMermaidLibrary() {
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

export function getValueType(value) {
  if (value === null) {
    return "null";
  }
  if (Array.isArray(value)) {
    return "array";
  }
  return typeof value;
}

export function isPrimitive(value) {
  const type = getValueType(value);
  return type === "string" || type === "number" || type === "boolean" || type === "null";
}

export function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function summarizeValue(value) {
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

export function getStateSections(payload) {
  if (isPlainObject(payload)) {
    return [{ key: "__overview", label: "Overview" }].concat(
      Object.keys(payload).map((key) => ({ key, label: key }))
    );
  }
  return [{ key: "__overview", label: "Overview" }];
}

export function getSectionValue(payload, sectionKey) {
  if (sectionKey === "__overview") {
    return payload;
  }
  if (isPlainObject(payload)) {
    return payload[sectionKey];
  }
  return payload;
}

export function collectColumnsFromRows(rows, maxColumns = 8) {
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

export function normalizeSnapshot(raw, index) {
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

export function normalizeExecution(rawExecution, executionIndex) {
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
      index: idx,
      key: snapshot.checkpoint ? `${snapshot.checkpoint}_${idx}` : `${snapshot.node}_${idx}`,
      phase,
      isResumePhase: phase > 1 || hasResumeMarker
    };
  });

  const executionDbId = firstDefined(
    ...snapshots.map((snapshot) =>
      firstDefined(
        snapshot?.payload?.execution_id,
        snapshot?.payload?.executionId,
        snapshot?.payload?.domain_graph_execution_id
      )
    )
  );

  return {
    executionIndex,
    id: `execution_${executionIndex + 1}`,
    executionDbId: Number.isFinite(Number(executionDbId)) ? Number(executionDbId) : null,
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

export function normalizeThread(entry) {
  if (!Array.isArray(entry) || entry.length < 1) {
    return null;
  }

  const threadId = entry[0];
  const rawExecutions = Array.isArray(entry[1]) ? entry[1] : [];
  const threadMeta = normalizeThreadMeta(entry[2]);
  const domainGraphExecutionFallback = normalizeDomainGraphExecution(
    firstDefined(threadMeta.domainGraphExecution, threadMeta.domain_graph_execution)
  );
  const domainGraphNodeExecutionsFallback = normalizeDomainGraphNodeExecutions(
    firstDefined(
      threadMeta.domainGraphNodeExecutions,
      threadMeta.domain_graph_node_executions,
      threadMeta.domainGraphNodeExecution,
      threadMeta.domain_graph_node_execution
    )
  );
  const domainGraphExecutions = normalizeDomainGraphExecutions(
    firstDefined(threadMeta.domainGraphExecutions, threadMeta.domain_graph_executions),
    domainGraphExecutionFallback
  );
  const domainGraphExecution = domainGraphExecutions[0] ?? domainGraphExecutionFallback;
  const domainGraphNodeExecutionsByExecutionId = normalizeDomainGraphNodeExecutionsByExecutionId(
    firstDefined(
      threadMeta.domainGraphNodeExecutionsByExecutionId,
      threadMeta.domain_graph_node_executions_by_execution_id
    ),
    domainGraphExecutions,
    domainGraphNodeExecutionsFallback
  );
  const latestExecutionIdKey = toExecutionIdKey(domainGraphExecution?.id);
  const domainGraphNodeExecutions =
    (latestExecutionIdKey && domainGraphNodeExecutionsByExecutionId[latestExecutionIdKey]) ||
    domainGraphNodeExecutionsFallback;
  const executions = rawExecutions.map((execution, idx) => normalizeExecution(execution, idx));
  const snapshotsFlat = executions.flatMap((execution) => execution.snapshots);
  const lineage = extractThreadLineageFromSnapshots(snapshotsFlat);
  const domainName = extractThreadDomainFromSnapshots(snapshotsFlat);

  if (threadId === "default" && executions.length === 0) {
    return null;
  }

  const allSnapshots = executions.flatMap((execution) => execution.snapshots);
  const latestSnapshotByTime = allSnapshots
    .filter((snapshot) => typeof snapshot.savedAtMs === "number")
    .sort((a, b) => b.savedAtMs - a.savedAtMs)[0];
  const fallbackLatestSnapshot =
    executions[0]?.snapshots?.[executions[0].snapshots.length - 1] ?? null;
  const latestSnapshot = latestSnapshotByTime ?? fallbackLatestSnapshot;
  const latestSavedAtMs = toMillis(firstDefined(threadMeta.latestSavedAtMs, latestSnapshot?.savedAtMs));
  const lastActivityAtMs = toMillis(
    firstDefined(
      domainGraphExecution.updatedAtMs,
      domainGraphExecution.endedAtMs,
      domainGraphExecution.startedAtMs,
      latestSavedAtMs
    )
  );
  const snapshotCount = executions.reduce((sum, ex) => sum + ex.snapshots.length, 0);
  const nodeExecutionCountAll = Object.values(domainGraphNodeExecutionsByExecutionId).reduce(
    (sum, entries) => sum + entries.length,
    0
  );
  const fallbackNodeExecutionCount = domainGraphNodeExecutions.length;
  const stateCount =
    nodeExecutionCountAll > 0
      ? nodeExecutionCountAll
      : fallbackNodeExecutionCount > 0
        ? fallbackNodeExecutionCount
        : snapshotCount;

  return {
    threadId,
    executions,
    campaignId: lineage.campaignId,
    domainName,
    parentCampaignId: lineage.parentCampaignId,
    runKind: lineage.runKind,
    threadType: lineage.threadType,
    schemaVersion: firstDefined(threadMeta.schemaVersion, threadMeta.schema_version, 1),
    runStatus: domainGraphExecution.status ?? null,
    domainGraphExecutions,
    domainGraphExecution,
    domainGraphNodeExecutionsByExecutionId,
    domainGraphNodeExecutions,
    latestSnapshot,
    latestSavedAtMs,
    lastActivityAtMs,
    snapshotCount,
    stateCount
  };
}

function normalizeThreadMeta(value) {
  if (isPlainObject(value)) {
    return value;
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return isPlainObject(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

function normalizeDomainGraphExecution(value) {
  if (!isPlainObject(value)) {
    return {};
  }

  const statusRaw = firstDefined(value.status, value.runStatus, value.run_status);
  const modeRaw = firstDefined(value.mode, value.runMode, value.run_mode);
  const strategyModeRaw = firstDefined(value.strategyMode, value.strategy_mode);

  return {
    ...value,
    status: typeof statusRaw === "string" ? statusRaw.trim().toUpperCase() : undefined,
    mode: typeof modeRaw === "string" ? modeRaw.trim().toUpperCase() : undefined,
    strategyMode:
      typeof strategyModeRaw === "string" ? strategyModeRaw.trim().toUpperCase() : undefined,
    startNode: firstDefined(value.startNode, value.start_node),
    currentNode: firstDefined(value.currentNode, value.current_node),
    lastSuccessNode: firstDefined(value.lastSuccessNode, value.last_success_node),
    lastFailedNode: firstDefined(value.lastFailedNode, value.last_failed_node),
    errorMessage: firstDefined(value.errorMessage, value.error_message),
    lgThreadId: firstDefined(value.lgThreadId, value.lg_thread_id),
    startedAtMs: toMillis(firstDefined(value.startedAtMs, value.started_at_ms, value.started_at)),
    endedAtMs: toMillis(firstDefined(value.endedAtMs, value.ended_at_ms, value.ended_at)),
    createdAtMs: toMillis(firstDefined(value.createdAtMs, value.created_at_ms, value.created_at)),
    updatedAtMs: toMillis(firstDefined(value.updatedAtMs, value.updated_at_ms, value.updated_at))
  };
}

function normalizeDomainGraphNodeExecutions(value) {
  const rawEntries = Array.isArray(value)
    ? value
    : isPlainObject(value)
      ? Array.isArray(value.items)
        ? value.items
        : Array.isArray(value.rows)
          ? value.rows
          : [value]
      : [];

  return rawEntries
    .filter((entry) => isPlainObject(entry))
    .map((entry, idx) => {
      const statusRaw = firstDefined(entry.status, entry.nodeStatus, entry.node_status);
      const writeStrategyRaw = firstDefined(entry.writeStrategy, entry.write_strategy);
      const nodeName = firstDefined(entry.nodeName, entry.node, entry.name, `node_${idx + 1}`);
      const attemptNoRaw = firstDefined(entry.attemptNo, entry.attempt_no, 1);
      const rowsWrittenRaw = firstDefined(entry.rowsWritten, entry.rows_written);
      const executionIdRaw = firstDefined(entry.executionId, entry.execution_id);

      return {
        ...entry,
        executionId: Number.isFinite(Number(executionIdRaw)) ? Number(executionIdRaw) : null,
        lgThreadId: firstDefined(entry.lgThreadId, entry.lg_thread_id),
        nodeName: String(nodeName),
        status: typeof statusRaw === "string" ? statusRaw.trim().toUpperCase() : "UNKNOWN",
        writeStrategy:
          typeof writeStrategyRaw === "string" ? writeStrategyRaw.trim().toUpperCase() : undefined,
        attemptNo: Number.isFinite(Number(attemptNoRaw)) ? Number(attemptNoRaw) : 1,
        rowsWritten: Number.isFinite(Number(rowsWrittenRaw)) ? Number(rowsWrittenRaw) : null,
        errorMessage: firstDefined(entry.errorMessage, entry.error_message),
        startedAtMs: toMillis(firstDefined(entry.startedAtMs, entry.started_at_ms, entry.started_at)),
        endedAtMs: toMillis(firstDefined(entry.endedAtMs, entry.ended_at_ms, entry.ended_at)),
        createdAtMs: toMillis(firstDefined(entry.createdAtMs, entry.created_at_ms, entry.created_at)),
        updatedAtMs: toMillis(firstDefined(entry.updatedAtMs, entry.updated_at_ms, entry.updated_at))
      };
    })
    .sort((a, b) => {
      const aTime = firstDefined(a.startedAtMs, a.createdAtMs, a.id, 0);
      const bTime = firstDefined(b.startedAtMs, b.createdAtMs, b.id, 0);
      return Number(aTime) - Number(bTime);
    });
}

function normalizeDomainGraphExecutions(value, fallbackSingleExecution) {
  const rawItems = Array.isArray(value)
    ? value
    : isPlainObject(value)
      ? Array.isArray(value.items)
        ? value.items
        : [value]
      : [];

  const normalized = rawItems
    .filter((item) => isPlainObject(item))
    .map((item) => normalizeDomainGraphExecution(item))
    .filter((item) => isPlainObject(item) && Object.keys(item).length > 0);

  if (normalized.length > 0) {
    return normalized.sort((a, b) => {
      const aTime = firstDefined(a.updatedAtMs, a.startedAtMs, a.createdAtMs, a.id, 0);
      const bTime = firstDefined(b.updatedAtMs, b.startedAtMs, b.createdAtMs, b.id, 0);
      return Number(bTime) - Number(aTime);
    });
  }

  if (isPlainObject(fallbackSingleExecution) && Object.keys(fallbackSingleExecution).length > 0) {
    return [fallbackSingleExecution];
  }

  return [];
}

function normalizeDomainGraphNodeExecutionsByExecutionId(value, executions, fallbackNodes) {
  const out = {};

  if (isPlainObject(value)) {
    for (const [executionId, rawEntries] of Object.entries(value)) {
      const key = toExecutionIdKey(executionId);
      if (!key) {
        continue;
      }
      out[key] = normalizeDomainGraphNodeExecutions(rawEntries);
    }
  }

  if (Object.keys(out).length > 0) {
    return out;
  }

  const fallbackExecutionId = toExecutionIdKey(executions?.[0]?.id);
  if (fallbackExecutionId) {
    out[fallbackExecutionId] = normalizeDomainGraphNodeExecutions(fallbackNodes);
  }
  return out;
}

function toExecutionIdKey(value) {
  if (value === null || value === undefined) {
    return null;
  }
  const normalized = Number(value);
  if (Number.isFinite(normalized)) {
    return String(normalized);
  }
  if (typeof value === "string" && value.trim() !== "") {
    return value.trim();
  }
  return null;
}

export function firstDefined(...values) {
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

export function toMillis(value) {
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

export function compareThreadsBySort(a, b, threadSort) {
  if (threadSort === "time_desc") {
    const diff = (b.campaignId ?? 0) - (a.campaignId ?? 0);
    return diff !== 0 ? diff : a.threadId.localeCompare(b.threadId);
  }
  return a.threadId.localeCompare(b.threadId);
}

export function toRequestedById(value) {
  const raw = typeof value === "string" ? value.trim() : value;
  if (raw === null || raw === undefined || raw === "") {
    return null;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export function extractDomainNameCandidate(value) {
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

export function extractContextFromPayload(payload, selectedNode) {
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

  const strategyMode = firstDefined(payload.strategyMode, payload.strategy_mode, payload.strategy);

  const requestedBy = firstDefined(payload.requestedBy, payload.requested_by);

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

export function mergeContext(base, next) {
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

export function extractContextFromSnapshots(snapshots) {
  if (!Array.isArray(snapshots) || snapshots.length === 0) {
    return null;
  }

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
