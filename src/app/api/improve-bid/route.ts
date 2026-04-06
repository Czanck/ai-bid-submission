import { NextResponse } from "next/server";
import OpenAI from "openai";
import { project1Context, project2Context } from "@/data/project-context";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");
    const data = new Uint8Array(buffer);
    const doc = await pdfjsLib.getDocument({ data, disableFontFace: true }).promise;
    let fullText = "";
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map((item: { str: string }) => item.str).join(" ");
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

const projectContextMap: Record<string, string> = {
  project1: project1Context,
  project2: project2Context,
};

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
    const projectId = (formData.get("projectId") as string) || "project1";
    const customContext = formData.get("projectContext") as string | null;
    const context = customContext || (projectContextMap[projectId] ?? projectContextMap.project1);
    const followUp = (formData.get("followUp") as string) || "";
    const previousContext = (formData.get("context") as string) || "";

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
    }

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File "${file.name}" exceeds 10MB limit` },
          { status: 413 }
        );
      }
    }

    let documentText = "";
    const imageContents: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [];

    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (file.type === "application/pdf") {
        const text = await extractTextFromPDF(buffer);
        documentText += `\n--- ${file.name} ---\n${text.trim() || "[Scanned PDF - no extractable text]"}\n`;
      } else if (file.type.startsWith("image/")) {
        imageContents.push(buildImageContent(buffer.toString("base64"), file.type));
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
      documentText = documentText.substring(0, maxTextLength) + "\n[...truncated]";
    }

    // --- Follow-up mode: simple Q&A ---
    if (followUp) {
      const followUpSystem = `You are a seasoned electrical subcontractor with 20+ years of experience reviewing and submitting bids. You speak plainly, directly, and from hard-won experience. Return only valid JSON, no other text.`;

      const followUpUser = `Project context: ${context}

Bid document:
${documentText || "[No text content — analyze the attached images]"}

Previous AI feedback:
${previousContext || "(none)"}

User question: "${followUp}"

