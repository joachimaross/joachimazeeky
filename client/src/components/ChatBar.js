import React, { useState, useRef, useEffect } from 'react';
import { FiSend, FiMic, FiPaperclip, FiImage, FiCamera, FiUser, FiMicOff } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import ZeekyAI from '../services/ZeekyAI';
import VoiceService from '../services/VoiceService';

const ChatBar = ({ onMessageSent, onAvatarStateChange }) => {
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [currentPersona, setCurrentPersona] = useState('default');
  const [showPersonaMenu, setShowPersonaMenu] = useState(false);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);

  // Initialize voice service
  useEffect(() => {
    VoiceService.setCallbacks({
      onSpeechStart: () => {
        if (onAvatarStateChange) {
          onAvatarStateChange({ isSpeaking: true });
        }
      },
      onSpeechEnd: () => {
        if (onAvatarStateChange) {
          onAvatarStateChange({ isSpeaking: false });
        }
      },
      onListeningStart: () => {
        setIsRecording(true);
        if (onAvatarStateChange) {
          onAvatarStateChange({ isListening: true });
        }
      },
      onListeningEnd: () => {
        setIsRecording(false);
        if (onAvatarStateChange) {
          onAvatarStateChange({ isListening: false });
        }
      },
      onSpeechResult: (result) => {
        if (result.isFinal) {
          setMessage(result.final);
          setInterimTranscript('');
          // Auto-send voice messages
          handleSendMessage(result.final);
        } else {
          setInterimTranscript(result.interim);
        }
      },
      onError: (error) => {
        console.error('Voice error:', error);
        setIsRecording(false);
        if (onAvatarStateChange) {
          onAvatarStateChange({ isListening: false, error: error });
        }
      }
    });
  }, [onAvatarStateChange]);

  const handleSendMessage = async (textMessage = message) => {
    if (!textMessage.trim() || isProcessing) return;

    const messageToSend = textMessage.trim();
    setMessage('');
    setIsProcessing(true);
    
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      // Set avatar to processing state
      if (onAvatarStateChange) {
        onAvatarStateChange({ 
          emotion: 'focused',
          isProcessing: true 
        });
      }

      // Send message to parent component
      if (onMessageSent) {
        onMessageSent({
          text: messageToSend,
          timestamp: Date.now(),
          type: 'user'
        });
      }

      // Get AI response with timeout
      const response = await Promise.race([
        ZeekyAI.generateResponse(messageToSend),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 30000)
        )
      ]);
      
      // Update avatar with response emotion
      if (onAvatarStateChange) {
        onAvatarStateChange({ 
          emotion: response.emotion || 'happy',
          isProcessing: false 
        });
      }

      // Send AI response to parent
      if (onMessageSent) {
        onMessageSent({
          text: response.text,
          timestamp: Date.now(),
          type: 'assistant',
          persona: response.persona,
          emotion: response.emotion
        });
      }

      // Speak the response with error handling
      if (response.text) {
        try {
          await VoiceService.speak(response.text);
        } catch (voiceError) {
          console.warn('Voice synthesis failed:', voiceError);
        }
      }

    } catch (error) {
      console.error('Error sending message:', error);
      
      if (onAvatarStateChange) {
        onAvatarStateChange({ 
          emotion: 'concerned',
          isProcessing: false 
        });
      }

      const errorMessage = error.message === 'Request timeout' 
        ? "I'm taking a bit longer than usual. Could you try asking again?"
        : "I'm having trouble right now, but I'm here to help! Could you try asking again?";

      if (onMessageSent) {
        onMessageSent({
          text: errorMessage,
          timestamp: Date.now(),
          type: 'assistant',
          error: true
        });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleTextareaChange = (e) => {
    setMessage(e.target.value);
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  };

  const toggleRecording = () => {
    if (isRecording) {
      VoiceService.stopListening();
    } else {
      VoiceService.startListening();
    }
  };

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleImageUpload = () => {
    imageInputRef.current?.click();
  };

  const handleCameraCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' },
        audio: false 
      });
      
      // Create a video element to capture the stream
      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();
      
      // Wait for video to load
      video.onloadedmetadata = () => {
        // Create canvas to capture frame
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        
        // Draw video frame to canvas
        ctx.drawImage(video, 0, 0);
        
        // Convert to blob and create file
        canvas.toBlob((blob) => {
          const file = new File([blob], `camera-capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
          handleFileProcessing([file]);
          
          // Stop the stream
          stream.getTracks().forEach(track => track.stop());
        }, 'image/jpeg', 0.9);
      };
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Unable to access camera. Please check your permissions.');
    }
  };

  const handleFileProcessing = async (files) => {
    // Process uploaded files
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        // Handle image files
        const imageUrl = URL.createObjectURL(file);
        if (onMessageSent) {
          onMessageSent({
            text: `[Image uploaded: ${file.name}]`,
            timestamp: Date.now(),
            type: 'user',
            attachment: {
              type: 'image',
              url: imageUrl,
              name: file.name,
              size: file.size
            }
          });
        }
      } else if (file.type.startsWith('audio/')) {
        // Handle audio files
        const audioUrl = URL.createObjectURL(file);
        if (onMessageSent) {
          onMessageSent({
            text: `[Audio uploaded: ${file.name}]`,
            timestamp: Date.now(),
            type: 'user',
            attachment: {
              type: 'audio',
              url: audioUrl,
              name: file.name,
              size: file.size
            }
          });
        }
      } else {
        // Handle other file types
        if (onMessageSent) {
          onMessageSent({
            text: `[File uploaded: ${file.name}]`,
            timestamp: Date.now(),
            type: 'user',
            attachment: {
              type: 'file',
              name: file.name,
              size: file.size,
              mimeType: file.type
            }
          });
        }
      }
    }
  };

  const handlePersonaChange = (personaId) => {
    setCurrentPersona(personaId);
    ZeekyAI.setPersona(personaId);
    VoiceService.setVoicePersonality(personaId);
    setShowPersonaMenu(false);
    
    if (onAvatarStateChange) {
      onAvatarStateChange({ persona: personaId });
    }
  };

  const personas = ZeekyAI.getPersonas();

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      {/* Persona Selection Menu */}
      <AnimatePresence>
        {showPersonaMenu && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
          >
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Choose Zeeky's Personality</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {personas.map((persona) => (
                <button
                  key={persona.id}
                  onClick={() => handlePersonaChange(persona.id)}
                  className={`p-2 rounded-lg text-sm font-medium transition-colors ${
                    currentPersona === persona.id
                      ? 'bg-blue-500 text-white'
                      : 'bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-500'
                  }`}
                >
                  {persona.name}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Interim transcript display */}
      <AnimatePresence>
        {interimTranscript && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-2 p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-sm italic"
          >
            Listening: "{interimTranscript}"
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-end space-x-3 max-w-4xl mx-auto">
        {/* Persona Toggle Button */}
        <button
          onClick={() => setShowPersonaMenu(!showPersonaMenu)}
          className="flex-shrink-0 p-2 text-gray-500 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
          title="Change Zeeky's personality"
        >
          <FiUser size={20} />
        </button>

        {/* File Upload Button */}
        <button
          onClick={handleFileUpload}
          className="flex-shrink-0 p-2 text-gray-500 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
          title="Upload files"
        >
          <FiPaperclip size={20} />
        </button>

        {/* Image Upload */}
        <button
          onClick={handleImageUpload}
          className="flex-shrink-0 p-2 text-gray-500 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
          title="Upload image"
        >
          <FiImage size={20} />
        </button>

        {/* Camera */}
        <button
          onClick={handleCameraCapture}
          className="flex-shrink-0 p-2 text-gray-500 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
          title="Take photo"
        >
          <FiCamera size={20} />
        </button>

        {/* Message Input */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder={isProcessing ? "Zeeky is thinking..." : "Ask Zeeky anything..."}
            disabled={isProcessing}
            aria-label="Chat message input"
            className="w-full min-h-[44px] max-h-[120px] px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-full bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:opacity-50"
            style={{ height: '44px' }}
          />
          
          {/* Processing indicator */}
          {isProcessing && (
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
        </div>

        {/* Voice Recording Button */}
        <motion.button
          onClick={toggleRecording}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`flex-shrink-0 p-3 rounded-full transition-all ${
            isRecording
              ? 'bg-red-500 text-white shadow-lg shadow-red-500/50'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
          title={isRecording ? 'Stop listening' : 'Start voice input'}
        >
          {isRecording ? (
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 1 }}
            >
              <FiMicOff size={20} />
            </motion.div>
          ) : (
            <FiMic size={20} />
          )}
        </button>

        {/* Send Button */}
        <motion.button
          onClick={() => handleSendMessage()}
          disabled={!message.trim() || isProcessing}
          whileHover={{ scale: message.trim() ? 1.05 : 1 }}
          whileTap={{ scale: message.trim() ? 0.95 : 1 }}
          className={`flex-shrink-0 p-3 rounded-full transition-all ${
            message.trim() && !isProcessing
              ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-lg shadow-blue-500/50'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
          }`}
          title="Send message"
        >
          <FiSend size={20} />
        </motion.button>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files);
          if (files.length > 0) {
            handleFileProcessing(files);
          }
          e.target.value = ''; // Reset input
        }}
      />
      
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files);
          if (files.length > 0) {
            handleFileProcessing(files);
          }
          e.target.value = ''; // Reset input
        }}
      />
    </div>
  );
};

export default ChatBar;