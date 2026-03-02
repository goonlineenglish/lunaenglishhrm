// Home page — redirects unauthenticated users to /login
// Authenticated users will be redirected to /dashboard by middleware (phase-02)
import { redirect } from "next/navigation";

export default function HomePage() {
  redirect("/login");
}
