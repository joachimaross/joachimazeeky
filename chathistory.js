import React, { useEffect, useRef } from 'react';

const ChatHistory = ({ messages }) => {
  const endOfMessagesRef = useRef(null);

  const scrollToBottom = () => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  return (
    <div className="h-full overflow-y-auto flex flex-col space-y-2 p-2">
      {messages.map((msg, index) => (
        <div
          key={index}
          className={`p-2 rounded-lg max-w-xs ${
            msg.sender === 'me'
              ? 'bg-blue-500 text-white self-end'
              : 'bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 self-start'
          }`}
        >
          {msg.text}
        </div>
      ))}
      <div ref={endOfMessagesRef} />
    </div>
  );
};

export default ChatHistory;
