import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getCurrentOperator } from "@/lib/auth";
import { getAccessibleBrands } from "@/lib/brandAccess";

export const dynamic = "force-dynamic";

export async function GET() {
  const operator = await getCurrentOperator();

  if (!operator) {
    return NextResponse.json(
      { error: "未登录" },
      { status: 401 }
    );
  }

  const access = await getAccessibleBrands(operator);

  if (!access.isAdmin) {
    return NextResponse.json(
      { error: "只有管理员可以读取供应商列表" },
      { status: 403 }
    );
  }

  /*
   * profiles 表假设包含：
   * id
   * username
   * role
   *
   * 如果你的用户名字段不是 username，
   * 请把下面的 username 替换成实际字段名。
   */
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, role")
    .eq("role", "user")
    .order("username", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: error.message || "读取供应商失败" },
      { status: 500 }
    );
  }

  const suppliers = (data || [])
    .filter((item: any) => Boolean(item.username))
    .map((item: any) => ({
      id: item.id,
      username: item.username,
      role: item.role,
    }));

  return NextResponse.json(suppliers);
}