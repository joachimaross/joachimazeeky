// Mobile Responsive Utilities and Components for Zeeky AI
import React, { useState, useEffect, createContext, useContext } from 'react';

// Mobile detection and responsive context
const ResponsiveContext = createContext();

export const ResponsiveProvider = ({ children }) => {
  const [screenSize, setScreenSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });

  const [deviceType, setDeviceType] = useState('desktop');
  const [orientation, setOrientation] = useState('portrait');
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    const detectDevice = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      // Update screen size
      setScreenSize({ width, height });
      
      // Determine device type
      if (width < 640) {
        setDeviceType('mobile');
      } else if (width < 1024) {
        setDeviceType('tablet');
      } else {
        setDeviceType('desktop');
      }
      
      // Determine orientation
      setOrientation(width > height ? 'landscape' : 'portrait');
      
      // Detect touch capability
      setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };

    // Initial detection
    detectDevice();

    // Listen for resize events
    window.addEventListener('resize', detectDevice);
    window.addEventListener('orientationchange', detectDevice);

    return () => {
      window.removeEventListener('resize', detectDevice);
      window.removeEventListener('orientationchange', detectDevice);
    };
  }, []);

  const value = {
    screenSize,
    deviceType,
    orientation,
    isTouch,
    isMobile: deviceType === 'mobile',
    isTablet: deviceType === 'tablet',
    isDesktop: deviceType === 'desktop',
    isLandscape: orientation === 'landscape',
    isPortrait: orientation === 'portrait'
  };

  return (
    <ResponsiveContext.Provider value={value}>
      {children}
    </ResponsiveContext.Provider>
  );
};

// Hook to use responsive context
export const useResponsive = () => {
  const context = useContext(ResponsiveContext);
  if (!context) {
    throw new Error('useResponsive must be used within a ResponsiveProvider');
  }
  return context;
};

// Mobile-optimized Zeeky Avatar
export const MobileZeekyAvatar = ({ isListening, isSpeaking, size = 120 }) => {
  const { isMobile, isTouch } = useResponsive();
  
  // Reduce size and complexity for mobile
  const mobileSize = isMobile ? Math.min(size, 100) : size;
  const reducedAnimations = isMobile && !isTouch;

  return (
    <div className={`
      relative inline-block transition-all duration-300
      ${isMobile ? 'mb-4' : ''}
    `}>
      <div 
        className={`
          rounded-full bg-gradient-to-br from-purple-600 to-blue-600 
          flex items-center justify-center text-white font-bold text-2xl
          ${isListening ? 'animate-pulse ring-4 ring-green-400' : ''}
          ${isSpeaking ? 'animate-bounce ring-4 ring-blue-400' : ''}
          ${isMobile ? 'shadow-lg' : 'shadow-xl'}
        `}
        style={{
          width: mobileSize,
          height: mobileSize
        }}
      >
        {isSpeaking ? '🗣️' : isListening ? '👂' : '🤖'}
      </div>
      
      {/* Mobile-specific status indicators */}
      {isMobile && (
        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
          {isListening && (
            <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
              Listening
            </span>
          )}
          {isSpeaking && (
            <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
              Speaking
            </span>
          )}
        </div>
      )}
    </div>
  );
};

