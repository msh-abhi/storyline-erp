import { corsHeaders } from '../_shared/cors.ts';

const BREVO_API_KEY = Deno.env.get('SENDINBLUE_API_KEY'); // For Deno/Supabase Functions
const DEFAULT_SENDER_EMAIL = 'kontakt@jysk-streaming.fun';
const DEFAULT_SENDER_NAME = 'Jysk Streaming';

interface EmailRequest {
  to: string;
  subject: string;
  content: string;
  templateData?: Record<string, string>;
  senderName?: string;
  senderEmail?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { 
      to, 
      subject, 
      content, 
      templateData = {},
      senderName,
      senderEmail
    }: EmailRequest = await req.json();

    // Use provided sender details or fallback to defaults
    const finalSenderName = senderName || DEFAULT_SENDER_NAME;
    const finalSenderEmail = senderEmail || DEFAULT_SENDER_EMAIL;

    // Replace template placeholders
    let processedContent = content;
    Object.entries(templateData).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      processedContent = processedContent.replace(new RegExp(placeholder, 'g'), value);
    });

    // Add default placeholders
    processedContent = processedContent.replace(/{{date}}/g, new Date().toLocaleDateString());
    processedContent = processedContent.replace(/{{company}}/g, finalSenderName);

    const emailData = {
      sender: {
        name: finalSenderName,
        email: finalSenderEmail
      },
      to: [
        {
          email: to,
          name: templateData.name || to
        }
      ],
      subject: subject,
      htmlContent: `
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h2 style="color: #2563eb; margin: 0;">${finalSenderName}</h2>
              </div>
              <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb;">
                ${processedContent.replace(/\n/g, '<br>')}
              </div>
              <div style="margin-top: 20px; padding: 20px; background: #f8f9fa; border-radius: 8px; text-align: center;">
                <p style="margin: 0; color: #6b7280; font-size: 14px;">
                  Best regards,<br>
                  ${finalSenderName} Team<br>
                  <a href="mailto:${finalSenderEmail}" style="color: #2563eb;">${finalSenderEmail}</a>
                </p>
              </div>
            </div>
          </body>
        </html>
      `
    };

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': BREVO_API_KEY
      },
      body: JSON.stringify(emailData)
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Brevo API error: ${response.status} - ${errorData}`);
    }

    const result = await response.json();

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: result.messageId,
        message: 'Email sent successfully' 
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );

  } catch (error) {
    console.error('Email sending error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to send email' 
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
});