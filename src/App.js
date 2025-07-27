import React, { useState, useEffect } from 'react';
import Dashboard from './pages/Dashboard';
import Sidebar from './components/Sidebar';
import SimpleAvatar from './components/SimpleAvatar';
import SignIn from './components/SignIn';
import ChatBar from './components/ChatBar';
import ConversationDisplay from './components/ConversationDisplay';
import LoadingScreen from './components/LoadingScreen';
import AdminDashboard from './components/AdminDashboard';
import ErrorBoundary from './components/ErrorBoundary';
import GlobalSearch from './components/GlobalSearch';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from './firebase-config';
import { motion, AnimatePresence } from 'framer-motion';
import AdminService from './services/AdminService';
import { useGlobalSearch } from './hooks/useGlobalSearch';

function App() {
  const [user, loading] = useAuthState(auth);
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentView, setCurrentView] = useState('chat'); // 'dashboard', 'chat', or 'admin'
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [avatarState, setAvatarState] = useState({
    emotion: 'neutral',
    isListening: false,
    isSpeaking: false,
    isProcessing: false,
    persona: 'default'
  });

  // Admin service instance (singleton)
  const adminService = AdminService;
  
  // Global search hook
  const { isSearchOpen, openSearch, closeSearch } = useGlobalSearch();

  // Initialize app and check admin status
  useEffect(() => {
    const initializeApp = async () => {
      // Initialize theme from localStorage
      const savedTheme = localStorage.getItem('zeeky_theme');
      if (savedTheme) {
        setDarkMode(savedTheme === 'dark');
      }

      // Simulate loading time for hologram initialization
      setTimeout(() => {
        setIsLoading(false);
      }, 100); // Quick loading for testing, will show full animation
    };

    initializeApp();
  }, []);

  // Check admin status when user changes
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (user) {
        try {
          const isAdminUser = await adminService.isAdmin(user);
          setIsAdmin(isAdminUser);
          
          // Auto-initialize admin if Joachima signs in
          if (isAdminUser && user.email === 'joachimaross@gmail.com') {
            await adminService.initializeJoachimaAdmin();
            setIsAdmin(true);
          }
        } catch (error) {
          console.error('Error checking admin status:', error);
        }
      } else {
        setIsAdmin(false);
      }
    };

    if (!loading) {
      checkAdminStatus();
    }
  }, [user, loading]);

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

  const switchToAdmin = () => {
    if (isAdmin) {
      setCurrentView('admin');
    }
  };

  // Show loading screen first
  if (isLoading) {
    return (
      <ErrorBoundary>
        <LoadingScreen onLoadComplete={() => setIsLoading(false)} />
      </ErrorBoundary>
    );
  }

  // Show sign-in if not authenticated
  if (!user && !loading) {
    return (
      <ErrorBoundary>
        <SignIn />
      </ErrorBoundary>
    );
  }

  // Show loading if still checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Authenticating...</div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
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
                  isAdmin={isAdmin}
                  user={user}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col relative">
            {/* AI Avatar */}
            <SimpleAvatar
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

            {/* Search and View Toggle Buttons */}
            <div className="flex items-center space-x-2">
              {/* Search Button */}
              <button
                onClick={openSearch}
                className="flex items-center space-x-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                title="Search (⌘K)"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span className="hidden md:inline text-sm">Search</span>
              </button>
              
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
                {isAdmin && (
                  <button
                    onClick={switchToAdmin}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      currentView === 'admin'
                        ? 'bg-gradient-to-r from-red-500 to-purple-600 text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    🛡️ Admin
                  </button>
                )}
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
            ) : currentView === 'dashboard' ? (
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
                  user={user}
                />
              </motion.div>
            ) : currentView === 'admin' && isAdmin ? (
              <motion.div
                key="admin"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="flex-1"
              >
                <AdminDashboard 
                  user={user}
                  onSwitchToChat={switchToChat}
                  onSwitchToDashboard={switchToDashboard}
                />
              </motion.div>
            ) : null}
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

        {/* Global Search */}
        <GlobalSearch
          isOpen={isSearchOpen}
          onClose={closeSearch}
          onNavigate={(view) => {
            setCurrentView(view);
            closeSearch();
          }}
        />
      </div>
    </ErrorBoundary>
  );
}

export default App;