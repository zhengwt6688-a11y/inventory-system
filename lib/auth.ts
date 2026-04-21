import { createClient } from "@/utils/supabase/server";

export type CurrentOperator = {
  userId: string;
  email: string;
  displayName: string;
  username: string | null;
  role: "admin" | "user";
};

export async function getCurrentOperator(): Promise<CurrentOperator | null> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name, email, role")
    .eq("id", user.id)
    .maybeSingle();

  return {
    userId: user.id,
    email: user.email || "",
    displayName:
      profile?.username ||
      profile?.display_name ||
      user.email ||
      "unknown",
    username: profile?.username || null,
    role: (profile?.role as "admin" | "user") || "user",
  };
}

export async function requireAdmin() {
  const operator = await getCurrentOperator();

  if (!operator) {
    return {
      ok: false as const,
      status: 401,
      error: "未登录",
    };
  }

  if (operator.role !== "admin") {
    return {
      ok: false as const,
      status: 403,
      error: "没有权限",
    };
  }

  return {
    ok: true as const,
    operator,
  };
}