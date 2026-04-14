import { NextResponse } from "next/server";
import OpenAI from "openai";
import {
  getInstructionsPromptBlock,
  specialInstructions,
  specialInstructions2,
} from "@/lib/special-instructions";
import { fetchProjectContext } from "@/lib/doc-intel";
import type { AnalyzeBidResponse, RequirementCheck } from "@/lib/types";

// Increase body size limit for file uploads (Next.js App Router)
export const runtime = "nodejs";
export const maxDuration = 60; // seconds

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    // Use pdfjs-dist legacy CJS build — works reliably in Node.js / Next.js serverless
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js");
    const data = new Uint8Array(buffer);
    const doc = await pdfjsLib.getDocument({ data, disableFontFace: true }).promise;

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
    image_url: {
      url: `data:${mimeType};base64,${base64}`,
      detail: "high",
    },
  };
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API key not configured. Please set OPENAI_API_KEY environment variable." },
        { status: 500 }
      );
    }

    const openai = new OpenAI({ apiKey });

    const formData = await request.formData();
    const files = formData.getAll("files") as File[];
    const projectId = (formData.get("projectId") as string) || "project1";
    const activeInstructions = projectId === "project2" ? specialInstructions2 : specialInstructions;
    // Start context fetch in parallel with file processing — await later
    const contextPromise = fetchProjectContext(projectId);

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "No files uploaded" },
        { status: 400 }
      );
    }

    // Check file sizes
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File "${file.name}" exceeds 10MB limit` },
          { status: 413 }
        );
      }
    }

    let documentText = "";
    const imageContents: OpenAI.Chat.Completions.ChatCompletionContentPart[] =
      [];

    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (file.type === "application/pdf") {
        const text = await extractTextFromPDF(buffer);
        if (text.trim()) {
          documentText += `\n--- ${file.name} ---\n${text}\n`;
        } else {
          // Scanned PDF with no text layer — skip for now
          // (GPT-4o can't process PDF pages as images easily without conversion)
          documentText += `\n--- ${file.name} ---\n[Scanned PDF - no extractable text]\n`;
        }
      } else if (file.type.startsWith("image/")) {
        const base64 = buffer.toString("base64");
        imageContents.push(buildImageContent(base64, file.type));
      } else {
        // Try reading as text
        try {
          const text = buffer.toString("utf-8");
          documentText += `\n--- ${file.name} ---\n${text}\n`;
        } catch {
          // Skip unreadable files
        }
      }
    }

    if (!documentText.trim() && imageContents.length === 0) {
      return NextResponse.json(
        {
          error:
            "Could not extract any text from the uploaded files. Please try uploading a different file format.",
        },
        { status: 422 }
      );
    }

    // Truncate text to avoid token limits
    const maxTextLength = 12000;
    if (documentText.length > maxTextLength) {
      documentText = documentText.substring(0, maxTextLength) + "\n[...truncated]";
    }

    const fast = (formData.get("fast") as string) === "true";

    if (fast) {
      // Skip doc-intel — just extract bid amount and draft message from the document
      const fastSystem = `You are a construction bid extractor. Extract data from bid documents. Return only valid JSON.`;
      const fastUser = `Document:
${documentText || "[No text — analyze attached images]"}

Return JSON:
{
  "extractedData": { "companyName": "string", "bidAmount": "string (format: '$1,234,567' or '' if not found)" },
  "messageTemplate": "2-3 sentence professional email body for submitting this bid. Mention company name, bid amount, and trade scope.",
  "confidence": 0.8
}`;
      const fastResp = await openai.chat.completions.create({
        model: "gpt-4o",
        temperature: 0.1,
        max_tokens: 512,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: fastSystem },
          { role: "user", content: [{ type: "text", text: fastUser }, ...imageContents] as OpenAI.Chat.Completions.ChatCompletionContentPart[] },
        ],
      });
      const fastText = fastResp.choices[0]?.message?.content;
      if (!fastText) return NextResponse.json({ error: "No response from AI" }, { status: 502 });
      const fp = JSON.parse(fastText) as { extractedData?: { companyName?: string; bidAmount?: string }; messageTemplate?: string; confidence?: number };
      return NextResponse.json({
        extractedData: {
          companyName: fp.extractedData?.companyName || "",
          bidAmount: fp.extractedData?.bidAmount || "",
          tradeBreakdown: [],
          certifications: { mbe: false, wbe: false, other: [] },
          bondInfo: { hasBidBond: false, bondingCapacity: "", bondCompany: "" },
          insuranceInfo: { hasGeneralLiability: false, coverageAmount: "", certificateProvided: false },
          contactInfo: { name: "", email: "", phone: "" },
        },
        checklist: [],
        messageTemplate: fp.messageTemplate || "",
        confidence: fp.confidence ?? 0.5,
      } as AnalyzeBidResponse);
    }

    // Await context now — file processing has been running in parallel
    const projectContextText = await contextPromise;

    const systemPrompt = `You are a construction bid document analyzer. You extract structured data from bid submissions and evaluate compliance against real project requirements and special instructions.

You have access to the actual project scope and specifications. Compare the submitted bid against these project details to identify coverage gaps, mismatches, or missing items.

Return ONLY valid JSON matching the exact schema provided. Use empty strings "" for missing text fields and false for missing boolean fields. Never add commentary outside the JSON object.`;

    const userPromptText = `=== PROJECT SCOPE & SPECIFICATIONS ===
