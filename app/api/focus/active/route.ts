import { NextResponse } from "next/server";
import { getActiveFocusInternal } from "@/actions/focus";

export async function GET() {
  const active = await getActiveFocusInternal();
  return NextResponse.json({ active });
}
