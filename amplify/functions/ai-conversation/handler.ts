import { Schema } from '../../data/resource';

// Define the conversation event type based on Amplify AI conversation structure
interface ConversationTurnEvent {
  conversationId: string;
  currentMessageId: string;
  messages: any[];
  request: {
    userMessage?: string;
    toolCall?: {
      name: string;
      toolUseId: string;
      input: any;
    };
  };
}

import { log } from '../utils/logger';

// Simple in-memory conversation storage (use DynamoDB in production)
const conversations = new Map<string, any[]>();

export const handler = async (event: ConversationTurnEvent) => {
  try {
    log.lambdaStart('ai-conversation', event);

    const { conversationId, currentMessageId, messages, request } = event;
    
    // Get or create conversation history
    let history = conversations.get(conversationId) || [];
    
    // Handle tool calls
    if (request.toolCall) {
      const toolResponse = await handleToolCall(request.toolCall, event);
      return {
        conversationId,
        currentMessageId,
        content: [toolResponse]
      };
    }

    // Store message in history
    const userMessage = request.userMessage || '';
    history.push({
      role: 'user',
      content: userMessage
    });

    // Generate response based on conversation type
    let response = '';
    
    if (userMessage.toLowerCase().includes('help') || 
        userMessage.toLowerCase().includes('hint')) {
      response = generateHelpResponse(userMessage, history);
    } else if (userMessage.toLowerCase().includes('debug') ||
               userMessage.toLowerCase().includes('error')) {
      response = generateDebugResponse(userMessage, history);
    } else {
      response = generateGeneralResponse(userMessage, history);
    }

    // Store assistant response
    history.push({
      role: 'assistant',
      content: response
    });

    // Update conversation history
    conversations.set(conversationId, history);

    return {
      conversationId,
      currentMessageId,
      content: [{ text: response }]
    };

  } catch (error: any) {
    console.error('Conversation Error:', error);
    return {
      conversationId: event.conversationId,
      currentMessageId: event.currentMessageId,
      content: [{
        text: `I apologize, but I encountered an error: ${error.message}. Please try rephrasing your question.`
      }]
    };
  }
};

async function handleToolCall(toolCall: any, event: ConversationTurnEvent) {
  const { name, input } = toolCall;
  
  log.info('Handling tool call', { toolName: name, hasInput: !!input });

  switch (name) {
    case 'analyzeCode':
      return {
        toolUse: {
          toolUseId: toolCall.toolUseId,
          content: [{
            json: await analyzeCode(input)
          }]
        }
      };
      
    case 'getHint':
      return {
        toolUse: {
          toolUseId: toolCall.toolUseId,
          content: [{
            json: await getHint(input)
          }]
        }
      };
      
    default:
      return {
        toolUse: {
          toolUseId: toolCall.toolUseId,
          content: [{
            json: { error: `Unknown tool: ${name}` }
          }]
        }
      };
  }
}

async function analyzeCode(input: any): Promise<any> {
  const { code, language, errorMessage } = input;
  
  // Simulate code analysis
  const issues = [];
  
  // Check for common issues based on language
  if (language === 'Python') {
    if (!code.includes('def ') && !code.includes('class ')) {
      issues.push('Missing function or class definition');
    }
    if (code.includes('  ') && !code.includes('    ')) {
      issues.push('Inconsistent indentation (use 4 spaces)');
    }
  } else if (language === 'Java') {
    if (!code.includes('public class')) {
      issues.push('Missing public class declaration');
    }
    if (!code.match(/;\s*$/m)) {
      issues.push('Missing semicolons at end of statements');
    }
  }
  
  // Check error message
  if (errorMessage) {
    if (errorMessage.includes('SyntaxError')) {
      issues.push('Syntax error detected - check brackets, quotes, and indentation');
    }
    if (errorMessage.includes('undefined')) {
      issues.push('Variable or function used before definition');
    }
  }

  return {
    analysis: {
      language,
      issues: issues.length > 0 ? issues : ['No obvious issues detected'],
      suggestions: [
        'Check variable names are defined before use',
        'Ensure proper syntax for the language',
        'Verify all brackets and quotes are properly closed'
      ]
    }
  };
}

async function getHint(input: any): Promise<any> {
  const { challengeId, currentProgress } = input;
  
  // Generate progressive hints based on progress
  const hints = [
    {
      level: 1,
      hint: "Start by understanding what the problem is asking. Break it down into smaller steps."
    },
    {
      level: 2,
      hint: "Consider the input and output format. What data structures might be helpful?"
    },
    {
      level: 3,
      hint: "Think about edge cases. What happens with empty input or special values?"
    }
  ];

  // Determine which hint to give based on progress
  let hintLevel = 1;
  if (currentProgress && currentProgress.length > 100) {
    hintLevel = 2;
  }
  if (currentProgress && currentProgress.length > 200) {
    hintLevel = 3;
  }

  return {
    hint: hints[hintLevel - 1],
    nextHintAvailable: hintLevel < 3
  };
}

function generateHelpResponse(message: string, history: any[]): string {
  const responses = [
    "I'm here to help! I can assist with debugging code, providing hints, and explaining programming concepts.",
    "Need a hint? I can guide you without giving away the solution. Just describe where you're stuck.",
    "I can help analyze your code for common issues. Share your code and any error messages you're seeing."
  ];
  
  return responses[Math.floor(Math.random() * responses.length)];
}

function generateDebugResponse(message: string, history: any[]): string {
  return `I can help debug your code! Please share:
1. The code you've written
2. Any error messages you're seeing
3. What you expected to happen
4. What actually happened

This will help me provide more specific guidance.`;
}

function generateGeneralResponse(message: string, history: any[]): string {
  // Context-aware responses based on conversation history
  const recentContext = history.slice(-3).map(m => m.content).join(' ');
  
  if (recentContext.includes('challenge') || recentContext.includes('problem')) {
    return "I see you're working on a challenge. Feel free to ask for hints or help with specific parts!";
  }
  
  return "I'm your coding assistant. I can help with debugging, provide hints, or explain concepts. What would you like help with?";
} 