Answer this question directly and specifically about their bid. Be concise — 1 to 3 sentences max. If it's a yes/no, lead with the answer. Return JSON: { "feedback": ["your response"] }`;

      const followUpContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
        { type: "text", text: followUpUser },
        ...imageContents,
      ];

      const followUpResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        temperature: 0.4,
        max_tokens: 512,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: followUpSystem },
          { role: "user", content: followUpContent },
        ],
      });

      const followUpContent2 = followUpResponse.choices[0]?.message?.content;
      if (!followUpContent2) {
        return NextResponse.json({ error: "No response from AI" }, { status: 502 });
      }
      const parsed = JSON.parse(followUpContent2) as { feedback: string[] };
      return NextResponse.json({ feedback: Array.isArray(parsed.feedback) ? parsed.feedback : ["Your bid looks great."] });
    }

    // --- Bid Readiness Score mode ---
    const systemPrompt = `You are a seasoned electrical subcontractor with 20+ years of experience reviewing bid submissions before they go out the door. You are direct, careful, and construction-aware. You never overstate confidence. You never claim to do takeoff or verify quantities. You focus on what a sub can actually check before hitting send: did they cover the scope, is the proposal clear, does anything contradict, and will the GC understand what they're getting.

Return only valid JSON matching the exact schema requested. No other text.`;

    const userPrompt = `Project context: ${context}

Bid document:
${documentText || "[No text content — analyze the attached images]"}

You are doing a final QA check on this bid package before the subcontractor submits. Score the bid's READINESS (not quality, not price, not likelihood to win).

Evaluate these 4 dimensions, each scored 0–100:

1. **Coverage** — Are the key requirements from the project likely addressed? Are addenda acknowledged? Are there obvious scope categories that seem missing given the project type and trades?

2. **Scope Clarity** — Are exclusions clearly stated? Is the line between base scope and optional/alternates clear? Would a GC reading this understand exactly what's included and what's not?

3. **Consistency** — Are there contradictions between the proposal and the project details (location, project name, scope references)? Does the language match the project? Any copy-paste artifacts from other bids?

4. **Submission Clarity** — Is the subject line specific enough? Does the message represent what's actually being bid? Would a GC assistant know where to route this?

For each dimension, provide:
- score (0–100)
- a short explanation (1 sentence, plain language)
- 1–3 specific findings. Each finding needs:
  - text: what you found (specific, referencing actual content from the documents when possible)
  - severity: "info" | "warning" | "risk"
  - source: which document section ("Proposal" | "Specs" | "Addenda" | "GC Instructions" | "Message" | "Trade Breakdown")
  - cta: optional suggested action ("Fix" | "Ask AI" | "Review")

IMPORTANT rules for findings:
- Only flag things that are genuinely observable in the documents. Do not invent issues.
- If a dimension looks solid, say so — do not manufacture warnings.
- Never suggest quantity corrections, takeoff changes, or specific pricing adjustments.
- If you lack information to evaluate a dimension, give it a middling score and explain why in the explanation.
- Be honest about what you can and cannot see.

Also provide:
- An overall score (weighted average, Coverage 35%, Scope Clarity 25%, Consistency 25%, Submission Clarity 15%)
- A status: "ready" (score >= 80), "needs-review" (score 50–79), "high-risk" (score < 50)
- A confidence level: "high" (multiple substantive documents available), "medium" (partial documents), "low" (minimal content to work with)
- If confidence is not "high", include a confidenceNote explaining why (1 sentence)
- A summary line like "2 likely gaps, 1 clarity issue" — short, scannable, factual
- 3–5 suggested follow-up prompt chips (short questions the user could ask AI next, relevant to what you found)

Return JSON matching this exact schema:
{
  "score": number,
  "status": "ready" | "needs-review" | "high-risk",
  "confidence": "high" | "medium" | "low",
  "confidenceNote": string | null,
  "summary": string,
  "dimensions": [
    {
      "name": string,
      "score": number,
      "explanation": string,
      "findings": [
        { "text": string, "severity": "info" | "warning" | "risk", "source": string, "cta": string | null }
      ]
    }
  ],
  "promptChips": [string]
}`;

    const userContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
      { type: "text", text: userPrompt },
      ...imageContents,
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.2,
      max_tokens: 2048,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: "No response from AI" }, { status: 502 });
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(content);
    } catch {
      return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
    }

    // Validate and sanitize the response
    const score = typeof parsed.score === "number" ? Math.min(100, Math.max(0, Math.round(parsed.score))) : 50;
    const status = ["ready", "needs-review", "high-risk"].includes(parsed.status as string)
      ? parsed.status as string
      : score >= 80 ? "ready" : score >= 50 ? "needs-review" : "high-risk";
    const confidence = ["high", "medium", "low"].includes(parsed.confidence as string)
      ? parsed.confidence as string
      : "medium";

    const result = {
      score,
      status,
      confidence,
      confidenceNote: typeof parsed.confidenceNote === "string" ? parsed.confidenceNote : null,
      summary: typeof parsed.summary === "string" ? parsed.summary : "Analysis complete",
      dimensions: Array.isArray(parsed.dimensions)
        ? (parsed.dimensions as Record<string, unknown>[]).map((d) => ({
            name: typeof d.name === "string" ? d.name : "Unknown",
            score: typeof d.score === "number" ? Math.min(100, Math.max(0, Math.round(d.score))) : 50,
            explanation: typeof d.explanation === "string" ? d.explanation : "",
            findings: Array.isArray(d.findings)
              ? (d.findings as Record<string, unknown>[]).map((f) => ({
                  text: typeof f.text === "string" ? f.text : "",
                  severity: ["info", "warning", "risk"].includes(f.severity as string) ? f.severity : "info",
                  source: typeof f.source === "string" ? f.source : "Proposal",
                  cta: typeof f.cta === "string" ? f.cta : null,
                }))
              : [],
          }))
        : [],
      promptChips: Array.isArray(parsed.promptChips)
        ? (parsed.promptChips as string[]).filter((c) => typeof c === "string").slice(0, 5)
        : [],
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Improve bid error:", error);
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
