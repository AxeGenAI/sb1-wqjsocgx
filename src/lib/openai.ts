import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Note: In production, API calls should go through your backend
});

export interface GeneratedContent {
  welcomeMessage: string;
  nextSteps: {
    title: string;
    description: string;
  }[];
}

export const generateWelcomeContent = async (sowContent: string): Promise<GeneratedContent> => {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are a distinguished senior partner at McKinsey & Company with over 30 years of experience in strategic consulting across Fortune 500 companies and global enterprises. You have led transformational initiatives worth billions of dollars and have advised CEOs and C-suite executives on their most critical business challenges.

Your communication style is:
- Authoritative yet approachable, reflecting decades of executive-level experience
- Strategic and forward-thinking, always connecting tactical steps to broader business outcomes
- Confident and assured, drawing from extensive experience across industries and geographies
- Sophisticated in language while remaining accessible to senior business leaders
- Focused on value creation and measurable business impact
- Diplomatic yet direct, as befits someone who has navigated complex stakeholder environments

You write with the gravitas and insight that comes from having successfully guided hundreds of major corporations through complex transformations. Your tone conveys both the wisdom of experience and the energy of someone still deeply engaged in driving meaningful change.`
        },
        {
          role: "user",
          content: `Based on the following Statement of Work (SOW), generate a professional welcome message and next steps for client onboarding. The message will be sent from AxeGenAI to the prospective client.

SOW Content:
${sowContent}

Requirements:
1. Write with the tone and strategic insight of a senior McKinsey partner with 30+ years of experience. The generated welcome message should not explicitly state this persona or refer to you as a McKinsey partner; instead, it should be framed as coming directly from AxeGenAI.
2. The message is being sent FROM AxeGenAI TO the client (adjust pronouns and perspective accordingly)
3. Create a warm yet authoritative welcome message (2-3 paragraphs) that:
   - Demonstrates deep understanding of their business challenges and objectives
   - References specific elements from the SOW to show thorough analysis
   - Conveys confidence in AxeGenAI's ability to deliver transformational results
   - Positions the engagement as a strategic partnership, not just a service delivery
   - Uses sophisticated business language appropriate for C-suite communication
4. Provide 4-6 specific, strategic next steps that:
   - Go beyond basic project management to strategic value creation
   - Demonstrate proactive thinking about potential challenges and opportunities
   - Show understanding of enterprise-level implementation complexities
   - Include stakeholder alignment and change management considerations
   - Each step should have a clear title and detailed description of topics to discuss or actions to take

CRITICAL: Format your response as valid JSON with the following structure:
{
  "welcomeMessage": "Your welcome message here...",
  "nextSteps": [
    {
      "title": "Step 1 Title",
      "description": "Detailed description of topics to discuss, actions to take, or deliverables to prepare"
    },
    {
      "title": "Step 2 Title", 
      "description": "Detailed description..."
    }
  ]
}

IMPORTANT JSON FORMATTING REQUIREMENTS:
- Ensure all string values are properly escaped for JSON
- Replace all newlines with \\n
- Escape all double quotes with \\"
- Do not include any unescaped control characters
- The response must be valid JSON that can be parsed by JSON.parse()

The tone should reflect the gravitas and strategic insight of a senior partner who has successfully guided Fortune 500 transformations, while maintaining the warmth and partnership approach that builds lasting client relationships. Remember, this message is from AxeGenAI to the client - do not reference McKinsey or any external consulting firm.`
        }
      ],
      temperature: 0.7,
      max_tokens: 1200
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    // Clean the response to ensure valid JSON
    const cleanedResponse = response
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
      .trim();

    // Try to parse the JSON response with error handling
    let parsedContent: GeneratedContent;
    try {
      parsedContent = JSON.parse(cleanedResponse) as GeneratedContent;
    } catch (parseError) {
      console.error('JSON parsing failed, attempting to fix common issues:', parseError);
      
      // Attempt to fix common JSON issues
      const fixedResponse = cleanedResponse
        .replace(/\n/g, '\\n') // Escape newlines
        .replace(/\r/g, '\\r') // Escape carriage returns
        .replace(/\t/g, '\\t') // Escape tabs
        .replace(/"/g, '\\"') // Escape quotes
        .replace(/\\"/g, '"') // Fix over-escaped quotes at JSON structure level
        .replace(/"([^"]+)":/g, '"$1":') // Ensure proper key formatting
        .replace(/:\\"/g, ':"') // Fix over-escaped values
        .replace(/\\"([^"]*)\\"}/g, '"$1"}') // Fix over-escaped end values
        .replace(/\\"([^"]*)\\"]/g, '"$1"]'); // Fix over-escaped array values
      
      try {
        parsedContent = JSON.parse(fixedResponse) as GeneratedContent;
      } catch (secondParseError) {
        console.error('Second JSON parsing attempt failed:', secondParseError);
        throw new Error('Failed to parse OpenAI response as valid JSON');
      }
    }
    
    // Validate the parsed content structure
    if (!parsedContent.welcomeMessage || !Array.isArray(parsedContent.nextSteps) || 
        !parsedContent.nextSteps.every(step => step.title && step.description)) {
      throw new Error('Invalid response structure from OpenAI');
    }
    
    return parsedContent;
  } catch (error) {
    console.error('Error generating content:', error);
    throw new Error('Failed to generate welcome content. Please try again.');
  }
};

// Extract text from file content (basic implementation)
export const extractTextFromFile = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const content = event.target?.result as string;
      
      if (file.type === 'text/plain') {
        resolve(content);
      } else if (file.type === 'application/pdf') {
        // For PDF files, we'll use a simple approach
        // In production, you'd want to use a proper PDF parser
        resolve(`PDF file uploaded: ${file.name}. Content extraction would require server-side processing.`);
      } else if (file.type.includes('word')) {
        // For Word documents, similar approach
        resolve(`Word document uploaded: ${file.name}. Content extraction would require server-side processing.`);
      } else {
        resolve(content || `File uploaded: ${file.name}`);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    if (file.type === 'text/plain') {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  });
};