// Mobile-optimized Chat Interface
export const MobileChatInterface = ({ messages, onSendMessage, isLoading }) => {
  const { isMobile, screenSize } = useResponsive();
  const [inputText, setInputText] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSend = () => {
    if (inputText.trim()) {
      onSendMessage(inputText.trim());
      setInputText('');
    }
  };

  return (
    <div className={`
      flex flex-col h-full
      ${isMobile ? 'p-2' : 'p-4'}
    `}>
      {/* Messages */}
      <div className={`
        flex-1 overflow-y-auto space-y-3 mb-4
        ${isMobile ? 'max-h-60' : 'max-h-96'}
      `}>
        {messages.map((message, index) => (
          <div
            key={index}
            className={`
              flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}
            `}
          >
            <div className={`
              max-w-xs lg:max-w-md px-4 py-2 rounded-lg
              ${message.role === 'user' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-800'
              }
              ${isMobile ? 'text-sm' : 'text-base'}
            `}>
              {message.content}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-200 rounded-lg p-4">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className={`
        flex items-center space-x-2 bg-white rounded-lg border-2 border-gray-200 p-2
        ${isMobile ? 'sticky bottom-0' : ''}
      `}>
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type your message..."
          className={`
            flex-1 outline-none
            ${isMobile ? 'text-sm' : 'text-base'}
          `}
          disabled={isLoading}
        />
        
        {isMobile && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 text-gray-500 hover:text-gray-700"
          >
            {isExpanded ? '▼' : '▲'}
          </button>
        )}
        
        <button
          onClick={handleSend}
          disabled={!inputText.trim() || isLoading}
          className={`
            bg-blue-500 text-white rounded-lg transition-colors
            disabled:bg-gray-300 disabled:cursor-not-allowed
            ${isMobile ? 'px-3 py-2 text-sm' : 'px-4 py-2'}
          `}
        >
          Send
        </button>
      </div>
    </div>
  );
};

// Mobile-optimized Dashboard
export const MobileDashboard = ({ widgets, onWidgetClick }) => {
  const { isMobile, isTablet } = useResponsive();
  const [activeWidget, setActiveWidget] = useState(null);

  const getGridCols = () => {
    if (isMobile) return 'grid-cols-2';
    if (isTablet) return 'grid-cols-3';
    return 'grid-cols-4';
  };

  return (
    <div className={`
      grid gap-4 p-4
      ${getGridCols()}
    `}>
      {widgets.map((widget, index) => (
        <div
          key={index}
          onClick={() => {
            setActiveWidget(widget.id);
            onWidgetClick?.(widget);
          }}
          className={`
            relative bg-white rounded-lg shadow-md p-4 cursor-pointer
            transition-all duration-200 hover:shadow-lg
            ${isMobile ? 'min-h-24' : 'min-h-32'}
            ${activeWidget === widget.id ? 'ring-2 ring-blue-500' : ''}
          `}
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className={`
              font-semibold
              ${isMobile ? 'text-sm' : 'text-base'}
            `}>
              {widget.title}
            </h3>
            <span className="text-2xl">{widget.icon}</span>
          </div>
          
          <div className={`
            text-gray-600
            ${isMobile ? 'text-xs' : 'text-sm'}
          `}>
            {widget.description}
          </div>
          
          {widget.data && (
            <div className={`
              mt-2 font-bold text-blue-600
              ${isMobile ? 'text-sm' : 'text-lg'}
            `}>
              {widget.data}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// Mobile Navigation Component
export const MobileNavigation = ({ items, activeItem, onItemClick }) => {
  const { isMobile } = useResponsive();
  const [isOpen, setIsOpen] = useState(false);

  if (!isMobile) {
    // Desktop navigation
    return (
      <nav className="flex space-x-6 bg-white shadow-sm p-4">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onItemClick(item)}
            className={`
              px-4 py-2 rounded-lg transition-colors
              ${activeItem === item.id
                ? 'bg-blue-500 text-white'
                : 'text-gray-600 hover:bg-gray-100'
              }
            `}
          >
            <span className="mr-2">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
    );
  }

  // Mobile navigation
  return (
    <>
      {/* Mobile menu button */}
      <div className="sticky top-0 z-50 bg-white shadow-sm">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-xl font-bold text-gray-800">Zeeky AI</h1>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 rounded-lg bg-gray-100 text-gray-600"
          >
            {isOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Mobile menu overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black bg-opacity-50" onClick={() => setIsOpen(false)}>
          <div className="absolute top-0 right-0 w-64 h-full bg-white shadow-lg">
            <div className="p-4 space-y-2">
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onItemClick(item);
                    setIsOpen(false);
                  }}
                  className={`
                    w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center
                    ${activeItem === item.id
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                    }
                  `}
                >
                  <span className="mr-3 text-lg">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom navigation for mobile */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30">
        <div className="flex justify-around py-2">
          {items.slice(0, 5).map((item) => (
            <button
              key={item.id}
              onClick={() => onItemClick(item)}
              className={`
                flex flex-col items-center py-2 px-3 rounded-lg
                ${activeItem === item.id
                  ? 'text-blue-500'
                  : 'text-gray-600'
                }
              `}
            >
              <span className="text-lg mb-1">{item.icon}</span>
              <span className="text-xs">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
};

// Touch-optimized File Upload
export const MobileFileUpload = ({ onFileSelect, maxFiles = 5 }) => {
  const { isMobile, isTouch } = useResponsive();
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const files = Array.from(e.dataTransfer.files).slice(0, maxFiles);
      onFileSelect(files);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      const files = Array.from(e.target.files).slice(0, maxFiles);
      onFileSelect(files);
    }
  };

  return (
    <div
      className={`
        relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
        transition-all duration-200
        ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
        ${isMobile ? 'p-4' : 'p-6'}
      `}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <input
        type="file"
        multiple
        onChange={handleFileInput}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.txt,.csv,.xlsx"
      />
      
      <div className="space-y-2">
        <div className={`text-4xl ${isMobile ? 'text-3xl' : 'text-4xl'}`}>
          📁
        </div>
        
        <div className={`text-gray-700 ${isMobile ? 'text-sm' : 'text-base'}`}>
          {isTouch ? 'Tap to select files' : 'Drag & drop files or click to select'}
        </div>
        
        <div className={`text-gray-500 ${isMobile ? 'text-xs' : 'text-sm'}`}>
          Up to {maxFiles} files • Images, Audio, Video, Documents
        </div>
      </div>
    </div>
  );
};

// Mobile-optimized Voice Recording
export const MobileVoiceRecorder = ({ onRecordingComplete, maxDuration = 60 }) => {
  const { isMobile } = useResponsive();
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setIsRecording(true);
      
      // Audio level monitoring (simplified for mobile)
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const updateLevel = () => {
        if (isRecording) {
          analyser.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setAudioLevel(average / 255);
          requestAnimationFrame(updateLevel);
        }
      };
      updateLevel();
      
      // Duration timer
      const timer = setInterval(() => {
        setDuration(prev => {
          if (prev >= maxDuration) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
      
    } catch (error) {
      console.error('Failed to start recording:', error);
      alert('Microphone access denied');
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
    setDuration(0);
    setAudioLevel(0);
    // Handle recording completion
    onRecordingComplete?.();
  };

  return (
    <div className={`
      bg-white rounded-lg shadow-lg p-6 text-center
      ${isMobile ? 'p-4' : 'p-6'}
    `}>
      {/* Recording button */}
      <button
        onClick={isRecording ? stopRecording : startRecording}
        className={`
          w-20 h-20 rounded-full flex items-center justify-center text-2xl
          transition-all duration-200
          ${isRecording 
            ? 'bg-red-500 text-white animate-pulse' 
            : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
          }
          ${isMobile ? 'w-16 h-16 text-xl' : 'w-20 h-20 text-2xl'}
        `}
      >
        {isRecording ? '⏹️' : '🎤'}
      </button>

      {/* Recording status */}
      {isRecording && (
        <div className="mt-4 space-y-2">
          <div className={`font-mono ${isMobile ? 'text-lg' : 'text-xl'}`}>
            {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')}
          </div>
          
          {/* Audio level indicator */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-500 h-2 rounded-full transition-all duration-100"
              style={{ width: `${audioLevel * 100}%` }}
            ></div>
          </div>
          
          <div className={`text-gray-500 ${isMobile ? 'text-sm' : 'text-base'}`}>
            Recording... Tap stop when finished
          </div>
        </div>
      )}
    </div>
  );
};

export default {
  ResponsiveProvider,
  useResponsive,
  MobileZeekyAvatar,
  MobileChatInterface,
  MobileDashboard,
  MobileNavigation,
  MobileFileUpload,
  MobileVoiceRecorder
};