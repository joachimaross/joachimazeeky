const express = require('express');
const { OpenAI } = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Anthropic = require('@anthropic-ai/sdk');
const router = express.Router();

// Initialize AI clients (server-side only)
let openai, gemini, claude;

try {
  if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  
  if (process.env.GEMINI_API_KEY) {
    gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  
  if (process.env.CLAUDE_API_KEY) {
    claude = new Anthropic({
      apiKey: process.env.CLAUDE_API_KEY,
    });
  }
} catch (error) {
  console.error('Failed to initialize AI clients:', error.message);
}

// Input validation middleware
const validateChatInput = (req, res, next) => {
  const { messages, personality, options = {} } = req.body;
  
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({
      error: 'Invalid messages array',
      code: 'INVALID_MESSAGES'
    });
  }
  
  // Validate message format
  for (const message of messages) {
    if (!message.role || !message.content) {
      return res.status(400).json({
        error: 'Invalid message format. Required: role and content',
        code: 'INVALID_MESSAGE_FORMAT'
      });
    }
    
    if (!['system', 'user', 'assistant'].includes(message.role)) {
      return res.status(400).json({
        error: 'Invalid message role. Must be: system, user, or assistant',
        code: 'INVALID_MESSAGE_ROLE'
      });
    }
    
    // Content length limits
    if (typeof message.content === 'string' && message.content.length > 8000) {
      return res.status(400).json({
        error: 'Message content too long (max 8000 characters)',
        code: 'MESSAGE_TOO_LONG'
      });
    }
  }
  
  // Validate personality
  const validPersonalities = ['default', 'therapist', 'coach', 'business', 'teacher', 'friend', 'scientist'];
  if (personality && !validPersonalities.includes(personality)) {
    return res.status(400).json({
      error: 'Invalid personality type',
      valid: validPersonalities,
      code: 'INVALID_PERSONALITY'
    });
  }
  
  // Validate options
  if (options.maxTokens && (options.maxTokens < 1 || options.maxTokens > 4000)) {
    return res.status(400).json({
      error: 'maxTokens must be between 1 and 4000',
      code: 'INVALID_MAX_TOKENS'
    });
  }
  
  if (options.temperature && (options.temperature < 0 || options.temperature > 2)) {
    return res.status(400).json({
      error: 'temperature must be between 0 and 2',
      code: 'INVALID_TEMPERATURE'
    });
  }
  
  next();
};

// Personality system prompts
const personalityPrompts = {
  default: "You are Zeeky, an advanced AI assistant. Be helpful, intelligent, and friendly.",
  therapist: "You are Zeeky in therapist mode. Be empathetic, supportive, and provide thoughtful guidance. Use active listening techniques and ask clarifying questions.",
  coach: "You are Zeeky in motivational coach mode. Be energetic, encouraging, and help users achieve their goals. Focus on actionable advice and positive reinforcement.",
  business: "You are Zeeky in business mode. Be professional, strategic, and focus on productivity and business success. Provide data-driven insights and practical solutions.",
  teacher: "You are Zeeky in teacher mode. Be patient, educational, and break down complex topics into understandable parts. Use examples and encourage learning.",
  friend: "You are Zeeky in friend mode. Be casual, supportive, and conversational. Show interest in the user's life and provide friendly advice.",
  scientist: "You are Zeeky in scientist mode. Be analytical, precise, and evidence-based. Focus on facts, research, and logical reasoning."
};

