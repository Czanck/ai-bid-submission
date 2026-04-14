import { NextResponse } from "next/server";
import OpenAI from "openai";
import { fetchProjectContext } from "@/lib/doc-intel";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");
    const data = new Uint8Array(buffer);
    const doc = await pdfjsLib.getDocument({ data, disableFontFace: true })
      .promise;
    let fullText = "";
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item: { str: string }) => item.str)
        .join(" ");
      fullText += pageText + "\n";
    }
    return fullText;
  } catch (err) {
    console.error("PDF parse error:", err);
    return "";
  }
}

function buildImageContent(
  base64: string,
  mimeType: string
): OpenAI.Chat.Completions.ChatCompletionContentPart {
  return {
    type: "image_url",
    image_url: { url: `data:${mimeType};base64,${base64}`, detail: "high" },
  };
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API key not configured." },
        { status: 500 }
      );
    }

    const openai = new OpenAI({ apiKey });
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];
    const projectId = (formData.get("projectId") as string) || "";
    // Start context fetch in parallel with file processing — await later
    const contextPromise = fetchProjectContext(projectId);

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "No files uploaded" },
        { status: 400 }
      );
    }

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File "${file.name}" exceeds 10MB limit` },
          { status: 413 }
        );
      }
    }

    // Extract content from bid files
    let documentText = "";
    const imageContents: OpenAI.Chat.Completions.ChatCompletionContentPart[] =
      [];

    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (file.type === "application/pdf") {
        const text = await extractTextFromPDF(buffer);
        documentText += `\n--- ${file.name} ---\n${text.trim() || "[Scanned PDF - no extractable text]"}\n`;
      } else if (file.type.startsWith("image/")) {
        imageContents.push(
          buildImageContent(buffer.toString("base64"), file.type)
        );
      } else {
        try {
          documentText += `\n--- ${file.name} ---\n${buffer.toString("utf-8")}\n`;
        } catch {
          // skip unreadable files
        }
      }
    }

    if (!documentText.trim() && imageContents.length === 0) {
      return NextResponse.json(
        { error: "Could not extract any content from the uploaded files." },
        { status: 422 }
      );
    }

    const maxTextLength = 12000;
    if (documentText.length > maxTextLength) {
      documentText =
        documentText.substring(0, maxTextLength) + "\n[...truncated]";
    }

    // Await context now — file processing has been running in parallel
    const projectContext = await contextPromise;

    // --- Readiness Check: scope alignment ---
    const systemPrompt = `You are a seasoned construction subcontractor with 20+ years of experience reviewing bid submissions. Your job is to compare the subcontractor's bid documents against the project specifications and identify scope alignment issues.

You focus ONLY on the trades/scopes of work that the subcontractor is bidding on. You do NOT check trades they are not bidding on. You do NOT assess pricing, quantities, or takeoff.

For each trade/scope the sub is bidding on, you check whether their proposal aligns with the project requirements for that specific trade/scope. You catch anything the subcontractor may be missing, mis-describing, or contradicting relative to the project files — but only for the scopes they claim to be bidding.

You also provide a brief (1-2 sentence) writing quality summary suggesting how the subcontractor could improve the clarity, organization, or professionalism of their bid proposal writing. This is about writing quality, not scope or pricing.

Return only valid JSON matching the exact schema requested. No other text.`;

    const userPrompt = `=== PROJECT FILES / SPECIFICATIONS ===
${projectContext}

=== SUBCONTRACTOR'S BID DOCUMENTS ===
${documentText || "[No text content — analyze the attached images]"}

Perform a Bid Readiness Check:

1. Identify all trades and scopes of work that the subcontractor's bid documents indicate they are bidding on.

2. For EACH trade/scope identified, compare the subcontractor's proposal against the project files for that specific trade/scope. Check if:
   - The subcontractor's described scope aligns with what the project requires for that trade
   - The subcontractor is missing any requirements, specifications, or deliverables that the project files call out for that trade
   - There are contradictions between the bid and the project requirements for that trade

3. Classify each trade/scope check as:
   - "aligned" — the bid and project specs are in agreement for this scope
   - "misaligned" — there's a contradiction or notable discrepancy
   - "missing" — the project specs include requirements for this trade that the bid does not address at all

4. Determine the overall result:
   - "looks-good" — ALL items are "aligned" (no misaligned or missing items)
   - "needs-review" — ANY item is "misaligned" or "missing"

5. For each item that is "misaligned" or "missing", provide a specific "fix" field explaining exactly what the subcontractor should do to resolve it.

6. Provide a 1-2 sentence "writingSummary" with a concrete suggestion for how the subcontractor could improve the writing quality or organization of their proposal (not about scope or pricing — about the writing itself).

7. Provide 3-5 "promptChips" — short follow-up questions the user could ask about their bid, relevant to the findings.

Return JSON matching this exact schema:
{
  "result": "looks-good" | "needs-review",
  "items": [
    {
      "trade": string,
      "status": "aligned" | "misaligned" | "missing",
      "detail": string,
      "fix": string | null
    }
  ],
  "writingSummary": string,
  "promptChips": [string]
}`;

    const userContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
      { type: "text", text: userPrompt },
      ...imageContents,
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-5.4",
      temperature: 0.2,
      max_completion_tokens: 2048,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { error: "No response from AI" },
        { status: 502 }
      );
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(content);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse AI response" },
        { status: 500 }
      );
    }

    // Validate and sanitize
    const items = Array.isArray(parsed.items)
      ? (parsed.items as Record<string, unknown>[]).map((item) => ({
          trade: typeof item.trade === "string" ? item.trade : "Unknown",
          status: ["aligned", "misaligned", "missing"].includes(
            item.status as string
          )
            ? (item.status as string)
            : "aligned",
          detail: typeof item.detail === "string" ? item.detail : "",
          fix: typeof item.fix === "string" ? item.fix : null,
        }))
      : [];

    const hasIssues = items.some(
      (i) => i.status === "misaligned" || i.status === "missing"
    );

    const result = {
      result: hasIssues ? "needs-review" : "looks-good",
      items,
      writingSummary:
        typeof parsed.writingSummary === "string"
          ? parsed.writingSummary
          : "Your bid proposal is clearly written.",
      promptChips: Array.isArray(parsed.promptChips)
        ? (parsed.promptChips as string[])
            .filter((c) => typeof c === "string")
            .slice(0, 5)
        : [],
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Readiness check error:", error);
    let message = "Unknown error occurred";
    let status = 502;
    if (error instanceof OpenAI.AuthenticationError) {
      message = "Invalid OpenAI API key.";
      status = 401;
    } else if (error instanceof OpenAI.RateLimitError) {
      message = "OpenAI rate limit reached. Please try again.";
      status = 429;
    } else if (error instanceof Error) {
      message = error.message;
    }
    return NextResponse.json({ error: message }, { status });
  }
}
