const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Color constants for PDF text
const COLORS = {
  DARK_BLUE: { r: 0, g: 0, b: 0.6 },
  RED: { r: 1, g: 0, b: 0 },
  BLACK: { r: 0, g: 0, b: 0 }
};

interface RequestPayload {
  requestId: string;
  signerName: string;
  entityName: string;
  signerTitle: string;
  signedAt: string;
}

// Helper function to fit text within a specified width
async function drawFittedText(
  page: any, 
  text: string, 
  x: number, 
  y: number, 
  font: any, 
  targetSize: number, 
  maxWidth: number,
  color = COLORS.DARK_BLUE
) {
  const { rgb } = await import("npm:pdf-lib@1.17.1");
  
  let size = targetSize;
  while (font.widthOfTextAtSize(text, size) > maxWidth && size > 8) {
    size -= 0.5;
  }
  
  page.drawText(text, { 
    x, 
    y, 
    size, 
    font, 
    color: rgb(color.r, color.g, color.b)
  });
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Parse and validate request payload
    const { requestId, signerName, entityName, signerTitle, signedAt }: RequestPayload = await req.json();

    if (!requestId || !signerName || !entityName || !signerTitle || !signedAt) {
      return new Response(
        JSON.stringify({ 
          error: "Missing required fields: requestId, signerName, entityName, signerTitle, and signedAt are required" 
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

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "Database configuration error" }),
        {
          status: 500,
          headers: { 
            "Content-Type": "application/json", 
            ...corsHeaders 
          },
        }
      );
    }

    const { createClient } = await import("npm:@supabase/supabase-js@2.39.3");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch signature request with document information
    const { data: signatureRequest, error: requestError } = await supabase
      .from('signature_requests')
      .select(`
        *,
        nda_document:universal_documents!nda_document_id(*)
      `)
      .eq('id', requestId)
      .single();

    if (requestError || !signatureRequest) {
      return new Response(
        JSON.stringify({ error: "Signature request not found" }),
        {
          status: 404,
          headers: { 
            "Content-Type": "application/json", 
            ...corsHeaders 
          },
        }
      );
    }

    // Check if this request has an NDA document to process
    if (!signatureRequest.nda_document_id || !signatureRequest.nda_document) {
      // If no NDA, just update the signature request status
      const { error: updateError } = await supabase
        .from('signature_requests')
        .update({
          status: 'signed',
          signer_typed_signature: signerName,
          signed_at: signedAt
        })
        .eq('id', requestId);

      if (updateError) {
        throw updateError;
      }

      return new Response(
        JSON.stringify({ 
          message: "Document signed successfully (no PDF processing required)",
          signedDocumentUrl: null
        }),
        {
          status: 200,
          headers: { 
            "Content-Type": "application/json", 
            ...corsHeaders 
          },
        }
      );
    }

    // Process the NDA document
    const ndaDocument = signatureRequest.nda_document;
    
    try {
      // Download the original NDA PDF from storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('kickoff-materials')
        .download(ndaDocument.document_path);

      if (downloadError || !fileData) {
        throw new Error(`Failed to download original document: ${downloadError?.message}`);
      }

      // Convert blob to array buffer for PDF processing
      const pdfBytes = await fileData.arrayBuffer();

      // Import PDF-lib for PDF manipulation
      const { PDFDocument, StandardFonts } = await import("npm:pdf-lib@1.17.1");

      // Load the PDF document
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pages = pdfDoc.getPages();
      const firstPage = pages[0];
      const lastPage = pages[pages.length - 1];

      // Embed fonts
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      // Download and embed custom cursive font for signature
      let cursiveFont;
      try {
        const { data: fontData, error: fontError } = await supabase.storage
          .from('kickoff-materials')
          .download('fonts/Signature.ttf');

        if (fontError || !fontData) {
          console.warn('Failed to download cursive font, falling back to bold font:', fontError?.message);
          cursiveFont = boldFont; // Fallback to bold font if cursive font is not available
        } else {
          const fontBytes = await fontData.arrayBuffer();
          cursiveFont = await pdfDoc.embedFont(fontBytes);
        }
      } catch (fontLoadError) {
        console.warn('Error loading cursive font, using fallback:', fontLoadError);
        cursiveFont = boldFont; // Fallback to bold font
      }

      // Format the signing date
      const formattedDate = new Date(signedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      // Format the signing time
      const formattedTime = new Date(signedAt).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZoneName: 'short'
      });

      // Insert entity name in the introductory paragraph (placeholder coordinates)
      await drawFittedText(firstPage, entityName, 111.6, 642.8, font, 11, 238, COLORS.DARK_BLUE);

      // Insert cursive signature on the last page (centered between Company and Name lines)
      await drawFittedText(lastPage, signerName, 377.0, 603.2, cursiveFont, 18, 200, COLORS.DARK_BLUE);

      // Insert timestamp directly under the cursive signature
      await drawFittedText(lastPage, formattedTime, 377.0, 585.0, font, 11, 200, COLORS.DARK_BLUE); // Time under signature

      // Mask any pre-printed date in AxeGenAI's signature block
      const { rgb } = await import("npm:pdf-lib@1.17.1");
      lastPage.drawRectangle({
        x: 160,
        y: 533,
        width: 220,
        height: 16,
        color: rgb(1, 1, 1) // White color to mask existing text
      });

      // Insert formatted date under AxeGenAI's left signature block
      await drawFittedText(lastPage, formattedDate, 165.0, 537.6, font, 11, 220, COLORS.BLACK);

      // Insert signature block information (placeholder coordinates)
      await drawFittedText(lastPage, entityName, 403.5, 639.0, font, 11, 190, COLORS.DARK_BLUE); // Company
      await drawFittedText(lastPage, signerName, 377.0, 567.4, boldFont, 11, 200, COLORS.DARK_BLUE); // Name
      await drawFittedText(lastPage, signerTitle, 367.2, 552.4, font, 11, 210, COLORS.DARK_BLUE); // Title
      await drawFittedText(lastPage, `Date: ${formattedDate}`, 371.0, 537.6, font, 11, 160, COLORS.DARK_BLUE); // Date

      // Generate the modified PDF
      const modifiedPdfBytes = await pdfDoc.save();

      // Create a unique filename for the signed document
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const signedFileName = `signed-${timestamp}-${ndaDocument.file_name}`;
      const signedFilePath = `signed-documents/${requestId}/${signedFileName}`;

      // Upload the signed document to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('kickoff-materials')
        .upload(signedFilePath, modifiedPdfBytes, {
          contentType: 'application/pdf',
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Failed to upload signed document: ${uploadError.message}`);
      }

      // Get the public URL for the signed document
      const { data: { publicUrl } } = supabase.storage
        .from('kickoff-materials')
        .getPublicUrl(signedFilePath);

      // Update the signature request with the signed document URL and other details
      const { error: updateError } = await supabase
        .from('signature_requests')
        .update({
          status: 'signed',
          signer_typed_signature: signerName,
          signed_document_url: publicUrl,
          signed_at: signedAt
        })
        .eq('id', requestId);

      if (updateError) {
        throw updateError;
      }

      console.log("Document processed successfully:", {
        requestId,
        signedFilePath,
        publicUrl
      });

      return new Response(
        JSON.stringify({
          message: "Document signed and processed successfully",
          signedDocumentUrl: publicUrl,
          signedFileName: signedFileName
        }),
        {
          status: 200,
          headers: { 
            "Content-Type": "application/json", 
            ...corsHeaders 
          },
        }
      );

    } catch (pdfError) {
      console.error("PDF processing error:", pdfError);
      
      // Fallback: Update signature request without PDF processing
      const { error: fallbackError } = await supabase
        .from('signature_requests')
        .update({
          status: 'signed',
          signer_typed_signature: signerName,
          signed_at: signedAt
        })
        .eq('id', requestId);

      if (fallbackError) {
        throw fallbackError;
      }

      return new Response(
        JSON.stringify({ 
          message: "Document signed successfully (PDF processing failed - manual processing may be required)",
          error: `PDF processing failed: ${pdfError instanceof Error ? pdfError.message : 'Unknown error'}`,
          signedDocumentUrl: null
        }),
        {
          status: 200,
          headers: { 
            "Content-Type": "application/json", 
            ...corsHeaders 
          },
        }
      );
    }

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