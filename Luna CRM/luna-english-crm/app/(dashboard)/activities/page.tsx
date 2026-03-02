import { ActivitiesPageView } from "@/components/pipeline/activities-page-view";

export default function ActivitiesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Hoạt động</h1>
        <p className="text-muted-foreground">
          Tổng quan hoạt động sắp tới và đã hoàn thành
        </p>
      </div>
      <ActivitiesPageView />
    </div>
  );
}
