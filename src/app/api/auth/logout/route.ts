import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const planhubApiUrl = process.env.PLANHUB_API_URL;
  if (!planhubApiUrl) {
    return NextResponse.json({});
  }

  try {
    const body = await request.json();
    await fetch(`${planhubApiUrl}/api/v1/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    // best-effort
  }
  return NextResponse.json({});
}
