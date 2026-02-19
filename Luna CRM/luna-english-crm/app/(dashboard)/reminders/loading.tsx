export default function RemindersLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-40 bg-muted animate-pulse rounded" />
          <div className="h-4 w-56 bg-muted animate-pulse rounded mt-2" />
        </div>
        <div className="h-9 w-32 bg-muted animate-pulse rounded" />
      </div>
      {[1, 2, 3].map((section) => (
        <div key={section} className="space-y-3">
          <div className="h-6 w-24 bg-muted animate-pulse rounded" />
          {[1, 2].map((card) => (
            <div
              key={card}
              className="h-20 bg-muted animate-pulse rounded-lg"
            />
          ))}
        </div>
      ))}
    </div>
  );
}
