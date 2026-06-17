import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";

import { db } from "@/db/client";
import { placeReports, reportStatusEnum } from "@/db/schema";
import { isAdminAuthenticated } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const STATUS_SET = new Set<string>(reportStatusEnum);
const FILTER_SET = new Set(["open", "all", "resolved", "dismissed"]);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  if (!(await isAdminAuthenticated())) {
    const url = new URL("/admin/login", request.url);
    url.searchParams.set("next", "/admin/reports");
    return NextResponse.redirect(url, 303);
  }

  const { id } = await params;
  const reportId = parseInt(id, 10);
  if (!Number.isFinite(reportId) || reportId <= 0) {
    return NextResponse.redirect(new URL("/admin/reports", request.url), 303);
  }

  const form = await request.formData();
  const statusRaw = String(form.get("status") ?? "");
  const filterRaw = String(form.get("filter") ?? "open");
  if (!STATUS_SET.has(statusRaw)) {
    return NextResponse.redirect(new URL("/admin/reports", request.url), 303);
  }
  const filter = FILTER_SET.has(filterRaw) ? filterRaw : "open";

  await db
    .update(placeReports)
    .set({
      status: statusRaw as (typeof reportStatusEnum)[number],
    })
    .where(eq(placeReports.id, reportId));

  revalidatePath("/admin/reports");

  const target = new URL("/admin/reports", request.url);
  target.searchParams.set("status", filter);
  target.searchParams.set("updated", "1");
  return NextResponse.redirect(target, 303);
}
