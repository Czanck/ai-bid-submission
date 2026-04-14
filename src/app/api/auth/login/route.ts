import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const planhubApiUrl = process.env.PLANHUB_API_URL;
  if (!planhubApiUrl) {
    return NextResponse.json(
      { error: "PLANHUB_API_URL not configured" },
      { status: 500 },
    );
  }

  const body = await request.json();
  try {
    const response = await fetch(`${planhubApiUrl}/api/v1/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json(
      { error: "PlanHub API unreachable" },
      { status: 502 },
    );
  }
}
