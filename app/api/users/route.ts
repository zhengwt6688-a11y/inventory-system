import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const auth = await requireAdmin();

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, email, username, role, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await req.json();

  const username = String(body.username || "").trim();
  const password = String(body.password || "").trim();
  const role = String(body.role || "user").trim() as "admin" | "user";
  const email = String(body.email || `${username}@internal.local`).trim();

  if (!username) {
    return NextResponse.json({ error: "用户名不能为空" }, { status: 400 });
  }

  if (!password || password.length < 6) {
    return NextResponse.json({ error: "密码至少 6 位" }, { status: 400 });
  }

  if (!["admin", "user"].includes(role)) {
    return NextResponse.json({ error: "角色无效" }, { status: 400 });
  }

  const { data: existingProfile } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (existingProfile) {
    return NextResponse.json({ error: "用户名已存在" }, { status: 400 });
  }

  const { data: createdUser, error: createError } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        username,
      },
    });

  if (createError || !createdUser.user) {
    return NextResponse.json(
      { error: createError?.message || "创建用户失败" },
      { status: 500 }
    );
  }

  const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
    id: createdUser.user.id,
    email,
    username,
    role,
  });

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  return NextResponse.json({
    message: "用户创建成功",
  });
}