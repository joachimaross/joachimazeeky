const express = require('express');
const router = express.Router();

// Music generation rate limiting (separate from general AI)
const rateLimit = require('express-rate-limit');

const musicLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 3, // Limit each user to 3 music generation requests per 5 minutes
  message: {
    error: 'Music generation limit exceeded. Please wait 5 minutes before generating more music.',
    retryAfter: 300,
    code: 'MUSIC_RATE_LIMIT'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.userId, // Rate limit per user
});

// Apply music-specific rate limiting
router.use(musicLimiter);

// Validation middleware for music generation
const validateMusicInput = (req, res, next) => {
  const { prompt, style, options = {} } = req.body;
  
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({
      error: 'Music prompt is required',
      code: 'MISSING_PROMPT'
    });
  }
  
  if (prompt.length < 5 || prompt.length > 500) {
    return res.status(400).json({
      error: 'Prompt must be between 5 and 500 characters',
      code: 'INVALID_PROMPT_LENGTH'
    });
  }
  
  const validStyles = [
    'pop', 'rock', 'hip-hop', 'electronic', 'jazz', 'classical', 
    'country', 'blues', 'reggae', 'folk', 'r&b', 'funk', 'punk'
  ];
  
  if (style && !validStyles.includes(style.toLowerCase())) {
    return res.status(400).json({
      error: 'Invalid music style',
      validStyles,
      code: 'INVALID_STYLE'
    });
  }
  
  // Validate options
  if (options.duration && (options.duration < 15 || options.duration > 300)) {
    return res.status(400).json({
      error: 'Duration must be between 15 and 300 seconds',
      code: 'INVALID_DURATION'
    });
  }
  
  if (options.mood && typeof options.mood !== 'string') {
    return res.status(400).json({
      error: 'Mood must be a string',
      code: 'INVALID_MOOD'
    });
  }
  
  // Content filtering for inappropriate prompts
  const inappropriateKeywords = [
    'violence', 'hate', 'explicit', 'drugs', 'illegal', 'offensive'
  ];
  
  const lowerPrompt = prompt.toLowerCase();
  const hasInappropriate = inappropriateKeywords.some(keyword => 
    lowerPrompt.includes(keyword)
  );
  
  if (hasInappropriate) {
    return res.status(400).json({
      error: 'Inappropriate content detected in prompt',
      code: 'INAPPROPRIATE_CONTENT'
    });
  }
  
  next();
};

// Initialize music generation services
let sunoAPI, udioAPI;

try {
  if (process.env.SUNO_API_KEY) {
    sunoAPI = {
      apiKey: process.env.SUNO_API_KEY,
      baseURL: process.env.SUNO_API_URL || 'https://api.suno.ai/v1',
    };
  }
  
  if (process.env.UDIO_API_KEY) {
    udioAPI = {
      apiKey: process.env.UDIO_API_KEY,
      baseURL: 'https://api.udio.ai/v1',
    };
  }
} catch (error) {
  console.error('Failed to initialize music APIs:', error.message);
}

// Enhanced prompt generation using AI
const enhancePromptWithAI = async (prompt, style, mood) => {
  try {
    const { OpenAI } = require('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    const enhancementPrompt = `
Transform this music prompt into a detailed, creative description for AI music generation:

Original prompt: "${prompt}"
Style: ${style || 'any'}
Mood: ${mood || 'any'}

Create a detailed prompt that includes:
- Musical elements (tempo, key, instruments)
- Emotional tone and atmosphere
- Song structure suggestions
- Any relevant stylistic details

Keep it under 200 characters and make it engaging for music AI.
    `;
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: enhancementPrompt }],
      max_tokens: 150,
      temperature: 0.8
    });
    
    return completion.choices[0]?.message?.content?.trim() || prompt;
  } catch (error) {
    console.error('Prompt enhancement failed:', error);
    return prompt; // Return original if enhancement fails
  }
};

// Mock Suno API call (replace with actual implementation)
const callSunoAPI = async (prompt, options) => {
  if (!sunoAPI) {
    throw new Error('Suno API not configured');
  }
  
  try {
    const response = await fetch(`${sunoAPI.baseURL}/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sunoAPI.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        style: options.style || 'pop',
        duration: options.duration || 180,
        instrumental: options.instrumental || false,
        custom_mode: true,
        tags: options.tags || []
      })
    });
    
    if (!response.ok) {
      throw new Error(`Suno API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Suno API call failed:', error);
    throw error;
  }
};

// Mock Udio API call (replace with actual implementation)
const callUdioAPI = async (prompt, options) => {
  if (!udioAPI) {
    throw new Error('Udio API not configured');
  }
  
  try {
    const response = await fetch(`${udioAPI.baseURL}/create`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${udioAPI.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        genre: options.style || 'pop',
        mood: options.mood || 'upbeat',
        duration: options.duration || 180,
        instrumental: options.instrumental || false
      })
    });
    
    if (!response.ok) {
      throw new Error(`Udio API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Udio API call failed:', error);
    throw error;
  }
};

