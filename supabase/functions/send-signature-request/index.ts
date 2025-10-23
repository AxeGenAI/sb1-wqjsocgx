const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestPayload {
  clientId: string;
  sowDocumentId?: string;
  ndaDocumentId?: string;
  recipientName: string;
  recipientEmail: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    const { clientId, sowDocumentId, ndaDocumentId, recipientName, recipientEmail }: RequestPayload = await req.json();

    // Validate required fields
    if (!clientId || !recipientName || !recipientEmail) {
      return new Response(
        JSON.stringify({ 
          error: "Missing required fields: clientId, recipientName, and recipientEmail are required" 
        }),
        {
          status: 400,
          headers: { 
            "Content-Type": "application/json", 
            ...corsHeaders 
          },
        }
      );
    }

    // Validate that at least one document is provided
    if (!sowDocumentId && !ndaDocumentId) {
      return new Response(
        JSON.stringify({ 
          error: "At least one document (SOW or NDA) must be provided for signature" 
        }),
        {
          status: 400,
          headers: { 
            "Content-Type": "application/json", 
            ...corsHeaders 
          },
        }
      );
    }

    // Get Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "Database configuration error" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Import Supabase client
    const { createClient } = await import("npm:@supabase/supabase-js@2.39.3");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch client information
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();

    if (clientError || !client) {
      return new Response(
        JSON.stringify({ error: "Client not found" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Fetch SOW document if provided
    let sowDocument = null;
    if (sowDocumentId) {
      const { data: sow, error: sowError } = await supabase
        .from('client_documents')
        .select('*')
        .eq('id', sowDocumentId)
        .eq('client_id', clientId)
        .single();

      if (sowError) {
        return new Response(
          JSON.stringify({ error: "SOW document not found or not accessible" }),
          {
            status: 404,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }
      sowDocument = sow;
    }

    // Fetch NDA document if provided
    let ndaDocument = null;
    if (ndaDocumentId) {
      const { data: nda, error: ndaError } = await supabase
        .from('universal_documents')
        .select('*')
        .eq('id', ndaDocumentId)
        .single();

      if (ndaError) {
        return new Response(
          JSON.stringify({ error: "NDA document not found" }),
          {
            status: 404,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }
      ndaDocument = nda;
    }

    // Generate unique signing URL
    const signatureRequestId = crypto.randomUUID();
    const baseUrl = req.headers.get('origin') || 'https://your-app.com';
    const signingUrl = `${baseUrl}/#/sign/${signatureRequestId}`;

    // Create signature request record
    const { data: signatureRequest, error: insertError } = await supabase
      .from('signature_requests')
      .insert({
        id: signatureRequestId,
        client_id: clientId,
        sow_document_id: sowDocumentId || null,
        nda_document_id: ndaDocumentId || null,
        recipient_name: recipientName,
        recipient_email: recipientEmail,
        status: 'sent',
        signing_url: signingUrl
      })
      .select()
      .single();

    if (insertError) {
      console.error("Database insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create signature request record" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Generate email content
    const documentsList = [];
    if (sowDocument) documentsList.push(`Statement of Work (${sowDocument.file_name})`);
    if (ndaDocument) documentsList.push(`Non-Disclosure Agreement (${ndaDocument.file_name})`);
    
    const emailHtml = generateSignatureRequestEmail(
      recipientName,
      client.name,
      documentsList,
      signingUrl
    );

    // Send email notification using existing email service
    try {
      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      
      if (resendApiKey) {
        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "AxeGen AI <info@axegen.ai>",
            to: [recipientEmail],
            subject: `Document Signature Request from ${client.name}`,
            html: emailHtml,
          }),
        });

        if (!emailResponse.ok) {
          console.warn("Failed to send email notification:", await emailResponse.text());
        }
      }
    } catch (emailError) {
      console.warn("Email notification failed:", emailError);
      // Don't fail the entire request if email fails
    }

    console.log("Signature request created:", {
      id: signatureRequestId,
      clientId,
      sowDocumentId,
      ndaDocumentId,
      recipientName,
      recipientEmail,
      signingUrl
    });

    // Return success response
    return new Response(
      JSON.stringify({
        message: "Signature request sent successfully",
        signatureRequestId: signatureRequestId,
        signingUrl: signingUrl,
        status: "sent",
        documents: {
          sow: sowDocument?.file_name || null,
          nda: ndaDocument?.file_name || null
        }
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      },
    );
  } catch (error) {
    console.error("Edge Function error:", error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      },
    );
  }
});

function generateSignatureRequestEmail(
  recipientName: string,
  clientName: string,
  documentsList: string[],
  signingUrl: string
): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document Signature Request</title>
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
                                        Document Signature Request
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
                                        Hello, ${recipientName}!
                                    </td>
                                </tr>
                                
                                <!-- Main Message -->
                                <tr>
                                    <td style="font-size: 17px; line-height: 1.7; color: #475569; padding-bottom: 40px;">
                                        ${clientName} has requested your electronic signature on the following document(s):
                                    </td>
                                </tr>
                                
                                <!-- Documents List -->
                                <tr>
                                    <td style="padding-bottom: 40px;">
                                        ${documentsList.map(doc => `
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
                                                                <td style="vertical-align: middle;">
                                                                    <span style="font-size: 17px; font-weight: 600; color: #1e293b;">
                                                                        ${doc}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        </table>
                                                    </td>
                                                </tr>
                                            </table>
                                        `).join('')}
                                    </td>
                                </tr>
                                
                                <!-- Call to Action -->
                                <tr>
                                    <td style="text-align: center; padding: 40px 0;">
                                        <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                                            <tr>
                                                <td style="background-color: #2563eb; padding: 20px 40px; border-radius: 12px;">
                                                    <a href="${signingUrl}" style="color: #ffffff; font-size: 18px; font-weight: 700; text-decoration: none; display: block;">
                                                        Review and Sign Documents
                                                    </a>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                                
                                <!-- Instructions -->
                                <tr>
                                    <td style="font-size: 15px; line-height: 1.6; color: #64748b; text-align: center; padding-bottom: 40px;">
                                        Click the button above to review the document(s) and provide your electronic signature. 
                                        The signing process is secure and legally binding.
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
                                        This signature request was sent by ${clientName} via AxeGen AI.
                                    </td>
                                </tr>
                                <tr>
                                    <td style="color: #e2e8f0; font-size: 15px; font-weight: 500; text-align: center;">
                                        Questions? Contact us at <a href="mailto:info@axegen.ai" style="color: #60a5fa;">info@axegen.ai</a>
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
}