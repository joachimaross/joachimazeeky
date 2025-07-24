import React, { useState, useEffect } from 'react';
import Dashboard from './pages/Dashboard';
import Sidebar from './components/Sidebar';
import ZeekyAvatar from './components/ZeekyAvatar';
import SignIn from './components/SignIn';
import ChatBar from './components/ChatBar';
import ConversationDisplay from './components/ConversationDisplay';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from './firebase';
import { motion, AnimatePresence } from 'framer-motion';

function App() {
  const [user] = useAuthState(auth);
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentView, setCurrentView] = useState('chat'); // 'dashboard' or 'chat'
  const [messages, setMessages] = useState([]);
  const [avatarState, setAvatarState] = useState({
    emotion: 'neutral',
    isListening: false,
    isSpeaking: false,
    isProcessing: false,
    persona: 'default'
  });

  // Initialize theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('zeeky_theme');
    if (savedTheme) {
      setDarkMode(savedTheme === 'dark');
    }
  }, []);

  // Save theme to localStorage
  useEffect(() => {
    localStorage.setItem('zeeky_theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const toggleTheme = () => {
    setDarkMode(!darkMode);
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const signOut = () => {
    auth.signOut();
  };

  const handleMessageSent = (message) => {
    setMessages(prev => [...prev, message]);
  };

  const handleAvatarStateChange = (newState) => {
    setAvatarState(prev => ({ ...prev, ...newState }));
  };

  const switchToChat = () => {
    setCurrentView('chat');
  };

  const switchToDashboard = () => {
    setCurrentView('dashboard');
  };

  if (!user) {
    return <SignIn />;
  }

  return (
    <div className={`flex h-screen ${darkMode ? 'dark' : ''}`}>
      <div className="flex flex-grow bg-gray-50 dark:bg-gray-900 transition-colors">
        {/* Sidebar */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
            >
              <Sidebar 
                onToggle={toggleSidebar} 
                onThemeToggle={toggleTheme} 
                darkMode={darkMode}
                currentView={currentView}
                onViewChange={(view) => setCurrentView(view)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col relative">
          {/* Holographic Avatar */}
          <ZeekyAvatar
            isListening={avatarState.isListening}
            isSpeaking={avatarState.isSpeaking}
            emotion={avatarState.emotion}
            message={avatarState.currentMessage}
          />

          {/* Header Bar */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg">
            <div className="flex items-center space-x-4">
              {!sidebarOpen && (
                <button
                  onClick={toggleSidebar}
                  className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              )}
              
              {/* Logo */}
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">Z</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">Zeeky AI</h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Advanced AI Assistant</p>
                </div>
              </div>
            </div>

            {/* View Toggle Buttons */}
            <div className="flex items-center space-x-2">
              <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                <button
                  onClick={switchToChat}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    currentView === 'chat'
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  💬 Chat
                </button>
                <button
                  onClick={switchToDashboard}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    currentView === 'dashboard'
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  📊 Dashboard
                </button>
              </div>

              {/* Sign Out Button */}
              <button 
                onClick={signOut}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
              >
                Sign Out
              </button>
            </div>
          </div>

          {/* Content Area */}
          <AnimatePresence mode="wait">
            {currentView === 'chat' ? (
              <motion.div
                key="chat"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="flex-1 flex flex-col"
              >
                <ConversationDisplay messages={messages} />
                <ChatBar 
                  onMessageSent={handleMessageSent}
                  onAvatarStateChange={handleAvatarStateChange}
                />
              </motion.div>
            ) : (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="flex-1"
              >
                <Dashboard 
                  sidebarOpen={sidebarOpen} 
                  onToggleSidebar={toggleSidebar}
                  onSwitchToChat={switchToChat}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Status Indicators */}
        <AnimatePresence>
          {avatarState.isProcessing && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="fixed bottom-4 left-4 bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg z-50"
            >
              🧠 Zeeky is thinking...
            </motion.div>
          )}
          
          {avatarState.error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="fixed bottom-4 left-4 bg-red-500 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg z-50"
            >
              ⚠️ Connection issue
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default App;