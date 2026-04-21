import { NextResponse } from "next/server";
import { getCurrentOperator } from "@/lib/auth";

export async function GET() {
  const operator = await getCurrentOperator();

  if (!operator) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  return NextResponse.json(operator);
}