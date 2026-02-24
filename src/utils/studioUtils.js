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

export function normalizeThread(entry) {
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
  if (threadSort === "id_asc") {
    return a.threadId.localeCompare(b.threadId);
  }
  const diff = b.snapshotCount - a.snapshotCount;
  return diff !== 0 ? diff : a.threadId.localeCompare(b.threadId);
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
