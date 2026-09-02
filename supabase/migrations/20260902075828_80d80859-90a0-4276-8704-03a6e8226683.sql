CREATE POLICY "No client access to orders" ON public.orders AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "No client access to order items" ON public.order_items AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "No client access to product delivery" ON public.product_delivery AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
