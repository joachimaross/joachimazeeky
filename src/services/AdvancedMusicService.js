class AdvancedMusicService {
  constructor() {
    this.isInitialized = false;
    this.currentTrack = null;
    this.playlist = [];
    this.musicHistory = [];
    this.userPreferences = new Map();
    this.generationQueue = [];
    
    // Music Generation APIs
    this.sunoAPI = null;
    this.udioAPI = null;
    this.elevenLabsAPI = null;
    
    // Audio Context for advanced audio processing
    this.audioContext = null;
    this.analyser = null;
    this.audioSource = null;
    
    // Music analysis and AI
    this.songAnalyzer = null;
    this.lyricsGenerator = null;
    this.beatGenerator = null;
    this.moodDetector = null;
    
    // Streaming services integration
    this.spotifyAPI = null;
    this.appleMusicAPI = null;
    this.youtubeMusicAPI = null;
    
    this.musicStyles = {
      pop: {
        tempo: { min: 120, max: 140 },
        key: ['C', 'G', 'Am', 'F'],
        instruments: ['vocals', 'guitar', 'bass', 'drums', 'synth'],
        structure: ['verse', 'chorus', 'verse', 'chorus', 'bridge', 'chorus']
      },
      rock: {
        tempo: { min: 110, max: 160 },
        key: ['E', 'A', 'D', 'G'],
        instruments: ['vocals', 'electric guitar', 'bass', 'drums'],
        structure: ['intro', 'verse', 'chorus', 'verse', 'chorus', 'solo', 'chorus']
      },
      hiphop: {
        tempo: { min: 70, max: 140 },
        key: ['Am', 'Dm', 'Gm', 'Em'],
        instruments: ['vocals', 'drums', 'bass', '808', 'synth'],
        structure: ['intro', 'verse', 'hook', 'verse', 'hook', 'bridge', 'hook']
      },
      electronic: {
        tempo: { min: 120, max: 150 },
        key: ['Am', 'Dm', 'Em', 'Bm'],
        instruments: ['synth', 'bass', 'drums', 'pad', 'lead'],
        structure: ['intro', 'buildup', 'drop', 'verse', 'buildup', 'drop']
      },
      jazz: {
        tempo: { min: 60, max: 200 },
        key: ['Cmaj7', 'Am7', 'Dm7', 'G7'],
        instruments: ['piano', 'bass', 'drums', 'trumpet', 'saxophone'],
        structure: ['intro', 'theme', 'solos', 'theme', 'outro']
      },
      classical: {
        tempo: { min: 60, max: 180 },
        key: ['C', 'G', 'D', 'A', 'F'],
        instruments: ['violin', 'piano', 'cello', 'flute', 'trumpet'],
        structure: ['exposition', 'development', 'recapitulation']
      }
    };
    
    this.moodMapping = {
      happy: { styles: ['pop', 'electronic', 'funk'], energy: 'high', tempo: 'fast' },
      sad: { styles: ['ballad', 'blues', 'classical'], energy: 'low', tempo: 'slow' },
      energetic: { styles: ['rock', 'electronic', 'hiphop'], energy: 'high', tempo: 'fast' },
      calm: { styles: ['ambient', 'classical', 'jazz'], energy: 'low', tempo: 'medium' },
      romantic: { styles: ['ballad', 'jazz', 'classical'], energy: 'medium', tempo: 'slow' },
      angry: { styles: ['rock', 'metal', 'punk'], energy: 'high', tempo: 'fast' },
      nostalgic: { styles: ['folk', 'country', 'oldies'], energy: 'medium', tempo: 'medium' }
    };
    
    this.initialize();
  }

  async initialize() {
    try {
      console.log('🎵 Initializing Advanced Music Service...');
      
      // Initialize audio context
      this.initializeAudioContext();
      
      // Setup music generation APIs
      this.setupMusicAPIs();
      
      // Initialize music analysis
      this.initializeMusicAnalysis();
      
      // Load user preferences
      this.loadUserPreferences();
      
      // Setup streaming integrations
      await this.setupStreamingServices();
      
      this.isInitialized = true;
      console.log('✅ Advanced Music Service ready');
    } catch (error) {
      console.error('Failed to initialize music service:', error);
    }
  }

  initializeAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      
      console.log('🔊 Audio context initialized');
    } catch (error) {
      console.warn('Audio context not available:', error);
    }
  }

  setupMusicAPIs() {
    // Suno AI Integration
    this.sunoAPI = {
      baseURL: process.env.REACT_APP_SUNO_API_URL || 'https://api.suno.ai/v1',
      apiKey: process.env.REACT_APP_SUNO_API_KEY,
      generateSong: this.generateSunoSong.bind(this),
      getGenerationStatus: this.getSunoStatus.bind(this)
    };
    
    // Udio AI Integration
    this.udioAPI = {
      baseURL: 'https://api.udio.ai/v1',
      apiKey: process.env.REACT_APP_UDIO_API_KEY,
      generateSong: this.generateUdioSong.bind(this),
      getGenerationStatus: this.getUdioStatus.bind(this)
    };
    
    // ElevenLabs for vocals
    this.elevenLabsAPI = {
      baseURL: 'https://api.elevenlabs.io/v1',
      apiKey: process.env.REACT_APP_ELEVENLABS_API_KEY,
      generateVocals: this.generateElevenLabsVocals.bind(this)
    };
  }

  initializeMusicAnalysis() {
    this.songAnalyzer = {
      analyzeTempo: this.analyzeTempo.bind(this),
      analyzeKey: this.analyzeKey.bind(this),
      analyzeMood: this.analyzeMood.bind(this),
      analyzeStructure: this.analyzeStructure.bind(this)
    };
    
    this.lyricsGenerator = {
      generateLyrics: this.generateLyrics.bind(this),
      analyzeLyrics: this.analyzeLyrics.bind(this),
      rhymeSchemes: ['ABAB', 'AABB', 'ABCB', 'AAAA']
    };
    
    this.beatGenerator = {
      generateBeat: this.generateBeat.bind(this),
      createRhythm: this.createRhythm.bind(this),
      addPercussion: this.addPercussion.bind(this)
    };
  }

  async setupStreamingServices() {
    // Spotify Integration
    if (process.env.REACT_APP_SPOTIFY_CLIENT_ID) {
      this.spotifyAPI = {
        clientId: process.env.REACT_APP_SPOTIFY_CLIENT_ID,
        clientSecret: process.env.REACT_APP_SPOTIFY_CLIENT_SECRET,
        accessToken: null,
        refreshToken: null,
        search: this.spotifySearch.bind(this),
        play: this.spotifyPlay.bind(this),
        createPlaylist: this.spotifyCreatePlaylist.bind(this)
      };
    }
    
    // Apple Music Integration (placeholder)
    this.appleMusicAPI = {
      search: this.appleMusicSearch.bind(this),
      play: this.appleMusicPlay.bind(this)
    };
  }

  // AI Music Generation
  async generateSong(prompt, options = {}) {
    try {
      const generationOptions = {
        style: options.style || 'pop',
        mood: options.mood || 'happy',
        duration: options.duration || 180, // 3 minutes
        instrumental: options.instrumental || false,
        tempo: options.tempo || 'medium',
        key: options.key || 'auto',
        lyrics: options.lyrics || null,
        voiceType: options.voiceType || 'auto',
        ...options
      };

      console.log('🎼 Generating song with prompt:', prompt);
      
      // Add to generation queue
      const jobId = this.addToGenerationQueue(prompt, generationOptions);
      
      // Try multiple services for best results
      const results = await Promise.allSettled([
        this.generateWithSuno(prompt, generationOptions),
        this.generateWithUdio(prompt, generationOptions)
      ]);
      
      // Select best result
      const bestResult = this.selectBestGeneration(results);
      
      if (bestResult) {
        // Post-process and enhance
        const enhancedSong = await this.enhanceSong(bestResult, generationOptions);
        
        // Add to music history
        this.addToHistory(enhancedSong, prompt, generationOptions);
        
        // Update user preferences
        this.updateUserPreferences(generationOptions, 'generated');
        
        this.onSongGenerated?.(enhancedSong);
        return enhancedSong;
      }
      
      throw new Error('All music generation services failed');
      
    } catch (error) {
      console.error('Song generation failed:', error);
      this.onGenerationError?.(error);
      throw error;
    }
  }

  async generateWithSuno(prompt, options) {
    if (!this.sunoAPI.apiKey) {
      throw new Error('Suno API key not configured');
    }

    const requestBody = {
      prompt: this.enhancePrompt(prompt, options),
      style: options.style,
      duration: options.duration,
      instrumental: options.instrumental,
      custom_mode: true,
      tags: this.generateTags(options)
    };

    if (options.lyrics) {
      requestBody.lyrics = options.lyrics;
    }

    const response = await fetch(`${this.sunoAPI.baseURL}/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.sunoAPI.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`Suno API error: ${response.status}`);
    }

    const result = await response.json();
    
    // Poll for completion
    return await this.pollForCompletion(result.id, this.sunoAPI);
  }

  async generateWithUdio(prompt, options) {
    if (!this.udioAPI.apiKey) {
      throw new Error('Udio API key not configured');
    }

    const requestBody = {
      prompt: this.enhancePrompt(prompt, options),
      genre: options.style,
      mood: options.mood,
      duration: options.duration,
      instrumental: options.instrumental
    };

    const response = await fetch(`${this.udioAPI.baseURL}/create`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.udioAPI.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`Udio API error: ${response.status}`);
    }

    const result = await response.json();
    return await this.pollForCompletion(result.creation_id, this.udioAPI);
  }

  enhancePrompt(prompt, options) {
    let enhancedPrompt = prompt;
    
    // Add style context
    const styleInfo = this.musicStyles[options.style];
    if (styleInfo) {
      enhancedPrompt += ` in ${options.style} style`;
    }
    
    // Add mood context
    if (options.mood) {
      enhancedPrompt += ` with ${options.mood} mood`;
    }
    
    // Add tempo information
    if (options.tempo) {
      enhancedPrompt += ` at ${options.tempo} tempo`;
    }
    
    // Add instrumentation hints
    if (styleInfo && styleInfo.instruments) {
      enhancedPrompt += ` featuring ${styleInfo.instruments.slice(0, 3).join(', ')}`;
    }
    
    return enhancedPrompt;
  }

  generateTags(options) {
    const tags = [];
    
    if (options.style) tags.push(options.style);
    if (options.mood) tags.push(options.mood);
    if (options.tempo) tags.push(options.tempo);
    if (options.instrumental) tags.push('instrumental');
    
    return tags;
  }

  async pollForCompletion(jobId, api) {
    const maxAttempts = 60; // 5 minutes with 5-second intervals
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      try {
        const status = await api.getGenerationStatus(jobId);
        
        if (status.status === 'completed') {
          return {
            id: jobId,
            audioUrl: status.audio_url,
            videoUrl: status.video_url,
            lyrics: status.lyrics,
            metadata: status.metadata,
            provider: api === this.sunoAPI ? 'suno' : 'udio'
          };
        }
        
        if (status.status === 'failed') {
          throw new Error(`Generation failed: ${status.error}`);
        }
        
        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, 5000));
        attempts++;
        
      } catch (error) {
        console.error('Error polling generation status:', error);
        throw error;
      }
    }
    
    throw new Error('Generation timed out');
  }

  async getSunoStatus(jobId) {
    const response = await fetch(`${this.sunoAPI.baseURL}/status/${jobId}`, {
      headers: {
        'Authorization': `Bearer ${this.sunoAPI.apiKey}`
      }
    });
    
    return await response.json();
  }

  async getUdioStatus(jobId) {
    const response = await fetch(`${this.udioAPI.baseURL}/status/${jobId}`, {
      headers: {
        'Authorization': `Bearer ${this.udioAPI.apiKey}`
      }
    });
    
    return await response.json();
  }

  // Lyrics Generation
  async generateLyrics(prompt, options = {}) {
    const lyricsOptions = {
      theme: options.theme || prompt,
      style: options.style || 'pop',
      mood: options.mood || 'happy',
      structure: options.structure || ['verse', 'chorus', 'verse', 'chorus', 'bridge', 'chorus'],
      rhymeScheme: options.rhymeScheme || 'ABAB',
      language: options.language || 'en'
    };

    try {
      // Use AI service to generate lyrics
      const lyrics = await this.generateAILyrics(prompt, lyricsOptions);
      
      // Analyze and improve lyrics
      const analyzedLyrics = this.analyzeLyrics(lyrics);
      const improvedLyrics = this.improveLyrics(lyrics, analyzedLyrics);
      
      return {
        lyrics: improvedLyrics,
        structure: lyricsOptions.structure,
        rhymeScheme: lyricsOptions.rhymeScheme,
        theme: lyricsOptions.theme,
        analysis: analyzedLyrics
      };
      
    } catch (error) {
      console.error('Lyrics generation failed:', error);
      throw error;
    }
  }

  async generateAILyrics(prompt, options) {
    // This would integrate with OpenAI or other AI service
    const systemPrompt = `Generate song lyrics for: "${prompt}"
    Style: ${options.style}
    Mood: ${options.mood}  
    Structure: ${options.structure.join(' - ')}
    Rhyme scheme: ${options.rhymeScheme}
    Language: ${options.language}
    
    Make the lyrics creative, emotionally resonant, and appropriate for the style and mood.`;
    
    // Placeholder for AI integration
    return this.generateMockLyrics(prompt, options);
  }

  generateMockLyrics(prompt, options) {
    // Mock lyrics generation for demonstration
    const verses = [
      `In the morning light I see your face
      Everything falls into its place
      Dancing through the streets with no fear
      Music fills the atmosphere`,
      
      `Time keeps moving but we stand still
      Chasing dreams up every hill  
      Nothing's gonna bring us down
      We're the heroes of this town`
    ];
    
    const chorus = `This is our moment, this is our time
    Every heartbeat, every rhyme
    We're alive, we're free, we're strong
    This is where we all belong`;
    
    const bridge = `When the world gets heavy and the sky turns gray
    We'll find a way to brighter days
    Together we can face it all
    Together we will never fall`;
    
    return `[Verse 1]\n${verses[0]}\n\n[Chorus]\n${chorus}\n\n[Verse 2]\n${verses[1]}\n\n[Chorus]\n${chorus}\n\n[Bridge]\n${bridge}\n\n[Chorus]\n${chorus}`;
  }

  analyzeLyrics(lyrics) {
    const lines = lyrics.split('\n').filter(line => line.trim() && !line.startsWith('['));
    
    return {
      lineCount: lines.length,
      wordCount: lines.join(' ').split(' ').length,
      averageLineLength: lines.reduce((sum, line) => sum + line.length, 0) / lines.length,
      rhymeQuality: this.analyzeRhymeQuality(lines),
      emotionalTone: this.analyzeLyricalTone(lyrics),
      complexity: this.analyzeLyricalComplexity(lyrics)
    };
  }

  analyzeRhymeQuality(lines) {
    // Simple rhyme analysis - would be more sophisticated in production
    return Math.random() * 0.4 + 0.6; // Mock score between 0.6-1.0
  }

  analyzeLyricalTone(lyrics) {
    const positiveWords = ['love', 'happy', 'joy', 'bright', 'free', 'strong', 'alive'];
    const negativeWords = ['sad', 'pain', 'hurt', 'dark', 'alone', 'cry', 'broken'];
    
    const text = lyrics.toLowerCase();
    const positiveCount = positiveWords.filter(word => text.includes(word)).length;
    const negativeCount = negativeWords.filter(word => text.includes(word)).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  analyzeLyricalComplexity(lyrics) {
    const uniqueWords = new Set(lyrics.toLowerCase().match(/\b\w+\b/g) || []);
    const totalWords = lyrics.match(/\b\w+\b/g)?.length || 0;
    
    return uniqueWords.size / totalWords; // Vocabulary richness
  }

  // Beat and Rhythm Generation
  async generateBeat(style, options = {}) {
    const beatOptions = {
      tempo: options.tempo || this.musicStyles[style]?.tempo?.min || 120,
      timeSignature: options.timeSignature || '4/4',
      complexity: options.complexity || 'medium',
      swing: options.swing || false,
      humanize: options.humanize || true
    };

    const beat = {
      style,
      tempo: beatOptions.tempo,
      timeSignature: beatOptions.timeSignature,
      pattern: this.createRhythmPattern(style, beatOptions),
      instruments: this.getBeatInstruments(style),
      swing: beatOptions.swing,
      humanized: beatOptions.humanize
    };

    return beat;
  }

  createRhythmPattern(style, options) {
    const patterns = {
      pop: {
        kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
        snare: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
        hihat: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
      },
      rock: {
        kick: [1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0],
        snare: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
        hihat: [1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1]
      },
      hiphop: {
        kick: [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0],
        snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
        hihat: [1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0]
      }
    };

    return patterns[style] || patterns.pop;
  }

  getBeatInstruments(style) {
    const instruments = {
      pop: ['kick', 'snare', 'hihat', 'crash', 'ride'],
      rock: ['kick', 'snare', 'hihat', 'crash', 'tom'],
      hiphop: ['kick', 'snare', 'hihat', '808', 'shaker'],
      electronic: ['kick', 'snare', 'hihat', 'clap', 'perc'],
      jazz: ['kick', 'snare', 'ride', 'brush', 'tom']
    };

    return instruments[style] || instruments.pop;
  }

  // Music Video Storyboarding
  async createMusicVideoStoryboard(song, options = {}) {
    const storyboardOptions = {
      style: options.style || 'narrative',
      mood: options.mood || song.mood || 'energetic',
      duration: options.duration || song.duration || 180,
      scenes: options.scenes || 8,
      transitions: options.transitions || 'cut'
    };

    const storyboard = {
      title: song.title || 'Untitled',
      duration: storyboardOptions.duration,
      style: storyboardOptions.style,
      scenes: []
    };

    // Generate scenes based on song structure
    const songStructure = this.analyzeSongStructure(song);
    
    for (let i = 0; i < storyboardOptions.scenes; i++) {
      const scene = {
        id: i + 1,
        timestamp: (storyboardOptions.duration / storyboardOptions.scenes) * i,
        duration: storyboardOptions.duration / storyboardOptions.scenes,
        description: this.generateSceneDescription(song, storyboardOptions, i),
        mood: this.getSceneMood(song, i, storyboardOptions.scenes),
        cameraAngles: this.generateCameraAngles(storyboardOptions.style),
        lighting: this.generateLighting(storyboardOptions.mood),
        effects: this.generateEffects(song.style)
      };
      
      storyboard.scenes.push(scene);
    }

    return storyboard;
  }

  generateSceneDescription(song, options, sceneIndex) {
    const sceneTypes = {
      narrative: [
        'Artist performing on stage with dramatic lighting',
        'Close-up shots of artist singing with emotion',
        'Crowd shots showing audience engagement',
        'Backstage moments and preparation',
        'Artistic shots with symbolic imagery',
        'Dynamic performance with choreography',
        'Atmospheric shots setting the mood',
        'Final climactic performance moment'
      ],
      performance: [
        'Full band performance on main stage',
        'Individual instrument solos',
        'Artist vocals with dynamic lighting',
        'Crowd interaction and energy',
        'Wide shots of entire performance',
        'Artistic lighting and effects',
        'Close-ups of emotional moments',
        'Grand finale with full production'
      ],
      conceptual: [
        'Abstract visual representing the theme',
        'Symbolic imagery matching lyrics',
        'Artistic interpretation of emotions',
        'Creative visual metaphors',
        'Surreal artistic sequences',
        'Color-themed visual narrative',
        'Conceptual storytelling elements',
        'Artistic conclusion and resolution'
      ]
    };

    const scenes = sceneTypes[options.style] || sceneTypes.narrative;
    return scenes[sceneIndex % scenes.length];
  }

  // Streaming Service Integration
  async spotifySearch(query, type = 'track', limit = 20) {
    if (!this.spotifyAPI.accessToken) {
      await this.authenticateSpotify();
    }

    const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=${type}&limit=${limit}`, {
      headers: {
        'Authorization': `Bearer ${this.spotifyAPI.accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Spotify search failed: ${response.status}`);
    }

    return await response.json();
  }

  async authenticateSpotify() {
    // Spotify OAuth flow - simplified for demo
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${this.spotifyAPI.clientId}:${this.spotifyAPI.clientSecret}`)}`
      },
      body: 'grant_type=client_credentials'
    });

    const data = await response.json();
    this.spotifyAPI.accessToken = data.access_token;
  }

  // Playlist and Music Management
  createPlaylist(name, tracks = []) {
    const playlist = {
      id: Date.now(),
      name,
      tracks,
      created: new Date(),
      duration: tracks.reduce((sum, track) => sum + (track.duration || 0), 0),
      mood: this.analyzePlaylistMood(tracks)
    };

    this.playlist.push(playlist);
    this.savePlaylistsToStorage();
    
    return playlist;
  }

  addToPlaylist(playlistId, track) {
    const playlist = this.playlist.find(p => p.id === playlistId);
    if (playlist) {
      playlist.tracks.push(track);
      playlist.duration += track.duration || 0;
      playlist.mood = this.analyzePlaylistMood(playlist.tracks);
      this.savePlaylistsToStorage();
    }
  }

  analyzePlaylistMood(tracks) {
    if (tracks.length === 0) return 'neutral';
    
    const moods = tracks.map(track => track.mood || 'neutral');
    const moodCounts = moods.reduce((acc, mood) => {
      acc[mood] = (acc[mood] || 0) + 1;
      return acc;
    }, {});
    
    return Object.keys(moodCounts).reduce((a, b) => 
      moodCounts[a] > moodCounts[b] ? a : b
    );
  }

  // AI Music Coaching and Analysis
  async analyzeUserVocals(audioData) {
    // Would integrate with audio analysis libraries
    return {
      pitch: this.analyzePitch(audioData),
      rhythm: this.analyzeRhythm(audioData),
      tone: this.analyzeTone(audioData),
      improvements: this.suggestVocalImprovements(audioData)
    };
  }

  analyzePitch(audioData) {
    // Mock pitch analysis
    return {
      accuracy: 0.85,
      range: { low: 'C3', high: 'C5' },
      stability: 0.78
    };
  }

  analyzeRhythm(audioData) {
    return {
      timing: 0.82,
      consistency: 0.75,
      swing: 0.1
    };
  }

  analyzeTone(audioData) {
    return {
      warmth: 0.7,
      clarity: 0.8,
      emotion: 0.85
    };
  }

  suggestVocalImprovements(analysis) {
    const suggestions = [];
    
    if (analysis.pitch?.accuracy < 0.8) {
      suggestions.push('Practice pitch accuracy with scales');
    }
    
    if (analysis.rhythm?.timing < 0.8) {
      suggestions.push('Work on timing with a metronome');
    }
    
    if (analysis.tone?.clarity < 0.7) {
      suggestions.push('Focus on breath support and diction');
    }
    
    return suggestions;
  }

  // Utility Methods
  addToHistory(song, prompt, options) {
    this.musicHistory.push({
      song,
      prompt,
      options,
      timestamp: Date.now(),
      id: Date.now()
    });
    
    // Keep only recent history
    if (this.musicHistory.length > 100) {
      this.musicHistory = this.musicHistory.slice(-100);
    }
    
    this.saveMusicHistory();
  }

  updateUserPreferences(options, action) {
    const key = `${options.style}_${options.mood}`;
    const current = this.userPreferences.get(key) || { count: 0, score: 0.5 };
    
    current.count++;
    if (action === 'generated') {
      current.score = Math.min(current.score + 0.1, 1.0);
    }
    
    this.userPreferences.set(key, current);
    this.saveUserPreferences();
  }

  loadUserPreferences() {
    try {
      const saved = localStorage.getItem('zeeky_music_preferences');
      if (saved) {
        const data = JSON.parse(saved);
        this.userPreferences = new Map(data);
      }
    } catch (error) {
      console.warn('Could not load music preferences:', error);
    }
  }

  saveUserPreferences() {
    try {
      localStorage.setItem('zeeky_music_preferences', 
        JSON.stringify(Array.from(this.userPreferences.entries())));
    } catch (error) {
      console.warn('Could not save music preferences:', error);
    }
  }

  saveMusicHistory() {
    try {
      localStorage.setItem('zeeky_music_history', JSON.stringify(this.musicHistory));
    } catch (error) {
      console.warn('Could not save music history:', error);
    }
  }

  savePlaylistsToStorage() {
    try {
      localStorage.setItem('zeeky_playlists', JSON.stringify(this.playlist));
    } catch (error) {
      console.warn('Could not save playlists:', error);
    }
  }

  getStatus() {
    return {
      isInitialized: this.isInitialized,
      currentTrack: this.currentTrack,
      playlistCount: this.playlist.length,
      historyCount: this.musicHistory.length,
      generationQueueSize: this.generationQueue.length,
      hasSpotifyAuth: !!this.spotifyAPI?.accessToken
    };
  }

  // Cleanup
  destroy() {
    if (this.audioContext) {
      this.audioContext.close();
    }
    
    this.playlist = [];
    this.musicHistory = [];
    this.userPreferences.clear();
    this.generationQueue = [];
    
    console.log('🎵 Advanced Music Service destroyed');
  }
}

export default AdvancedMusicService;