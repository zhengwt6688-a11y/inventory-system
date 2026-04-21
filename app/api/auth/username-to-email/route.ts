import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const username = String(body.username || "").trim();

    if (!username) {
      return NextResponse.json({ error: "用户名不能为空" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("email, username, role")
      .eq("username", username)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data?.email) {
      return NextResponse.json({ error: "用户名不存在" }, { status: 404 });
    }

    return NextResponse.json({
      email: data.email,
      username: data.username,
      role: data.role,
    });
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }
}