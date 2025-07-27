import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiSearch, 
  FiCommand, 
  FiMessageCircle, 
  FiCalendar, 
  FiFileText,
  FiSettings,
  FiUser,
  FiMusic,
  FiTrendingUp,
  FiClock,
  FiArrowRight,
  FiStar
} from 'react-icons/fi';

const GlobalSearch = ({ isOpen, onClose, onNavigate }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState([
    'Create workout plan',
    'Schedule meeting',
    'Weather forecast',
    'Music recommendations'
  ]);
  const inputRef = useRef(null);

  // Sample search data
  const searchData = [
    {
      id: 'chat',
      title: 'AI Chat',
      description: 'Start a conversation with Zeeky AI',
      icon: FiMessageCircle,
      category: 'Core',
      action: 'navigate',
      target: 'chat',
      keywords: ['chat', 'conversation', 'ai', 'talk', 'ask']
    },
    {
      id: 'dashboard',
      title: 'Dashboard',
      description: 'View your personalized dashboard',
      icon: FiTrendingUp,
      category: 'Core',
      action: 'navigate',
      target: 'dashboard',
      keywords: ['dashboard', 'overview', 'home', 'main']
    },
    {
      id: 'calendar',
      title: 'Smart Calendar',
      description: 'Manage your schedule and events',
      icon: FiCalendar,
      category: 'Productivity',
      action: 'section',
      target: 'calendar',
      keywords: ['calendar', 'schedule', 'events', 'appointments', 'meetings']
    },
    {
      id: 'notes',
      title: 'Notes & Tasks',
      description: 'Create and manage your notes',
      icon: FiFileText,
      category: 'Productivity',
      action: 'section',
      target: 'notes',
      keywords: ['notes', 'tasks', 'todo', 'write', 'remember']
    },
    {
      id: 'music',
      title: 'Music Lab',
      description: 'Control music and audio features',
      icon: FiMusic,
      category: 'Entertainment',
      action: 'section',
      target: 'music',
      keywords: ['music', 'audio', 'play', 'songs', 'playlist']
    },
    {
      id: 'fitness',
      title: 'Fitness Tracker',
      description: 'Track your health and fitness',
      icon: FiTrendingUp,
      category: 'Health',
      action: 'section',
      target: 'fitness',
      keywords: ['fitness', 'health', 'workout', 'exercise', 'steps']
    },
    {
      id: 'settings',
      title: 'Settings',
      description: 'Configure your preferences',
      icon: FiSettings,
      category: 'System',
      action: 'section',
      target: 'settings',
      keywords: ['settings', 'preferences', 'config', 'options']
    },
    {
      id: 'profile',
      title: 'User Profile',
      description: 'Manage your account and profile',
      icon: FiUser,
      category: 'System',
      action: 'section',
      target: 'profile',
      keywords: ['profile', 'account', 'user', 'personal']
    }
  ];

  // Quick actions
  const quickActions = [
    {
      id: 'new-chat',
      title: 'Start New Chat',
      description: 'Begin a fresh conversation',
      icon: FiMessageCircle,
      action: () => {
        onNavigate('chat');
        onClose();
      }
    },
    {
      id: 'voice-command',
      title: 'Voice Command',
      description: 'Use voice to control Zeeky',
      icon: FiCommand,
      action: () => {
        // Trigger voice recognition
        console.log('Voice command activated');
      }
    },
    {
      id: 'quick-note',
      title: 'Quick Note',
      description: 'Create a quick note',
      icon: FiFileText,
      action: () => {
        onNavigate('notes');
        onClose();
      }
    }
  ];

  // Search function
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setSelectedIndex(0);
      return;
    }

    const searchResults = searchData.filter(item => {
      const queryLower = query.toLowerCase();
      return (
        item.title.toLowerCase().includes(queryLower) ||
        item.description.toLowerCase().includes(queryLower) ||
        item.keywords.some(keyword => keyword.includes(queryLower))
      );
    });

    setResults(searchResults);
    setSelectedIndex(0);
  }, [query]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < results.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => prev > 0 ? prev - 1 : prev);
          break;
        case 'Enter':
          e.preventDefault();
          if (results[selectedIndex]) {
            handleResultSelect(results[selectedIndex]);
          }
          break;
        case 'Escape':
          onClose();
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleResultSelect = (result) => {
    // Add to recent searches
    setRecentSearches(prev => {
      const updated = [result.title, ...prev.filter(item => item !== result.title)];
      return updated.slice(0, 4);
    });

    // Execute action
    if (result.action === 'navigate' && onNavigate) {
      onNavigate(result.target);
    } else if (result.action === 'section') {
      console.log(`Navigate to section: ${result.target}`);
    }

    onClose();
    setQuery('');
  };

  const handleRecentSearchSelect = (searchTerm) => {
    setQuery(searchTerm);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center pt-20"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: -20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: -20 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Search Input */}
          <div className="flex items-center border-b border-gray-200 dark:border-gray-700 p-4">
            <FiSearch className="w-5 h-5 text-gray-400 mr-3" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search anything... (⌘K)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-lg text-gray-900 dark:text-white placeholder-gray-500"
            />
            <div className="flex items-center space-x-2 text-xs text-gray-400">
              <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">↑↓</kbd>
              <span>Navigate</span>
              <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">↵</kbd>
              <span>Select</span>
            </div>
          </div>

          {/* Results */}
          <div className="max-h-96 overflow-y-auto">
            {query.trim() === '' ? (
              /* No Query - Show Quick Actions and Recent */
              <div className="p-4">
                {/* Quick Actions */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                    Quick Actions
                  </h3>
                  <div className="space-y-2">
                    {quickActions.map((action) => (
                      <button
                        key={action.id}
                        onClick={action.action}
                        className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                      >
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                          <action.icon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {action.title}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {action.description}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Recent Searches */}
                {recentSearches.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                      Recent Searches
                    </h3>
                    <div className="space-y-1">
                      {recentSearches.map((search, index) => (
                        <button
                          key={index}
                          onClick={() => handleRecentSearchSelect(search)}
                          className="w-full flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                        >
                          <FiClock className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-700 dark:text-gray-300">{search}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : results.length > 0 ? (
              /* Search Results */
              <div className="p-2">
                {results.map((result, index) => (
                  <motion.button
                    key={result.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleResultSelect(result)}
                    className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-all text-left ${
                      index === selectedIndex
                        ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${
                      index === selectedIndex
                        ? 'bg-blue-100 dark:bg-blue-900/30'
                        : 'bg-gray-100 dark:bg-gray-700'
                    }`}>
                      <result.icon className={`w-4 h-4 ${
                        index === selectedIndex
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-gray-600 dark:text-gray-400'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className={`font-medium ${
                          index === selectedIndex
                            ? 'text-blue-900 dark:text-blue-100'
                            : 'text-gray-900 dark:text-white'
                        }`}>
                          {result.title}
                        </span>
                        <span className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded-full text-gray-600 dark:text-gray-400">
                          {result.category}
                        </span>
                      </div>
                      <div className={`text-sm ${
                        index === selectedIndex
                          ? 'text-blue-700 dark:text-blue-300'
                          : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        {result.description}
                      </div>
                    </div>
                    {index === selectedIndex && (
                      <FiArrowRight className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    )}
                  </motion.button>
                ))}
              </div>
            ) : (
              /* No Results */
              <div className="p-8 text-center">
                <div className="text-gray-400 mb-2">
                  <FiSearch className="w-8 h-8 mx-auto" />
                </div>
                <p className="text-gray-500 dark:text-gray-400">
                  No results found for "{query}"
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  Try a different search term
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1">
                  <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs">⌘</kbd>
                  <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs">K</kbd>
                  <span>to search</span>
                </div>
                <div className="flex items-center space-x-1">
                  <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs">esc</kbd>
                  <span>to close</span>
                </div>
              </div>
              <div className="text-gray-400">
                Powered by Zeeky AI
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default GlobalSearch;