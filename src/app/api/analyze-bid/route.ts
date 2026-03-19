import { NextResponse } from "next/server";
import OpenAI from "openai";
import { PDFParse } from "pdf-parse";
import {
  getInstructionsPromptBlock,
  specialInstructions,
} from "@/lib/special-instructions";
import type { AnalyzeBidResponse, RequirementCheck } from "@/lib/types";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    const result = await parser.getText();
    return result.text;
  } catch {
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
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

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

    const systemPrompt = `You are a construction bid document analyzer. You extract structured data from bid submissions and evaluate compliance against project special instructions/requirements.

Return ONLY valid JSON matching the exact schema provided. Use empty strings "" for missing text fields and false for missing boolean fields. Never add commentary outside the JSON object.`;

    const userPromptText = `=== DOCUMENT TEXT ===
${documentText || "[No text content - analyze the attached images]"}

=== PROJECT SPECIAL INSTRUCTIONS TO VERIFY ===
${getInstructionsPromptBlock()}

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
    const fullChecklist: RequirementCheck[] = specialInstructions.map(
      (inst) => {
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
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      { error: `Analysis failed: ${message}` },
      { status: 502 }
    );
  }
}
