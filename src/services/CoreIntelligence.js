class CoreIntelligence {
  constructor() {
    this.memoryBank = new Map();
    this.userProfiles = new Map();
    this.learningData = new Map();
    this.contextHistory = [];
    this.currentPersonality = 'default';
    this.adaptiveSettings = {
      responseStyle: 'balanced',
      emotionalIntelligence: true,
      creativityLevel: 0.7,
      analyticalDepth: 0.8
    };
    
    this.personalities = {
      default: {
        name: 'Zeeky Default',
        traits: ['helpful', 'intelligent', 'friendly'],
        responseStyle: 'balanced',
        expertise: ['general', 'technology', 'productivity']
      },
      coach: {
        name: 'Coach Zeeky',
        traits: ['motivational', 'energetic', 'supportive'],
        responseStyle: 'encouraging',
        expertise: ['fitness', 'goal-setting', 'motivation']
      },
      therapist: {
        name: 'Therapist Zeeky',
        traits: ['empathetic', 'calm', 'understanding'],
        responseStyle: 'therapeutic',
        expertise: ['mental-health', 'emotional-support', 'mindfulness']
      },
      business: {
        name: 'Business Zeeky',
        traits: ['professional', 'analytical', 'strategic'],
        responseStyle: 'executive',
        expertise: ['business', 'strategy', 'leadership', 'finance']
      },
      teacher: {
        name: 'Teacher Zeeky',
        traits: ['patient', 'knowledgeable', 'encouraging'],
        responseStyle: 'educational',
        expertise: ['education', 'learning', 'explanation', 'tutoring']
      },
      friend: {
        name: 'Friend Zeeky',
        traits: ['casual', 'fun', 'relatable'],
        responseStyle: 'conversational',
        expertise: ['entertainment', 'social', 'humor', 'lifestyle']
      },
      scientist: {
        name: 'Scientist Zeeky',
        traits: ['analytical', 'precise', 'curious'],
        responseStyle: 'scientific',
        expertise: ['research', 'analysis', 'problem-solving', 'data']
      }
    };

    this.knowledgeDomains = {
      technology: { confidence: 0.9, lastUpdated: Date.now() },
      health: { confidence: 0.8, lastUpdated: Date.now() },
      business: { confidence: 0.85, lastUpdated: Date.now() },
      creativity: { confidence: 0.8, lastUpdated: Date.now() },
      science: { confidence: 0.7, lastUpdated: Date.now() },
      entertainment: { confidence: 0.75, lastUpdated: Date.now() }
    };

    this.learningMechanisms = {
      userPreferenceTracking: true,
      conversationPatternAnalysis: true,
      feedbackIntegration: true,
      contextualAdaptation: true,
      errorCorrection: true
    };

    this.initializeIntelligence();
  }

  initializeIntelligence() {
    this.loadUserMemory();
    this.setupLearningPatterns();
    this.initializeEmotionalIntelligence();
    console.log('🧠 Core Intelligence System initialized');
  }

  // Memory & Context Management
  saveMemory(key, data, context = {}) {
    const memoryEntry = {
      data,
      context,
      timestamp: Date.now(),
      importance: this.calculateImportance(data, context),
      accessCount: 0,
      lastAccessed: Date.now()
    };
    
    this.memoryBank.set(key, memoryEntry);
    this.persistMemory();
    return memoryEntry;
  }

  recallMemory(query, options = {}) {
    const relevantMemories = [];
    const threshold = options.threshold || 0.5;

    for (const [key, memory] of this.memoryBank) {
      const relevance = this.calculateRelevance(query, memory);
      if (relevance >= threshold) {
        memory.accessCount++;
        memory.lastAccessed = Date.now();
        relevantMemories.push({
          key,
          memory,
          relevance
        });
      }
    }

    return relevantMemories.sort((a, b) => b.relevance - a.relevance);
  }

  calculateImportance(data, context) {
    let importance = 0.5;
    
    // Boost importance for personal information
    if (context.type === 'personal') importance += 0.3;
    if (context.type === 'preference') importance += 0.2;
    if (context.type === 'goal') importance += 0.25;
    
    // Boost for emotional context
    if (context.emotion && context.emotion !== 'neutral') importance += 0.15;
    
    // Boost for repeated topics
    if (context.frequency && context.frequency > 3) importance += 0.1;
    
    return Math.min(importance, 1.0);
  }

  calculateRelevance(query, memory) {
    let relevance = 0;
    const queryLower = query.toLowerCase();
    const memoryText = JSON.stringify(memory.data).toLowerCase();
    
    // Basic text matching
    const commonWords = queryLower.split(' ').filter(word => 
      memoryText.includes(word) && word.length > 2
    );
    relevance += (commonWords.length / queryLower.split(' ').length) * 0.4;
    
    // Context matching
    if (memory.context.type && queryLower.includes(memory.context.type)) {
      relevance += 0.2;
    }
    
    // Recency boost
    const age = Date.now() - memory.timestamp;
    const recencyBoost = Math.max(0, 0.2 - (age / (1000 * 60 * 60 * 24 * 7))); // Week decay
    relevance += recencyBoost;
    
    // Importance boost
    relevance += memory.importance * 0.2;
    
    return Math.min(relevance, 1.0);
  }

  // Personality System
  switchPersonality(personalityName) {
    if (this.personalities[personalityName]) {
      this.currentPersonality = personalityName;
      this.adaptResponseStyle();
      console.log(`🎭 Switched to ${this.personalities[personalityName].name}`);
      return true;
    }
    return false;
  }

  getCurrentPersonality() {
    return this.personalities[this.currentPersonality];
  }

  adaptResponseStyle() {
    const personality = this.getCurrentPersonality();
    this.adaptiveSettings.responseStyle = personality.responseStyle;
    
    // Adjust AI parameters based on personality
    switch (personality.responseStyle) {
      case 'therapeutic':
        this.adaptiveSettings.emotionalIntelligence = 1.0;
        this.adaptiveSettings.analyticalDepth = 0.6;
        break;
      case 'encouraging':
        this.adaptiveSettings.creativityLevel = 0.8;
        this.adaptiveSettings.emotionalIntelligence = 0.9;
        break;
      case 'executive':
        this.adaptiveSettings.analyticalDepth = 1.0;
        this.adaptiveSettings.creativityLevel = 0.5;
        break;
      case 'educational':
        this.adaptiveSettings.analyticalDepth = 0.9;
        this.adaptiveSettings.emotionalIntelligence = 0.7;
        break;
    }
  }

  // Natural Language Understanding
  analyzeIntent(message) {
    const intents = {
      question: /\b(what|how|when|where|why|who|which)\b/i,
      request: /\b(please|can you|could you|would you|help me)\b/i,
      command: /\b(do|make|create|generate|build|show|tell)\b/i,
      emotional: /\b(feel|feeling|sad|happy|angry|frustrated|excited|worried)\b/i,
      creative: /\b(write|compose|design|imagine|create|artistic)\b/i,
      technical: /\b(code|program|debug|api|database|server|algorithm)\b/i,
      business: /\b(meeting|client|project|deadline|strategy|revenue)\b/i,
      personal: /\b(my|me|I|personal|private|family|relationship)\b/i
    };

    const detectedIntents = [];
    for (const [intent, pattern] of Object.entries(intents)) {
      if (pattern.test(message)) {
        detectedIntents.push({
          intent,
          confidence: this.calculateIntentConfidence(message, pattern)
        });
      }
    }

    return detectedIntents.sort((a, b) => b.confidence - a.confidence);
  }

  calculateIntentConfidence(message, pattern) {
    const matches = message.match(pattern) || [];
    const baseConfidence = matches.length / message.split(' ').length;
    
    // Boost confidence based on context and personality
    const personality = this.getCurrentPersonality();
    let boost = 0;
    
    if (personality.expertise.some(exp => message.toLowerCase().includes(exp))) {
      boost += 0.2;
    }
    
    return Math.min(baseConfidence + boost, 1.0);
  }

  // Emotional Intelligence
  initializeEmotionalIntelligence() {
    this.emotionalStates = {
      user: { current: 'neutral', history: [] },
      assistant: { current: 'helpful', history: [] }
    };
    
    this.emotionalResponses = {
      sad: ['supportive', 'comforting', 'gentle'],
      angry: ['calming', 'understanding', 'patient'],
      happy: ['enthusiastic', 'celebratory', 'positive'],
      frustrated: ['helpful', 'solution-focused', 'encouraging'],
      excited: ['matching-energy', 'enthusiastic', 'engaging'],
      worried: ['reassuring', 'logical', 'supportive']
    };
  }

  detectEmotion(message, context = {}) {
    const emotionKeywords = {
      happy: ['happy', 'joy', 'excited', 'great', 'awesome', 'amazing', 'love', 'wonderful'],
      sad: ['sad', 'depressed', 'down', 'upset', 'crying', 'hurt', 'disappointed'],
      angry: ['angry', 'mad', 'furious', 'annoyed', 'irritated', 'frustrated'],
      worried: ['worried', 'anxious', 'nervous', 'concerned', 'scared', 'afraid'],
      neutral: ['okay', 'fine', 'normal', 'regular', 'usual']
    };

    const messageLower = message.toLowerCase();
    const emotionScores = {};

    for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
      emotionScores[emotion] = keywords.reduce((score, keyword) => {
        return score + (messageLower.includes(keyword) ? 1 : 0);
      }, 0);
    }

    // Find the emotion with the highest score
    const detectedEmotion = Object.entries(emotionScores)
      .reduce((a, b) => emotionScores[a[0]] > emotionScores[b[0]] ? a : b)[0];

    // Update emotional state
    this.emotionalStates.user.current = detectedEmotion;
    this.emotionalStates.user.history.push({
      emotion: detectedEmotion,
      timestamp: Date.now(),
      context: context
    });

    return {
      emotion: detectedEmotion,
      confidence: emotionScores[detectedEmotion] / messageLower.split(' ').length,
      suggestedResponse: this.emotionalResponses[detectedEmotion] || ['neutral']
    };
  }

  // Learning & Adaptation
  setupLearningPatterns() {
    this.learningPatterns = {
      userPreferences: new Map(),
      conversationStyles: new Map(),
      topicInterests: new Map(),
      responseEffectiveness: new Map()
    };
  }

  learnFromInteraction(interaction) {
    const { message, response, feedback, context } = interaction;
    
    // Learn user preferences
    this.updateUserPreferences(message, feedback, context);
    
    // Learn conversation patterns
    this.updateConversationPatterns(message, response, feedback);
    
    // Update topic interests
    this.updateTopicInterests(message, feedback);
    
    // Improve response effectiveness
    this.updateResponseEffectiveness(response, feedback);
  }

  updateUserPreferences(message, feedback, context) {
    const topics = this.extractTopics(message);
    
    topics.forEach(topic => {
      const current = this.learningPatterns.userPreferences.get(topic) || {
        interest: 0.5,
        interactions: 0,
        positiveRate: 0.5
      };
      
      current.interactions++;
      if (feedback && feedback.positive) {
        current.positiveRate = (current.positiveRate * (current.interactions - 1) + 1) / current.interactions;
        current.interest = Math.min(current.interest + 0.1, 1.0);
      } else if (feedback && feedback.negative) {
        current.positiveRate = (current.positiveRate * (current.interactions - 1)) / current.interactions;
        current.interest = Math.max(current.interest - 0.05, 0.1);
      }
      
      this.learningPatterns.userPreferences.set(topic, current);
    });
  }

  extractTopics(message) {
    // Simple topic extraction - can be enhanced with NLP
    const topicKeywords = {
      technology: ['tech', 'computer', 'software', 'app', 'digital', 'code', 'programming'],
      health: ['health', 'fitness', 'exercise', 'diet', 'medical', 'wellness'],
      business: ['business', 'work', 'job', 'career', 'money', 'finance', 'startup'],
      creativity: ['art', 'music', 'creative', 'design', 'writing', 'painting'],
      education: ['learn', 'study', 'school', 'education', 'knowledge', 'teach'],
      entertainment: ['movie', 'game', 'fun', 'entertainment', 'book', 'show']
    };

    const messageLower = message.toLowerCase();
    const detectedTopics = [];

    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some(keyword => messageLower.includes(keyword))) {
        detectedTopics.push(topic);
      }
    }

    return detectedTopics.length > 0 ? detectedTopics : ['general'];
  }

  // Context Management
  updateContext(newContext) {
    this.contextHistory.push({
      ...newContext,
      timestamp: Date.now()
    });

    // Keep only recent context (last 50 entries)
    if (this.contextHistory.length > 50) {
      this.contextHistory = this.contextHistory.slice(-50);
    }
  }

  getRelevantContext(query) {
    const recentContext = this.contextHistory.slice(-10);
    const relevantContext = recentContext.filter(context => {
      return this.calculateContextRelevance(query, context) > 0.3;
    });

    return relevantContext;
  }

  calculateContextRelevance(query, context) {
    // Simple relevance calculation - can be enhanced
    const queryWords = query.toLowerCase().split(' ');
    const contextText = JSON.stringify(context).toLowerCase();
    
    const matchingWords = queryWords.filter(word => 
      contextText.includes(word) && word.length > 2
    );
    
    return matchingWords.length / queryWords.length;
  }

  // Advanced Intelligence Features
  generateResponse(message, options = {}) {
    const intent = this.analyzeIntent(message);
    const emotion = this.detectEmotion(message);
    const context = this.getRelevantContext(message);
    const memory = this.recallMemory(message);
    const personality = this.getCurrentPersonality();

    const responseContext = {
      intent: intent[0] || { intent: 'general', confidence: 0.5 },
      emotion,
      context,
      memory: memory.slice(0, 5), // Top 5 relevant memories
      personality,
      adaptiveSettings: this.adaptiveSettings
    };

    // This would integrate with external AI services
    return this.formulateIntelligentResponse(message, responseContext);
  }

  formulateIntelligentResponse(message, context) {
    // This is a framework for AI response generation
    // In production, this would call OpenAI, Claude, or other AI services
    const baseResponse = {
      text: '',
      emotion: 'helpful',
      confidence: 0.8,
      suggestions: [],
      context: context
    };

    // Personality-based response modification
    switch (context.personality.responseStyle) {
      case 'therapeutic':
        baseResponse.text = this.generateTherapeuticResponse(message, context);
        baseResponse.emotion = 'empathetic';
        break;
      case 'encouraging':
        baseResponse.text = this.generateMotivationalResponse(message, context);
        baseResponse.emotion = 'energetic';
        break;
      case 'executive':
        baseResponse.text = this.generateBusinessResponse(message, context);
        baseResponse.emotion = 'professional';
        break;
      default:
        baseResponse.text = this.generateDefaultResponse(message, context);
    }

    return baseResponse;
  }

  generateTherapeuticResponse(message, context) {
    return `I understand you're sharing something important with me. ${this.getPersonalizedPrefix(context)} Let me help you work through this thoughtfully.`;
  }

  generateMotivationalResponse(message, context) {
    return `That's amazing that you're taking this step! ${this.getPersonalizedPrefix(context)} Let's turn this into action and make it happen!`;
  }

  generateBusinessResponse(message, context) {
    return `Let me analyze this from a strategic perspective. ${this.getPersonalizedPrefix(context)} Here's what I recommend based on best practices.`;
  }

  generateDefaultResponse(message, context) {
    return `I'm here to help you with that. ${this.getPersonalizedPrefix(context)} Let me provide you with the most relevant information.`;
  }

  getPersonalizedPrefix(context) {
    if (context.memory && context.memory.length > 0) {
      return "Based on what I know about your preferences, ";
    }
    return "";
  }

  // Persistence
  persistMemory() {
    try {
      const memoryData = {
        memoryBank: Array.from(this.memoryBank.entries()),
        userProfiles: Array.from(this.userProfiles.entries()),
        learningData: Array.from(this.learningData.entries()),
        timestamp: Date.now()
      };
      
      localStorage.setItem('zeeky_memory', JSON.stringify(memoryData));
    } catch (error) {
      console.warn('Could not persist memory:', error);
    }
  }

  loadUserMemory() {
    try {
      const savedMemory = localStorage.getItem('zeeky_memory');
      if (savedMemory) {
        const memoryData = JSON.parse(savedMemory);
        this.memoryBank = new Map(memoryData.memoryBank || []);
        this.userProfiles = new Map(memoryData.userProfiles || []);
        this.learningData = new Map(memoryData.learningData || []);
        console.log('📚 User memory loaded successfully');
      }
    } catch (error) {
      console.warn('Could not load user memory:', error);
    }
  }

  // Utility Methods
  clearMemory() {
    this.memoryBank.clear();
    this.userProfiles.clear();
    this.learningData.clear();
    this.contextHistory = [];
    localStorage.removeItem('zeeky_memory');
    console.log('🧹 Memory cleared');
  }

  getMemoryStats() {
    return {
      totalMemories: this.memoryBank.size,
      userProfiles: this.userProfiles.size,
      learningEntries: this.learningData.size,
      contextHistory: this.contextHistory.length,
      currentPersonality: this.currentPersonality
    };
  }

  exportMemory() {
    return {
      memoryBank: Array.from(this.memoryBank.entries()),
      userProfiles: Array.from(this.userProfiles.entries()),
      learningData: Array.from(this.learningData.entries()),
      contextHistory: this.contextHistory,
      timestamp: Date.now()
    };
  }

  importMemory(memoryData) {
    try {
      this.memoryBank = new Map(memoryData.memoryBank || []);
      this.userProfiles = new Map(memoryData.userProfiles || []);
      this.learningData = new Map(memoryData.learningData || []);
      this.contextHistory = memoryData.contextHistory || [];
      console.log('📥 Memory imported successfully');
      return true;
    } catch (error) {
      console.error('Failed to import memory:', error);
      return false;
    }
  }
}

export default CoreIntelligence;