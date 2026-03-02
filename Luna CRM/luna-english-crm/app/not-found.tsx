import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="mx-auto max-w-md space-y-4 text-center">
        <h2 className="text-2xl font-bold text-foreground">
          Không tìm thấy trang
        </h2>
        <p className="text-muted-foreground">
          Trang bạn đang tìm không tồn tại hoặc đã bị di chuyển.
        </p>
        <Link
          href="/pipeline"
          className="inline-block rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
        >
          Về trang chính
        </Link>
      </div>
    </div>
  );
}
