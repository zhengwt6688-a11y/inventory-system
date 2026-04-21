import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerSupabase } from "@/utils/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const username = String(body.username || "").trim();
    const password = String(body.password || "").trim();

    if (!username) {
      return NextResponse.json({ error: "用户名不能为空" }, { status: 400 });
    }

    if (!password) {
      return NextResponse.json({ error: "密码不能为空" }, { status: 400 });
    }

    const supabase = await createServerSupabase();

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email, username")
      .eq("username", username)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    if (!profile?.email) {
      return NextResponse.json({ error: "用户名不存在" }, { status: 400 });
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: profile.email,
      password,
    });

    if (signInError) {
      return NextResponse.json({ error: signInError.message || "登录失败" }, { status: 400 });
    }

    return NextResponse.json({
      message: "登录成功",
      username: profile.username,
    });
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }
}