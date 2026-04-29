import { NextResponse } from "next/server";

const DOC_INTEL_API_URL =
  process.env.DOC_INTEL_API_URL ?? "https://doc-intel-api.qa.planhub.com";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");

  if (!projectId) {
    return NextResponse.json({ error: "projectId required" }, { status: 400 });
  }

  try {
    const response = await fetch(
      `${DOC_INTEL_API_URL}/projects/${projectId}/documents`,
      { headers: { Accept: "application/json" } },
    );
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ error: "Doc Intel API unreachable" }, { status: 502 });
  }
}
