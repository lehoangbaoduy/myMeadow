import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const SYSTEM_PROMPT = `You are an expert utility bill parser. Extract structured data from the provided utility bill PDF.

Return ONLY a valid JSON object with these fields (use null for any field you cannot determine):
{
  "billingMonth": <number 1-12>,
  "billingYear": <number e.g. 2026>,
  "billingPeriodStart": <ISO date string e.g. "2026-02-15" or null>,
  "billingPeriodEnd": <ISO date string e.g. "2026-03-14" or null>,
  "totalAmount": <number in USD, e.g. 95.40>,
  "usage": <number representing quantity used, null for flat-rate services>,
  "pricePerUnit": <number cost per unit, null for flat-rate services>
}

Rules:
- billingMonth/billingYear: the month this bill is FOR (not the issue date)
- totalAmount: the total amount due or charged on the bill
- usage: quantity in kWh (electric), m³ (gas/water), or null (wifi/flat-rate)
- pricePerUnit: cost per kWh or m³, null if not listed or flat-rate
- All numbers must be plain numbers (no currency symbols)
- Return ONLY the JSON object, no explanation or markdown`;

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const caller = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!caller || caller.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const utilityType = (formData.get("utilityType") as string) ?? "electric";

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 });
  }
  if (file.size > 20 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 20MB)" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");

  const userPrompt = `This is a ${utilityType} utility bill. Extract the billing data.`;

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: base64,
              },
            },
            {
              type: "text",
              text: userPrompt,
            },
          ],
        },
      ],
    });

    const raw = message.content[0].type === "text" ? message.content[0].text : "";

    // Strip any markdown code fences if present
    const jsonText = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

    let extracted: Record<string, unknown>;
    try {
      extracted = JSON.parse(jsonText);
    } catch {
      return NextResponse.json(
        { error: "OCR could not parse bill data", raw },
        { status: 422 }
      );
    }

    return NextResponse.json(extracted);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "OCR failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
