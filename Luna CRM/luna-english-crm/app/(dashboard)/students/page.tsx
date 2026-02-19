import { getStudents } from "@/lib/actions/student-actions";
import { StudentsClient } from "./students-client";

export default async function StudentsPage() {
  const { data: students, count } = await getStudents();

  return <StudentsClient initialStudents={students} initialCount={count} />;
}
