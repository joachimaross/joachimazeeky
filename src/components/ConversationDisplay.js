import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiUser, FiBot, FiCopy, FiThumbsUp, FiThumbsDown } from 'react-icons/fi';

const ConversationDisplay = ({ messages, className }) => {
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const getAvatarIcon = (type, persona) => {
    if (type === 'user') {
      return <FiUser size={16} />;
    }
    
    // Different icons for different personas
    const personaIcons = {
      therapist: '🧠',
      coach: '💪',
      business: '💼',
      tutor: '📚',
      friend: '😊',
      fitness: '🏃‍♂️',
      default: '🤖'
    };
    
    return <span className="text-lg">{personaIcons[persona] || personaIcons.default}</span>;
  };

  const getMessageBubbleClass = (type, emotion) => {
    const baseClasses = "max-w-[80%] p-4 rounded-2xl shadow-sm";
    
    if (type === 'user') {
      return `${baseClasses} bg-blue-500 text-white ml-auto`;
    }
    
    // Emotion-based styling for assistant messages
    const emotionColors = {
      happy: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
      excited: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
      confused: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800',
      concerned: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
      focused: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
      neutral: 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
    };
    
    const emotionClass = emotionColors[emotion] || emotionColors.neutral;
    return `${baseClasses} ${emotionClass} border text-gray-900 dark:text-white`;
  };

  return (
    <div className={`flex-1 overflow-y-auto px-4 py-6 space-y-6 ${className}`}>
      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center">
          <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-6">
            <span className="text-white text-4xl">🤖</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Hey! I'm Zeeky AI
          </h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-md">
            I'm your advanced AI assistant with emotional intelligence, voice capabilities, and multiple personalities. 
            Ask me anything or use voice input to get started!
          </p>
          <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="font-semibold text-blue-700 dark:text-blue-300">🎤 Voice Control</div>
              <div className="text-blue-600 dark:text-blue-400">Speak naturally to me</div>
            </div>
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="font-semibold text-green-700 dark:text-green-300">🎭 Multiple Personas</div>
              <div className="text-green-600 dark:text-green-400">Coach, Therapist, Tutor & more</div>
            </div>
            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="font-semibold text-purple-700 dark:text-purple-300">🧠 Memory System</div>
              <div className="text-purple-600 dark:text-purple-400">I remember our conversations</div>
            </div>
            <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <div className="font-semibold text-orange-700 dark:text-orange-300">😊 Emotional Intelligence</div>
              <div className="text-orange-600 dark:text-orange-400">I understand how you feel</div>
            </div>
          </div>
        </div>
      ) : (
        <AnimatePresence initial={false}>
          {messages.map((message, index) => (
            <motion.div
              key={`${message.timestamp}-${index}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} items-start space-x-3`}
            >
              {message.type === 'assistant' && (
                <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  {getAvatarIcon(message.type, message.persona)}
                </div>
              )}
              
              <div className="flex flex-col max-w-[80%]">
                {/* Message header */}
                <div className={`flex items-center space-x-2 mb-1 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {message.type === 'user' ? 'You' : message.persona || 'Zeeky'}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {formatTime(message.timestamp)}
                  </span>
                  {message.emotion && message.type === 'assistant' && (
                    <span className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded-full capitalize">
                      {message.emotion}
                    </span>
                  )}
                </div>
                
                {/* Message bubble */}
                <div className={getMessageBubbleClass(message.type, message.emotion)}>
                  <div className="whitespace-pre-wrap leading-relaxed">
                    {message.text}
                  </div>
                  
                  {/* Message actions */}
                  {message.type === 'assistant' && (
                    <div className="flex items-center justify-end space-x-2 mt-3 pt-2 border-t border-gray-200 dark:border-gray-600">
                      <button
                        onClick={() => copyToClipboard(message.text)}
                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        title="Copy message"
                      >
                        <FiCopy size={14} />
                      </button>
                      <button
                        onClick={() => console.log('Thumbs up:', message)}
                        className="p-1 text-gray-400 hover:text-green-500 transition-colors"
                        title="Good response"
                      >
                        <FiThumbsUp size={14} />
                      </button>
                      <button
                        onClick={() => console.log('Thumbs down:', message)}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                        title="Poor response"
                      >
                        <FiThumbsDown size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              {message.type === 'user' && (
                <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <FiUser size={16} className="text-white" />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      )}
      
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ConversationDisplay;