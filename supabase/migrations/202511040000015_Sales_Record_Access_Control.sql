-- Allow SELECT only if the user owns the record
DROP POLICY IF EXISTS "Users can view their own sales" ON sales;
CREATE POLICY "Users can view their own sales"
ON sales
FOR SELECT
USING (user_id = auth.uid());

-- Allow INSERT if the user sets their own user_id
DROP POLICY IF EXISTS "Users can insert their own sales" ON sales;
CREATE POLICY "Users can insert their own sales"
ON sales
FOR INSERT
WITH CHECK (user_id = auth.uid());
