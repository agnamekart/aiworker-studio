export default function InitQueryPanel({
  appliedQuery,
  fixedPageSize,
  hasNextPage,
  loading,
  paginationMeta,
  onNextPage
}) {
  const totalPagesLabel =
    Number.isInteger(paginationMeta.totalPages) && paginationMeta.totalPages > 0
      ? `${appliedQuery.page + 1} of ${paginationMeta.totalPages}`
      : null;
  const totalThreadsLabel = Number.isInteger(paginationMeta.totalThreads)
    ? `${paginationMeta.totalThreads} total thread(s)`
    : null;

  return (
    <section className="panel mb-4 border border-sky-100/70 bg-white/85">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-700">
            Studio Pagination
          </p>
          <h2 className="mt-1 text-xl font-extrabold text-slate-900">Fixed page size</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
            The app keeps <code>size={fixedPageSize}</code> for every <code className="ml-1">/init</code>{" "}
            request and advances by incrementing the page number in the URL.
          </p>
        </div>

        <button
          type="button"
          className="btn-primary min-w-[140px]"
          onClick={onNextPage}
          disabled={loading || !hasNextPage}
        >
          Next Page
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="badge border-slate-200 bg-slate-50 text-slate-700">
          instance={appliedQuery.instance}
        </span>
        <span className="badge border-slate-200 bg-slate-50 text-slate-700">
          page={appliedQuery.page}
        </span>
        <span className="badge border-sky-200 bg-sky-50 text-sky-700">
          size={fixedPageSize}
        </span>
        <span className="badge border-slate-200 bg-slate-50 text-slate-700">
          historySize={appliedQuery.historySize}
        </span>
        <span className="badge border-slate-200 bg-slate-50 text-slate-700">
          executionSize={appliedQuery.executionSize}
        </span>
        {totalPagesLabel && (
          <span className="badge border-sky-200 bg-sky-50 text-sky-700">{totalPagesLabel}</span>
        )}
        {totalThreadsLabel && (
          <span className="badge border-emerald-200 bg-emerald-50 text-emerald-700">
            {totalThreadsLabel}
          </span>
        )}
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
        Example URL:
        <code className="ml-1 rounded bg-slate-100 px-1.5 py-0.5">
          ?instance=default&page={appliedQuery.page}&size={fixedPageSize}&historySize={appliedQuery.historySize}
          &executionSize={appliedQuery.executionSize}
        </code>
      </p>
    </section>
  );
}
