import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabase
    .from("product_variants")
    .select(`
      id,
      product_id,
      flavor_name,
      stock_qty,
      warning_qty,
      updated_at,
      products(name)
    `)
    .order("id", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data || []).map((item: any) => ({
    variant_id: item.id,
    product_id: item.product_id,
    product_name: item.products?.name || "",
    flavor_name: item.flavor_name,
    stock_qty: item.stock_qty,
    warning_qty: item.warning_qty,
    updated_at: item.updated_at,
  }));

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const { data, error } = await supabase
    .from("product_variants")
    .insert({
      product_id: body.product_id,
      flavor_name: body.flavor_name,
      stock_qty: body.stock_qty ?? 0,
      warning_qty: body.warning_qty ?? 10,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}