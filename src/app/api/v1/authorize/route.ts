import { NextResponse } from "next/server";
import { userIdForKey } from "@/lib/api-keys";
import { CheckError, runCheck, type CheckInput } from "@/lib/risk-engine";

export async function POST(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const userId = token ? await userIdForKey(token) : null;
  if (!userId) {
    return NextResponse.json({ error: "Missing or invalid API key" }, { status: 401 });
  }

  let body: CheckInput;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body must be JSON" }, { status: 400 });
  }

  try {
    const { eventId, ...result } = await runCheck(userId, body, "api");
    return NextResponse.json({ id: eventId, ...result });
  } catch (e) {
    if (e instanceof CheckError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
