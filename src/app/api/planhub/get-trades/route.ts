import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const planhubApiUrl = process.env.PLANHUB_API_URL;
  if (!planhubApiUrl) {
    return NextResponse.json({ error: "PLANHUB_API_URL not configured" }, { status: 500 });
  }

  const authorization = request.headers.get("authorization");
  if (!authorization) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const response = await fetch(`${planhubApiUrl}/api/v1/projects/get-trades`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: authorization,
      },
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ error: "PlanHub API unreachable" }, { status: 502 });
  }
}
