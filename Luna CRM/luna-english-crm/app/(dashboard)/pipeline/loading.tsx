import { PIPELINE_STAGES } from "@/lib/constants/pipeline-stages";

export default function PipelineLoading() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="flex gap-2">
          <div className="h-9 w-24 animate-pulse rounded bg-muted" />
          <div className="h-9 w-32 animate-pulse rounded bg-muted" />
        </div>
      </div>
      <div className="flex gap-4 overflow-hidden">
        {PIPELINE_STAGES.map((stage) => (
          <div
            key={stage.id}
            className="flex w-72 shrink-0 flex-col rounded-lg border bg-muted/30 p-3"
          >
            <div className="mb-3 h-6 w-32 animate-pulse rounded bg-muted" />
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-24 animate-pulse rounded-md bg-muted"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
