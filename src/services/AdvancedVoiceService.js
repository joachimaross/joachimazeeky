class AdvancedVoiceService {
  constructor() {
    this.isListening = false;
    this.isSpeaking = false;
    this.recognition = null;
    this.synthesis = window.speechSynthesis;
    this.currentVoice = null;
    this.wakeWordActive = false;
    this.continuousMode = false;
    this.voiceSettings = {
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0,
      voice: null,
      language: 'en-US'
    };
    
    this.wakeWords = ['aye zeeky', 'hey zeeky', 'zeeky'];
    this.commands = new Map();
    this.voiceProfiles = new Map();
    this.emotionalVoices = new Map();
    this.conversationBuffer = [];
    
    this.initializeVoiceRecognition();
    this.initializeVoiceSynthesis();
    this.setupWakeWordDetection();
    this.setupVoiceProfiles();
  }

  // Initialize Speech Recognition
  initializeVoiceRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 3;
      this.recognition.lang = this.voiceSettings.language;
      
      this.setupRecognitionHandlers();
      console.log('🎤 Advanced Voice Recognition initialized');
    } else {
      console.warn('Speech Recognition not supported');
    }
  }

  setupRecognitionHandlers() {
    this.recognition.onstart = () => {
      this.isListening = true;
      this.onListeningStart?.();
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.onListeningEnd?.();
      
      // Restart if in continuous mode
      if (this.continuousMode) {
        setTimeout(() => this.startListening(), 100);
      }
    };

    this.recognition.onresult = (event) => {
      this.handleSpeechResult(event);
    };

    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      this.onError?.(event.error);
    };
  }

  handleSpeechResult(event) {
    let finalTranscript = '';
    let interimTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      
      if (event.results[i].isFinal) {
        finalTranscript += transcript;
      } else {
        interimTranscript += transcript;
      }
    }

    // Check for wake words
    const fullTranscript = (finalTranscript + interimTranscript).toLowerCase();
    if (this.detectWakeWord(fullTranscript)) {
      this.onWakeWordDetected?.(fullTranscript);
    }

    // Check for voice commands
    if (finalTranscript) {
      this.processVoiceCommand(finalTranscript);
      this.conversationBuffer.push({
        text: finalTranscript,
        timestamp: Date.now(),
        type: 'user'
      });
    }

    this.onTranscript?.({
      final: finalTranscript,
      interim: interimTranscript,
      confidence: event.results[event.resultIndex]?.[0]?.confidence || 0
    });
  }

  // Wake Word Detection
  setupWakeWordDetection() {
    this.wakeWordPatterns = this.wakeWords.map(word => ({
      word,
      pattern: new RegExp(`\\b${word.replace(' ', '\\s+')}\\b`, 'i'),
      confidence: 0
    }));
  }

  detectWakeWord(transcript) {
    for (const wakeWord of this.wakeWordPatterns) {
      if (wakeWord.pattern.test(transcript)) {
        wakeWord.confidence = this.calculateWakeWordConfidence(transcript, wakeWord.word);
        if (wakeWord.confidence > 0.7) {
          this.wakeWordActive = true;
          setTimeout(() => { this.wakeWordActive = false; }, 5000); // 5 second window
          return true;
        }
      }
    }
    return false;
  }

  calculateWakeWordConfidence(transcript, wakeWord) {
    const words = transcript.toLowerCase().split(/\s+/);
    const wakeWords = wakeWord.toLowerCase().split(/\s+/);
    
    let matches = 0;
    for (const word of wakeWords) {
      if (words.includes(word)) matches++;
    }
    
    return matches / wakeWords.length;
  }

  // Voice Synthesis Enhancement
  initializeVoiceSynthesis() {
    this.synthesis.onvoiceschanged = () => {
      this.loadAvailableVoices();
    };
    
    // Load voices immediately if available
    this.loadAvailableVoices();
  }

  loadAvailableVoices() {
    const voices = this.synthesis.getVoices();
    this.availableVoices = voices;
    
    // Find best default voice
    this.currentVoice = voices.find(voice => 
      voice.lang.startsWith('en') && voice.name.includes('Neural')
    ) || voices.find(voice => 
      voice.lang.startsWith('en') && !voice.name.includes('Google')
    ) || voices[0];
    
    this.voiceSettings.voice = this.currentVoice;
    console.log(`🔊 Voice synthesis ready with ${voices.length} voices`);
  }

  setupVoiceProfiles() {
    this.voiceProfiles.set('default', {
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0,
      style: 'neutral'
    });
    
    this.voiceProfiles.set('friendly', {
      rate: 1.1,
      pitch: 1.1,
      volume: 0.9,
      style: 'warm'
    });
    
    this.voiceProfiles.set('professional', {
      rate: 0.9,
      pitch: 0.95,
      volume: 1.0,
      style: 'formal'
    });
    
    this.voiceProfiles.set('excited', {
      rate: 1.2,
      pitch: 1.2,
      volume: 1.0,
      style: 'energetic'
    });
    
    this.voiceProfiles.set('calm', {
      rate: 0.8,
      pitch: 0.9,
      volume: 0.8,
      style: 'soothing'
    });
  }

  // Enhanced Speech Synthesis
  async speak(text, options = {}) {
    if (this.isSpeaking && !options.interrupt) {
      return false;
    }
    
    if (options.interrupt) {
      this.synthesis.cancel();
    }
    
    const processedText = this.processTextForSpeech(text, options);
    const utterance = new SpeechSynthesisUtterance(processedText);
    
    // Apply voice profile
    const profile = options.profile || 'default';
    this.applyVoiceProfile(utterance, profile);
    
    // Apply emotional inflection
    if (options.emotion) {
      this.applyEmotionalInflection(utterance, options.emotion);
    }
    
    // Set up event handlers
    utterance.onstart = () => {
      this.isSpeaking = true;
      this.onSpeechStart?.(processedText);
    };
    
    utterance.onend = () => {
      this.isSpeaking = false;
      this.onSpeechEnd?.(processedText);
      this.conversationBuffer.push({
        text: processedText,
        timestamp: Date.now(),
        type: 'assistant'
      });
    };
    
    utterance.onerror = (event) => {
      this.isSpeaking = false;
      console.error('Speech synthesis error:', event.error);
      this.onSpeechError?.(event.error);
    };
    
    // Speak with advanced features
    if (options.ssml) {
      await this.speakWithSSML(text, utterance);
    } else {
      this.synthesis.speak(utterance);
    }
    
    return true;
  }

  processTextForSpeech(text, options = {}) {
    let processedText = text;
    
    // Handle abbreviations
    const abbreviations = {
      'AI': 'Artificial Intelligence',
      'API': 'Application Programming Interface',
      'UI': 'User Interface',
      'UX': 'User Experience',
      'CEO': 'Chief Executive Officer',
      'CRM': 'Customer Relationship Management'
    };
    
    for (const [abbr, full] of Object.entries(abbreviations)) {
      const regex = new RegExp(`\\b${abbr}\\b`, 'g');
      processedText = processedText.replace(regex, full);
    }
    
    // Handle URLs and emails
    processedText = processedText.replace(/https?:\/\/[^\s]+/g, 'website link');
    processedText = processedText.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, 'email address');
    
    // Add pauses for better flow
    if (options.naturalPauses) {
      processedText = processedText.replace(/\. /g, '. <break time="500ms"/> ');
      processedText = processedText.replace(/\? /g, '? <break time="300ms"/> ');
      processedText = processedText.replace(/! /g, '! <break time="400ms"/> ');
    }
    
    return processedText;
  }

  applyVoiceProfile(utterance, profileName) {
    const profile = this.voiceProfiles.get(profileName) || this.voiceProfiles.get('default');
    
    utterance.rate = profile.rate * this.voiceSettings.rate;
    utterance.pitch = profile.pitch * this.voiceSettings.pitch;
    utterance.volume = profile.volume * this.voiceSettings.volume;
    utterance.voice = this.voiceSettings.voice;
  }

  applyEmotionalInflection(utterance, emotion) {
    const emotionalSettings = {
      happy: { rate: 1.1, pitch: 1.1, volume: 1.0 },
      sad: { rate: 0.8, pitch: 0.8, volume: 0.7 },
      excited: { rate: 1.3, pitch: 1.2, volume: 1.0 },
      angry: { rate: 1.2, pitch: 0.9, volume: 1.0 },
      calm: { rate: 0.9, pitch: 0.9, volume: 0.8 },
      surprised: { rate: 1.1, pitch: 1.3, volume: 0.9 }
    };
    
    const settings = emotionalSettings[emotion];
    if (settings) {
      utterance.rate *= settings.rate;
      utterance.pitch *= settings.pitch;
      utterance.volume *= settings.volume;
    }
  }

  // Voice Commands System
  registerCommand(trigger, callback, options = {}) {
    this.commands.set(trigger.toLowerCase(), {
      callback,
      options,
      pattern: new RegExp(trigger.replace(/\*/g, '(.*)'), 'i'),
      exactMatch: options.exactMatch || false
    });
  }

  processVoiceCommand(transcript) {
    const text = transcript.toLowerCase().trim();
    
    for (const [trigger, command] of this.commands) {
      let match = false;
      let params = [];
      
      if (command.exactMatch) {
        match = text === trigger;
      } else {
        const matchResult = text.match(command.pattern);
        if (matchResult) {
          match = true;
          params = matchResult.slice(1);
        }
      }
      
      if (match) {
        try {
          command.callback(params, transcript);
          this.onCommandExecuted?.(trigger, params);
        } catch (error) {
          console.error(`Error executing command ${trigger}:`, error);
        }
        break;
      }
    }
  }

  // Advanced Features
  startContinuousListening() {
    this.continuousMode = true;
    this.startListening();
  }

  stopContinuousListening() {
    this.continuousMode = false;
    this.stopListening();
  }

  startListening() {
    if (this.recognition && !this.isListening) {
      try {
        this.recognition.start();
      } catch (error) {
        console.error('Error starting speech recognition:', error);
      }
    }
  }

  stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
  }

  // Speaker Identification
  analyzeVoiceCharacteristics(audioData) {
    // This would integrate with voice biometrics APIs
    // For now, return basic analysis
    return {
      speakerId: 'unknown',
      confidence: 0.5,
      characteristics: {
        pitch: 'medium',
        speed: 'normal',
        accent: 'neutral'
      }
    };
  }

  // Noise Filtering (placeholder for Web Audio API implementation)
  enableNoiseFiltering() {
    // Would implement Web Audio API noise reduction
    console.log('🔇 Noise filtering enabled');
  }

  // Multi-language Support
  setLanguage(languageCode) {
    this.voiceSettings.language = languageCode;
    if (this.recognition) {
      this.recognition.lang = languageCode;
    }
    
    // Find appropriate voice for language
    const voice = this.availableVoices?.find(v => v.lang.startsWith(languageCode));
    if (voice) {
      this.voiceSettings.voice = voice;
    }
  }

  // Voice Notes and Reminders
  recordVoiceNote(duration = 60000) {
    return new Promise((resolve) => {
      const note = {
        id: Date.now(),
        timestamp: Date.now(),
        transcript: '',
        duration: 0
      };
      
      this.startListening();
      
      const timeout = setTimeout(() => {
        this.stopListening();
        resolve(note);
      }, duration);
      
      const originalHandler = this.onTranscript;
      this.onTranscript = (result) => {
        if (result.final) {
          note.transcript += result.final + ' ';
        }
        originalHandler?.(result);
      };
      
      // Restore original handler after recording
      setTimeout(() => {
        this.onTranscript = originalHandler;
      }, duration + 100);
    });
  }

  // Conversation Management
  getConversationHistory(limit = 10) {
    return this.conversationBuffer.slice(-limit);
  }

  clearConversationHistory() {
    this.conversationBuffer = [];
  }

  // Settings and Configuration
  updateVoiceSettings(newSettings) {
    this.voiceSettings = { ...this.voiceSettings, ...newSettings };
    
    if (newSettings.language) {
      this.setLanguage(newSettings.language);
    }
  }

  getVoiceSettings() {
    return { ...this.voiceSettings };
  }

  getAvailableVoices() {
    return this.availableVoices || [];
  }

  // Utility Methods
  isSupported() {
    return {
      recognition: 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window,
      synthesis: 'speechSynthesis' in window
    };
  }

  getStatus() {
    return {
      isListening: this.isListening,
      isSpeaking: this.isSpeaking,
      wakeWordActive: this.wakeWordActive,
      continuousMode: this.continuousMode,
      currentLanguage: this.voiceSettings.language,
      conversationLength: this.conversationBuffer.length
    };
  }

  // Cleanup
  destroy() {
    this.stopListening();
    this.synthesis.cancel();
    this.commands.clear();
    this.conversationBuffer = [];
    this.recognition = null;
  }
}

export default AdvancedVoiceService;