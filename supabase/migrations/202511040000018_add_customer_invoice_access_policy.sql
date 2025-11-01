-- Add RLS policy to allow customers to view their own invoices
CREATE POLICY "Customers can view their own invoices" ON invoices 
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM customer_portal_users 
    WHERE customer_portal_users.customer_id = invoices.customer_id 
    AND customer_portal_users.auth_provider_id = auth.uid()
  )
);

-- Admins can still manage all invoices
CREATE POLICY "Admins can manage all invoices" ON invoices 
FOR ALL USING (is_admin());