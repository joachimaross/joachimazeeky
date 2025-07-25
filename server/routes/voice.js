// Voice Cloning and Synthesis API Routes
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const database = require('../models/database');
const router = express.Router();

// Configure multer for voice file uploads
const voiceStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/voice');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = `voice-sample-${uniqueSuffix}.webm`;
    cb(null, filename);
  }
});

const voiceUpload = multer({
  storage: voiceStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for voice files
    files: 20 // Maximum 20 voice samples
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'audio/webm',
      'audio/wav',
      'audio/mpeg',
      'audio/mp4',
      'audio/ogg'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Audio format ${file.mimetype} not supported for voice cloning`), false);
    }
  }
});

// Get user's voice profiles
router.get('/profiles', async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get voice profiles from database
    const query = `
      SELECT id, profile_name, training_status, voice_characteristics, created_at
      FROM voice_profiles 
      WHERE user_id = $1 
      ORDER BY created_at DESC
    `;
    
    const result = await database.pgPool.query(query, [userId]);
    
    const profiles = result.rows.map(profile => ({
      id: profile.id,
      name: profile.profile_name,
      status: profile.training_status,
      characteristics: profile.voice_characteristics || {},
      createdAt: profile.created_at,
      sampleCount: 0 // Will be populated by separate query if needed
    }));

    res.json({
      success: true,
      data: profiles
    });

  } catch (error) {
    console.error('Failed to get voice profiles:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve voice profiles'
    });
  }
});

// Create new voice profile
router.post('/create-profile', voiceUpload.array('samples', 20), async (req, res) => {
  try {
    const userId = req.user.userId;
    const { profileName, sampleCount } = req.body;
    const files = req.files;

    if (!profileName || !files || files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Profile name and voice samples are required'
      });
    }

    if (files.length < 3) {
      return res.status(400).json({
        success: false,
        error: 'At least 3 voice samples are required for quality cloning'
      });
    }

    // Process voice samples
    const processedSamples = [];
    const voiceCharacteristics = {
      totalSamples: files.length,
      totalDuration: 0,
      averageVolume: 0,
      dominantFrequency: 0,
      voiceType: 'unknown'
    };

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const promptText = req.body[`prompt_${i}`] || '';
      
      // Analyze audio file
      const audioAnalysis = await analyzeAudioFile(file.path);
      
      processedSamples.push({
        filename: file.filename,
        path: file.path,
        size: file.size,
        prompt: promptText,
        duration: audioAnalysis.duration,
        analysis: audioAnalysis
      });

      voiceCharacteristics.totalDuration += audioAnalysis.duration;
      voiceCharacteristics.averageVolume += audioAnalysis.averageVolume;
    }

    // Calculate average characteristics
    voiceCharacteristics.averageVolume /= files.length;
    voiceCharacteristics.averageDuration = voiceCharacteristics.totalDuration / files.length;
    voiceCharacteristics.voiceType = determineVoiceType(voiceCharacteristics);

    // Save voice profile to database
    const insertQuery = `
      INSERT INTO voice_profiles (user_id, profile_name, voice_data_url, training_status, voice_characteristics)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `;

    const voiceDataUrl = JSON.stringify(processedSamples.map(s => ({
      filename: s.filename,
      prompt: s.prompt,
      duration: s.duration
    })));

    const result = await database.pgPool.query(insertQuery, [
      userId,
      profileName,
      voiceDataUrl,
      'training',
      JSON.stringify(voiceCharacteristics)
    ]);

    const profileId = result.rows[0].id;

    // Start voice training process (simulated)
    setTimeout(async () => {
      try {
        await database.pgPool.query(
          'UPDATE voice_profiles SET training_status = $1 WHERE id = $2',
          ['ready', profileId]
        );
      } catch (updateError) {
        console.error('Failed to update voice profile status:', updateError);
      }
    }, 10000); // Simulate 10 second training

    // Log voice profile creation
    await database.logEvent(userId, 'voice_profile_created', {
      profileId: profileId,
      profileName: profileName,
      sampleCount: files.length,
      characteristics: voiceCharacteristics
    });

    res.json({
      success: true,
      data: {
        profileId: profileId,
        profileName: profileName,
        sampleCount: files.length,
        characteristics: voiceCharacteristics,
        estimatedTrainingTime: '10 seconds'
      }
    });

  } catch (error) {
    console.error('Voice profile creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create voice profile'
    });
  }
});

// Synthesize speech with voice profile
router.post('/synthesize', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { profileId, text, speed = 1.0, pitch = 1.0 } = req.body;

    if (!profileId || !text) {
      return res.status(400).json({
        success: false,
        error: 'Profile ID and text are required'
      });
    }

    if (text.length > 1000) {
      return res.status(400).json({
        success: false,
        error: 'Text too long. Maximum 1000 characters allowed.'
      });
    }

    // Verify profile belongs to user
    const profileQuery = `
      SELECT profile_name, training_status, voice_characteristics
      FROM voice_profiles 
      WHERE id = $1 AND user_id = $2
    `;
    
    const profileResult = await database.pgPool.query(profileQuery, [profileId, userId]);
    
    if (profileResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Voice profile not found'
      });
    }

    const profile = profileResult.rows[0];
    
    if (profile.training_status !== 'ready') {
      return res.status(400).json({
        success: false,
        error: 'Voice profile is still training. Please wait.'
      });
    }

    // Synthesize speech (placeholder implementation)
    const synthesizedAudio = await synthesizeSpeech({
      text: text,
      profileId: profileId,
      characteristics: profile.voice_characteristics,
      speed: speed,
      pitch: pitch
    });

    // Log synthesis event
    await database.logEvent(userId, 'voice_synthesis', {
      profileId: profileId,
      textLength: text.length,
      speed: speed,
      pitch: pitch
    });

    // Return synthesized audio
    res.set({
      'Content-Type': 'audio/wav',
      'Content-Disposition': `attachment; filename="synthesized-${profileId}-${Date.now()}.wav"`
    });

    res.send(synthesizedAudio);

  } catch (error) {
    console.error('Voice synthesis error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to synthesize speech'
    });
  }
});

// Get voice profile details
router.get('/profiles/:profileId', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { profileId } = req.params;

    const query = `
      SELECT id, profile_name, training_status, voice_characteristics, created_at, voice_data_url
      FROM voice_profiles 
      WHERE id = $1 AND user_id = $2
    `;
    
    const result = await database.pgPool.query(query, [profileId, userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Voice profile not found'
      });
    }

    const profile = result.rows[0];
    const voiceData = JSON.parse(profile.voice_data_url || '[]');

    res.json({
      success: true,
      data: {
        id: profile.id,
        name: profile.profile_name,
        status: profile.training_status,
        characteristics: profile.voice_characteristics || {},
        createdAt: profile.created_at,
        samples: voiceData
      }
    });

  } catch (error) {
    console.error('Failed to get voice profile details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve voice profile details'
    });
  }
});

// Delete voice profile
router.delete('/profiles/:profileId', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { profileId } = req.params;

    // Get profile details for cleanup
    const profileQuery = `
      SELECT voice_data_url FROM voice_profiles 
      WHERE id = $1 AND user_id = $2
    `;
    
    const profileResult = await database.pgPool.query(profileQuery, [profileId, userId]);
    
    if (profileResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Voice profile not found'
      });
    }

    // Delete voice sample files
    try {
      const voiceData = JSON.parse(profileResult.rows[0].voice_data_url || '[]');
      for (const sample of voiceData) {
        const filePath = path.join(__dirname, '../uploads/voice', sample.filename);
        try {
          await fs.unlink(filePath);
        } catch (unlinkError) {
          console.warn(`Failed to delete voice file ${sample.filename}:`, unlinkError);
        }
      }
    } catch (cleanupError) {
      console.warn('Voice file cleanup error:', cleanupError);
    }

    // Delete profile from database
    const deleteQuery = `
      DELETE FROM voice_profiles 
      WHERE id = $1 AND user_id = $2
    `;
    
    await database.pgPool.query(deleteQuery, [profileId, userId]);

    // Log deletion
    await database.logEvent(userId, 'voice_profile_deleted', {
      profileId: profileId
    });

    res.json({
      success: true,
      message: 'Voice profile deleted successfully'
    });

  } catch (error) {
    console.error('Voice profile deletion error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete voice profile'
    });
  }
});

// Test voice profile quality
router.post('/test/:profileId', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { profileId } = req.params;
    const testText = "Hello, this is a test of my voice cloning profile.";

    // Verify profile exists and is ready
    const profileQuery = `
      SELECT training_status FROM voice_profiles 
      WHERE id = $1 AND user_id = $2
    `;
    
    const result = await database.pgPool.query(profileQuery, [profileId, userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Voice profile not found'
      });
    }

    if (result.rows[0].training_status !== 'ready') {
      return res.status(400).json({
        success: false,
        error: 'Voice profile is not ready for testing'
      });
    }

    // Generate test audio
    const testAudio = await synthesizeSpeech({
      text: testText,
      profileId: profileId,
      speed: 1.0,
      pitch: 1.0
    });

    res.set({
      'Content-Type': 'audio/wav',
      'Content-Disposition': `attachment; filename="test-${profileId}.wav"`
    });

    res.send(testAudio);

  } catch (error) {
    console.error('Voice test error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test voice profile'
    });
  }
});

// Helper functions
async function analyzeAudioFile(filePath) {
  try {
    // Placeholder audio analysis
    // In production, you'd use libraries like node-ffmpeg or Web Audio API
    const stats = await fs.stat(filePath);
    
    return {
      duration: Math.max(1, Math.ceil(stats.size / 16000)), // Rough estimate in seconds
      averageVolume: 0.7 + Math.random() * 0.3, // Mock volume between 0.7-1.0
      dominantFrequency: 150 + Math.random() * 200, // Mock frequency 150-350 Hz
      clarity: 0.8 + Math.random() * 0.2, // Mock clarity score
      noiseLevel: Math.random() * 0.1 // Mock noise level
    };
  } catch (error) {
    throw new Error(`Audio analysis failed: ${error.message}`);
  }
}

function determineVoiceType(characteristics) {
  const avgFreq = characteristics.dominantFrequency || 200;
  
  if (avgFreq < 180) {
    return 'deep';
  } else if (avgFreq < 220) {
    return 'medium';
  } else {
    return 'high';
  }
}

async function synthesizeSpeech(options) {
  try {
    // Placeholder speech synthesis
    // In production, you'd integrate with services like:
    // - Eleven Labs API
    // - Azure Cognitive Services
    // - Google Cloud Text-to-Speech
    // - Amazon Polly
    // - Custom TTS models
    
    const { text, profileId, characteristics, speed, pitch } = options;
    
    // Mock audio data (silence buffer)
    const duration = Math.max(1, text.length * 0.1); // Rough duration estimate
    const sampleRate = 44100;
    const samples = Math.floor(duration * sampleRate);
    const buffer = Buffer.alloc(samples * 2); // 16-bit audio
    
    // Fill with very quiet sine wave to simulate speech
    for (let i = 0; i < samples; i++) {
      const t = i / sampleRate;
      const frequency = 200 + Math.sin(t * 2) * 50; // Varying frequency
      const amplitude = 0.1 * Math.sin(t * frequency * 2 * Math.PI);
      const sample = Math.floor(amplitude * 32767);
      
      buffer.writeInt16LE(sample, i * 2);
    }
    
    // Add WAV header
    const wavHeader = createWavHeader(buffer.length, sampleRate);
    return Buffer.concat([wavHeader, buffer]);
    
  } catch (error) {
    throw new Error(`Speech synthesis failed: ${error.message}`);
  }
}

function createWavHeader(audioLength, sampleRate) {
  const header = Buffer.alloc(44);
  
  // RIFF header
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + audioLength, 4);
  header.write('WAVE', 8);
  
  // Format chunk
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // Subchunk1Size
  header.writeUInt16LE(1, 20);  // AudioFormat (PCM)
  header.writeUInt16LE(1, 22);  // NumChannels (mono)
  header.writeUInt32LE(sampleRate, 24); // SampleRate
  header.writeUInt32LE(sampleRate * 2, 28); // ByteRate
  header.writeUInt16LE(2, 32);  // BlockAlign
  header.writeUInt16LE(16, 34); // BitsPerSample
  
  // Data chunk
  header.write('data', 36);
  header.writeUInt32LE(audioLength, 40);
  
  return header;
}

module.exports = router;