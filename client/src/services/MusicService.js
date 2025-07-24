class MusicService {
  constructor() {
    this.apiKey = process.env.REACT_APP_SUNO_API_KEY;
    this.baseUrl = 'https://api.suno.ai/v1';
    this.currentTrack = null;
    this.isPlaying = false;
    this.audio = null;
    
    // Callbacks
    this.onTrackStart = null;
    this.onTrackEnd = null;
    this.onProgress = null;
    this.onError = null;
  }

  // Generate music with Suno AI
  async generateMusic(prompt, options = {}) {
    try {
      const requestBody = {
        prompt: prompt,
        style: options.style || 'pop',
        duration: options.duration || 30,
        instrumental: options.instrumental || false,
        mood: options.mood || 'upbeat',
        tempo: options.tempo || 'medium',
        key: options.key || 'C major',
        ...options
      };

      const response = await fetch(`${this.baseUrl}/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      return {
        success: true,
        trackId: result.id,
        audioUrl: result.audio_url,
        lyrics: result.lyrics,
        metadata: {
          title: result.title,
          style: result.style,
          duration: result.duration,
          prompt: prompt
        }
      };

    } catch (error) {
      console.error('Error generating music:', error);
      
      // Return mock data for development
      return this.getMockTrack(prompt, options);
    }
  }

  // Mock music generation for development
  getMockTrack(prompt, options) {
    const mockTracks = [
      {
        success: true,
        trackId: 'mock_001',
        audioUrl: 'https://www.soundjay.com/misc/bells-tibetan-singing-bowl.mp3',
        lyrics: `🎵 Generated song about: "${prompt}"\n\nVerse 1:\nThis is where the magic happens\nAI creating something new\nMusic flowing from the pixels\nJust for me and just for you\n\nChorus:\nZeeky's making music now\nFrom a simple text somehow\nEvery beat and every sound\nComes alive and spins around`,
        metadata: {
          title: `AI Song: ${prompt.substring(0, 30)}...`,
          style: options.style || 'pop',
          duration: 180,
          prompt: prompt
        }
      }
    ];
    
    return mockTracks[0];
  }

  // Generate lyrics based on mood and theme
  async generateLyrics(theme, mood = 'happy', genre = 'pop') {
    const lyricsPrompts = {
      happy: {
        pop: [
          `Bright and cheerful song about ${theme}`,
          `Uplifting anthem celebrating ${theme}`,
          `Feel-good track about ${theme} with positive vibes`
        ],
        rock: [
          `Energetic rock song about ${theme}`,
          `Powerful anthem about ${theme} with driving beat`
        ]
      },
      sad: {
        pop: [
          `Melancholic ballad about ${theme}`,
          `Emotional song reflecting on ${theme}`
        ],
        rock: [
          `Slow rock ballad about ${theme}`,
          `Emotional rock song about ${theme}`
        ]
      },
      motivational: {
        pop: [
          `Inspiring song about ${theme} that motivates`,
          `Empowering anthem about ${theme}`
        ],
        rock: [
          `Powerful motivational rock song about ${theme}`,
          `High-energy rock anthem about ${theme}`
        ]
      }
    };

    const prompts = lyricsPrompts[mood]?.[genre] || lyricsPrompts.happy.pop;
    const selectedPrompt = prompts[Math.floor(Math.random() * prompts.length)];
    
    try {
      // In a real implementation, this would call a lyrics generation API
      return {
        success: true,
        lyrics: await this.generateMockLyrics(theme, mood, genre),
        prompt: selectedPrompt,
        metadata: { theme, mood, genre }
      };
    } catch (error) {
      console.error('Error generating lyrics:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Generate mock lyrics
  async generateMockLyrics(theme, mood, genre) {
    const verses = {
      happy: [
        `Dancing in the sunshine, feeling so alive\nThinking about ${theme}, helping me to thrive\nEvery single moment is a gift to me\nWith ${theme} in my life, I'm finally free`,
        `${theme} lights up my world like a shooting star\nMakes me feel like I can travel near and far\nNothing's gonna stop me when I feel this way\n${theme} is the reason I can face each day`
      ],
      sad: [
        `Looking back on memories of ${theme}\nWondering what could have been, it seems\nEmpty spaces where the love used to be\n${theme} was everything, now I can't see`,
        `Rain keeps falling on my window pane\nThinking about ${theme} through all this pain\nSometimes the hardest thing is letting go\nOf ${theme} that meant everything, now I know`
      ],
      motivational: [
        `${theme} is calling me to rise above\nPush through the struggle with the strength I love\nEvery challenge makes me who I am\nWith ${theme} as my guide, I know I can`,
        `When the world says no, ${theme} says yes\nHelps me overcome and handle stress\nI won't give up, I'll find a way\n${theme} gives me power every single day`
      ]
    };

    const chorus = {
      happy: `This is my moment, this is my time\nWith ${theme} here, everything's fine\nSinging this song with joy in my heart\n${theme} and me, we'll never part`,
      sad: `Missing ${theme} more than words can say\nHoping things will change someday\nTill then I'll hold these memories tight\nOf ${theme} that made everything right`,
      motivational: `I will rise, I will soar\nWith ${theme} I can do so much more\nNothing's impossible when I believe\nWith ${theme} there's nothing I can't achieve`
    };

    const selectedVerses = verses[mood] || verses.happy;
    const selectedChorus = chorus[mood] || chorus.happy;
    
    return `Verse 1:\n${selectedVerses[0]}\n\nChorus:\n${selectedChorus}\n\nVerse 2:\n${selectedVerses[1] || selectedVerses[0]}\n\nChorus:\n${selectedChorus}\n\nBridge:\nThis is the story of ${theme}\nWoven in melody, living the dream\nEvery note carries the truth inside\nWith ${theme} as my eternal guide`;
  }

  // Play generated track
  async playTrack(trackData) {
    try {
      if (this.audio) {
        this.audio.pause();
        this.audio = null;
      }

      this.audio = new Audio(trackData.audioUrl);
      this.currentTrack = trackData;
      
      this.audio.addEventListener('loadstart', () => {
        if (this.onTrackStart) this.onTrackStart(trackData);
      });

      this.audio.addEventListener('timeupdate', () => {
        if (this.onProgress) {
          this.onProgress({
            currentTime: this.audio.currentTime,
            duration: this.audio.duration,
            progress: (this.audio.currentTime / this.audio.duration) * 100
          });
        }
      });

      this.audio.addEventListener('ended', () => {
        this.isPlaying = false;
        if (this.onTrackEnd) this.onTrackEnd(trackData);
      });

      this.audio.addEventListener('error', (e) => {
        console.error('Audio playback error:', e);
        if (this.onError) this.onError(e);
      });

      await this.audio.play();
      this.isPlaying = true;
      
      return { success: true };
    } catch (error) {
      console.error('Error playing track:', error);
      if (this.onError) this.onError(error);
      return { success: false, error: error.message };
    }
  }

  // Pause current track
  pauseTrack() {
    if (this.audio && this.isPlaying) {
      this.audio.pause();
      this.isPlaying = false;
      return true;
    }
    return false;
  }

  // Resume current track
  resumeTrack() {
    if (this.audio && !this.isPlaying) {
      this.audio.play();
      this.isPlaying = true;
      return true;
    }
    return false;
  }

  // Stop current track
  stopTrack() {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.isPlaying = false;
      return true;
    }
    return false;
  }

  // Get current playback status
  getPlaybackStatus() {
    if (!this.audio) return null;
    
    return {
      track: this.currentTrack,
      isPlaying: this.isPlaying,
      currentTime: this.audio.currentTime,
      duration: this.audio.duration,
      progress: (this.audio.currentTime / this.audio.duration) * 100
    };
  }

  // Analyze mood from text/lyrics
  analyzeMood(text) {
    const moodKeywords = {
      happy: ['happy', 'joy', 'excited', 'cheerful', 'bright', 'celebration', 'love', 'amazing'],
      sad: ['sad', 'lonely', 'heartbreak', 'tears', 'goodbye', 'lost', 'empty', 'pain'],
      energetic: ['energy', 'power', 'strong', 'fast', 'running', 'dancing', 'party', 'wild'],
      calm: ['peaceful', 'quiet', 'serene', 'gentle', 'soft', 'relaxing', 'meditation', 'zen'],
      romantic: ['love', 'heart', 'romance', 'kiss', 'together', 'forever', 'valentine', 'soulmate'],
      motivational: ['strong', 'overcome', 'achieve', 'success', 'dream', 'goal', 'winner', 'champion']
    };

    const lowerText = text.toLowerCase();
    let detectedMood = 'neutral';
    let maxScore = 0;

    for (const [mood, keywords] of Object.entries(moodKeywords)) {
      const score = keywords.filter(keyword => lowerText.includes(keyword)).length;
      if (score > maxScore) {
        maxScore = score;
        detectedMood = mood;
      }
    }

    return {
      mood: detectedMood,
      confidence: Math.min(maxScore / 3, 1),
      keywords: moodKeywords[detectedMood]
    };
  }

  // Create a music video storyboard
  async createVideoStoryboard(lyrics, style = 'narrative') {
    const scenes = [];
    const lyricsLines = lyrics.split('\n').filter(line => line.trim());
    
    for (let i = 0; i < lyricsLines.length; i++) {
      const line = lyricsLines[i];
      if (line.trim()) {
        scenes.push({
          timestamp: i * 3, // 3 seconds per line
          lyrics: line,
          scene: this.generateSceneDescription(line, style),
          visuals: this.suggestVisuals(line),
          camera: this.suggestCameraMovement(line)
        });
      }
    }

    return {
      success: true,
      storyboard: scenes,
      totalDuration: scenes.length * 3,
      style: style
    };
  }

  // Generate scene description for video
  generateSceneDescription(lyricLine, style) {
    const sceneTypes = {
      narrative: [
        `Close-up of singer performing: "${lyricLine}"`,
        `Cinematic scene illustrating: "${lyricLine}"`,
        `Artistic interpretation of: "${lyricLine}"`
      ],
      performance: [
        `Band performing on stage while singing: "${lyricLine}"`,
        `Solo artist in spotlight delivering: "${lyricLine}"`,
        `Concert atmosphere with crowd as artist sings: "${lyricLine}"`
      ],
      abstract: [
        `Abstract visual metaphor for: "${lyricLine}"`,
        `Surreal artistic representation of: "${lyricLine}"`,
        `Colorful abstract animation expressing: "${lyricLine}"`
      ]
    };

    const scenes = sceneTypes[style] || sceneTypes.narrative;
    return scenes[Math.floor(Math.random() * scenes.length)];
  }

  // Suggest visuals for lyrics
  suggestVisuals(lyricLine) {
    const visuals = [];
    const lower = lyricLine.toLowerCase();

    if (lower.includes('sun') || lower.includes('bright')) {
      visuals.push('Golden hour lighting', 'Lens flares', 'Warm color palette');
    }
    if (lower.includes('rain') || lower.includes('storm')) {
      visuals.push('Rain effects', 'Dark moody lighting', 'Cool color palette');
    }
    if (lower.includes('love') || lower.includes('heart')) {
      visuals.push('Soft romantic lighting', 'Rose petals', 'Warm intimate setting');
    }
    if (lower.includes('dance') || lower.includes('party')) {
      visuals.push('Dynamic lighting', 'Crowd shots', 'Energetic movements');
    }

    return visuals.length > 0 ? visuals : ['Standard performance lighting', 'Neutral backdrop'];
  }

  // Suggest camera movements
  suggestCameraMovement(lyricLine) {
    const movements = [
      'Slow zoom in',
      'Pan across scene',
      'Steady close-up',
      'Wide establishing shot',
      'Dolly movement',
      'Handheld follow'
    ];

    return movements[Math.floor(Math.random() * movements.length)];
  }

  // Set event callbacks
  setCallbacks(callbacks) {
    this.onTrackStart = callbacks.onTrackStart;
    this.onTrackEnd = callbacks.onTrackEnd;
    this.onProgress = callbacks.onProgress;
    this.onError = callbacks.onError;
  }

  // Get music generation history
  getGenerationHistory() {
    const history = localStorage.getItem('zeeky_music_history');
    return history ? JSON.parse(history) : [];
  }

  // Save generation to history
  saveToHistory(generation) {
    const history = this.getGenerationHistory();
    history.unshift({
      ...generation,
      timestamp: Date.now(),
      id: `gen_${Date.now()}`
    });
    
    // Keep only last 50 generations
    const limitedHistory = history.slice(0, 50);
    localStorage.setItem('zeeky_music_history', JSON.stringify(limitedHistory));
  }
}

export default new MusicService();