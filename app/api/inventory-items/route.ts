import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getCurrentOperator, requireAdmin } from "@/lib/auth";
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
      .select("*")
      .order("updated_at", { ascending: false });

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
      { error: error.message || "读取库存失败" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();

    const product_name = String(body.product_name || "").trim();
    const brand_name = String(body.brand_name || "").trim();
    const flavor_name = String(body.flavor_name || "").trim();
    const stock_qty = Number(body.stock_qty || 0);

    if (!product_name) {
      return NextResponse.json({ error: "产品不能为空" }, { status: 400 });
    }

    if (!brand_name) {
      return NextResponse.json({ error: "品牌不能为空" }, { status: 400 });
    }

    if (!flavor_name) {
      return NextResponse.json({ error: "口味不能为空" }, { status: 400 });
    }

    const { data: existing, error: findError } = await supabase
      .from("inventory_items")
      .select("id, stock_qty")
      .eq("product_name", product_name)
      .eq("brand_name", brand_name)
      .eq("flavor_name", flavor_name)
      .maybeSingle();

    if (findError) {
      return NextResponse.json({ error: findError.message }, { status: 500 });
    }

    if (existing) {
      const { error } = await supabase
        .from("inventory_items")
        .update({
          stock_qty: Number(existing.stock_qty || 0) + stock_qty,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ message: "库存已累加" });
    }

    const { error } = await supabase.from("inventory_items").insert({
      product_name,
      brand_name,
      flavor_name,
      stock_qty,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: "库存添加成功" });
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }
}