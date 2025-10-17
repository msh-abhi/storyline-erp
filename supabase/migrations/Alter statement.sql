ALTER POLICY "Admin full access on customers" ON public.customers USING (is_admin_v2());
ALTER POLICY "Admin full access on resellers" ON public.resellers USING (is_admin_v2());
ALTER POLICY "Admin full access on suppliers" ON public.suppliers USING (is_admin_v2());
ALTER POLICY "Admin full access on digital_codes" ON public.digital_codes USING (is_admin_v2());
ALTER POLICY "Admin full access on tv_boxes" ON public.tv_boxes USING (is_admin_v2());
ALTER POLICY "Admin full access on sales" ON public.sales USING (is_admin_v2());
ALTER POLICY "Admin full access on purchases" ON public.purchases USING (is_admin_v2());
ALTER POLICY "Admin full access on email_templates" ON public.email_templates USING (is_admin_v2());
ALTER POLICY "Admin full access on subscriptions" ON public.subscriptions USING (is_admin_v2());
ALTER POLICY "Admin full access on subscription_products" ON public.subscription_products USING (is_admin_v2());
ALTER POLICY "Admin full access on settings" ON public.settings USING (is_admin_v2());
ALTER POLICY "Admin full access on invoices" ON public.invoices USING (is_admin_v2());
ALTER POLICY "Admin full access on payment_transactions" ON public.payment_transactions USING (is_admin_v2());
ALTER POLICY "Admin full access on payments" ON public.payments USING (is_admin_v2());
ALTER POLICY "Admin full access on woocommerce_orders" ON public.woocommerce_orders USING (is_admin_v2());
ALTER POLICY "Admin full access on woocommerce_products" ON public.woocommerce_products USING (is_admin_v2());
ALTER POLICY "Admin full access on woocommerce_subscriptions" ON public.woocommerce_subscriptions USING (is_admin_v2());
ALTER POLICY "Admin full access on woocommerce_sync_log" ON public.woocommerce_sync_log USING (is_admin_v2());
ALTER POLICY "Admin full access on exchange_rates" ON public.exchange_rates USING (is_admin_v2());
ALTER POLICY "Admin full access on email_logs" ON public.email_logs USING (is_admin_v2());
ALTER POLICY "Admin full access on activity_logs" ON public.activity_logs USING (is_admin_v2());
ALTER POLICY "Admin full access on credit_sales" ON public.credit_sales USING (is_admin_v2());
ALTER POLICY "Admin full access on reseller_credits" ON public.reseller_credits USING (is_admin_v2());
ALTER POLICY "Admin full access on supplier_credits" ON public.supplier_credits USING (is_admin_v2());
ALTER POLICY "Admins can manage all user profiles" ON public.users USING (is_admin_v2());
ALTER POLICY "Admins can view all portal records" ON public.customer_portal_users USING (is_admin_v2());
ALTER POLICY "Admins can manage all credentials" ON public.customer_credentials USING (is_admin_v2());
ALTER POLICY "Admins can manage all messages" ON public.customer_messages USING (is_admin_v2());


DROP FUNCTION public.is_admin();

ALTER FUNCTION public.is_admin_v2() RENAME TO is_admin;

-- Test the renamed function again
SELECT public.is_admin();