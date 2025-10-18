-- Allow SELECT only if the user owns the record
CREATE POLICY "Users can view their own sales"
ON sales
FOR SELECT
USING (user_id = auth.uid());

-- Allow INSERT if the user sets their own user_id
CREATE POLICY "Users can insert their own sales"
ON sales
FOR INSERT
WITH CHECK (user_id = auth.uid());