// POST /api/ai/chat - Main chat endpoint
router.post('/chat', validateChatInput, async (req, res) => {
  try {
    const { messages, personality = 'default', options = {} } = req.body;
    const userId = req.userId;
    
    // Add personality system prompt if not already present
    const systemMessage = messages.find(m => m.role === 'system');
    let processedMessages = [...messages];
    
    if (!systemMessage) {
      processedMessages.unshift({
        role: 'system',
        content: personalityPrompts[personality]
      });
    }
    
    // Try OpenAI first (primary)
    if (openai) {
      try {
        const completion = await openai.chat.completions.create({
          model: options.model || 'gpt-4o-mini',
          messages: processedMessages,
          max_tokens: options.maxTokens || 1000,
          temperature: options.temperature || 0.7,
          user: userId, // For OpenAI usage tracking
          stream: false
        });
        
        const response = completion.choices[0]?.message?.content;
        
        if (response) {
          return res.json({
            response,
            provider: 'openai',
            model: completion.model,
            usage: completion.usage,
            personality,
            timestamp: new Date().toISOString()
          });
        }
      } catch (openaiError) {
        console.error('OpenAI API error:', openaiError.message);
        
        // Check if it's a rate limit or quota error
        if (openaiError.status === 429 || openaiError.status === 402) {
          // Fall back to Gemini
          console.log('OpenAI rate limited, falling back to Gemini');
        } else {
          throw openaiError;
        }
      }
    }
    
    // Fallback to Gemini
    if (gemini) {
      try {
        const model = gemini.getGenerativeModel({ model: 'gemini-1.5-flash' });
        
        // Convert messages to Gemini format
        const prompt = processedMessages
          .filter(m => m.role !== 'system')
          .map(m => `${m.role === 'user' ? 'Human' : 'Assistant'}: ${m.content}`)
          .join('\n\n') + '\n\nAssistant:';
          
        const result = await model.generateContent(prompt);
        const response = result.response.text();
        
        return res.json({
          response,
          provider: 'gemini',
          model: 'gemini-1.5-flash',
          personality,
          timestamp: new Date().toISOString()
        });
      } catch (geminiError) {
        console.error('Gemini API error:', geminiError.message);
        
        // Fall back to Claude if available
        if (!claude) {
          throw geminiError;
        }
      }
    }
    
    // Final fallback to Claude
    if (claude) {
      try {
        const response = await claude.messages.create({
          model: 'claude-3-haiku-20240307',
          max_tokens: options.maxTokens || 1000,
          messages: processedMessages.filter(m => m.role !== 'system'),
          system: personalityPrompts[personality]
        });
        
        return res.json({
          response: response.content[0]?.text,
          provider: 'claude',
          model: 'claude-3-haiku-20240307',
          usage: response.usage,
          personality,
          timestamp: new Date().toISOString()
        });
      } catch (claudeError) {
        console.error('Claude API error:', claudeError.message);
        throw claudeError;
      }
    }
    
    // If all AI services fail
    throw new Error('All AI services unavailable');
    
  } catch (error) {
    console.error('AI chat error:', error);
    
    // Provide appropriate error response
    if (error.status === 429) {
      return res.status(429).json({
        error: 'AI service rate limit exceeded',
        retryAfter: 60,
        code: 'AI_RATE_LIMIT'
      });
    }
    
    if (error.status === 402 || error.message?.includes('quota')) {
      return res.status(402).json({
        error: 'AI service quota exceeded',
        code: 'AI_QUOTA_EXCEEDED'
      });
    }
    
    res.status(500).json({
      error: 'AI service error',
      code: 'AI_SERVICE_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/ai/analyze - Text analysis endpoint
router.post('/analyze', async (req, res) => {
  try {
    const { text, analysisType = 'sentiment' } = req.body;
    
    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        error: 'Text content required',
        code: 'MISSING_TEXT'
      });
    }
    
    if (text.length > 10000) {
      return res.status(400).json({
        error: 'Text too long (max 10000 characters)',
        code: 'TEXT_TOO_LONG'
      });
    }
    
    const validAnalysisTypes = ['sentiment', 'emotion', 'intent', 'language', 'summary'];
    if (!validAnalysisTypes.includes(analysisType)) {
      return res.status(400).json({
        error: 'Invalid analysis type',
        valid: validAnalysisTypes,
        code: 'INVALID_ANALYSIS_TYPE'
      });
    }
    
    // Create analysis prompt based on type
    let analysisPrompt;
    switch (analysisType) {
      case 'sentiment':
        analysisPrompt = `Analyze the sentiment of this text. Respond with JSON format: {"sentiment": "positive|negative|neutral", "confidence": 0.0-1.0, "explanation": "brief explanation"}`;
        break;
      case 'emotion':
        analysisPrompt = `Analyze the emotions in this text. Respond with JSON format: {"emotions": [{"emotion": "name", "intensity": 0.0-1.0}], "primary_emotion": "name"}`;
        break;
      case 'intent':
        analysisPrompt = `Analyze the intent of this text. Respond with JSON format: {"intent": "category", "confidence": 0.0-1.0, "entities": []}`;
        break;
      case 'language':
        analysisPrompt = `Detect the language of this text. Respond with JSON format: {"language": "code", "language_name": "name", "confidence": 0.0-1.0}`;
        break;
      case 'summary':
        analysisPrompt = `Provide a concise summary of this text. Respond with JSON format: {"summary": "text", "key_points": ["point1", "point2"]}`;
        break;
    }
    
    const messages = [
      { role: 'system', content: analysisPrompt },
      { role: 'user', content: text }
    ];
    
    // Use the same AI fallback logic as chat
    let result;
    if (openai) {
      try {
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages,
          max_tokens: 500,
          temperature: 0.3,
          user: req.userId
        });
        
        const responseText = completion.choices[0]?.message?.content;
        result = JSON.parse(responseText);
        result.provider = 'openai';
      } catch (error) {
        console.error('OpenAI analysis error:', error);
        if (!gemini) throw error;
      }
    }
    
    // Fallback to Gemini if OpenAI failed
    if (!result && gemini) {
      try {
        const model = gemini.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const prompt = `${analysisPrompt}\n\nText to analyze: ${text}`;
        const response = await model.generateContent(prompt);
        result = JSON.parse(response.response.text());
        result.provider = 'gemini';
      } catch (error) {
        console.error('Gemini analysis error:', error);
        throw error;
      }
    }
    
    res.json({
      ...result,
      analysisType,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Text analysis error:', error);
    res.status(500).json({
      error: 'Text analysis failed',
      code: 'ANALYSIS_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/ai/personalities - Get available personalities
router.get('/personalities', (req, res) => {
  const personalities = Object.keys(personalityPrompts).map(key => ({
    id: key,
    name: key.charAt(0).toUpperCase() + key.slice(1),
    description: personalityPrompts[key]
  }));
  
  res.json({
    personalities,
    count: personalities.length
  });
});

// GET /api/ai/status - Check AI service availability
router.get('/status', async (req, res) => {
  const status = {
    openai: { available: !!openai, healthy: false },
    gemini: { available: !!gemini, healthy: false },
    claude: { available: !!claude, healthy: false }
  };
  
  // Quick health checks (with timeout)
  const healthCheckPromise = async (service, client) => {
    try {
      const timeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Health check timeout')), 5000)
      );
      
      let healthCheck;
      if (service === 'openai' && client) {
        healthCheck = client.models.list();
      } else if (service === 'gemini' && client) {
        const model = client.getGenerativeModel({ model: 'gemini-1.5-flash' });
        healthCheck = model.generateContent('Health check');
      } else if (service === 'claude' && client) {
        healthCheck = client.messages.create({
          model: 'claude-3-haiku-20240307',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Health check' }]
        });
      }
      
      if (healthCheck) {
        await Promise.race([healthCheck, timeout]);
        status[service].healthy = true;
      }
    } catch (error) {
      console.log(`${service} health check failed:`, error.message);
      status[service].healthy = false;
    }
  };
  
  // Run health checks in parallel
  await Promise.all([
    healthCheckPromise('openai', openai),
    healthCheckPromise('gemini', gemini),
    healthCheckPromise('claude', claude)
  ]);
  
  const healthyServices = Object.values(status).filter(s => s.healthy).length;
  
  res.json({
    services: status,
    overall: healthyServices > 0 ? 'healthy' : 'unhealthy',
    healthyCount: healthyServices,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;