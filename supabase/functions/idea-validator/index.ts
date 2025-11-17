import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// Summarize conversation for context (keep last few messages + summary)
function buildConversationContext(messages: Message[], previousContext?: string): { messages: Message[], contextSummary: string } {
  const MAX_CONTEXT_MESSAGES = 6; // Keep last 3 exchanges (6 messages)
  
  // If conversation is short, return all messages
  if (messages.length <= MAX_CONTEXT_MESSAGES) {
    return {
      messages,
      contextSummary: previousContext || ''
    };
  }
  
  // Keep the most recent messages
  const recentMessages = messages.slice(-MAX_CONTEXT_MESSAGES);
  
  // Build context summary from older messages if needed
  const olderMessages = messages.slice(0, -MAX_CONTEXT_MESSAGES);
  let contextSummary = previousContext || '';
  
  if (olderMessages.length > 0 && !contextSummary) {
    // Create a brief summary of older messages
    contextSummary = `Previous conversation context: User discussed their startup idea and received validation feedback covering market analysis, competition, and viability.`;
  }
  
  return {
    messages: recentMessages,
    contextSummary
  };
}

// Search the web using Serper API
async function searchWeb(query: string): Promise<string> {
  const serperApiKey = Deno.env.get('SERPER_API_KEY');
  
  if (!serperApiKey) {
    console.error('SERPER_API_KEY not configured');
    return 'Web search temporarily unavailable.';
  }

  try {
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': serperApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: query,
        num: 5, // Get top 5 results
      }),
    });

    if (!response.ok) {
      throw new Error(`Serper API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Format search results
    let searchContext = '\n--- Web Search Results ---\n';
    
    if (data.organic && data.organic.length > 0) {
      data.organic.slice(0, 5).forEach((result: any, index: number) => {
        searchContext += `\n${index + 1}. ${result.title}\n`;
        searchContext += `   ${result.snippet}\n`;
        if (result.link) searchContext += `   Source: ${result.link}\n`;
      });
    }
    
    if (data.answerBox) {
      searchContext += `\n--- Quick Answer ---\n${data.answerBox.answer || data.answerBox.snippet}\n`;
    }
    
    return searchContext;
  } catch (error) {
    console.error('Web search error:', error);
    return 'Unable to fetch web results at this time.';
  }
}

// Analyze idea with Gemini AI
async function validateIdea(
  messages: Message[], 
  ideaContext: string,
  conversationContext?: string
): Promise<string> {
  const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
  
  if (!geminiApiKey) {
    return 'AI service is not configured. Please ask the administrator to set up the API key.';
  }

  try {
    const systemPrompt = `You are an expert startup idea validator and business advisor. Your role is to:

1. **Thoroughly analyze startup ideas** with brutal honesty
2. **Provide real-time market research** using latest web data
3. **Identify potential problems, competition, and opportunities**
4. **Give actionable feedback** on viability, market fit, and execution
5. **Be constructive but realistic** - point out red flags and strengths
6. **Maintain conversation context** - remember what was discussed earlier and build upon it

When analyzing ideas:
- Research current market trends and competitors
- Assess market size and growth potential
- Evaluate technical feasibility
- Consider monetization strategies
- Identify key risks and mitigation strategies
- Suggest pivots or improvements if needed
- Reference previous discussion points when relevant

Be conversational, encouraging, but HONEST. If an idea has major flaws, explain them clearly with data.

${conversationContext ? `\n--- Previous Conversation Context ---\n${conversationContext}\n` : ''}
${ideaContext}`;

    // Build optimized conversation context
    const { messages: contextMessages, contextSummary } = buildConversationContext(
      messages,
      conversationContext
    );

    // Format messages for OpenAI-compatible format
    const formattedMessages = [
      { role: 'system', content: systemPrompt },
      ...contextMessages.map(msg => ({
        role: msg.role,
        content: msg.content
      }))
    ];

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${geminiApiKey}`,
        },
        body: JSON.stringify({
          model: 'gemini-2.0-flash-exp',
          messages: formattedMessages,
          temperature: 0.7,
          max_tokens: 2048,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Gemini API error:', response.status, error);
      
      // More specific error messages
      if (response.status === 404) {
        throw new Error(`Gemini API 404: Endpoint or model not found. Check model name.`);
      } else if (response.status === 403) {
        throw new Error(`Gemini API 403: API key doesn't have permission.`);
      } else if (response.status === 429) {
        throw new Error(`Gemini API rate limit exceeded. Please try again in a few moments.`);
      } else {
        throw new Error(`Gemini API error ${response.status}: ${error.slice(0, 100)}`);
      }
    }

    const data = await response.json();
    
    // OpenAI-compatible response format
    if (!data.choices || data.choices.length === 0) {
      console.error('No choices in response:', data);
      throw new Error('No response from AI');
    }

    return data.choices[0].message.content;
  } catch (error) {
    console.error('Validation error:', error);
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check API keys first
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    const serperApiKey = Deno.env.get('SERPER_API_KEY');
    
    console.log('API Keys check:', {
      gemini: geminiApiKey ? 'configured' : 'MISSING',
      serper: serperApiKey ? 'configured' : 'MISSING'
    });

    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({ 
          response: 'The AI service is not configured yet. Please contact the administrator to set up the GEMINI_API_KEY.'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    const { messages, ideaSummary, sessionId, conversationContext } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ 
          response: 'Please provide a valid message to validate your idea.'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    const lastUserMessage = messages[messages.length - 1]?.content || '';
    
    console.log('Processing request:', {
      messageCount: messages.length,
      ideaSummary: ideaSummary ? 'provided' : 'none',
      sessionId: sessionId || 'new session',
      hasContext: !!conversationContext,
      lastMessage: lastUserMessage.slice(0, 50) + '...'
    });
    
    // Perform web search for relevant context (non-blocking)
    let webContext = '';
    try {
      const searchQuery = ideaSummary 
        ? `${ideaSummary} startup market analysis competition` 
        : `${lastUserMessage} startup idea market research`;
      
      console.log('Starting web search for:', searchQuery);
      webContext = await searchWeb(searchQuery);
      console.log('Web search completed, context length:', webContext.length);
    } catch (searchError) {
      console.error('Search error (non-fatal):', searchError);
      webContext = ''; // Continue without web context
    }
    
    console.log('Starting AI validation...');
    // Get AI validation with web context and conversation context
    const aiResponse = await validateIdea(messages, webContext, conversationContext);
    console.log('AI validation completed');

    return new Response(
      JSON.stringify({ 
        response: aiResponse,
        hasWebContext: webContext.length > 50,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Fatal error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    const errorStack = error instanceof Error ? error.stack : '';
    
    console.error('Error details:', {
      message: errorMessage,
      stack: errorStack
    });
    
    return new Response(
      JSON.stringify({ 
        response: `I apologize, but I encountered an error while processing your request. Error: ${errorMessage}. Please try again or contact support if the issue persists.`
      }),
      {
        status: 200, // Return 200 to avoid client-side errors
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
