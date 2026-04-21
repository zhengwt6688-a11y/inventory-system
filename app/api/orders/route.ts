import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data, error } = await supabase
    .from("orders")
    .select(`
      id,
      order_no,
      customer_info,
      remark,
      created_by,
      created_user_id,
      updated_by,
      updated_user_id,
      updated_at,
      total_qty,
      created_at,
      order_items (
        id,
        inventory_item_id,
        product_name,
        brand_name,
        flavor_name,
        qty,
        created_at
      )
    `)
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

  const operator = auth.operator;

  try {
    const body = await req.json();

    const order_no = String(body.order_no || "").trim();
    const customer_info = String(body.customer_info || "").trim();
    const remark = String(body.remark || "").trim();
    const items = Array.isArray(body.items) ? body.items : [];

    if (!order_no) {
      return NextResponse.json({ error: "订单号不能为空" }, { status: 400 });
    }

    if (!customer_info) {
      return NextResponse.json({ error: "客户信息不能为空" }, { status: 400 });
    }

    if (!items.length) {
      return NextResponse.json({ error: "请至少添加一个商品" }, { status: 400 });
    }

    const { data, error } = await supabase.rpc("create_order_with_inventory_items", {
      p_order_no: order_no,
      p_customer_info: customer_info,
      p_remark: remark || null,
      p_created_by: operator.displayName,
      p_items: items,
    });

    if (error) {
      return NextResponse.json(
        {
          error: error.message,
          details: error.details ?? null,
          hint: error.hint ?? null,
          code: error.code ?? null,
        },
        { status: 500 }
      );
    }

    await supabase
      .from("orders")
      .update({
        created_user_id: operator.userId,
        updated_by: operator.displayName,
        updated_user_id: operator.userId,
      })
      .eq("id", data);

    return NextResponse.json({
      message: "订单创建成功，库存已实时扣减",
      order_id: data,
    });
  } catch {
    return NextResponse.json({ error: "请求数据格式错误" }, { status: 400 });
  }
}