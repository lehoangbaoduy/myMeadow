import { NextRequest, NextResponse } from "next/server";
import { parseLocalDateString, previewRecycleShift } from "@/lib/rotation-core";
import { requireAdminUser } from "@/lib/rotation-route-auth";

/** Read-only "what if" preview for a recycle-schedule override the admin hasn't submitted yet — never writes anything. */
export async function GET(req: NextRequest) {
  const gate = await requireAdminUser();
  if ("error" in gate) return gate.error;

  const effectiveDateParam = req.nextUrl.searchParams.get("effectiveDate");
  const effectiveDate = effectiveDateParam ? parseLocalDateString(effectiveDateParam) : null;
  if (!effectiveDate) {
    return NextResponse.json({ error: "effectiveDate must be a valid YYYY-MM-DD date" }, { status: 400 });
  }

  const hasRecycleParam = req.nextUrl.searchParams.get("hasRecycle");
  if (hasRecycleParam !== "true" && hasRecycleParam !== "false") {
    return NextResponse.json({ error: "hasRecycle must be 'true' or 'false'" }, { status: 400 });
  }

  const preview = await previewRecycleShift(effectiveDate, hasRecycleParam === "true");
  return NextResponse.json(preview);
}
