/**
 * Loading spinner used while async content is fetching.
 */
export function LoadingSpinner({ label = 'Đang tải...' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      <span className="text-sm">{label}</span>
    </div>
  )
}
