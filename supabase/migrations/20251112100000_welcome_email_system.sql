-- Create welcome email logs table
CREATE TABLE IF NOT EXISTS welcome_email_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
    message_id VARCHAR(255), -- Brevo/SendGrid message ID
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'sent',
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_welcome_email_logs_customer_id ON welcome_email_logs(customer_id);
CREATE INDEX IF NOT EXISTS idx_welcome_email_logs_sent_at ON welcome_email_logs(sent_at);
CREATE INDEX IF NOT EXISTS idx_welcome_email_logs_status ON welcome_email_logs(status);

-- Add welcome email settings to settings table
ALTER TABLE settings ADD COLUMN IF NOT EXISTS welcome_email_enabled BOOLEAN DEFAULT false;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS welcome_email_template_id UUID REFERENCES email_templates(id);

-- Create function to automatically send welcome emails
CREATE OR REPLACE FUNCTION send_welcome_email_to_customer()
RETURNS TRIGGER AS $$
DECLARE
    template_data JSON;
    email_subject TEXT;
    email_content TEXT;
    template_record RECORD;
BEGIN
    -- Only send welcome email if enabled in settings
    IF NOT (SELECT welcome_email_enabled FROM settings LIMIT 1) THEN
        RETURN NEW;
    END IF;

    -- Get welcome email template
    SELECT et.* INTO template_record
    FROM email_templates et
    JOIN settings s ON s.welcome_email_template_id = et.id OR et.trigger = 'new_customer'
    WHERE et.trigger = 'new_customer'
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE NOTICE 'No welcome email template found';
        RETURN NEW;
    END IF;

    -- Prepare template data
    template_data = json_build_object(
        'name', NEW.name,
        'email', NEW.email,
        'date', CURRENT_DATE::TEXT,
        'company', 'StoryLine ERP',
        'customer_id', NEW.id,
        'phone', COALESCE(NEW.phone, ''),
        'address', COALESCE(NEW.address, '')
    );

    -- Log the welcome email attempt
    INSERT INTO welcome_email_logs (customer_id, template_id, status)
    VALUES (NEW.id, template_record.id, 'pending');

    -- Note: Actual email sending would be handled by application logic
    -- This trigger just logs the attempt. The email sending is triggered
    -- by the application after successful customer creation.

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic welcome email logging
DROP TRIGGER IF EXISTS trigger_welcome_email_on_customer_create ON customers;
CREATE TRIGGER trigger_welcome_email_on_customer_create
    AFTER INSERT ON customers
    FOR EACH ROW
    EXECUTE FUNCTION send_welcome_email_to_customer();

-- Create function to get welcome email statistics
CREATE OR REPLACE FUNCTION get_welcome_email_stats()
RETURNS JSON AS $$
DECLARE
    total_sent INTEGER;
    this_month_sent INTEGER;
    recent_logs JSON;
BEGIN
    -- Total welcome emails sent
    SELECT COUNT(*) INTO total_sent
    FROM welcome_email_logs
    WHERE status = 'sent';

    -- Welcome emails sent this month
    SELECT COUNT(*) INTO this_month_sent
    FROM welcome_email_logs
    WHERE status = 'sent'
      AND date_trunc('month', sent_at) = date_trunc('month', CURRENT_DATE);

    -- Recent logs
    SELECT json_agg(
        json_build_object(
            'id', wel.id,
            'status', wel.status,
            'sent_at', wel.sent_at,
            'customer_name', c.name,
            'customer_email', c.email,
            'template_name', et.name
        )
    ) INTO recent_logs
    FROM welcome_email_logs wel
    LEFT JOIN customers c ON wel.customer_id = c.id
    LEFT JOIN email_templates et ON wel.template_id = et.id
    ORDER BY wel.sent_at DESC
    LIMIT 10;

    RETURN json_build_object(
        'totalSent', total_sent,
        'thisMonth', this_month_sent,
        'recentLogs', COALESCE(recent_logs, '[]'::json)
    );
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT, INSERT ON welcome_email_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON welcome_email_logs TO service_role;