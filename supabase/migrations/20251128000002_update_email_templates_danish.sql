-- Update email templates with Danish content and improved structure
-- This migration updates both welcome email and credentials email templates

-- Update existing welcome email template with Danish content
UPDATE email_templates 
SET 
  name = 'Welcome New Customer - Danish',
  subject = 'Velkommen til Jysk-Streaming!',
  content = 'Kære {{name}},

Velkommen til Jysk-Streaming! Vi er utrolig glade for, at du har valgt os til at levere underholdning lige til din stue.

Vi tilbyder:
• Personlig service – Du kan altid regne med, at vi står klar til at hjælpe dig
• Ægte jysk hygge – Vi sætter pris på nærvær og gode oplevelser
• Stort udvalg – Film, serier, sport og dokumentarer til hele familien
• Skræddersyet til dig – Vi arbejder hver dag på at gøre din oplevelse bedre og mere personlig

Kontakt os:
📧 kontakt@jysk-streaming.fun
💬 +45 91624906

Endnu en gang – velkommen til Jysk-Streaming! Vi glæder os til at være din streamingpartner.

Med venlig hilsen,
Jysk-Streaming Teamet',
  updated_at = NOW()
WHERE trigger = 'new_customer';

-- Create credentials email template if it doesn't exist
INSERT INTO email_templates (id, name, subject, content, trigger, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  'IPTV Credentials - Danish',
  'Dine IPTV-oplysninger - Jysk-Streaming',
  'Hej {{name}},

Her er dine IPTV-oplysninger. Gem disse oplysninger sikkert.

Server URL: {{serverUrl}}
Server ID: {{serverId}}
Password: {{password}}
MAC Address: {{macAddress}}
Expires: {{expiresAt}}

Har du brug for hjælp?
📧 kontakt@jysk-streaming.fun
💬 +45 91624906

Med venlig hilsen,
Jysk-Streaming Teamet',
  'credentials_created',
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM email_templates WHERE trigger = 'credentials_created'
);

-- Create credentials updated template if it doesn't exist
INSERT INTO email_templates (id, name, subject, content, trigger, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  'IPTV Credentials Updated - Danish',
  'Dine IPTV-oplysninger er opdateret - Jysk-Streaming',
  'Hej {{name}},

Dine IPTV-oplysninger er blevet opdateret. Her er de nye oplysninger:

Server URL: {{serverUrl}}
Server ID: {{serverId}}
Password: {{password}}
MAC Address: {{macAddress}}
Expires: {{expiresAt}}

Har du brug for hjælp?
📧 kontakt@jysk-streaming.fun
💬 +45 91624906

Med venlig hilsen,
Jysk-Streaming Teamet',
  'credentials_updated',
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM email_templates WHERE trigger = 'credentials_updated'
);

-- Create credentials deleted template if it doesn't exist
INSERT INTO email_templates (id, name, subject, content, trigger, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  'IPTV Credentials Deleted - Danish',
  'Dine IPTV-oplysninger er fjernet - Jysk-Streaming',
  'Hej {{name}},

Dine IPTV-oplysninger er blevet fjernet.

Hvis du tror dette er en fejl, eller du har brug for nye oplysninger, kontakt venligst vores supportteam.

Har du brug for hjælp?
📧 kontakt@jysk-streaming.fun
💬 +45 91624906

Med venlig hilsen,
Jysk-Streaming Teamet',
  'credentials_deleted',
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM email_templates WHERE trigger = 'credentials_deleted'
);

-- Update settings to use Danish welcome email template
UPDATE settings 
SET welcome_email_template_id = (
  SELECT id FROM email_templates 
  WHERE trigger = 'new_customer' 
  AND name LIKE '%Danish%'
  ORDER BY updated_at DESC 
  LIMIT 1
)
WHERE id = (SELECT id FROM settings ORDER BY updated_at DESC LIMIT 1);

-- Add comment to track this migration
COMMENT ON TABLE email_templates IS 'Updated with Danish content templates on 2025-11-28';