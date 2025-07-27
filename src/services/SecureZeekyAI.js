class SecureZeekyAI {
  constructor() {
    this.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
    this.currentPersonality = 'default';
    this.conversationHistory = [];
    this.retryAttempts = 3;
    this.retryDelay = 1000; // milliseconds
    
    // Error handling
    this.onError = null;
    this.onRateLimit = null;
    this.onUnauthorized = null;
    
    this.personalities = {
      default: { name: 'Zeeky Default', traits: ['helpful', 'intelligent', 'friendly'] },
      therapist: { name: 'Therapist Zeeky', traits: ['empathetic', 'supportive', 'caring'] },
      coach: { name: 'Coach Zeeky', traits: ['motivational', 'energetic', 'encouraging'] },
      business: { name: 'Business Zeeky', traits: ['professional', 'strategic', 'analytical'] },
      teacher: { name: 'Teacher Zeeky', traits: ['patient', 'educational', 'clear'] },
      friend: { name: 'Friend Zeeky', traits: ['casual', 'supportive', 'fun'] },
      scientist: { name: 'Scientist Zeeky', traits: ['analytical', 'precise', 'curious'] }
    };
  }

  // Get authentication headers
  getAuthHeaders() {
    const user = this.getCurrentUser();
    const token = this.getIdToken();
    
    return {
      'Content-Type': 'application/json',
      'X-User-ID': user?.uid || 'anonymous',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  }

  // Get current Firebase user (implement based on your auth system)
  getCurrentUser() {
    // This should integrate with your Firebase auth
    try {
      const auth = require('../firebase-config').auth;
      return auth.currentUser;
    } catch (error) {
      console.warn('Could not get current user:', error);
      return null;
    }
  }

  // Get Firebase ID token (implement based on your auth system)
  async getIdToken() {
    try {
      const user = this.getCurrentUser();
      if (user) {
        return await user.getIdToken();
      }
    } catch (error) {
      console.warn('Could not get ID token:', error);
    }
    return null;
  }

  // Enhanced fetch with retry logic and error handling
  async secureFetch(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            ...this.getAuthHeaders(),
            ...options.headers
          }
        });

        // Handle different HTTP status codes
        if (response.status === 401) {
          const error = new Error('Authentication required');
          error.code = 'AUTH_REQUIRED';
          this.onUnauthorized?.(error);
          throw error;
        }

        if (response.status === 429) {
          const data = await response.json();
          const error = new Error(data.error || 'Rate limit exceeded');
          error.code = 'RATE_LIMIT';
          error.retryAfter = data.retryAfter || 60;
          
          this.onRateLimit?.(error);
          
          // Wait before retrying
          if (attempt < this.retryAttempts) {
            await this.delay(data.retryAfter * 1000 || this.retryDelay * attempt);
            continue;
          }
          throw error;
        }

        if (response.status === 503) {
          const error = new Error('Service temporarily unavailable');
          error.code = 'SERVICE_UNAVAILABLE';
          
          // Retry with exponential backoff
          if (attempt < this.retryAttempts) {
            await this.delay(this.retryDelay * Math.pow(2, attempt - 1));
            continue;
          }
          throw error;
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const error = new Error(errorData.error || `HTTP ${response.status}`);
          error.code = errorData.code || 'HTTP_ERROR';
          error.status = response.status;
          throw error;
        }

        return await response.json();

      } catch (error) {
        console.error(`API call attempt ${attempt} failed:`, error);
        
        // Don't retry for certain errors
        if (error.code === 'AUTH_REQUIRED' || error.code === 'VALIDATION_ERROR') {
          throw error;
        }
        
        // Last attempt - throw the error
        if (attempt === this.retryAttempts) {
          this.onError?.(error);
          throw error;
        }
        
        // Wait before retrying
        await this.delay(this.retryDelay * attempt);
      }
    }
  }

  // Utility function for delays
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Main chat method with conversation management
  async chat(message, options = {}) {
    try {
      // Add user message to history
      const userMessage = {
        role: 'user',
        content: message,
        timestamp: new Date().toISOString()
      };
      
      this.conversationHistory.push(userMessage);

      // Prepare messages for API call
      const messages = this.prepareMessages(options.includeHistory !== false);
      
      const requestData = {
        messages,
        personality: this.currentPersonality,
        options: {
          maxTokens: options.maxTokens || 1000,
          temperature: options.temperature || 0.7,
          model: options.model
        }
      };

      const response = await this.secureFetch('/ai/chat', {
        method: 'POST',
        body: JSON.stringify(requestData)
      });

      // Add assistant response to history
      const assistantMessage = {
        role: 'assistant',
        content: response.response,
        timestamp: response.timestamp,
        provider: response.provider,
        personality: response.personality
      };
      
      this.conversationHistory.push(assistantMessage);

      // Trim history to prevent it from getting too large
      this.trimConversationHistory();

      return {
        response: response.response,
        provider: response.provider,
        model: response.model,
        usage: response.usage,
        personality: response.personality,
        cached: response.cached || false,
        timestamp: response.timestamp
      };

    } catch (error) {
      console.error('Chat error:', error);
      
      // Return fallback response for better UX
      const fallbackResponse = this.getFallbackResponse(message, error);
      
      return {
        response: fallbackResponse,
        provider: 'fallback',
        error: error.message,
        code: error.code,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Prepare messages for API call
  prepareMessages(includeHistory = true) {
    const messages = [];
    
    if (includeHistory && this.conversationHistory.length > 0) {
      // Include recent conversation history (last 10 messages)
      const recentHistory = this.conversationHistory.slice(-10);
      messages.push(...recentHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      })));
    }
    
    return messages;
  }

  // Trim conversation history to prevent memory issues
  trimConversationHistory(maxLength = 50) {
    if (this.conversationHistory.length > maxLength) {
      // Keep system messages and recent messages
      const systemMessages = this.conversationHistory.filter(msg => msg.role === 'system');
      const recentMessages = this.conversationHistory.slice(-maxLength + systemMessages.length);
      
      this.conversationHistory = [...systemMessages, ...recentMessages];
    }
  }

  // Generate fallback responses when AI services fail
  getFallbackResponse(message, error) {
    const fallbackResponses = {
      'RATE_LIMIT': [
        "I'm experiencing high demand right now. Please try again in a moment.",
        "My AI services are busy at the moment. Let me help you differently in just a bit.",
        "I need a quick break to process all the requests. Please try again shortly."
      ],
      'AUTH_REQUIRED': [
        "I need you to be signed in to help with that. Please log in and try again.",
        "Authentication is required for this feature. Please sign in first."
      ],
      'SERVICE_UNAVAILABLE': [
        "I'm having technical difficulties right now, but I'll be back soon!",
        "My AI services are temporarily down for maintenance. Please try again later.",
        "I'm experiencing some technical issues. Please bear with me!"
      ],
      'DEFAULT': [
        "I'm having trouble processing that right now. Could you try rephrasing your question?",
        "Something went wrong on my end. Let me try to help you differently.",
        "I encountered an issue, but I'm here to help. Can you try asking again?"
      ]
    };
    
    const responses = fallbackResponses[error.code] || fallbackResponses.DEFAULT;
    return responses[Math.floor(Math.random() * responses.length)];
  }

  // Text analysis method
  async analyzeText(text, analysisType = 'sentiment') {
    try {
      const response = await this.secureFetch('/ai/analyze', {
        method: 'POST',
        body: JSON.stringify({
          text,
          analysisType
        })
      });

      return response;

    } catch (error) {
      console.error('Text analysis error:', error);
      
      // Return basic fallback analysis
      return {
        analysisType,
        error: error.message,
        fallback: true,
        result: this.getFallbackAnalysis(text, analysisType),
        timestamp: new Date().toISOString()
      };
    }
  }

  // Fallback analysis when AI services are unavailable
  getFallbackAnalysis(text, analysisType) {
    switch (analysisType) {
      case 'sentiment':
        return {
          sentiment: 'neutral',
          confidence: 0.5,
          explanation: 'Fallback analysis - AI services unavailable'
        };
      case 'emotion':
        return {
          emotions: [{ emotion: 'neutral', intensity: 0.5 }],
          primary_emotion: 'neutral'
        };
      case 'language':
        return {
          language: 'en',
          language_name: 'English',
          confidence: 0.8
        };
      default:
        return { error: 'Analysis type not supported in fallback mode' };
    }
  }

  // Personality management
  switchPersonality(personalityName) {
    if (this.personalities[personalityName]) {
      this.currentPersonality = personalityName;
      
      // Add personality switch to conversation history
      this.conversationHistory.push({
        role: 'system',
        content: `Personality switched to ${personalityName}`,
        timestamp: new Date().toISOString(),
        type: 'personality_switch'
      });
      
      return true;
    }
    return false;
  }

  getCurrentPersonality() {
    return {
      id: this.currentPersonality,
      ...this.personalities[this.currentPersonality]
    };
  }

  async getAvailablePersonalities() {
    try {
      const response = await this.secureFetch('/ai/personalities');
      return response.personalities;
    } catch (error) {
      console.error('Failed to fetch personalities:', error);
      // Return local fallback
      return Object.entries(this.personalities).map(([id, data]) => ({
        id,
        name: data.name,
        traits: data.traits
      }));
    }
  }

  // Service status check
  async getServiceStatus() {
    try {
      const response = await this.secureFetch('/ai/status');
      return response;
    } catch (error) {
      console.error('Failed to get service status:', error);
      return {
        overall: 'unknown',
        services: {},
        error: error.message
      };
    }
  }

  // Conversation management
  clearConversation() {
    this.conversationHistory = [];
  }

  getConversationHistory() {
    return [...this.conversationHistory];
  }

  exportConversation() {
    return {
      personality: this.currentPersonality,
      history: this.conversationHistory,
      exportedAt: new Date().toISOString()
    };
  }

  importConversation(data) {
    try {
      if (data.personality && this.personalities[data.personality]) {
        this.currentPersonality = data.personality;
      }
      
      if (Array.isArray(data.history)) {
        this.conversationHistory = data.history;
      }
      
      return true;
    } catch (error) {
      console.error('Failed to import conversation:', error);
      return false;
    }
  }

  // Event listeners
  setErrorHandler(handler) {
    this.onError = handler;
  }

  setRateLimitHandler(handler) {
    this.onRateLimit = handler;
  }

  setUnauthorizedHandler(handler) {
    this.onUnauthorized = handler;
  }

  // Configuration
  setBaseURL(url) {
    this.baseURL = url;
  }

  setRetryConfig(attempts, delay) {
    this.retryAttempts = attempts;
    this.retryDelay = delay;
  }
}

export default SecureZeekyAI;