${projectContextText}

=== SUBMITTED BID DOCUMENT TEXT ===
${documentText || "[No text content - analyze the attached images]"}

=== PROJECT SPECIAL INSTRUCTIONS TO VERIFY ===
${getInstructionsPromptBlock(activeInstructions)}

=== TASK ===
1. Extract all bid information from the document into the JSON structure below.
2. For each special instruction listed above, determine its status:
   - "found" = clear evidence exists in the document addressing this requirement
   - "missing" = no evidence found, the bidder must provide this
   - "needs-action" = requires a specific action that can't be verified from documents alone (e.g., making a phone call)
   Note: The "gc-phone-call" requirement should always be "needs-action" since calling can't be verified from a document.
3. Generate a professional, concise email message body for submitting this bid. Include the company name, bid amount, trades/services covered, and a professional closing.

=== REQUIRED JSON SCHEMA ===
{
  "extractedData": {
    "companyName": "string",
    "bidAmount": "string (e.g. '$1,234,567.00')",
    "tradeBreakdown": [{"trade": "string", "amount": "string"}],
    "certifications": {"mbe": false, "wbe": false, "other": []},
    "bondInfo": {"hasBidBond": false, "bondingCapacity": "", "bondCompany": ""},
    "insuranceInfo": {"hasGeneralLiability": false, "coverageAmount": "", "certificateProvided": false},
    "contactInfo": {"name": "", "email": "", "phone": ""}
  },
  "checklist": [
    {"id": "instruction-id", "label": "Short label", "description": "Requirement description", "status": "found|missing|needs-action", "detail": "What was found or what is missing"}
  ],
  "messageTemplate": "Professional email body...",
  "confidence": 0.85
}`;

    // Build the message content
    const userContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
      { type: "text", text: userPromptText },
      ...imageContents,
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.1,
      max_tokens: 4096,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { error: "No response from AI analysis" },
        { status: 502 }
      );
    }

    let parsed: AnalyzeBidResponse;
    try {
      parsed = JSON.parse(content) as AnalyzeBidResponse;
    } catch {
      return NextResponse.json(
        { error: "Failed to parse AI response" },
        { status: 500 }
      );
    }

    // Ensure all special instructions have a checklist entry
    const checklistMap = new Map(
      (parsed.checklist || []).map((c) => [c.id, c])
    );
    const fullChecklist: RequirementCheck[] = activeInstructions.map(
      (inst) => {
        // submit-via-planhub is always met — the user is literally submitting through PlanHub
        if (inst.id === "submit-via-planhub") {
          return {
            id: inst.id,
            label: "Submit via PlanHub",
            description: inst.requirement,
            status: "found" as const,
            detail: "Bid is being submitted through PlanHub",
          };
        }
        const existing = checklistMap.get(inst.id);
        if (existing) return existing;
        return {
          id: inst.id,
          label: inst.requirement.split(" ").slice(0, 4).join(" "),
          description: inst.requirement,
          status: inst.id === "gc-phone-call" ? "needs-action" as const : "missing" as const,
          detail: inst.actionRequired,
        };
      }
    );

    // Build the validated response
    const result: AnalyzeBidResponse = {
      extractedData: {
        companyName: parsed.extractedData?.companyName || "",
        bidAmount: parsed.extractedData?.bidAmount || "",
        tradeBreakdown: parsed.extractedData?.tradeBreakdown || [],
        certifications: {
          mbe: parsed.extractedData?.certifications?.mbe || false,
          wbe: parsed.extractedData?.certifications?.wbe || false,
          other: parsed.extractedData?.certifications?.other || [],
        },
        bondInfo: {
          hasBidBond: parsed.extractedData?.bondInfo?.hasBidBond || false,
          bondingCapacity: parsed.extractedData?.bondInfo?.bondingCapacity || "",
          bondCompany: parsed.extractedData?.bondInfo?.bondCompany || "",
        },
        insuranceInfo: {
          hasGeneralLiability:
            parsed.extractedData?.insuranceInfo?.hasGeneralLiability || false,
          coverageAmount:
            parsed.extractedData?.insuranceInfo?.coverageAmount || "",
          certificateProvided:
            parsed.extractedData?.insuranceInfo?.certificateProvided || false,
        },
        contactInfo: {
          name: parsed.extractedData?.contactInfo?.name || "",
          email: parsed.extractedData?.contactInfo?.email || "",
          phone: parsed.extractedData?.contactInfo?.phone || "",
        },
      },
      checklist: fullChecklist,
      messageTemplate: parsed.messageTemplate || "",
      confidence: parsed.confidence ?? 0.5,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Analyze bid error:", error);

    // Surface helpful error messages
    let message = "Unknown error occurred";
    let status = 502;

    if (error instanceof OpenAI.AuthenticationError) {
      message = "Invalid OpenAI API key. Please check your OPENAI_API_KEY environment variable.";
      status = 401;
    } else if (error instanceof OpenAI.RateLimitError) {
      message = "OpenAI rate limit reached. Please try again in a moment.";
      status = 429;
    } else if (error instanceof OpenAI.APIError) {
      message = `OpenAI API error: ${error.message}`;
      status = 502;
    } else if (error instanceof Error) {
      message = error.message;
    }

    return NextResponse.json(
      { error: `Analysis failed: ${message}` },
      { status }
    );
  }
}
