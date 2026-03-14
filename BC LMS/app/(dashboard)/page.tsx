import { redirect } from "next/navigation";

// (dashboard) root → redirect to /dashboard (the actual dashboard page)
export default function DashboardRootPage() {
  redirect("/dashboard");
}
