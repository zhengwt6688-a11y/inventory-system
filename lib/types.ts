export type InventoryRow = {
  variant_id: number;
  product_id: number;
  product_name: string;
  flavor_name: string;
  stock_qty: number;
  warning_qty: number;
  updated_at: string;
};

export type Product = {
  id: number;
  name: string;
};

export type Variant = {
  id: number;
  product_id: number;
  flavor_name: string;
  stock_qty: number;
  warning_qty: number;
};