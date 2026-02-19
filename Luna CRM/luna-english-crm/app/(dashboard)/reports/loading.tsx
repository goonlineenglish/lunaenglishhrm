export default function ReportsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="h-8 w-32 rounded bg-muted" />
          <div className="mt-2 h-4 w-48 rounded bg-muted" />
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-20 rounded bg-muted" />
          <div className="h-8 w-20 rounded bg-muted" />
          <div className="h-8 w-20 rounded bg-muted" />
          <div className="h-8 w-36 rounded bg-muted" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl border bg-muted" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-[380px] rounded-xl border bg-muted" />
        <div className="h-[380px] rounded-xl border bg-muted" />
      </div>
      <div className="h-[380px] rounded-xl border bg-muted" />
      <div className="h-48 rounded-xl border bg-muted" />
    </div>
  );
}
