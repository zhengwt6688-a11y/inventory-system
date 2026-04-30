import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getCurrentOperator } from "@/lib/auth";
import { getAccessibleBrands } from "@/lib/brandAccess";

export async function GET() {
  const operator = await getCurrentOperator();

  if (!operator) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const access = await getAccessibleBrands(operator);

    let query = supabase
      .from("inventory_items")
      .select("id, product_name, brand_name, flavor_name, stock_qty, updated_at")
      .gt("stock_qty", 0)
      .order("brand_name", { ascending: true })
      .order("product_name", { ascending: true });

    if (!access.isAdmin) {
      if (!access.brands.length) {
        return NextResponse.json([]);
      }

      query = query.in("brand_name", access.brands);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "读取商品选项失败" },
      { status: 500 }
    );
  }
}