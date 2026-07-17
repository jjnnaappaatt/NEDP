"use server";

import { submitIssue } from "@/lib/data";
import type { IssueReport } from "@/types";

/** Server action — lets client components persist an issue report without the service key. */
export async function submitIssueAction(input: { type: string; description: string; email?: string }): Promise<IssueReport> {
  return submitIssue(input);
}
