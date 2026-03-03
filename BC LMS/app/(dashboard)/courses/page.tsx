// /courses index — redirect to dashboard (course list is on the dashboard)
import { redirect } from 'next/navigation';

export default function CoursesIndexPage() {
  redirect('/dashboard');
}
