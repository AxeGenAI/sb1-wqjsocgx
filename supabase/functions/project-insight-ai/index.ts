const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
};

interface RequestPayload {
  clientId: string;
  userQuery: string;
}

interface ProjectData {
  client: {
    id: string;
    name: string;
    app_url?: string;
    created_at: string;
  };
  onboarding_steps: Array<{
    id: string;
    title: string;
    description?: string;
    status: string;
    assigned_to?: string;
    start_date?: string;
    end_date?: string;
    client_visible: boolean;
  }>;
  risks: Array<{
    id: string;
    title: string;
    description?: string;
    severity: string;
    likelihood: string;
    status: string;
    assigned_to?: string;
    due_date?: string;
    mitigation_plan?: string;
  }>;
  deliverables: Array<{
    id: string;
    milestone_name: string;
    title: string;
    description?: string;
    version: string;
    created_at: string;
  }>;
  engagement: {
    status: string;
    email_sent_at?: string;
    created_at: string;
  } | null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { clientId, userQuery }: RequestPayload = await req.json();

    // Validate required fields
    if (!clientId || !userQuery) {
      return new Response(
        JSON.stringify({ 
          error: "Missing required fields: clientId and userQuery are required" 
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

    // Get OpenAI API key from environment
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      console.error("OPENAI_API_KEY environment variable not found");
      return new Response(
        JSON.stringify({ 
          error: "AI service not configured. Please contact support." 
        }),
        {
          status: 500,
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

    // Fetch comprehensive project data
    const projectData = await fetchProjectData(supabase, clientId);
    
    if (!projectData.client) {
      return new Response(
        JSON.stringify({ error: "Client not found" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Generate streaming AI response
    const stream = await generateStreamingProjectInsight(openaiApiKey, projectData, userQuery);

    return new Response(stream, {
      status: 200,
      headers: { 
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        ...corsHeaders 
      },
    });

  } catch (error) {
    console.error("Edge Function error:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Internal server error" 
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
});

async function fetchProjectData(supabase: any, clientId: string): Promise<ProjectData> {
  try {
    // Fetch client information
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();

    if (clientError) {
      throw new Error(`Failed to fetch client: ${clientError.message}`);
    }

    // Fetch onboarding steps
    const { data: onboarding_steps, error: stepsError } = await supabase
      .from('onboarding_steps')
      .select('*')
      .eq('client_id', clientId)
      .order('order_index', { ascending: true });

    if (stepsError) {
      console.warn(`Failed to fetch onboarding steps: ${stepsError.message}`);
    }

    // Fetch risks
    const { data: risks, error: risksError } = await supabase
      .from('risks')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (risksError) {
      console.warn(`Failed to fetch risks: ${risksError.message}`);
    }

    // Fetch deliverables
    const { data: deliverables, error: deliverablesError } = await supabase
      .from('client_deliverables')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (deliverablesError) {
      console.warn(`Failed to fetch deliverables: ${deliverablesError.message}`);
    }

    // Fetch engagement information
    const { data: engagement, error: engagementError } = await supabase
      .from('client_engagements')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (engagementError) {
      console.warn(`Failed to fetch engagement: ${engagementError.message}`);
    }

    return {
      client,
      onboarding_steps: onboarding_steps || [],
      risks: risks || [],
      deliverables: deliverables || [],
      engagement: engagement || null
    };

  } catch (error) {
    console.error('Error fetching project data:', error);
    throw error;
  }
}

async function generateStreamingProjectInsight(
  openaiApiKey: string, 
  projectData: ProjectData, 
  userQuery: string
): Promise<ReadableStream> {
  try {
    // Import OpenAI
    const { OpenAI } = await import("npm:openai@4.28.0");
    const openai = new OpenAI({ apiKey: openaiApiKey });

    // Calculate project statistics
    const totalSteps = projectData.onboarding_steps.length;
    const completedSteps = projectData.onboarding_steps.filter(step => step.status === 'completed').length;
    const inProgressSteps = projectData.onboarding_steps.filter(step => step.status === 'in_progress').length;
    const progressPercentage = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

    const openRisks = projectData.risks.filter(risk => risk.status === 'open').length;
    const criticalRisks = projectData.risks.filter(risk => risk.severity === 'critical').length;
    const highRisks = projectData.risks.filter(risk => risk.severity === 'high').length;

    const totalDeliverables = projectData.deliverables.length;
    const uniqueMilestones = [...new Set(projectData.deliverables.map(d => d.milestone_name))].length;

    // Prepare comprehensive project context for OpenAI
    const projectContext = `
CLIENT: ${projectData.client.name}
PROJECT CREATED: ${new Date(projectData.client.created_at).toLocaleDateString()}
APP URL: ${projectData.client.app_url || 'Not configured'}

ENGAGEMENT STATUS: ${projectData.engagement?.status || 'No engagement record'}
EMAIL SENT: ${projectData.engagement?.email_sent_at ? new Date(projectData.engagement.email_sent_at).toLocaleDateString() : 'Not sent'}

PROJECT METRICS:
- Overall Progress: ${progressPercentage}% (${completedSteps}/${totalSteps} tasks completed)
- Tasks In Progress: ${inProgressSteps}
- Open Risks: ${openRisks} (${criticalRisks} critical, ${highRisks} high priority)
- Deliverables: ${totalDeliverables} across ${uniqueMilestones} milestones

ONBOARDING STEPS:
${projectData.onboarding_steps.map((step, index) => `
${index + 1}. ${step.title}
   Status: ${step.status.replace('_', ' ').toUpperCase()}
   Assigned to: ${step.assigned_to || 'Unassigned'}
   Client Visible: ${step.client_visible ? 'Yes' : 'No'}
   Start Date: ${step.start_date ? new Date(step.start_date).toLocaleDateString() : 'Not set'}
   Due Date: ${step.end_date ? new Date(step.end_date).toLocaleDateString() : 'Not set'}
   Description: ${step.description || 'No description'}
`).join('')}

RISKS:
${projectData.risks.map((risk, index) => `
${index + 1}. ${risk.title}
   Severity: ${risk.severity.toUpperCase()}
   Likelihood: ${risk.likelihood.toUpperCase()}
   Status: ${risk.status.replace('_', ' ').toUpperCase()}
   Assigned to: ${risk.assigned_to || 'Unassigned'}
   Due Date: ${risk.due_date ? new Date(risk.due_date).toLocaleDateString() : 'Not set'}
   Impact: ${risk.impact || 'Not specified'}
   Mitigation Plan: ${risk.mitigation_plan || 'Not specified'}
`).join('')}

DELIVERABLES:
${projectData.deliverables.map((deliverable, index) => `
${index + 1}. ${deliverable.title} (v${deliverable.version})
   Milestone: ${deliverable.milestone_name}
   Created: ${new Date(deliverable.created_at).toLocaleDateString()}
   Description: ${deliverable.description || 'No description'}
`).join('')}
`;

    // Create streaming completion
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are a Senior Project Analyst providing executive-level insights to a CEO about their client projects. Your responses should be:

COMMUNICATION STYLE:
- Professional, concise, and data-driven
- Executive-level language appropriate for C-suite
- Focus on actionable insights and key metrics
- Highlight items requiring CEO attention or decision-making
- Use bullet points and clear formatting for easy scanning

RESPONSE SCOPE - STRICTLY LIMITED TO:
- Project status and progress analysis
- Task assignments and ownership
- Risk assessment and mitigation
- Deliverable status and milestones
- Team performance and bottlenecks
- Timeline and deadline analysis

CRITICAL RESTRICTIONS:
- ONLY discuss the specific project data provided
- NEVER engage in general conversation or topics outside project management
- If asked about anything unrelated to the project, politely redirect: "I'm focused on providing insights about your current project. Please ask about project status, tasks, risks, or deliverables."
- Always base responses on the actual data provided, never make assumptions

RESPONSE FORMAT:
- Start with a brief executive summary
- Use **bold** for key metrics and important items
- Use bullet points for lists
- Highlight urgent items that need CEO attention
- Keep responses concise but comprehensive (aim for 200-400 words)

Remember: You are analyzing real project data for executive decision-making. Be precise, actionable, and focused.`
        },
        {
          role: "user",
          content: `Based on the following project data, please provide insights for this query: "${userQuery}"

PROJECT DATA:
${projectContext}`
        }
      ],
      temperature: 0.3,
      max_tokens: 800,
      presence_penalty: 0.1,
      frequency_penalty: 0.1,
      stream: true // Enable streaming
    });

    // Create a readable stream to pipe OpenAI chunks to the client
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of completion) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              // Encode the content as UTF-8 bytes
              const encoder = new TextEncoder();
              controller.enqueue(encoder.encode(content));
            }
          }
          controller.close();
        } catch (error) {
          console.error('Error in streaming:', error);
          controller.error(error);
        }
      }
    });

    return stream;

  } catch (error) {
    console.error('Error generating streaming project insight:', error);
    
    // Return error as a stream
    const errorStream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        const errorMessage = `I apologize, but I encountered an error while analyzing your project data: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again or contact support if the issue persists.`;
        controller.enqueue(encoder.encode(errorMessage));
        controller.close();
      }
    });
    
    return errorStream;
  }
}