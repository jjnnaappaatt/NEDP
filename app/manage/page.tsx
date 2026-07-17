import { redirect } from "next/navigation";

// จัดการ was merged: file/grid entry → ส่งข้อมูล (/submit); status + location management → /status.
export default function ManageRedirect() {
  redirect("/submit");
}
