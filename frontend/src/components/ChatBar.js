import React, { useState } from 'react';
import { FiMic, FiPaperclip, FiSend } from 'react-icons/fi';

const ChatBar = ({ onSendMessage }) => {
  const [inputValue, setInputValue] = useState('');

  const handleSend = () => {
    if (inputValue.trim()) {
      onSendMessage(inputValue);
      setInputValue('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <div className="p-4 bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
      <div className="relative flex items-center">
        <input
          type="text"
          placeholder="Ask Zeeky anything..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          className="w-full p-3 pl-12 pr-20 rounded-full bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex space-x-3">
          <button className="text-gray-500 hover:text-blue-500 text-xl"><FiMic /></button>
          <button className="text-gray-500 hover:text-blue-500 text-xl"><FiPaperclip /></button>
        </div>
        <button onClick={handleSend} className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 text-xl">
          <FiSend />
        </button>
      </div>
    </div>
  );
};

export default ChatBar;