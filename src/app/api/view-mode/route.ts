import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { VIEW_MODE_COOKIE } from "@/lib/view-mode";

const bodySchema = z.object({
  mode: z.enum(["pc", "mobile"]),
});

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "mode must be 'pc' or 'mobile'" }, { status: 400 });
  }

  const res = NextResponse.json({ success: true, mode: parsed.data.mode });
  res.cookies.set(VIEW_MODE_COOKIE, parsed.data.mode, {
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    path: "/",
  });
  return res;
}
