import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requireAdmin();

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  const body = await req.json();

  const role = String(body.role || "").trim();
  const newPassword = String(body.password || "").trim();

  if (role && !["admin", "user"].includes(role)) {
    return NextResponse.json({ error: "角色无效" }, { status: 400 });
  }

  if (role) {
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ role })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  if (newPassword) {
    if (newPassword.length < 6) {
      return NextResponse.json({ error: "密码至少 6 位" }, { status: 400 });
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(id, {
      password: newPassword,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    message: "用户已更新",
  });
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const auth = await requireAdmin();

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;

  if (id === auth.operator.userId) {
    return NextResponse.json({ error: "不能删除当前登录账号" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.auth.admin.deleteUser(id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabaseAdmin.from("profiles").delete().eq("id", id);

  return NextResponse.json({
    message: "用户已删除",
  });
}