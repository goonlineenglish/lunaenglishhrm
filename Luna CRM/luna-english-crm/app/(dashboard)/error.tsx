"use client";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="mx-auto max-w-md space-y-4 text-center">
        <h2 className="text-xl font-semibold text-foreground">
          Đã xảy ra lỗi
        </h2>
        <p className="text-sm text-muted-foreground">
          {error.message || "Có lỗi khi tải dữ liệu. Vui lòng thử lại."}
        </p>
        <button
          onClick={reset}
          className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
        >
          Thử lại
        </button>
      </div>
    </div>
  );
}
