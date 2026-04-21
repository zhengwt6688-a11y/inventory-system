import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabase
    .from("inventory_items")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const product_name = String(body.product_name || "").trim();
    const brand_name = String(body.brand_name || "").trim();
    const flavor_name = String(body.flavor_name || "").trim();
    const stock_qty = Number(body.stock_qty || 0);

    if (!product_name || !brand_name || !flavor_name) {
      return NextResponse.json(
        { error: "产品、品牌、口味不能为空" },
        { status: 400 }
      );
    }

    if (Number.isNaN(stock_qty) || stock_qty < 0) {
      return NextResponse.json(
        { error: "库存必须是大于等于 0 的数字" },
        { status: 400 }
      );
    }

    const { data: existingItem, error: findError } = await supabase
      .from("inventory_items")
      .select("*")
      .eq("product_name", product_name)
      .eq("brand_name", brand_name)
      .eq("flavor_name", flavor_name)
      .maybeSingle();

    if (findError) {
      return NextResponse.json(
        { error: findError.message },
        { status: 500 }
      );
    }

    // 如果已存在，就在原库存基础上累加
    if (existingItem) {
      const newStockQty = Number(existingItem.stock_qty || 0) + stock_qty;

      const { data: updatedItem, error: updateError } = await supabase
        .from("inventory_items")
        .update({
          stock_qty: newStockQty,
        })
        .eq("id", existingItem.id)
        .select()
        .single();

      if (updateError) {
        return NextResponse.json(
          { error: updateError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        message: "该组合已存在，库存已自动累加",
        data: updatedItem,
      });
    }

    // 如果不存在，就新增
    const { data: newItem, error: insertError } = await supabase
      .from("inventory_items")
      .insert({
        product_name,
        brand_name,
        flavor_name,
        stock_qty,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "库存添加成功",
      data: newItem,
    });
  } catch {
    return NextResponse.json(
      { error: "请求数据格式错误" },
      { status: 400 }
    );
  }
}