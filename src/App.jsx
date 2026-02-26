import { useEffect, useMemo, useState } from "react";
import ExecutionControlsModal from "./components/ExecutionControlsModal";
import LoadingOverlay from "./components/LoadingOverlay";
import RawSnapshotModal from "./components/RawSnapshotModal";
import StateTimelinePanel from "./components/StateTimelinePanel";
import ThreadPanel from "./components/ThreadPanel";
import TopBar from "./components/TopBar";
import robotPng from "./assets/robot.png";
import { studioApi } from "./api/studioApi";
import {
  cleanMermaidSource,
  compareThreadsBySort,
  DEFAULT_NODES,
  extractContextFromPayload,
  extractContextFromSnapshots,
  firstDefined,
  getSectionValue,
  getStateSections,
  getValueType,
  isPlainObject,
  loadMermaidLibrary,
  mergeContext,
  normalizeThread,
  summarizeValue,
  toRequestedById,
  safeJson
} from "./utils/studioUtils";

export default function App() {
  const [threads, setThreads] = useState([]);
  const [graphMermaid, setGraphMermaid] = useState("");
  const [graphSvg, setGraphSvg] = useState("");
  const [graphRenderError, setGraphRenderError] = useState("");
  const [loading, setLoading] = useState(false);
  const [threadFilter, setThreadFilter] = useState("");
  const [threadSort, setThreadSort] = useState("time_desc");

  const [selectedThreadId, setSelectedThreadId] = useState("");
  const [selectedStateIndex, setSelectedStateIndex] = useState(0);
  const [selectedStateSectionKey, setSelectedStateSectionKey] = useState("__overview");
  const [selectedGraphExecutionId, setSelectedGraphExecutionId] = useState("");

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
    () => threads.reduce((sum, thread) => sum + (thread.stateCount ?? thread.snapshotCount ?? 0), 0),
    [threads]
  );

  const graphExecutionsForSelectedThread = useMemo(() => {
    if (!selectedThread) {
      return [];
    }
    const byId = new Map();

    const addExecution = (execution) => {
      const id = execution?.id;
      if (id === null || id === undefined || id === "") {
        return;
      }
      const key = String(id);
      const existing = byId.get(key);
      if (!existing) {
        byId.set(key, execution);
        return;
      }
      // Prefer richer execution metadata if available later.
      const existingKeys = Object.keys(existing ?? {}).length;
      const nextKeys = Object.keys(execution ?? {}).length;
      if (nextKeys > existingKeys) {
        byId.set(key, execution);
      }
    };

    const explicitExecutions = Array.isArray(selectedThread.domainGraphExecutions)
      ? selectedThread.domainGraphExecutions
      : [];
    explicitExecutions.forEach(addExecution);

    if (selectedThread.domainGraphExecution && Object.keys(selectedThread.domainGraphExecution).length > 0) {
      addExecution(selectedThread.domainGraphExecution);
    }

    const nodesByExecutionId = selectedThread.domainGraphNodeExecutionsByExecutionId ?? {};
    for (const [executionId, entries] of Object.entries(nodesByExecutionId)) {
      if (!executionId) {
        continue;
      }
      const firstEntry = Array.isArray(entries) && entries.length > 0 ? entries[0] : null;
      addExecution({
        id: Number.isFinite(Number(executionId)) ? Number(executionId) : executionId,
        status: firstEntry?.status ?? "UNKNOWN",
        startedAtMs: firstEntry?.startedAtMs ?? null,
        endedAtMs: firstEntry?.endedAtMs ?? null
      });
    }

    const snapshotExecutionIds = selectedThread.executions
      .map((execution) => execution.executionDbId)
      .filter((id) => id !== null && id !== undefined);
    snapshotExecutionIds.forEach((id) =>
      addExecution({
        id,
        status: "UNKNOWN"
      })
    );

    return Array.from(byId.values()).sort((a, b) => {
      const aId = Number(a?.id);
      const bId = Number(b?.id);
      if (Number.isFinite(aId) && Number.isFinite(bId)) {
        return bId - aId;
      }
      return String(b?.id ?? "").localeCompare(String(a?.id ?? ""));
    });
  }, [selectedThread]);

  const selectedExecution = useMemo(() => {
    if (!selectedThread) {
      return null;
    }
    if (selectedGraphExecutionId === "__ALL__") {
      return selectedThread.executions[0] ?? null;
    }
    const selectedId = Number(selectedGraphExecutionId);
    if (Number.isFinite(selectedId)) {
      const matched = selectedThread.executions.find((execution) => execution.executionDbId === selectedId);
      if (matched) {
        return matched;
      }

      const snapshotsByExecutionId = selectedThread.executions
        .flatMap((execution) => execution.snapshots)
        .filter((snapshot) => {
          const payload = snapshot?.payload;
          const snapshotExecutionId =
            payload?.execution_id ?? payload?.executionId ?? payload?.domain_graph_execution_id ?? null;
          return Number(snapshotExecutionId) === selectedId;
        });
      if (snapshotsByExecutionId.length > 0) {
        return {
          executionIndex: -1,
          id: `execution_${selectedId}`,
          executionDbId: selectedId,
          snapshots: snapshotsByExecutionId
        };
      }

      // Fallback when snapshot payloads don't include execution ids:
      // match selected graph execution by dropdown order.
      const selectedGraphExecutionPosition = graphExecutionsForSelectedThread.findIndex(
        (execution) => Number(execution?.id) === selectedId
      );
      if (selectedGraphExecutionPosition >= 0) {
        const executionByPosition = selectedThread.executions[selectedGraphExecutionPosition] ?? null;
        if (executionByPosition) {
          return executionByPosition;
        }
      }
    }
    return selectedThread.executions[0] ?? null;
  }, [selectedThread, selectedGraphExecutionId, graphExecutionsForSelectedThread]);

  const selectedState = useMemo(() => {
    if (!selectedExecution) {
      return null;
    }
    return selectedExecution.snapshots[selectedStateIndex] ?? selectedExecution.snapshots[0] ?? null;
  }, [selectedExecution, selectedStateIndex]);

  const executionSnapshots = selectedExecution?.snapshots ?? [];

  const timelineEntries = useMemo(() => {
    const nodesByExecutionId = selectedThread?.domainGraphNodeExecutionsByExecutionId ?? {};
    const isAllExecutionsSelected = selectedGraphExecutionId === "__ALL__";
    const fallbackLatestExecutionId =
      graphExecutionsForSelectedThread[0]?.id != null ? String(graphExecutionsForSelectedThread[0].id) : "";
    const executionIdKey =
      !isAllExecutionsSelected && selectedGraphExecutionId
        ? selectedGraphExecutionId
        : fallbackLatestExecutionId;
    const hasScopedNodeExecutions =
      !isAllExecutionsSelected &&
      Boolean(executionIdKey) &&
      Array.isArray(nodesByExecutionId[executionIdKey]) &&
      nodesByExecutionId[executionIdKey].length > 0;

    const nodeExecutions = isAllExecutionsSelected
      ? Object.values(nodesByExecutionId).flatMap((entries) => (Array.isArray(entries) ? entries : []))
      : hasScopedNodeExecutions
        ? nodesByExecutionId[executionIdKey]
        : [];
    const allThreadSnapshots = selectedThread?.executions?.flatMap((execution) => execution.snapshots) ?? [];
    const snapshotsForMatching =
      isAllExecutionsSelected && allThreadSnapshots.length > 0 ? allThreadSnapshots : executionSnapshots;
    const snapshotArrayIndexByKey = new Map(
      executionSnapshots.map((snapshot, index) => [snapshot.key, index])
    );

    if (nodeExecutions.length > 0) {
      const snapshotIndexesByExecutionAndNode = new Map();
      const snapshotIndexesByNode = new Map();
      for (const snapshot of snapshotsForMatching) {
        const payload = snapshot?.payload;
        const snapshotExecutionId =
          payload?.execution_id ?? payload?.executionId ?? payload?.domain_graph_execution_id ?? null;

        const scopedKey = `${snapshotExecutionId ?? "unknown"}::${snapshot.node}`;
        const scopedList = snapshotIndexesByExecutionAndNode.get(scopedKey) ?? [];
        scopedList.push(snapshot.index);
        snapshotIndexesByExecutionAndNode.set(scopedKey, scopedList);

        const nodeList = snapshotIndexesByNode.get(snapshot.node) ?? [];
        nodeList.push(snapshot.index);
        snapshotIndexesByNode.set(snapshot.node, nodeList);
      }

      const matchedPerExecutionAndNode = new Map();
      const matchedPerNode = new Map();

      const nodeExecutionEntries = nodeExecutions.map((nodeExecution, index) => {
        const nodeName = nodeExecution.nodeName;
        const scopedKey = `${nodeExecution.executionId ?? "unknown"}::${nodeName}`;

        const scopedIndexes = snapshotIndexesByExecutionAndNode.get(scopedKey) ?? [];
        const scopedUsedCount = matchedPerExecutionAndNode.get(scopedKey) ?? 0;
        const scopedSnapshotIndex = scopedIndexes[scopedUsedCount] ?? null;
        matchedPerExecutionAndNode.set(scopedKey, scopedUsedCount + 1);

        const fallbackIndexes = snapshotIndexesByNode.get(nodeName) ?? [];
        const fallbackUsedCount = matchedPerNode.get(nodeName) ?? 0;
        const fallbackSnapshotIndex = fallbackIndexes[fallbackUsedCount] ?? null;
        matchedPerNode.set(nodeName, fallbackUsedCount + 1);

        const snapshotIndex = scopedSnapshotIndex ?? fallbackSnapshotIndex;
        const matchingSnapshot =
          typeof snapshotIndex === "number"
            ? snapshotsForMatching.find((snapshot) => snapshot.index === snapshotIndex) ?? null
            : null;
        const snapshotArrayIndex =
          !isAllExecutionsSelected && matchingSnapshot
            ? snapshotArrayIndexByKey.get(matchingSnapshot.key) ?? null
            : null;

        return {
          key: nodeExecution.id ? `node_execution_${nodeExecution.id}` : `node_execution_${index}`,
          node: nodeName,
          executionId: nodeExecution.executionId ?? null,
          startedAtMs: nodeExecution.startedAtMs ?? null,
          status: nodeExecution.status,
          attemptNo: nodeExecution.attemptNo,
          rowsWritten: nodeExecution.rowsWritten,
          errorMessage: nodeExecution.errorMessage,
          checkpoint: matchingSnapshot?.checkpoint ?? null,
          snapshotIndex: snapshotArrayIndex,
          isResumePhase: matchingSnapshot?.isResumePhase ?? null,
          phase: matchingSnapshot?.phase ?? null,
          source: "nodeExecution"
        };
      });

      return [...nodeExecutionEntries].sort((a, b) => {
        const aOrder = Number(a.startedAtMs ?? 0);
        const bOrder = Number(b.startedAtMs ?? 0);
        return aOrder - bOrder;
      });
    }

    return snapshotsForMatching.map((snapshot, index) => {
      return {
        key: snapshot.key,
        node: snapshot.node,
        status: null,
        attemptNo: null,
        rowsWritten: null,
        errorMessage: null,
        checkpoint: snapshot.checkpoint,
        snapshotIndex: isAllExecutionsSelected ? null : index,
        isResumePhase: snapshot.isResumePhase,
        phase: snapshot.phase,
        source: "snapshot"
      };
    });
  }, [selectedThread, executionSnapshots, selectedGraphExecutionId, graphExecutionsForSelectedThread]);

  useEffect(() => {
    const availableIds = graphExecutionsForSelectedThread
      .map((execution) => execution?.id)
      .filter((id) => id !== null && id !== undefined)
      .map((id) => String(id));

    if (availableIds.length === 0) {
      if (selectedGraphExecutionId !== "") {
        setSelectedGraphExecutionId("");
      }
      return;
    }

    if (!selectedGraphExecutionId || !availableIds.includes(selectedGraphExecutionId)) {
      setSelectedGraphExecutionId(availableIds[0]);
      setSelectedStateIndex(0);
    }
  }, [graphExecutionsForSelectedThread, selectedGraphExecutionId]);

  const selectedTimelinePosition = useMemo(() => {
    if (timelineEntries.length === 0) {
      return 0;
    }
    const index = timelineEntries.findIndex((entry) => entry.snapshotIndex === selectedStateIndex);
    return index >= 0 ? index + 1 : 0;
  }, [selectedStateIndex, timelineEntries]);

  const selectedExecutionUniqueNodeCount = useMemo(
    () => new Set(timelineEntries.map((entry) => entry.node)).size,
    [timelineEntries]
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

  const stateSections = useMemo(() => getStateSections(selectedState?.payload), [selectedState]);

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
      const mermaid = await studioApi.fetchGraphMermaid();
      setGraphMermaid(mermaid);
    } catch (error) {
      setStatus({ type: "error", message: error.message || "Failed to fetch graph" });
    }
  }

  async function loadStudioState() {
    setLoading(true);
    setStatus({ type: "neutral", message: "Loading threads and state history..." });

    try {
      const payload = await studioApi.loadStudioState();
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
      const data = await studioApi.fetchExecutionContext(selectedThreadId);

      applyContextToForms(data);

      setStatus({
        type: "success",
        message: `Context loaded for ${selectedThreadId}. Resume and rerun forms are pre-filled.`
      });
    } catch (error) {
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
      const data = await studioApi.submitResume(payload);

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
      const data = await studioApi.submitRerun(payload);

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
    <div className="relative mx-auto max-w-[1680px] px-4 py-5 pb-24">
      <TopBar
        loading={loading}
        onOpenControls={() => setControlsOpen(true)}
        onRefreshData={loadStudioState}
        onRefreshGraph={fetchGraphMermaid}
        selectedThreadId={selectedThreadId}
        totalExecutions={totalExecutions}
        totalStates={totalStates}
        threadsCount={threads.length}
      />

      <main className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
        <ThreadPanel
          filteredThreads={filteredThreads}
          nestedThreads={nestedThreads}
          onCopyThreadId={(threadId) => {
            navigator.clipboard?.writeText(threadId);
            setStatus({ type: "success", message: `Copied thread ID: ${threadId}` });
          }}
          onSelectThread={(threadId) => {
            setSelectedThreadId(threadId);
            setSelectedStateIndex(0);
            setSelectedGraphExecutionId("");
          }}
          selectedThread={selectedThread}
          selectedThreadId={selectedThreadId}
          threadFilter={threadFilter}
          threadSort={threadSort}
          setThreadFilter={setThreadFilter}
          setThreadSort={setThreadSort}
        />

        <StateTimelinePanel
          timelineEntries={timelineEntries}
          onOpenRawSnapshot={() => setRawSnapshotOverlayOpen(true)}
          onSelectState={setSelectedStateIndex}
          graphExecutions={graphExecutionsForSelectedThread}
          selectedGraphExecutionId={selectedGraphExecutionId}
          onSelectGraphExecution={(value) => {
            setSelectedGraphExecutionId(value);
            setSelectedStateIndex(0);
            setSelectedStateSectionKey("__overview");
          }}
          selectedExecution={selectedExecution}
          selectedExecutionUniqueNodeCount={selectedExecutionUniqueNodeCount}
          selectedSectionValue={selectedSectionValue}
          selectedState={selectedState}
          selectedStateIndex={selectedStateIndex}
          selectedStatePosition={selectedTimelinePosition}
          selectedStateSectionKey={selectedStateSectionKey}
          setSelectedStateSectionKey={setSelectedStateSectionKey}
          stateOverview={stateOverview}
          stateSections={stateSections}
        />
      </main>

      {!controlsOpen && (
        <button
          type="button"
          aria-label="Open Execution Controls"
          title="Open Execution Controls"
          className="group fixed bottom-5 right-5 z-40 rounded-full p-0 transition-transform duration-200 hover:scale-105"
          onClick={() => setControlsOpen(true)}
        >
          <span className="pointer-events-none absolute -inset-4 -z-10 rounded-full bg-[conic-gradient(from_90deg,_#38bdf8,_#22d3ee,_#34d399,_#60a5fa,_#38bdf8)] opacity-80 blur-md animate-[spin_2.4s_linear_infinite]" />
          <span className="pointer-events-none absolute -inset-2 -z-10 rounded-full border-2 border-cyan-300/70 border-t-emerald-300 border-r-blue-300 animate-[spin_1.6s_linear_infinite]" />
          <span className="pointer-events-none absolute -inset-1 -z-10 rounded-full border border-sky-200/70 border-b-teal-300 animate-[spin_2.8s_linear_infinite_reverse]" />
          <span className="pointer-events-none absolute inset-0 -z-10 rounded-full bg-sky-300/25 blur-sm animate-pulse" />
          <div className="relative grid h-16 w-16 place-items-center rounded-full border border-sky-300 bg-slate-900/85 shadow-[0_14px_28px_rgba(9,44,63,0.35)]">
            <img
              src={robotPng}
              alt="Open Execution Controls"
              className="h-12 w-12 rounded-full object-contain"
            />
          </div>
        </button>
      )}

      <ExecutionControlsModal
        controlsOpen={controlsOpen}
        graphMermaid={graphMermaid}
        graphRenderError={graphRenderError}
        graphSvg={graphSvg}
        hydrateFromSelectedThread={hydrateFromSelectedThread}
        onClose={() => setControlsOpen(false)}
        rerunForm={rerunForm}
        resumeForm={resumeForm}
        setRerunForm={setRerunForm}
        setResumeForm={setResumeForm}
        startNodes={startNodes}
        status={status}
        submitRerun={submitRerun}
        submitResume={submitResume}
      />

      <RawSnapshotModal
        onClose={() => setRawSnapshotOverlayOpen(false)}
        onCopy={() => {
          const text = selectedState ? safeJson(selectedState.raw) : "";
          if (!text) {
            return;
          }
          navigator.clipboard?.writeText(text);
          setStatus({ type: "success", message: "Raw snapshot JSON copied." });
        }}
        rawSnapshotOverlayOpen={rawSnapshotOverlayOpen}
        selectedState={selectedState}
      />

      <LoadingOverlay visible={loading} message="Syncing thread history and state timeline..." />
    </div>
  );
}
