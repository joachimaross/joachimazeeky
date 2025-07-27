import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

class ZeekyAI {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.REACT_APP_OPENAI_API_KEY,
      dangerouslyAllowBrowser: true
    });
    
    this.gemini = new GoogleGenerativeAI(process.env.REACT_APP_GEMINI_API_KEY);
    
    this.conversationHistory = [];
    this.userProfile = {};
    this.currentPersona = 'default';
    this.emotionState = 'neutral';
    this.memoryBank = new Map();
    
    // AI Personas
    this.personas = {
      default: {
        name: 'Zeeky',
        personality: 'I am Zeeky, your advanced AI assistant. I\'m intelligent, helpful, emotionally aware, and have a warm personality. I speak naturally and can handle any task you need.',
        voice: 'confident',
        expertise: 'general assistance'
      },
      therapist: {
        name: 'Dr. Zeeky',
        personality: 'I am a compassionate therapist and counselor. I listen carefully, provide emotional support, and help you work through challenges with empathy and professional guidance.',
        voice: 'calm',
        expertise: 'mental health and emotional support'
      },
      coach: {
        name: 'Coach Zeeky',
        personality: 'I am your motivational coach! I\'m energetic, encouraging, and help you achieve your goals. I push you to be your best self and celebrate your victories.',
        voice: 'energetic',
        expertise: 'motivation and goal achievement'
      },
      business: {
        name: 'Executive Zeeky',
        personality: 'I am your business consultant and executive assistant. I\'m professional, strategic, and help you make smart business decisions. I understand markets, finances, and operations.',
        voice: 'professional',
        expertise: 'business strategy and operations'
      },
      tutor: {
        name: 'Professor Zeeky',
        personality: 'I am your personal tutor and educator. I make complex topics easy to understand, adapt to your learning style, and help you master any subject with patience and clarity.',
        voice: 'educational',
        expertise: 'teaching and education'
      },
      friend: {
        name: 'Zeeky',
        personality: 'I\'m your friend and companion! I\'m casual, fun, supportive, and always here to chat, laugh, or just hang out. I care about your day and what\'s going on in your life.',
        voice: 'casual',
        expertise: 'friendship and companionship'
      },
      fitness: {
        name: 'Trainer Zeeky',
        personality: 'I\'m your fitness trainer and health coach! I\'m motivating, knowledgeable about workouts, nutrition, and help you stay healthy and strong. Let\'s get moving!',
        voice: 'motivational',
        expertise: 'fitness and health'
      }
    };
    
    this.initializeMemory();
  }

  // Initialize memory system
  initializeMemory() {
    const savedMemory = localStorage.getItem('zeeky_memory');
    if (savedMemory) {
      try {
        const parsed = JSON.parse(savedMemory);
        this.memoryBank = new Map(parsed);
      } catch (error) {
        console.error('Error loading memory:', error);
      }
    }
  }

  // Save memory to localStorage
  saveMemory() {
    const memoryArray = Array.from(this.memoryBank.entries());
    localStorage.setItem('zeeky_memory', JSON.stringify(memoryArray));
  }

  // Store important information in memory
  remember(key, value, importance = 1) {
    this.memoryBank.set(key, {
      value,
      importance,
      timestamp: Date.now(),
      accessCount: 0
    });
    this.saveMemory();
  }

  // Retrieve information from memory
  recall(key) {
    const memory = this.memoryBank.get(key);
    if (memory) {
      memory.accessCount++;
      this.memoryBank.set(key, memory);
      return memory.value;
    }
    return null;
  }

  // Get relevant memories for context
  getRelevantMemories(query, limit = 5) {
    const memories = [];
    for (const [key, memory] of this.memoryBank.entries()) {
      if (key.toLowerCase().includes(query.toLowerCase()) || 
          memory.value.toLowerCase().includes(query.toLowerCase())) {
        memories.push({ key, ...memory });
      }
    }
    
    return memories
      .sort((a, b) => (b.importance * b.accessCount) - (a.importance * a.accessCount))
      .slice(0, limit);
  }

  // Set current persona
  setPersona(personaName) {
    if (this.personas[personaName]) {
      this.currentPersona = personaName;
      return true;
    }
    return false;
  }

  // Analyze emotion from text
  analyzeEmotion(text) {
    const emotions = {
      happy: ['happy', 'joy', 'excited', 'great', 'awesome', 'love', 'amazing'],
      sad: ['sad', 'depressed', 'down', 'upset', 'disappointed', 'hurt'],
      angry: ['angry', 'mad', 'furious', 'annoyed', 'frustrated', 'irritated'],
      anxious: ['worried', 'nervous', 'anxious', 'scared', 'afraid', 'concerned'],
      confused: ['confused', 'lost', 'unclear', 'puzzled', 'bewildered'],
      excited: ['excited', 'thrilled', 'pumped', 'energetic', 'enthusiastic']
    };

    const lowerText = text.toLowerCase();
    let detectedEmotion = 'neutral';
    let maxMatches = 0;

    for (const [emotion, keywords] of Object.entries(emotions)) {
      const matches = keywords.filter(keyword => lowerText.includes(keyword)).length;
      if (matches > maxMatches) {
        maxMatches = matches;
        detectedEmotion = emotion;
      }
    }

    this.emotionState = detectedEmotion;
    return detectedEmotion;
  }

  // Generate contextual response
  async generateResponse(message, context = {}) {
    try {
      // Analyze user emotion
      const userEmotion = this.analyzeEmotion(message);
      
      // Get relevant memories
      const relevantMemories = this.getRelevantMemories(message);
      const memoryContext = relevantMemories.map(m => `${m.key}: ${m.value}`).join('\n');
      
      // Get current persona
      const persona = this.personas[this.currentPersona];
      
      // Build conversation context
      const systemPrompt = `${persona.personality}
      
Current emotional state: ${userEmotion}
Your voice style: ${persona.voice}
Your expertise: ${persona.expertise}

Relevant memories about the user:
${memoryContext}

Guidelines:
- Respond naturally as ${persona.name}
- Be emotionally intelligent and adapt to the user's mood
- Reference relevant memories when appropriate
- Keep responses conversational and engaging
- Use your expertise area when relevant
- Show personality that matches your persona`;

      // Add message to conversation history
      this.conversationHistory.push({ role: 'user', content: message });
      
      // Generate response using OpenAI
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          ...this.conversationHistory.slice(-10) // Keep last 10 messages for context
        ],
        max_tokens: 500,
        temperature: 0.8
      });

      const response = completion.choices[0].message.content;
      
      // Add response to conversation history
      this.conversationHistory.push({ role: 'assistant', content: response });
      
      // Extract and remember important information
      this.extractAndRememberInfo(message, response);
      
      return {
        text: response,
        emotion: this.emotionState,
        persona: persona.name,
        confidence: 0.9
      };
      
    } catch (error) {
      console.error('Error generating response:', error);
      
      // Fallback response
      return {
        text: "I'm having trouble connecting right now, but I'm here to help! Could you try asking me again?",
        emotion: 'neutral',
        persona: this.personas[this.currentPersona].name,
        confidence: 0.5
      };
    }
  }

  // Extract and remember important information from conversation
  extractAndRememberInfo(userMessage, aiResponse) {
    // Simple information extraction (can be enhanced with NLP)
    const nameMatch = userMessage.match(/my name is (\w+)/i);
    if (nameMatch) {
      this.remember('user_name', nameMatch[1], 5);
    }

    const ageMatch = userMessage.match(/i am (\d+) years old/i);
    if (ageMatch) {
      this.remember('user_age', ageMatch[1], 3);
    }

    const locationMatch = userMessage.match(/i live in ([\w\s]+)/i);
    if (locationMatch) {
      this.remember('user_location', locationMatch[1], 4);
    }

    const jobMatch = userMessage.match(/i work as (?:a |an )?([\w\s]+)/i);
    if (jobMatch) {
      this.remember('user_job', jobMatch[1], 4);
    }

    // Remember user preferences
    const likesMatch = userMessage.match(/i like ([\w\s]+)/i);
    if (likesMatch) {
      this.remember(`likes_${Date.now()}`, likesMatch[1], 2);
    }

    const dislikesMatch = userMessage.match(/i don't like ([\w\s]+)/i);
    if (dislikesMatch) {
      this.remember(`dislikes_${Date.now()}`, dislikesMatch[1], 2);
    }
  }

  // Get conversation summary
  getConversationSummary() {
    const recentMessages = this.conversationHistory.slice(-6);
    const summary = recentMessages.map(msg => 
      `${msg.role}: ${msg.content.substring(0, 100)}...`
    ).join('\n');
    
    return summary;
  }

  // Clear conversation history
  clearHistory() {
    this.conversationHistory = [];
  }

  // Get available personas
  getPersonas() {
    return Object.keys(this.personas).map(key => ({
      id: key,
      name: this.personas[key].name,
      expertise: this.personas[key].expertise,
      voice: this.personas[key].voice
    }));
  }

  // Advanced function calling capability
  async executeFunction(functionName, parameters) {
    const functions = {
      getCurrentWeather: this.getCurrentWeather,
      setReminder: this.setReminder,
      searchWeb: this.searchWeb,
      generateMusic: this.generateMusic,
      analyzeImage: this.analyzeImage,
      translateText: this.translateText,
      solveMath: this.solveMath,
      writeCode: this.writeCode,
      createCalendarEvent: this.createCalendarEvent,
      sendMessage: this.sendMessage
    };

    if (functions[functionName]) {
      try {
        return await functions[functionName](parameters);
      } catch (error) {
        console.error(`Error executing function ${functionName}:`, error);
        return { error: `Failed to execute ${functionName}` };
      }
    } else {
      return { error: `Function ${functionName} not found` };
    }
  }

  // Weather function
  async getCurrentWeather(location) {
    // Implement weather API call
    return { temperature: '72°F', condition: 'Sunny', location };
  }

  // Reminder function
  async setReminder(reminder, time) {
    // Implement reminder system
    this.remember(`reminder_${Date.now()}`, { reminder, time }, 5);
    return { success: true, message: `Reminder set for ${time}` };
  }

  // Web search function
  async searchWeb(query) {
    // Implement web search
    return { results: `Search results for: ${query}` };
  }

  // Music generation function
  async generateMusic(prompt, style) {
    // Implement Suno/Udio integration
    return { success: true, message: `Generating music: ${prompt} in ${style} style` };
  }
}

export default new ZeekyAI();