// POST /api/music/generate - Generate music
router.post('/generate', validateMusicInput, async (req, res) => {
  try {
    const { prompt, style = 'pop', options = {} } = req.body;
    const userId = req.userId;
    
    // Enhance prompt with AI if available
    const enhancedPrompt = await enhancePromptWithAI(prompt, style, options.mood);
    
    console.log(`Music generation request from user ${userId}:`, {
      originalPrompt: prompt,
      enhancedPrompt,
      style,
      options
    });
    
    const generationOptions = {
      style: style.toLowerCase(),
      mood: options.mood || 'upbeat',
      duration: options.duration || 180,
      instrumental: options.instrumental || false,
      tempo: options.tempo || 'medium',
      tags: options.tags || [style, options.mood].filter(Boolean)
    };
    
    // Try multiple services for best results
    let result = null;
    let provider = null;
    let errors = [];
    
    // Try Suno first (if available)
    if (sunoAPI && !result) {
      try {
        console.log('Attempting Suno API generation...');
        result = await callSunoAPI(enhancedPrompt, generationOptions);
        provider = 'suno';
        console.log('Suno generation successful');
      } catch (error) {
        console.error('Suno generation failed:', error.message);
        errors.push({ provider: 'suno', error: error.message });
      }
    }
    
    // Try Udio as fallback (if available)
    if (udioAPI && !result) {
      try {
        console.log('Attempting Udio API generation...');
        result = await callUdioAPI(enhancedPrompt, generationOptions);
        provider = 'udio';
        console.log('Udio generation successful');
      } catch (error) {
        console.error('Udio generation failed:', error.message);
        errors.push({ provider: 'udio', error: error.message });
      }
    }
    
    // If no real APIs available, return mock response for development
    if (!result && process.env.NODE_ENV === 'development') {
      console.log('Using mock music generation for development');
      result = {
        id: `mock_${Date.now()}`,
        status: 'completed',
        audio_url: `https://example.com/mock-music-${Date.now()}.mp3`,
        video_url: `https://example.com/mock-video-${Date.now()}.mp4`,
        lyrics: `[Mock lyrics for: ${prompt}]\n\nVerse 1:\nThis is a generated song\nBased on your prompt so strong\n\nChorus:\n${prompt} (repeat)\nMaking music that's so sweet\n\nVerse 2:\nAI creating melodies\nBringing your dreams to reality`,
        metadata: {
          duration: generationOptions.duration,
          style: generationOptions.style,
          tempo: '120 BPM',
          key: 'C Major',
          mood: generationOptions.mood
        }
      };
      provider = 'mock';
    }
    
    if (!result) {
      return res.status(503).json({
        error: 'All music generation services unavailable',
        errors,
        code: 'MUSIC_SERVICE_UNAVAILABLE'
      });
    }
    
    // Store generation record for analytics
    const generationRecord = {
      id: result.id,
      userId,
      originalPrompt: prompt,
      enhancedPrompt,
      style,
      options: generationOptions,
      provider,
      status: result.status || 'pending',
      timestamp: new Date().toISOString()
    };
    
    // In production, store this in database
    console.log('Music generation record:', generationRecord);
    
    res.json({
      success: true,
      generation: {
        id: result.id,
        status: result.status || 'pending',
        provider,
        estimatedTime: result.estimated_time || 60, // seconds
        audioUrl: result.audio_url || null,
        videoUrl: result.video_url || null,
        lyrics: result.lyrics || null,
        metadata: {
          ...result.metadata,
          originalPrompt: prompt,
          enhancedPrompt,
          generatedAt: new Date().toISOString()
        }
      }
    });
    
  } catch (error) {
    console.error('Music generation error:', error);
    
    res.status(500).json({
      error: 'Music generation failed',
      code: 'MUSIC_GENERATION_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/music/status/:id - Check generation status
router.get('/status/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    
    if (!id) {
      return res.status(400).json({
        error: 'Generation ID required',
        code: 'MISSING_ID'
      });
    }
    
    // In production, check database for generation record
    // For now, mock the status check
    
    let status = 'completed';
    let progress = 100;
    
    // Simulate processing for newer generations
    const timestamp = parseInt(id.split('_')[1]) || Date.now();
    const ageMinutes = (Date.now() - timestamp) / (1000 * 60);
    
    if (ageMinutes < 2) {
      status = 'processing';
      progress = Math.min(95, ageMinutes * 50);
    }
    
    res.json({
      id,
      status,
      progress,
      estimatedTimeRemaining: status === 'processing' ? Math.max(0, 120 - ageMinutes * 60) : 0,
      audioUrl: status === 'completed' ? `https://example.com/audio/${id}.mp3` : null,
      videoUrl: status === 'completed' ? `https://example.com/video/${id}.mp4` : null,
      error: status === 'failed' ? 'Generation failed due to content policy' : null,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({
      error: 'Status check failed',
      code: 'STATUS_CHECK_ERROR'
    });
  }
});

// GET /api/music/styles - Get available music styles
router.get('/styles', (req, res) => {
  const styles = [
    { id: 'pop', name: 'Pop', description: 'Catchy, mainstream appeal' },
    { id: 'rock', name: 'Rock', description: 'Guitar-driven, energetic' },
    { id: 'hip-hop', name: 'Hip-Hop', description: 'Rhythmic, urban beats' },
    { id: 'electronic', name: 'Electronic', description: 'Synthesized, digital sounds' },
    { id: 'jazz', name: 'Jazz', description: 'Improvisation, complex harmonies' },
    { id: 'classical', name: 'Classical', description: 'Orchestral, traditional' },
    { id: 'country', name: 'Country', description: 'Folk-inspired, storytelling' },
    { id: 'blues', name: 'Blues', description: 'Soulful, emotional expression' },
    { id: 'reggae', name: 'Reggae', description: 'Jamaican rhythm, relaxed' },
    { id: 'folk', name: 'Folk', description: 'Acoustic, traditional roots' },
    { id: 'r&b', name: 'R&B', description: 'Rhythm and blues, soulful' },
    { id: 'funk', name: 'Funk', description: 'Groove-oriented, rhythmic' }
  ];
  
  res.json({
    styles,
    count: styles.length
  });
});

// GET /api/music/history - Get user's music generation history
router.get('/history', (req, res) => {
  const userId = req.userId;
  const { limit = 20, offset = 0 } = req.query;
  
  // In production, fetch from database
  // For now, return mock history
  const mockHistory = [
    {
      id: 'mock_1234567890',
      prompt: 'Upbeat pop song about success',
      style: 'pop',
      status: 'completed',
      audioUrl: 'https://example.com/audio/mock_1234567890.mp3',
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      duration: 180
    },
    {
      id: 'mock_1234567891',
      prompt: 'Relaxing jazz instrumental',
      style: 'jazz',
      status: 'completed',
      audioUrl: 'https://example.com/audio/mock_1234567891.mp3',
      createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
      duration: 240
    }
  ];
  
  res.json({
    history: mockHistory.slice(offset, offset + limit),
    total: mockHistory.length,
    limit: parseInt(limit),
    offset: parseInt(offset)
  });
});

// DELETE /api/music/:id - Delete a generation
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const userId = req.userId;
  
  // In production, verify ownership and delete from database
  console.log(`User ${userId} requested deletion of music generation ${id}`);
  
  res.json({
    success: true,
    message: 'Music generation deleted',
    id
  });
});

module.exports = router;