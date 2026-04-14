import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";
export const maxDuration = 120;

interface FileInput {
  fileName: string;
  fileType: string;
  extractedText: string;
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

    // Accept JSON with pre-extracted text (extracted client-side)
    const body = await request.json() as { files: FileInput[] };
    const files = body.files;

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    // Build combined text from pre-extracted content
    let combinedText = "";
    const fileResults: FileInput[] = [];

    for (const file of files) {
      const trimmed = (file.extractedText || "").trim();
      fileResults.push({
        fileName: file.fileName,
        fileType: file.fileType,
        extractedText: trimmed || "[No extractable text]",
      });
      if (trimmed && trimmed !== "[No extractable text]") {
        combinedText += `\n--- ${file.fileName} ---\n${trimmed}\n`;
      }
    }

    if (!combinedText.trim()) {
      return NextResponse.json(
        { error: "Could not extract text from any uploaded files. The PDFs may be scanned images without a text layer." },
        { status: 422 }
      );
    }

    // Truncate to fit token limits
    const maxLen = 30000;
    if (combinedText.length > maxLen) {
      combinedText = combinedText.substring(0, maxLen) + "\n[...truncated]";
    }

    // Ask GPT-4o to extract structured project information
    const systemPrompt = `You are a construction project document analyzer. You read plan sets, specifications, scopes of work, bulletins, and other construction documents to extract structured project information.

Return ONLY valid JSON matching the exact schema provided. Be thorough — extract as much detail as you can from the documents. For fields you cannot determine, use reasonable defaults or empty strings.`;

    const userPrompt = `=== UPLOADED PROJECT DOCUMENTS ===
${combinedText}

=== TASK ===
Analyze these construction project documents and extract:
1. Structured project metadata (name, location, type, value, etc.)
2. A comprehensive project context summary that captures ALL technical requirements, specifications, scope items, and key details that a bidder would need to know. This context will be used later to evaluate bid submissions against, so be thorough.

=== REQUIRED JSON SCHEMA ===
{
  "id": "string (short alphanumeric project ID, e.g. from the documents or generate one)",
  "name": "string (project name from documents)",
  "description": "string (2-3 sentence project description)",
  "location": "string (full address if available, e.g. '123 MAIN ST City, ST 12345')",
  "projectValue": "string (estimated value like '$1,500,000.00', or '$0.00' if unknown)",
  "projectSize": "string (e.g. '28,000.00 SF', or 'TBD' if unknown)",
  "dueDate": "string (MM/DD/YYYY format, or 'TBD')",
  "startDate": "string (MM/DD/YYYY format, or 'TBD')",
  "endDate": "string (MM/DD/YYYY format, or 'TBD')",
  "status": "string (e.g. 'GC and Sub Bidding')",
  "constructionType": "string (e.g. 'Private / Commercial', 'Government / Public')",
  "projectType": "string (e.g. 'New Construction', 'Renovation / Remodel')",
  "buildingUse": "string (e.g. 'Retail Store', 'Medical Office')",
  "sectorLaborStatus": "string (e.g. 'Open Shop', 'Prevailing Wage')",
  "trades": ["string array of specific trade categories needed, e.g. 'Electrical Power', 'HVAC', 'Fire Alarm'"],
  "totalTrades": "number (total count of all trades, including those not listed)",
  "projectContext": "string (COMPREHENSIVE technical summary of all project requirements, specifications, scope items, equipment schedules, special requirements, key notes — everything a bidder needs to know. This should be 500-2000 words covering all major systems and requirements found in the documents.)"
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-5.4",
      temperature: 0.1,
      max_completion_tokens: 4096,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
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

    // Build the response with safe defaults
    const project = {
      id: (parsed.id as string) || `P${Date.now().toString(36).toUpperCase()}`,
      name: (parsed.name as string) || "Untitled Project",
      description: (parsed.description as string) || "",
      location: (parsed.location as string) || "",
      projectValue: (parsed.projectValue as string) || "$0.00",
      projectSize: (parsed.projectSize as string) || "TBD",
      dueDate: (parsed.dueDate as string) || "TBD",
      startDate: (parsed.startDate as string) || "TBD",
      endDate: (parsed.endDate as string) || "TBD",
      status: (parsed.status as string) || "GC and Sub Bidding",
      constructionType: (parsed.constructionType as string) || "Private / Commercial",
      projectType: (parsed.projectType as string) || "New Construction",
      buildingUse: (parsed.buildingUse as string) || "Commercial",
      sectorLaborStatus: (parsed.sectorLaborStatus as string) || "Open Shop",
      trades: Array.isArray(parsed.trades) ? (parsed.trades as string[]) : [],
      totalTrades: typeof parsed.totalTrades === "number" ? parsed.totalTrades : 0,
      projectContext: (parsed.projectContext as string) || combinedText.substring(0, 5000),
    };

    return NextResponse.json({
      project,
      files: fileResults.map((f) => ({
        projectId: project.id,
        fileName: f.fileName,
        fileType: f.fileType,
        extractedText: f.extractedText.substring(0, 10000), // cap per file
      })),
    });
  } catch (error) {
    console.error("Scan project error:", error);
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
    return NextResponse.json({ error: `Scan failed: ${message}` }, { status });
  }
}
