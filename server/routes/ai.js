const express = require('express');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const validator = require('validator');
const DOMPurify = require('isomorphic-dompurify');
const router = express.Router();

// Security middleware
router.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Enhanced rate limiting
const aiChatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs
  message: {
    success: false,
    error: 'Too many AI requests, please try again later.',
    retryAfter: 900
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.use('/chat', aiChatLimiter);

// Input sanitization middleware
function sanitizeInput(req, res, next) {
  if (req.body.message) {
    // Remove HTML tags and escape dangerous characters
    req.body.message = DOMPurify.sanitize(req.body.message, { 
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: []
    });
    
    // Validate against XSS patterns
    if (!validator.isLength(req.body.message, { min: 1, max: 4000 })) {
      return res.status(400).json({
        success: false,
        error: 'Message must be between 1 and 4000 characters'
      });
    }
  }
  next();
}

// AI chat endpoint with multi-provider support
router.post('/chat', sanitizeInput, async (req, res) => {
  try {
    const { message, provider = 'openai', persona = 'default' } = req.body;
    
    // Enhanced input validation
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid message is required' 
      });
    }

    // Validate provider
    const validProviders = ['openai', 'gemini', 'claude'];
    if (!validProviders.includes(provider.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid AI provider specified'
      });
    }

    // Validate persona
    const validPersonas = ['default', 'therapist', 'coach', 'business', 'teacher', 'friend', 'scientist'];
    if (!validPersonas.includes(persona.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid persona specified'
      });
    }

    // Process AI request based on provider with fallback
    let response;
    let usedProvider = provider.toLowerCase();
    
    try {
      switch (usedProvider) {
        case 'openai':
          response = await processOpenAIRequest(message, persona);
          break;
        case 'gemini':
          response = await processGeminiRequest(message, persona);
          break;
        case 'claude':
          response = await processClaudeRequest(message, persona);
          break;
      }
    } catch (providerError) {
      console.warn(`${usedProvider} failed, attempting fallback:`, providerError.message);
      
      // Intelligent fallback system
      const fallbackOrder = ['openai', 'claude', 'gemini'].filter(p => p !== usedProvider);
      
      for (const fallbackProvider of fallbackOrder) {
        try {
          switch (fallbackProvider) {
            case 'openai':
              response = await processOpenAIRequest(message, persona);
              break;
            case 'gemini':
              response = await processGeminiRequest(message, persona);
              break;
            case 'claude':
              response = await processClaudeRequest(message, persona);
              break;
          }
          usedProvider = fallbackProvider;
          break;
        } catch (fallbackError) {
          console.warn(`Fallback ${fallbackProvider} also failed:`, fallbackError.message);
        }
      }
      
      if (!response) {
        throw new Error('All AI providers failed');
      }
    }

    // Sanitize response before sending
    const sanitizedResponse = DOMPurify.sanitize(response);

    res.json({
      success: true,
      data: {
        message: sanitizedResponse,
        provider: usedProvider,
        persona: persona,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('AI Chat Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error processing AI request'
    });
  }
});

// AI Processing Functions with enhanced error handling
async function processOpenAIRequest(message, persona) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  const { Configuration, OpenAIApi } = require('openai');
  
  const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  });
  
  const openai = new OpenAIApi(configuration);
  
  const systemPrompt = getPersonaPrompt(persona);
  
  const completion = await openai.createChatCompletion({
    model: 'gpt-4',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message }
    ],
    max_tokens: 1000,
    temperature: 0.7,
    timeout: 30000 // 30 second timeout
  });
  
  return completion.data.choices[0].message.content;
}

async function processGeminiRequest(message, persona) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('Gemini API key not configured');
  }

  const { GoogleGenerativeAI } = require('@google/generative-ai');
  
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
  
  const systemPrompt = getPersonaPrompt(persona);
  const fullPrompt = `${systemPrompt}\n\nUser: ${message}`;
  
  const result = await model.generateContent(fullPrompt);
  const response = await result.response;
  
  return response.text();
}

async function processClaudeRequest(message, persona) {
  if (!process.env.CLAUDE_API_KEY) {
    throw new Error('Claude API key not configured');
  }

  const Anthropic = require('@anthropic-ai/sdk');
  
  const anthropic = new Anthropic({
    apiKey: process.env.CLAUDE_API_KEY,
  });
  
  const systemPrompt = getPersonaPrompt(persona);
  
  const completion = await anthropic.messages.create({
    model: 'claude-3-sonnet-20240229',
    max_tokens: 1000,
    messages: [
      { role: 'user', content: message }
    ],
    system: systemPrompt
  });
  
  return completion.content[0].text;
}

function getPersonaPrompt(persona) {
  const personas = {
    default: "You are Zeeky, a helpful and knowledgeable AI assistant. Be concise, friendly, and provide accurate information. Always prioritize user safety and never provide harmful content.",
    therapist: "You are Zeeky in therapist mode. Be empathetic, supportive, and provide thoughtful guidance. Ask clarifying questions when appropriate. Maintain professional boundaries.",
    coach: "You are Zeeky in coach mode. Be motivational, goal-oriented, and help users achieve their objectives with actionable advice. Focus on positive reinforcement.",
    business: "You are Zeeky in business mode. Provide professional, strategic advice focused on business growth, efficiency, and success. Ensure all advice is ethical and legal.",
    teacher: "You are Zeeky in teacher mode. Explain concepts clearly, provide examples, and help users learn step by step. Encourage critical thinking.",
    friend: "You are Zeeky in friend mode. Be casual, supportive, and engaging like a close friend would be. Maintain appropriate boundaries.",
    scientist: "You are Zeeky in scientist mode. Be analytical, evidence-based, and provide detailed technical explanations. Cite sources when possible."
  };
  
  return personas[persona] || personas.default;
}

module.exports = router;