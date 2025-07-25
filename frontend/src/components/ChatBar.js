import React, { useState, useRef, useCallback } from 'react';
import { FiMic, FiPaperclip, FiSend, FiMicOff, FiX } from 'react-icons/fi';

const ChatBar = ({ onSendMessage }) => {
  const [inputValue, setInputValue] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);

  const handleSend = useCallback(() => {
    if (inputValue.trim() || attachedFiles.length > 0) {
      onSendMessage({
        text: inputValue,
        attachments: attachedFiles
      });
      setInputValue('');
      setAttachedFiles([]);
    }
  }, [inputValue, attachedFiles, onSendMessage]);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  const handleVoiceToggle = async () => {
    if (isRecording) {
      // Stop recording
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
    } else {
      // Start recording
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;

        const audioChunks = [];
        mediaRecorder.ondataavailable = (event) => {
          audioChunks.push(event.data);
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
          const audioFile = new File([audioBlob], 'voice-message.wav', { type: 'audio/wav' });
          setAttachedFiles(prev => [...prev, audioFile]);
          stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
        setIsRecording(true);
      } catch (error) {
        console.error('Error accessing microphone:', error);
        alert('Unable to access microphone. Please check your permissions.');
      }
    }
  };

  const handleFileAttachment = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    setAttachedFiles(prev => [...prev, ...files]);
    event.target.value = ''; // Reset input
  };

  const removeAttachment = (index) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="p-4 bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
      {/* File attachments preview */}
      {attachedFiles.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {attachedFiles.map((file, index) => (
            <div key={index} className="flex items-center bg-blue-100 dark:bg-blue-900 px-3 py-1 rounded-full text-sm">
              <span className="mr-2">
                {file.type.startsWith('image/') ? '🖼️' : 
                 file.type.startsWith('audio/') ? '🎵' :
                 file.type.startsWith('video/') ? '🎥' : '📄'}
              </span>
              <span className="text-blue-800 dark:text-blue-200 mr-2">
                {file.name} ({formatFileSize(file.size)})
              </span>
              <button
                onClick={() => removeAttachment(index)}
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
              >
                <FiX size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="relative flex items-center">
        <input
          type="text"
          placeholder={isRecording ? "Recording..." : "Ask Zeeky anything..."}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          aria-label="Chat message input"
          className="w-full p-3 pl-16 pr-20 rounded-full bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isRecording}
        />
        
        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex space-x-2">
          <button 
            onClick={handleVoiceToggle}
            className={`text-xl transition-colors ${
              isRecording 
                ? 'text-red-500 hover:text-red-600 animate-pulse' 
                : 'text-gray-500 hover:text-blue-500'
            }`}
          >
            {isRecording ? <FiMicOff /> : <FiMic />}
          </button>
          <button 
            onClick={handleFileAttachment}
            className="text-gray-500 hover:text-blue-500 text-xl"
          >
            <FiPaperclip />
          </button>
        </div>

        <button 
          onClick={handleSend} 
          disabled={!inputValue.trim() && attachedFiles.length === 0}
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 text-xl disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          <FiSend />
        </button>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.txt"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    </div>
  );
};

export default ChatBar;