import { supabase } from './supabase';
import { type UploadedFile } from './supabase';

interface EmailData {
  to: string;
  subject: string;
  html: string;
}

interface ChecklistItem {
  title: string;
  description?: string;
}

export const sendClientOnboardingEmail = async (
  clientName: string,
  clientEmail: string,
  welcomeMessage: string,
  checklistItems: ChecklistItem[],
  kickoffFiles: UploadedFile[]
): Promise<void> => {
  const emailHtml = generateOnboardingEmailTemplate(
    clientName,
    welcomeMessage,
    checklistItems,
    kickoffFiles
  );

  const emailPayload = {
    to: clientEmail,
    subject: `Welcome to AxeGen AI - Your Onboarding Journey Begins`,
    html: emailHtml,
  };

  try {
    // Invoke the Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('send-onboarding-email', {
      body: emailPayload,
    });

    if (error) {
      console.error('Supabase Edge Function error:', error);
      throw new Error(`Failed to send email via Edge Function: ${error.message}`);
    }

    if (data && data.error) {
      console.error('Resend API error from Edge Function:', data.error);
      throw new Error(`Email service error: ${data.error}`);
    }

    console.log('Email sent successfully via Edge Function:', data);
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

const generateOnboardingEmailTemplate = (
  clientName: string,
  welcomeMessage: string,
  checklistItems: ChecklistItem[],
  kickoffFiles: UploadedFile[]
): string => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to AxeGen AI</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #1e293b;
            background-color: #f8fafc;
        }
        
        a {
            color: #2563eb;
            text-decoration: none;
        }
        
        a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <!-- Main Container Table -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 20px 0;">
        <tr>
            <td align="center">
                <table width="680" cellpadding="0" cellspacing="0" style="background-color: #ffffff; max-width: 680px;">
                    
                    <!-- Header Section -->
                    <tr>
                        <td style="background-color: #2563eb; padding: 60px 40px; text-align: center;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td style="color: #ffffff; font-size: 42px; font-weight: 800; letter-spacing: -1px; margin-bottom: 12px; text-align: center;">
                                        AxeGen AI
                                    </td>
                                </tr>
                                <tr>
                                    <td style="color: #ffffff; font-size: 18px; font-weight: 500; text-align: center; padding-top: 8px;">
                                        Strategic Consulting Excellence
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Main Content Section -->
                    <tr>
                        <td style="padding: 60px 50px;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                
                                <!-- Greeting -->
                                <tr>
                                    <td style="font-size: 28px; font-weight: 700; color: #1e293b; margin-bottom: 30px; padding-bottom: 30px;">
                                        Welcome, ${clientName}!
                                    </td>
                                </tr>
                                
                                <!-- Welcome Message -->
                                <tr>
                                    <td style="font-size: 17px; line-height: 1.7; color: #475569; padding-bottom: 50px;">
                                        ${welcomeMessage}
                                    </td>
                                </tr>
                                
                                <!-- Divider -->
                                <tr>
                                    <td style="height: 1px; background: linear-gradient(90deg, transparent, #e2e8f0, transparent); margin: 40px 0; padding-bottom: 40px;"></td>
                                </tr>
                                
                                ${kickoffFiles.length > 0 ? `
                                <!-- Supporting Documents Section -->
                                <tr>
                                    <td style="padding-bottom: 30px;">
                                        <table width="100%" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td style="vertical-align: middle; width: 50px;">
                                                    <table cellpadding="0" cellspacing="0">
                                                        <tr>
                                                            <td style="width: 36px; height: 36px; background-color: #10b981; border-radius: 50%; text-align: center; vertical-align: middle; color: white; font-size: 18px; font-weight: bold; line-height: 36px;">
                                                                &#128196;
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                                <td style="font-size: 24px; font-weight: 700; color: #1e293b; vertical-align: middle; padding-left: 16px;">
                                                    Supporting Resources
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                                
                                <!-- Supporting Documents List -->
                                <tr>
                                    <td style="padding-bottom: 40px;">
                                        ${kickoffFiles.map(file => `
                                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0fdf4; border: 1px solid #bbf7d0; margin-bottom: 16px;">
                                                <tr>
                                                    <td style="padding: 20px;">
                                                        <table width="100%" cellpadding="0" cellspacing="0">
                                                            <tr>
                                                                <td style="width: 40px; vertical-align: middle; padding-right: 16px;">
                                                                    <table cellpadding="0" cellspacing="0">
                                                                        <tr>
                                                                            <td style="width: 32px; height: 32px; background-color: #10b981; border-radius: 8px; text-align: center; vertical-align: middle; color: white; font-size: 16px; font-weight: bold; line-height: 32px;">
                                                                                &#128196;
                                                                            </td>
                                                                        </tr>
                                                                    </table>
                                                                </td>
                                                                <td style="vertical-align: middle; flex: 1;">
                                                                    <table width="100%" cellpadding="0" cellspacing="0">
                                                                        <tr>
                                                                            <td style="font-size: 17px; font-weight: 600; color: #1e293b; padding-bottom: 4px;">
                                                                                <a href="${file.url}" target="_blank" style="color: #10b981; text-decoration: none; font-weight: 600;">
                                                                                    ${file.name}
                                                                                </a>
                                                                            </td>
                                                                        </tr>
                                                                        <tr>
                                                                            <td style="font-size: 14px; color: #6b7280;">
                                                                                Click to view or download • ${(file.size / 1024 / 1024).toFixed(2)} MB
                                                                            </td>
                                                                        </tr>
                                                                    </table>
                                                                </td>
                                                            </tr>
                                                        </table>
                                                    </td>
                                                </tr>
                                            </table>
                                        `).join('')}
                                    </td>
                                </tr>
                                
                                <!-- Divider -->
                                <tr>
                                    <td style="height: 1px; background: linear-gradient(90deg, transparent, #e2e8f0, transparent); margin: 40px 0; padding-bottom: 40px;"></td>
                                </tr>
                                ` : ''}
                                
                                <!-- Checklist Header -->
                                <tr>
                                    <td style="padding-bottom: 30px;">
                                        <table width="100%" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td style="vertical-align: middle; width: 50px;">
                                                    <table cellpadding="0" cellspacing="0">
                                                        <tr>
                                                            <td style="width: 36px; height: 36px; background-color: #2563eb; border-radius: 50%; text-align: center; vertical-align: middle; color: white; font-size: 18px; font-weight: bold; line-height: 36px;">
                                                                &#10003;
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                                <td style="font-size: 24px; font-weight: 700; color: #1e293b; vertical-align: middle; padding-left: 16px;">
                                                    Your Onboarding Checklist
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                                
                                <!-- Checklist Items -->
                                <tr>
                                    <td style="padding-bottom: 40px;">
                                        ${checklistItems.map(item => `
                                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; margin-bottom: 20px;">
                                                <tr>
                                                    <td style="padding: 24px;">
                                                        <table width="100%" cellpadding="0" cellspacing="0">
                                                            <tr>
                                                                <td style="width: 40px; vertical-align: top; padding-right: 16px;">
                                                                    <table cellpadding="0" cellspacing="0">
                                                                        <tr>
                                                                            <td style="width: 24px; height: 24px; border: 2px solid #cbd5e1; background-color: #ffffff; text-align: center; vertical-align: middle; font-size: 14px; color: #64748b; line-height: 20px;">
                                                                                &#10003;
                                                                            </td>
                                                                        </tr>
                                                                    </table>
                                                                </td>
                                                                <td style="vertical-align: top;">
                                                                    <table width="100%" cellpadding="0" cellspacing="0">
                                                                        <tr>
                                                                            <td style="font-size: 19px; font-weight: 600; color: #1e293b; padding-bottom: 8px; line-height: 1.4;">
                                                                                ${item.title}
                                                                            </td>
                                                                        </tr>
                                                                        ${item.description ? `
                                                                        <tr>
                                                                            <td style="font-size: 15px; color: #64748b; line-height: 1.6;">
                                                                                ${item.description}
                                                                            </td>
                                                                        </tr>
                                                                        ` : ''}
                                                                    </table>
                                                                </td>
                                                            </tr>
                                                        </table>
                                                    </td>
                                                </tr>
                                            </table>
                                        `).join('')}
                                    </td>
                                </tr>
                                
                                <!-- What Happens Next Section -->
                                <tr>
                                    <td style="background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%); padding: 32px; margin-bottom: 40px;">
                                        <table width="100%" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td style="font-size: 20px; font-weight: 700; color: #1e293b; padding-bottom: 16px;">
                                                    What Happens Next?
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="font-size: 16px; color: #475569; line-height: 1.6;">
                                                    Our team will be working through each of these items with you over the coming days. 
                                                    You'll receive regular updates on our progress, and we'll coordinate with you on any 
                                                    items that require your input or approval.
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                                
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Footer Section -->
                    <tr>
                        <td style="background-color: #1e293b; padding: 40px 50px; text-align: center;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td style="color: #94a3b8; font-size: 15px; padding-bottom: 16px; text-align: center;">
                                        This email was sent by AxeGen AI as part of your onboarding process.
                                    </td>
                                </tr>
                                <tr>
                                    <td style="color: #e2e8f0; font-size: 15px; font-weight: 500; text-align: center;">
                                        Questions? Reply to this email or contact us at <a href="mailto:info@axegen.ai" style="color: #60a5fa;">info@axegen.ai</a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
  `;
};