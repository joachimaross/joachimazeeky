import React, { useState, useRef } from 'react';
import { FiSend, FiMic, FiPaperclip, FiImage, FiCamera } from 'react-icons/fi';

const ChatBar = () => {
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const textareaRef = useRef(null);

  const handleSendMessage = () => {
    if (message.trim()) {
      console.log('Sending message:', message);
      // TODO: Integrate with AI assistant
      setMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyPress = (e) => {
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
    setIsRecording(!isRecording);
    // TODO: Implement voice recording
    console.log('Recording:', !isRecording);
  };

  const handleFileUpload = () => {
    // TODO: Implement file upload
    console.log('File upload clicked');
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <div className="flex items-end space-x-3 max-w-4xl mx-auto">
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
          onClick={() => console.log('Image upload')}
          className="flex-shrink-0 p-2 text-gray-500 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
          title="Upload image"
        >
          <FiImage size={20} />
        </button>

        {/* Camera */}
        <button
          onClick={() => console.log('Camera')}
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
            onKeyPress={handleKeyPress}
            placeholder="Ask Zeeky anything..."
            className="w-full min-h-[44px] max-h-[120px] px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-full bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            style={{ height: '44px' }}
          />
        </div>

        {/* Voice Recording Button */}
        <button
          onClick={toggleRecording}
          className={`flex-shrink-0 p-3 rounded-full transition-all ${
            isRecording
              ? 'bg-red-500 text-white animate-pulse'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
          title={isRecording ? 'Stop recording' : 'Start voice recording'}
        >
          <FiMic size={20} />
        </button>

        {/* Send Button */}
        <button
          onClick={handleSendMessage}
          disabled={!message.trim()}
          className={`flex-shrink-0 p-3 rounded-full transition-all ${
            message.trim()
              ? 'bg-blue-500 text-white hover:bg-blue-600'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
          }`}
          title="Send message"
        >
          <FiSend size={20} />
        </button>
      </div>
    </div>
  );
};

export default ChatBar;