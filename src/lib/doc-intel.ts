const DOC_INTEL_BASE_URL = "https://doc-intel-api.qa.planhub.com";

/**
 * Fetches project context from the doc-intel RAG API.
 * Returns the source text chunks joined as a single string,
 * or an empty string if the project has no indexed documents or the API is unavailable.
 *
 * Response shape (from doc-intel API):
 *   { answer: string; sources: Array<{ text: string; score: number }> }
 */
export async function fetchProjectContext(projectId: string): Promise<string> {
  if (!projectId) return "";

  const query =
    "What are the project specifications, scope of work, required trades, bidding requirements, certifications, insurance, and bonding requirements?";

  try {
    const response = await fetch(
      `${DOC_INTEL_BASE_URL}/projects/${encodeURIComponent(projectId)}/query`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, top_k: 5 }),
      },
    );

    if (!response.ok) {
      console.warn(`[fetchProjectContext] ${projectId} → HTTP ${response.status}`);
      return "";
    }

    const data = await response.json() as {
      answer?: string;
      sources?: Array<{ text: string; score: number }>;
    };

    const chunks = (data.sources ?? []).map((s) => s.text).filter(Boolean);
    if (chunks.length === 0 && data.answer) {
      return data.answer;
    }
    return chunks.join("\n\n");
  } catch (err) {
    console.warn("[fetchProjectContext] error:", err);
    return "";
  }
}
