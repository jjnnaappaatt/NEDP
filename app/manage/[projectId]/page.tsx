import { redirect } from "next/navigation";

// The old grid/manage page moved to the ส่งข้อมูล portal.
export default async function ManageProjectRedirect({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  redirect(`/submit/${projectId}`);
}
