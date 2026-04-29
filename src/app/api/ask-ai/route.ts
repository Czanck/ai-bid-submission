import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { fetchProjectContext } from "@/lib/doc-intel";

export const runtime = "nodejs";
export const maxDuration = 60;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? "" });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, history, projectId, projectContext } = body as {
      message: string;
      history: { role: "user" | "assistant"; content: string }[];
      projectId?: string;
      projectContext?: string;
    };

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Resolve project context: prefer explicitly passed context, then fetch from doc-intel
    const context = projectContext || (projectId ? await fetchProjectContext(projectId) : "");

    const systemPrompt = `You are an expert AI construction bid advisor embedded in a bid management platform (PlanHub). You help subcontractors understand project requirements, improve their bids, identify risks, and answer questions about the project specifications.

You have access to the following project context:

${context || "No project context available."}

Guidelines:
- Be SHORT. 3–5 bullet points max. No numbered multi-paragraph essays.
- Each bullet: 1–2 sentences. Direct, actionable, plain language.
- Skip obvious steps like "review the drawings" or "communicate with the team" — the user already knows that.
- Focus on what specifically to do or change in their bid.
- If referencing specs or drawings, mention them briefly inline — don't dedicate a bullet to "go look at Drawing X."
- If asked about something not in the project context, say so in one sentence.
- Total response: under 100 words unless the user explicitly asks for more detail.`;

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...(history || []).map((h) => ({
        role: h.role as "user" | "assistant",
        content: h.content,
      })),
      { role: "user", content: message },
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      temperature: 0.3,
      max_tokens: 400,
    });

    const reply = completion.choices[0]?.message?.content ?? "Sorry, I couldn't generate a response.";

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("Ask AI error:", err);
    return NextResponse.json(
      { error: "Failed to get AI response" },
      { status: 500 }
    );
  }
}
