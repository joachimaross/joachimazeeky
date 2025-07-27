import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SimpleAvatar = ({ isListening, isSpeaking, emotion = 'neutral', message = '' }) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  const expressions = {
    neutral: { emoji: '😐', color: 'from-blue-400 to-blue-600' },
    happy: { emoji: '😊', color: 'from-green-400 to-green-600' },
    focused: { emoji: '🤔', color: 'from-purple-400 to-purple-600' },
    excited: { emoji: '🤩', color: 'from-yellow-400 to-yellow-600' },
    confused: { emoji: '😕', color: 'from-orange-400 to-orange-600' }
  };

  const currentExpression = expressions[emotion] || expressions.neutral;

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.5, y: -50 }}
        animate={{ 
          opacity: 1, 
          scale: 1, 
          y: 0,
        }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative"
      >
        {/* Holographic Container */}
        <div className="relative bg-gradient-to-br from-blue-900/20 to-purple-900/20 backdrop-blur-sm border border-blue-400/30 rounded-3xl p-6">
          
          {/* Main Avatar */}
          <div className="w-32 h-32 relative flex items-center justify-center">
            {/* Holographic Background Effect */}
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className={`absolute inset-0 bg-gradient-to-r ${currentExpression.color} rounded-full blur-lg`}
            />

            {/* Avatar Face */}
            <motion.div
              animate={{
                rotateY: isListening ? [0, 5, -5, 0] : 0,
                scale: isSpeaking ? [1, 1.1, 1] : 1,
              }}
              transition={{
                rotateY: { duration: 2, repeat: isListening ? Infinity : 0 },
                scale: { duration: 0.5, repeat: isSpeaking ? Infinity : 0 }
              }}
              className="relative z-10 w-24 h-24 bg-gradient-to-br from-amber-100 to-amber-200 rounded-full flex items-center justify-center text-4xl shadow-lg"
            >
              <motion.span
                animate={{
                  scale: isSpeaking ? [1, 1.2, 1] : 1,
                }}
                transition={{
                  duration: 0.3,
                  repeat: isSpeaking ? Infinity : 0
                }}
              >
                {currentExpression.emoji}
              </motion.span>
            </motion.div>

            {/* Scanning Lines Effect */}
            <div className="absolute inset-0 overflow-hidden rounded-full">
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-full h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent"
                  style={{ top: `${25 + i * 25}%` }}
                  animate={{
                    opacity: [0, 1, 0],
                    scaleX: [0, 1, 0],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: i * 0.3,
                  }}
                />
              ))}
            </div>

            {/* Listening Ring */}
            {isListening && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="absolute inset-0 border-2 border-green-400 rounded-full"
              />
            )}
          </div>

          {/* Status Indicators */}
          <AnimatePresence>
            {isListening && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="absolute -bottom-2 -right-2 bg-green-500/90 backdrop-blur-sm text-white px-2 py-1 rounded-full text-xs font-semibold border border-green-400"
              >
                🎤 Listening
              </motion.div>
            )}
            
            {isSpeaking && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="absolute -bottom-2 -left-2 bg-blue-500/90 backdrop-blur-sm text-white px-2 py-1 rounded-full text-xs font-semibold border border-blue-400"
              >
                🗣️ Speaking
              </motion.div>
            )}
          </AnimatePresence>

          {/* Emotion Display */}
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-gray-800/90 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-medium capitalize border border-gray-600">
            <span className="mr-1">🧠</span>
            {emotion}
          </div>

          {/* Time Display */}
          <div className="absolute top-2 right-2 text-xs text-blue-300 font-mono">
            {currentTime.toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </div>
        </div>

        {/* Holographic Glow Effect */}
        <div 
          className="absolute inset-0 bg-blue-400/20 rounded-3xl blur-xl -z-10"
          style={{
            filter: 'blur(20px)',
          }}
        />
      </motion.div>
    </div>
  );
};

export default SimpleAvatar;