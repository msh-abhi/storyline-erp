import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables manually
function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const [key, ...valueParts] = trimmed.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').replace(/^["']|["']$/g, '');
      process.env[key] = value;
    }
  }
}

loadEnvFile(path.join(__dirname, '.env.local'));
loadEnvFile(path.join(__dirname, '.env'));

async function checkWelcomeEmailSettings() {
  try {
    console.log('🔍 Checking welcome email settings...\n');

    // Initialize Supabase
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase environment variables');
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🔗 Connected to Supabase\n');

    // 1. Check current settings
    console.log('📋 Checking settings table...');

    // First, check if table exists and get all columns
    const { data: settingsColumns, error: columnsError } = await supabase
      .from('settings')
      .select('*')
      .limit(1);

    if (columnsError) {
      console.log('❌ Settings table access error:', columnsError.message);
      console.log('   Table might not exist or you lack permissions\n');
    } else if (settingsColumns && settingsColumns.length > 0) {
      console.log('✅ Settings table exists');
      console.log('   Available columns:', Object.keys(settingsColumns[0]).join(', '));
      console.log('   Settings record:', settingsColumns[0]);
      console.log('');
    } else {
      console.log('⚠️  Settings table exists but is empty\n');
    }

    // Now try to get specific settings
    const { data: specificSettings, error: specificError } = await supabase
      .from('settings')
      .select('welcome_email_enabled, welcome_email_template_id')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (specificError) {
      console.log('❌ Error fetching welcome email settings:', specificError.message);
    } else if (specificSettings) {
      console.log('✅ Welcome email settings:');
      console.log('   - welcome_email_enabled:', specificSettings.welcome_email_enabled);
      console.log('   - welcome_email_template_id:', specificSettings.welcome_email_template_id);
      console.log('');
    } else {
      console.log('⚠️  No welcome email settings found\n');
    }

    // 2. Check email templates
    console.log('📧 Checking email templates...');
    const { data: templates, error: templatesError } = await supabase
      .from('email_templates')
      .select('id, name, trigger, subject')
      .eq('trigger', 'new_customer');

    if (templatesError) {
      console.log('❌ Templates error:', templatesError.message);
    } else if (templates && templates.length > 0) {
      console.log('✅ Welcome email templates found:');
      templates.forEach(template => {
        console.log(`   - ${template.name} (${template.id}): "${template.subject}"`);
      });
      console.log('');
    } else {
      console.log('⚠️  No welcome email templates found\n');
    }

    // 3. Check if welcome_email_logs table exists
    console.log('📊 Checking welcome email logs table...');
    const { data: logs, error: logsError } = await supabase
      .from('welcome_email_logs')
      .select('id')
      .limit(1);

    if (logsError) {
      console.log('❌ Welcome email logs table error:', logsError.message);
      console.log('   Table likely does not exist\n');
    } else {
      console.log('✅ Welcome email logs table exists\n');
    }

    // 4. Check recent welcome emails
    console.log('📈 Checking recent welcome email logs...');
    const { data: recentLogs, error: logsError2 } = await supabase
      .from('welcome_email_logs')
      .select(`
        id,
        sent_at,
        status,
        customers(name, email),
        email_templates(name)
      `)
      .order('sent_at', { ascending: false })
      .limit(3);

    if (logsError2) {
      console.log('❌ Error fetching recent logs:', logsError2.message);
    } else if (recentLogs && recentLogs.length > 0) {
      console.log('✅ Recent welcome emails:');
      recentLogs.forEach(log => {
        console.log(`   - ${log.customers?.name} (${log.customers?.email}): ${log.status} on ${new Date(log.sent_at).toLocaleString()}`);
      });
    } else {
      console.log('⚠️  No welcome emails have been sent yet\n');
    }

    // 5. Summary and recommendations
    console.log('📋 SUMMARY & RECOMMENDATIONS:');

    if (!settingsColumns || settingsColumns.length === 0) {
      console.log('❌ ISSUE: No settings record exists in the database');
      console.log('   🔧 SOLUTION: Create an initial settings record\n');

      // Create default settings
      console.log('🔧 Creating initial settings record...');
      const { data: newSettings, error: createSettingsError } = await supabase
        .from('settings')
        .insert({
          welcome_email_enabled: true,
          currency: 'DKK',
          language: 'en',
          company_name: 'StoryLine ERP'
        })
        .select()
        .single();

      if (createSettingsError) {
        console.log('❌ Failed to create settings:', createSettingsError.message);
      } else {
        console.log('✅ Created initial settings');
        console.log('   Settings record:', newSettings);
        console.log('');
      }
    } else if (!specificSettings || !specificSettings.welcome_email_enabled) {
      console.log('❌ ISSUE: Welcome email is NOT enabled');
      console.log('   🔧 SOLUTION: Update existing settings to enable welcome email\n');

      // Update settings to enable welcome email
      console.log('🔧 Enabling welcome email in settings...');
      const { error: updateError } = await supabase
        .from('settings')
        .update({ welcome_email_enabled: true })
        .eq('id', settingsColumns[0].id);

      if (updateError) {
        console.log('❌ Failed to enable welcome email:', updateError.message);
      } else {
        console.log('✅ Enabled welcome email in settings\n');
      }
    } else {
      console.log('✅ Welcome email is enabled');
    }

    if (!templates || templates.length === 0) {
      console.log('❌ ISSUE: No welcome email templates exist');
      console.log('   🔧 Creating a default welcome email template...\n');

      // Create default welcome template
      console.log('🔧 Creating default welcome email template...');
      const { data: newTemplate, error: createTemplateError } = await supabase
        .from('email_templates')
        .insert({
          name: 'Welcome Email',
          trigger: 'new_customer',
          subject: 'Welcome to StoryLine ERP - {{name}}!',
          content: `Dear {{name}},

Welcome to StoryLine ERP! We're excited to have you as part of our system.

Your account has been successfully created with email: {{email}}

Here are some things you can do:
- Access your customer dashboard
- View your invoices and payments
- Contact our support team

If you have any questions, please don't hesitate to reach out to us.

Best regards,
StoryLine ERP Team`
        })
        .select()
        .single();

      if (createTemplateError) {
        console.log('❌ Failed to create welcome template:', createTemplateError.message);
      } else {
        console.log('✅ Created welcome email template');
        console.log(`   Template ID: ${newTemplate.id}\n`);

        // Update settings to use this template
        console.log('🔧 Linking template to settings...');
        const { error: linkError } = await supabase
          .from('settings')
          .update({ welcome_email_template_id: newTemplate.id })
          .order('updated_at', { ascending: false })
          .limit(1);

        if (linkError) {
          console.log('⚠️  Could not link template to settings, but template was created');
        } else {
          console.log('✅ Linked template to settings');
        }
        console.log('');
      }
    } else {
      console.log('✅ Welcome email templates exist');
    }

    if (logsError) {
      console.log('❌ ISSUE: welcome_email_logs table does not exist');
      console.log('   ℹ️  This is not critical but prevents tracking');
    } else {
      console.log('✅ Welcome email logs table exists and has data');
    }

    // Final verification
    console.log('🔄 FINAL VERIFICATION:');
    const { data: finalSettings } = await supabase
      .from('settings')
      .select('welcome_email_enabled, welcome_email_template_id')
      .maybeSingle();

    const { data: finalTemplates } = await supabase
      .from('email_templates')
      .select('id, name')
      .eq('trigger', 'new_customer');

    console.log('📊 Final Status:');
    console.log(`   Welcome email enabled: ${finalSettings?.welcome_email_enabled ? '✅ YES' : '❌ NO'}`);
    console.log(`   Templates available: ${finalTemplates?.length > 0 ? `✅ YES (${finalTemplates.length} templates)` : '❌ NO'}`);
    console.log(`   Welcome email ready: ${finalSettings?.welcome_email_enabled && finalTemplates?.length > 0 ? '✅ YES' : '❌ NO'}`);

  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

checkWelcomeEmailSettings().then(() => {
  console.log('\n🎯 Welcome email configuration check completed');
  process.exit(0);
}).catch(err => {
  console.error('\n💥 Script failed:', err);
  process.exit(1);
});
