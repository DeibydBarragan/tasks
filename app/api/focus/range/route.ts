import { NextResponse } from "next/server";
import { getFocusRange } from "@/actions/focus";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from") ?? new Date(0).toISOString();
  const to = searchParams.get("to") ?? new Date().toISOString();
  const sessions = await getFocusRange(from, to);
  return NextResponse.json({ sessions });
}
