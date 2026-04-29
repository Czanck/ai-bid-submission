import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const planhubApiUrl = process.env.PLANHUB_API_URL ?? "https://api.qa.planhub.com";

  const authorization = request.headers.get("authorization");
  if (!authorization) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  try {
    const response = await fetch(`${planhubApiUrl}/api/v1/projects/get-details`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: authorization,
      },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ error: "PlanHub API unreachable" }, { status: 502 });
  }
}
