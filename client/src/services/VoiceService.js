class VoiceService {
  constructor() {
    this.synthesis = window.speechSynthesis;
    this.recognition = null;
    this.isListening = false;
    this.isSpeaking = false;
    this.voiceSettings = {
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0,
      voice: null
    };
    
    this.initializeSpeechRecognition();
    this.initializeVoices();
    
    // Callbacks
    this.onSpeechStart = null;
    this.onSpeechEnd = null;
    this.onListeningStart = null;
    this.onListeningEnd = null;
    this.onSpeechResult = null;
    this.onError = null;
  }

  // Initialize speech recognition
  initializeSpeechRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';
      this.recognition.maxAlternatives = 1;

      this.recognition.onstart = () => {
        this.isListening = true;
        if (this.onListeningStart) this.onListeningStart();
      };

      this.recognition.onend = () => {
        this.isListening = false;
        if (this.onListeningEnd) this.onListeningEnd();
      };

      this.recognition.onresult = (event) => {
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

        if (this.onSpeechResult) {
          this.onSpeechResult({
            final: finalTranscript,
            interim: interimTranscript,
            isFinal: finalTranscript.length > 0
          });
        }
      };

      this.recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        this.isListening = false;
        if (this.onError) this.onError(event.error);
      };

      this.recognition.onnomatch = () => {
        console.log('No speech was recognized');
      };
    } else {
      console.warn('Speech Recognition not supported in this browser');
    }
  }

  // Initialize available voices
  initializeVoices() {
    const setVoices = () => {
      const voices = this.synthesis.getVoices();
      
      // Find a suitable male voice for Zeeky
      const preferredVoices = [
        'Google US English Male',
        'Microsoft David Desktop',
        'Alex',
        'Daniel',
        'Fred'
      ];
      
      let selectedVoice = null;
      for (const voiceName of preferredVoices) {
        selectedVoice = voices.find(voice => 
          voice.name.includes(voiceName) || voice.name.toLowerCase().includes('male')
        );
        if (selectedVoice) break;
      }
      
      // Fallback to any English voice
      if (!selectedVoice) {
        selectedVoice = voices.find(voice => 
          voice.lang.startsWith('en') && voice.name.toLowerCase().includes('male')
        ) || voices.find(voice => voice.lang.startsWith('en'));
      }
      
      this.voiceSettings.voice = selectedVoice;
    };

    // Set voices immediately if available
    setVoices();
    
    // Set voices when they become available
    this.synthesis.onvoiceschanged = setVoices;
  }

  // Start listening for speech
  startListening() {
    if (this.recognition && !this.isListening) {
      try {
        this.recognition.start();
        return true;
      } catch (error) {
        console.error('Error starting speech recognition:', error);
        if (this.onError) this.onError(error.message);
        return false;
      }
    }
    return false;
  }

  // Stop listening for speech
  stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      return true;
    }
    return false;
  }

  // Toggle listening state
  toggleListening() {
    if (this.isListening) {
      return this.stopListening();
    } else {
      return this.startListening();
    }
  }

  // Speak text with natural voice
  speak(text, options = {}) {
    return new Promise((resolve, reject) => {
      if (!text || this.isSpeaking) {
        resolve(false);
        return;
      }

      // Stop any current speech
      this.synthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      
      // Apply voice settings
      utterance.voice = options.voice || this.voiceSettings.voice;
      utterance.rate = options.rate || this.voiceSettings.rate;
      utterance.pitch = options.pitch || this.voiceSettings.pitch;
      utterance.volume = options.volume || this.voiceSettings.volume;

      // Add natural pauses and emphasis
      const processedText = this.processTextForSpeech(text);
      utterance.text = processedText;

      utterance.onstart = () => {
        this.isSpeaking = true;
        if (this.onSpeechStart) this.onSpeechStart();
      };

      utterance.onend = () => {
        this.isSpeaking = false;
        if (this.onSpeechEnd) this.onSpeechEnd();
        resolve(true);
      };

      utterance.onerror = (event) => {
        this.isSpeaking = false;
        console.error('Speech synthesis error:', event.error);
        if (this.onError) this.onError(event.error);
        reject(event.error);
      };

      this.synthesis.speak(utterance);
    });
  }

  // Process text to make it sound more natural
  processTextForSpeech(text) {
    let processedText = text;
    
    // Add pauses for punctuation
    processedText = processedText.replace(/\./g, '... ');
    processedText = processedText.replace(/!/g, '! ');
    processedText = processedText.replace(/\?/g, '? ');
    processedText = processedText.replace(/,/g, ', ');
    processedText = processedText.replace(/:/g, ': ');
    processedText = processedText.replace(/;/g, '; ');
    
    // Handle emphasis
    processedText = processedText.replace(/\*([^*]+)\*/g, '$1'); // Remove markdown asterisks
    processedText = processedText.replace(/\*\*([^*]+)\*\*/g, '$1'); // Remove bold markdown
    
    // Handle code blocks
    processedText = processedText.replace(/```[\s\S]*?```/g, 'code block');
    processedText = processedText.replace(/`([^`]+)`/g, '$1');
    
    // Clean up extra spaces
    processedText = processedText.replace(/\s+/g, ' ').trim();
    
    return processedText;
  }

  // Stop speaking
  stopSpeaking() {
    if (this.isSpeaking) {
      this.synthesis.cancel();
      this.isSpeaking = false;
      if (this.onSpeechEnd) this.onSpeechEnd();
      return true;
    }
    return false;
  }

  // Analyze voice tone and emotion
  analyzeVoiceTone(audioData) {
    // This would require more advanced audio processing
    // For now, return a basic analysis
    const analysis = {
      emotion: 'neutral',
      confidence: 0.5,
      pitch: 'normal',
      speed: 'normal',
      volume: 'normal'
    };
    
    // Basic amplitude analysis
    if (audioData && audioData.length > 0) {
      const avgAmplitude = audioData.reduce((sum, val) => sum + Math.abs(val), 0) / audioData.length;
      
      if (avgAmplitude > 0.7) {
        analysis.emotion = 'excited';
        analysis.volume = 'loud';
      } else if (avgAmplitude < 0.3) {
        analysis.emotion = 'calm';
        analysis.volume = 'quiet';
      }
      
      analysis.confidence = Math.min(avgAmplitude * 2, 1);
    }
    
    return analysis;
  }

  // Set voice personality based on persona
  setVoicePersonality(persona) {
    const personalitySettings = {
      therapist: { rate: 0.9, pitch: 0.9, volume: 0.8 },
      coach: { rate: 1.2, pitch: 1.1, volume: 1.0 },
      business: { rate: 1.0, pitch: 0.95, volume: 0.9 },
      tutor: { rate: 0.95, pitch: 1.0, volume: 0.85 },
      friend: { rate: 1.1, pitch: 1.05, volume: 0.95 },
      fitness: { rate: 1.3, pitch: 1.2, volume: 1.0 },
      default: { rate: 1.0, pitch: 1.0, volume: 1.0 }
    };
    
    const settings = personalitySettings[persona] || personalitySettings.default;
    this.voiceSettings = { ...this.voiceSettings, ...settings };
  }

  // Get available voices
  getAvailableVoices() {
    return this.synthesis.getVoices().map(voice => ({
      name: voice.name,
      lang: voice.lang,
      gender: voice.name.toLowerCase().includes('female') ? 'female' : 'male',
      isDefault: voice.default
    }));
  }

  // Check if browser supports speech features
  isSupported() {
    return {
      synthesis: 'speechSynthesis' in window,
      recognition: 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window
    };
  }

  // Get current status
  getStatus() {
    return {
      isListening: this.isListening,
      isSpeaking: this.isSpeaking,
      voiceSettings: this.voiceSettings,
      support: this.isSupported()
    };
  }

  // Set event callbacks
  setCallbacks(callbacks) {
    this.onSpeechStart = callbacks.onSpeechStart;
    this.onSpeechEnd = callbacks.onSpeechEnd;
    this.onListeningStart = callbacks.onListeningStart;
    this.onListeningEnd = callbacks.onListeningEnd;
    this.onSpeechResult = callbacks.onSpeechResult;
    this.onError = callbacks.onError;
  }
}

export default new VoiceService();