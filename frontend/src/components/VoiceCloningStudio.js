// Advanced Voice Cloning Studio for Zeeky AI
import React, { useState, useRef, useEffect, useCallback } from 'react';

const VoiceCloningStudio = ({ onVoiceProfileCreated }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [voiceProfiles, setVoiceProfiles] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  
  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const audioPreviewRef = useRef(null);
  const recordingTimerRef = useRef(null);

  // Voice training samples for better cloning
  const trainingPrompts = [
    "Hello, my name is Zeeky, and I'm your AI assistant. I'm here to help you with whatever you need.",
    "The quick brown fox jumps over the lazy dog. This sentence contains every letter of the alphabet.",
    "I can help you with a wide variety of tasks, from answering questions to solving complex problems.",
    "Technology has revolutionized the way we communicate and interact with the world around us.",
    "Whether you need creative inspiration or technical assistance, I'm ready to support your goals.",
    "Voice synthesis technology allows us to create natural-sounding speech from text input.",
    "Let's work together to accomplish your objectives efficiently and effectively.",
    "The future of artificial intelligence holds incredible possibilities for human advancement."
  ];

  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [recordedSamples, setRecordedSamples] = useState([]);

  // Initialize audio context and analyzer
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  // Load existing voice profiles
  useEffect(() => {
    loadVoiceProfiles();
  }, []);

  const loadVoiceProfiles = async () => {
    try {
      const response = await fetch('/api/voice/profiles', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const profiles = await response.json();
        setVoiceProfiles(profiles);
      }
    } catch (error) {
      console.error('Failed to load voice profiles:', error);
    }
  };

  // Start recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });

      // Set up audio context for level monitoring
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      
      analyserRef.current.fftSize = 256;
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      // Audio level monitoring
      const updateAudioLevel = () => {
        if (analyserRef.current && isRecording) {
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / bufferLength;
          setAudioLevel(average / 255);
          requestAnimationFrame(updateAudioLevel);
        }
      };
      updateAudioLevel();

      // Start media recorder
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      const chunks = [];
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Failed to start recording:', error);
      alert('Failed to access microphone. Please check permissions.');
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setAudioLevel(0);
      
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    }
  };

  // Save recorded sample
  const saveRecordedSample = () => {
    if (audioBlob) {
      const sample = {
        id: Date.now(),
        promptIndex: currentPromptIndex,
        prompt: trainingPrompts[currentPromptIndex],
        audioBlob: audioBlob,
        duration: recordingTime,
        timestamp: new Date().toISOString()
      };

      setRecordedSamples(prev => [...prev, sample]);
      setAudioBlob(null);
      setRecordingTime(0);
      
      // Move to next prompt
      if (currentPromptIndex < trainingPrompts.length - 1) {
        setCurrentPromptIndex(prev => prev + 1);
      }
    }
  };

  // Create voice profile from samples
  const createVoiceProfile = async (profileName) => {
    if (recordedSamples.length < 3) {
      alert('Please record at least 3 samples for better voice quality.');
      return;
    }

    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append('profileName', profileName);
      formData.append('sampleCount', recordedSamples.length.toString());

      // Add audio samples
      recordedSamples.forEach((sample, index) => {
        formData.append(`sample_${index}`, sample.audioBlob, `sample_${index}.webm`);
        formData.append(`prompt_${index}`, sample.prompt);
      });

      const response = await fetch('/api/voice/create-profile', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to create voice profile');
      }

      const result = await response.json();
      
      // Add to profiles list
      const newProfile = {
        id: result.profileId,
        name: profileName,
        sampleCount: recordedSamples.length,
        status: 'training',
        createdAt: new Date().toISOString(),
        characteristics: result.characteristics || {}
      };

      setVoiceProfiles(prev => [...prev, newProfile]);
      
      // Clear samples
      setRecordedSamples([]);
      setCurrentPromptIndex(0);
      
      // Callback to parent
      if (onVoiceProfileCreated) {
        onVoiceProfileCreated(newProfile);
      }

      alert('Voice profile created successfully! Training in progress...');

    } catch (error) {
      console.error('Failed to create voice profile:', error);
      alert('Failed to create voice profile. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Test voice synthesis
  const testVoiceSynthesis = async (profileId, testText) => {
    try {
      const response = await fetch('/api/voice/synthesize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          profileId: profileId,
          text: testText,
          speed: 1.0,
          pitch: 1.0
        })
      });

      if (!response.ok) {
        throw new Error('Voice synthesis failed');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Play synthesized audio
      const audio = new Audio(audioUrl);
      audio.play();

    } catch (error) {
      console.error('Voice synthesis error:', error);
      alert('Failed to synthesize voice. Please try again.');
    }
  };

  // Format time display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Voice Cloning Studio</h1>
        <p className="text-gray-600">Create personalized voice profiles for Zeeky AI</p>
      </div>

      {/* Recording Section */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Record Training Samples</h2>
        
        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Sample {currentPromptIndex + 1} of {trainingPrompts.length}</span>
            <span>{recordedSamples.length} recorded</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(recordedSamples.length / trainingPrompts.length) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Current Prompt */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-gray-900 mb-2">Read this text clearly:</h3>
          <p className="text-lg text-gray-700 leading-relaxed">
            "{trainingPrompts[currentPromptIndex]}"
          </p>
        </div>

        {/* Audio Level Meter */}
        {isRecording && (
          <div className="mb-4">
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-600">Audio Level:</span>
              <div className="flex-1 bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-green-500 h-3 rounded-full transition-all duration-100"
                  style={{ width: `${audioLevel * 100}%` }}
                ></div>
              </div>
              <span className="text-sm text-gray-600">{Math.round(audioLevel * 100)}%</span>
            </div>
          </div>
        )}

        {/* Recording Controls */}
        <div className="flex items-center justify-center space-x-4 mb-6">
          {!isRecording ? (
            <button
              onClick={startRecording}
              className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-full flex items-center space-x-2 transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" />
              </svg>
              <span>Start Recording</span>
            </button>
          ) : (
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-lg font-mono">{formatTime(recordingTime)}</span>
              </div>
              <button
                onClick={stopRecording}
                className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-full flex items-center space-x-2 transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 012 0v6a1 1 0 11-2 0V7zM12 7a1 1 0 012 0v6a1 1 0 11-2 0V7z" />
                </svg>
                <span>Stop Recording</span>
              </button>
            </div>
          )}
        </div>

        {/* Audio Preview */}
        {audioBlob && (
          <div className="bg-blue-50 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">Recording Preview</h4>
                <p className="text-sm text-gray-600">Duration: {formatTime(recordingTime)}</p>
              </div>
              <div className="flex space-x-2">
                <audio
                  ref={audioPreviewRef}
                  src={URL.createObjectURL(audioBlob)}
                  controls
                  className="h-8"
                />
                <button
                  onClick={saveRecordedSample}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                >
                  Save Sample
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Recorded Samples */}
        {recordedSamples.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-gray-900">Recorded Samples ({recordedSamples.length})</h4>
            {recordedSamples.map((sample, index) => (
              <div key={sample.id} className="bg-green-50 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium">Sample {index + 1}</span>
                    <span className="text-xs text-gray-500 ml-2">
                      {formatTime(sample.duration)}
                    </span>
                  </div>
                  <audio
                    src={URL.createObjectURL(sample.audioBlob)}
                    controls
                    className="h-6"
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Profile */}
        {recordedSamples.length >= 3 && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center space-x-4">
              <input
                type="text"
                placeholder="Voice profile name"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && e.target.value.trim()) {
                    createVoiceProfile(e.target.value.trim());
                    e.target.value = '';
                  }
                }}
              />
              <button
                onClick={() => {
                  const input = document.querySelector('input[placeholder="Voice profile name"]');
                  if (input.value.trim()) {
                    createVoiceProfile(input.value.trim());
                    input.value = '';
                  }
                }}
                disabled={isProcessing}
                className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-6 py-2 rounded-lg transition-colors"
              >
                {isProcessing ? 'Creating...' : 'Create Profile'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Voice Profiles */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Your Voice Profiles</h2>
        
        {voiceProfiles.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No voice profiles created yet. Record some samples to get started!
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {voiceProfiles.map((profile) => (
              <div key={profile.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{profile.name}</h3>
                    <p className="text-sm text-gray-500">
                      {profile.sampleCount} samples • Created {new Date(profile.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    profile.status === 'ready' 
                      ? 'bg-green-100 text-green-800' 
                      : profile.status === 'training'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {profile.status}
                  </span>
                </div>
                
                {profile.status === 'ready' && (
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Enter text to synthesize..."
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && e.target.value.trim()) {
                          testVoiceSynthesis(profile.id, e.target.value.trim());
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        const input = document.querySelector(`input[placeholder="Enter text to synthesize..."]`);
                        if (input.value.trim()) {
                          testVoiceSynthesis(profile.id, input.value.trim());
                        }
                      }}
                      className="w-full bg-purple-500 hover:bg-purple-600 text-white py-2 rounded text-sm transition-colors"
                    >
                      Test Voice
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceCloningStudio;