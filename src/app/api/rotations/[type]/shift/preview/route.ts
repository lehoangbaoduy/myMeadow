import { NextRequest, NextResponse } from "next/server";
import { parseRotationType, parseLocalDateString, previewShift } from "@/lib/rotation-core";
import { requireAdminUser } from "@/lib/rotation-route-auth";

/** Read-only "what if" preview for a shift the admin hasn't submitted yet — never writes anything. */
export async function GET(req: NextRequest, { params }: { params: { type: string } }) {
  const rotationType = parseRotationType(params.type);
  if (!rotationType) return NextResponse.json({ error: "Invalid rotation type" }, { status: 400 });

  const gate = await requireAdminUser();
  if ("error" in gate) return gate.error;

  const effectiveDateParam = req.nextUrl.searchParams.get("effectiveDate");
  const effectiveDate = effectiveDateParam ? parseLocalDateString(effectiveDateParam) : null;
  if (!effectiveDate) {
    return NextResponse.json({ error: "effectiveDate must be a valid YYYY-MM-DD date" }, { status: 400 });
  }

  const offsetPositions = Number(req.nextUrl.searchParams.get("offsetPositions"));
  if (!Number.isInteger(offsetPositions)) {
    return NextResponse.json({ error: "offsetPositions must be an integer" }, { status: 400 });
  }

  const preview = await previewShift(rotationType, effectiveDate, offsetPositions);
  return NextResponse.json(preview);
}
