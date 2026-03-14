import { redirect } from "next/navigation";

// /admin root redirects to /admin/users
export default function AdminPage() {
  redirect("/admin/users");
}
