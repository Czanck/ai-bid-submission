const DOC_INTEL_BASE_URL = "https://doc-intel-api.qa.planhub.com";

/**
 * Fetches project context from the doc-intel RAG API.
 * Returns the source text chunks joined as a single string,
 * or an empty string if the project has no indexed documents or the API is unavailable.
 *
 * Response shape (from doc-intel API):
 *   { answer: string; sources: Array<{ text: string; score: number }> }
 */
/**
 * Queries doc-intel with the user's message to get relevant project chunks for chat.
 * Falls back to the generic context query if no custom query is provided.
 */
export async function queryProjectContext(projectId: string, query: string, authToken?: string): Promise<string> {
  if (!projectId) return "";

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (authToken) headers["Authorization"] = `Bearer ${authToken}`;

  try {
    const response = await fetch(
      `${DOC_INTEL_BASE_URL}/projects/${encodeURIComponent(projectId)}/query`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ query, top_k: 5 }),
      },
    );

    if (!response.ok) {
      console.warn(`[queryProjectContext] ${projectId} → HTTP ${response.status}`);
      return "";
    }

    const data = await response.json() as {
      answer?: string;
      sources?: Array<{ text: string; score: number }>;
    };

    console.log(`[queryProjectContext] ${projectId} → sources: ${(data.sources ?? []).length}, answer: ${data.answer ? "yes" : "no"}`);

    const chunks = (data.sources ?? []).map((s) => s.text).filter(Boolean);
    if (chunks.length === 0 && data.answer) return data.answer;
    return chunks.join("\n\n");
  } catch (err) {
    console.warn("[queryProjectContext] error:", err);
    return "";
  }
}

export async function fetchProjectContext(projectId: string, authToken?: string): Promise<string> {
  if (!projectId) return "";

  const query =
    "What are the project specifications, scope of work, required trades, bidding requirements, certifications, insurance, and bonding requirements?";

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (authToken) headers["Authorization"] = `Bearer ${authToken}`;

  try {
    const response = await fetch(
      `${DOC_INTEL_BASE_URL}/projects/${encodeURIComponent(projectId)}/query`,
      {
        method: "POST",
        headers,
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

    console.log(`[fetchProjectContext] ${projectId} → sources: ${(data.sources ?? []).length}, answer: ${data.answer ? "yes" : "no"}`);

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
