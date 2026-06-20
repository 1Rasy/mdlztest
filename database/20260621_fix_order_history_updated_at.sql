-- 修复：前端 store.html 的历史单据和卖进报表会按 sales_orders.updated_at 排序/筛选。
-- 如果 sales_orders 没有 updated_at，开单虽然能写入 sales_orders / sales_order_items，
-- 但网页历史账单列表会查不出来。

ALTER TABLE public.sales_orders
ADD COLUMN IF NOT EXISTS updated_at timestamptz;

UPDATE public.sales_orders
SET updated_at = COALESCE(updated_at, created_at, now())
WHERE updated_at IS NULL;

ALTER TABLE public.sales_orders
ALTER COLUMN updated_at SET DEFAULT now();

CREATE OR REPLACE FUNCTION public.set_sales_orders_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_sales_orders_updated_at ON public.sales_orders;
CREATE TRIGGER trg_set_sales_orders_updated_at
BEFORE UPDATE ON public.sales_orders
FOR EACH ROW
EXECUTE FUNCTION public.set_sales_orders_updated_at();

-- 顺手修复 submit_sales_order_v2 里 van_stocks 时间字段错误：
-- van_stocks 表是 updated_at，不是 created_at。
CREATE OR REPLACE FUNCTION public.submit_sales_order_v2(
  p_order_no text,
  p_employee_code text,
  p_atom_code text,
  p_store_name text,
  p_total_amount numeric,
  p_items jsonb,
  p_stock_updates jsonb
)
RETURNS text
LANGUAGE plpgsql
AS $function$
DECLARE
  v_item RECORD;
  v_stock RECORD;
BEGIN
  FOR v_stock IN
    SELECT * FROM jsonb_to_recordset(COALESCE(p_stock_updates, '[]'::jsonb))
      AS x(product_barcode text, qty numeric)
  LOOP
    IF COALESCE(v_stock.qty, 0) < 0 THEN
      RAISE EXCEPTION '商品 [%] 车销可用库存不足，无法提交账单！', v_stock.product_barcode;
    END IF;
  END LOOP;

  INSERT INTO public.sales_orders (
    order_no, employee_code, atom_code, store_name, total_amount, status, created_at, updated_at
  )
  VALUES (
    p_order_no, p_employee_code, p_atom_code, p_store_name, p_total_amount, 'SUCCESS', NOW(), NOW()
  )
  ON CONFLICT (order_no)
  DO UPDATE SET
    employee_code = EXCLUDED.employee_code,
    atom_code = EXCLUDED.atom_code,
    store_name = EXCLUDED.store_name,
    total_amount = EXCLUDED.total_amount,
    status = EXCLUDED.status,
    updated_at = NOW();

  DELETE FROM public.sales_order_items WHERE order_no = p_order_no;

  FOR v_item IN
    SELECT * FROM jsonb_to_recordset(COALESCE(p_items, '[]'::jsonb))
      AS x(barcode text, product_name text, qty numeric, unit_price numeric, amount numeric, remark text)
  LOOP
    INSERT INTO public.sales_order_items (
      order_no, barcode, product_name, qty, unit_price, amount, remark, created_at
    )
    VALUES (
      p_order_no,
      v_item.barcode,
      v_item.product_name,
      COALESCE(v_item.qty, 0),
      COALESCE(v_item.unit_price, 0),
      COALESCE(v_item.amount, 0),
      v_item.remark,
      NOW()
    );
  END LOOP;

  FOR v_stock IN
    SELECT * FROM jsonb_to_recordset(COALESCE(p_stock_updates, '[]'::jsonb))
      AS x(product_barcode text, qty numeric)
  LOOP
    INSERT INTO public.van_stocks (
      employee_code, product_barcode, qty, updated_at
    )
    VALUES (
      p_employee_code,
      v_stock.product_barcode,
      COALESCE(v_stock.qty, 0)::bigint,
      NOW()
    )
    ON CONFLICT (employee_code, product_barcode)
    DO UPDATE SET
      qty = EXCLUDED.qty,
      updated_at = NOW();
  END LOOP;

  RETURN 'SUCCESS';
END;
$function$;
