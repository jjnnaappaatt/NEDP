import { redirect } from "next/navigation";

// แจ้งเตือน (reminders) was folded into สถานะโครงการ. Keep the route as a redirect so old links don't 404.
export default function AdminRemindersPage() {
  redirect("/admin/status");
}
