import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSearch, FiFilter, FiX, FiClock, FiUser, FiFile, FiSettings } from 'react-icons/fi';

const SearchSystem = ({ onClose, isVisible = true }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState({
    type: 'all', // 'all', 'conversations', 'files', 'users', 'settings'
    timeRange: 'all', // 'all', 'today', 'week', 'month', 'year'
    sortBy: 'relevance' // 'relevance', 'date', 'name'
  });
  const [recentSearches, setRecentSearches] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const searchInputRef = useRef(null);
  const resultsRef = useRef(null);

  // Focus search input when component mounts
  useEffect(() => {
    if (isVisible && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isVisible]);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('zeeky_recent_searches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to load recent searches:', error);
      }
    }
  }, []);

  // Debounced search function
  const debouncedSearch = useMemo(() => {
    const debounce = (func, delay) => {
      let timeoutId;
      return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(...args), delay);
      };
    };

    return debounce(async (searchQuery, searchFilters) => {
      if (!searchQuery.trim()) {
        setResults([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      
      try {
        const searchResults = await performSearch(searchQuery, searchFilters);
        setResults(searchResults);
      } catch (error) {
        console.error('Search failed:', error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);
  }, []);

  // Perform search when query or filters change
  useEffect(() => {
    debouncedSearch(query, filters);
  }, [query, filters, debouncedSearch]);

  // Search function
  const performSearch = async (searchQuery, searchFilters) => {
    // Simulate search API call
    const searchData = await searchContent(searchQuery, searchFilters);
    
    // Add search to recent searches
    if (searchQuery.trim()) {
      addToRecentSearches(searchQuery);
    }
    
    return searchData;
  };

  // Mock search function - replace with actual search implementation
  const searchContent = async (query, filters) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Mock search results
    const mockResults = [
      {
        id: 1,
        type: 'conversation',
        title: 'Chat about AI and machine learning',
        content: 'Discussion about the future of artificial intelligence and its applications',
        date: '2025-01-15T10:30:00Z',
        relevance: 0.95,
        metadata: { messageCount: 24, participants: ['You', 'Zeeky'] }
      },
      {
        id: 2,
        type: 'file',
        title: 'Project Planning Document.pdf',
        content: 'Comprehensive project planning and roadmap for Q1 2025',
        date: '2025-01-14T15:20:00Z',
        relevance: 0.87,
        metadata: { size: '2.4 MB', fileType: 'PDF' }
      },
      {
        id: 3,
        type: 'setting',
        title: 'Voice Recognition Settings',
        content: 'Configure voice recognition and speech-to-text preferences',
        date: '2025-01-13T09:15:00Z',
        relevance: 0.78,
        metadata: { category: 'Audio Settings', path: '/settings/voice' }
      }
    ];

    // Filter results based on search criteria
    return mockResults
      .filter(result => {
        const matchesQuery = result.title.toLowerCase().includes(query.toLowerCase()) ||
                           result.content.toLowerCase().includes(query.toLowerCase());
        
        const matchesType = filters.type === 'all' || result.type === filters.type;
        
        const matchesTimeRange = checkTimeRange(result.date, filters.timeRange);
        
        return matchesQuery && matchesType && matchesTimeRange;
      })
      .sort((a, b) => {
        switch (filters.sortBy) {
          case 'date':
            return new Date(b.date) - new Date(a.date);
          case 'name':
            return a.title.localeCompare(b.title);
          default: // relevance
            return b.relevance - a.relevance;
        }
      });
  };

  // Check if date falls within time range
  const checkTimeRange = (dateString, timeRange) => {
    if (timeRange === 'all') return true;
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    
    switch (timeRange) {
      case 'today':
        return diffMs < 24 * 60 * 60 * 1000;
      case 'week':
        return diffMs < 7 * 24 * 60 * 60 * 1000;
      case 'month':
        return diffMs < 30 * 24 * 60 * 60 * 1000;
      case 'year':
        return diffMs < 365 * 24 * 60 * 60 * 1000;
      default:
        return true;
    }
  };

  // Add search to recent searches
  const addToRecentSearches = (searchQuery) => {
    const newRecentSearches = [
      searchQuery,
      ...recentSearches.filter(s => s !== searchQuery)
    ].slice(0, 10); // Keep only last 10 searches
    
    setRecentSearches(newRecentSearches);
    localStorage.setItem('zeeky_recent_searches', JSON.stringify(newRecentSearches));
  };

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e) => {
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
        if (selectedIndex >= 0 && results[selectedIndex]) {
          handleResultClick(results[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
      default:
        break;
    }
  }, [results, selectedIndex, onClose]);

  // Handle result click
  const handleResultClick = (result) => {
    console.log('Opening result:', result);
    
    // Navigate to result based on type
    switch (result.type) {
      case 'conversation':
        // Navigate to conversation
        window.location.href = `/chat/${result.id}`;
        break;
      case 'file':
        // Open file
        window.location.href = `/files/${result.id}`;
        break;
      case 'setting':
        // Navigate to settings
        window.location.href = result.metadata.path;
        break;
      default:
        console.log('Unknown result type:', result.type);
    }
    
    onClose();
  };

  // Handle recent search click
  const handleRecentSearchClick = (searchTerm) => {
    setQuery(searchTerm);
    searchInputRef.current?.focus();
  };

  // Clear recent searches
  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('zeeky_recent_searches');
  };

  // Get result icon
  const getResultIcon = (type) => {
    switch (type) {
      case 'conversation':
        return '💬';
      case 'file':
        return '📄';
      case 'setting':
        return '⚙️';
      case 'user':
        return '👤';
      default:
        return '📋';
    }
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center pt-20"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ scale: 0.9, y: -20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: -20 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden"
        onKeyDown={handleKeyDown}
      >
        {/* Search Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <FiSearch className="text-gray-400 text-xl" />
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search conversations, files, settings..."
              className="flex-1 text-lg bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-400"
            />
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-colors"
            >
              <FiFilter />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-colors"
            >
              <FiX />
            </button>
          </div>

          {/* Filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-4 space-y-3"
              >
                <div className="flex flex-wrap gap-2">
                  <select
                    value={filters.type}
                    onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                    className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm"
                  >
                    <option value="all">All Types</option>
                    <option value="conversation">Conversations</option>
                    <option value="file">Files</option>
                    <option value="setting">Settings</option>
                    <option value="user">Users</option>
                  </select>
                  
                  <select
                    value={filters.timeRange}
                    onChange={(e) => setFilters(prev => ({ ...prev, timeRange: e.target.value }))}
                    className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm"
                  >
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="year">This Year</option>
                  </select>
                  
                  <select
                    value={filters.sortBy}
                    onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                    className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm"
                  >
                    <option value="relevance">Relevance</option>
                    <option value="date">Date</option>
                    <option value="name">Name</option>
                  </select>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Search Results */}
        <div className="flex-1 overflow-y-auto" ref={resultsRef}>
          {isLoading && (
            <div className="p-8 text-center">
              <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-500 dark:text-gray-400">Searching...</p>
            </div>
          )}

          {!isLoading && query && results.length === 0 && (
            <div className="p-8 text-center">
              <div className="text-4xl mb-4">🔍</div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No results found
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Try adjusting your search terms or filters
              </p>
            </div>
          )}

          {!query && recentSearches.length > 0 && (
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Recent Searches
                </h3>
                <button
                  onClick={clearRecentSearches}
                  className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  Clear
                </button>
              </div>
              <div className="space-y-1">
                {recentSearches.map((search, index) => (
                  <button
                    key={index}
                    onClick={() => handleRecentSearchClick(search)}
                    className="flex items-center space-x-2 w-full p-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <FiClock className="text-gray-400 text-sm" />
                    <span className="text-gray-700 dark:text-gray-300">{search}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {results.length > 0 && (
            <div className="p-2">
              {results.map((result, index) => (
                <motion.button
                  key={result.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleResultClick(result)}
                  className={`w-full p-3 text-left rounded-lg transition-colors mb-1 ${
                    selectedIndex === index
                      ? 'bg-blue-100 dark:bg-blue-900'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="text-xl">{getResultIcon(result.type)}</div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                        {result.title}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mt-1">
                        {result.content}
                      </p>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                        <span>{formatDate(result.date)}</span>
                        <span>•</span>
                        <span className="capitalize">{result.type}</span>
                        {result.metadata && (
                          <>
                            <span>•</span>
                            <span>
                              {result.type === 'conversation' && `${result.metadata.messageCount} messages`}
                              {result.type === 'file' && result.metadata.size}
                              {result.type === 'setting' && result.metadata.category}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </div>

        {/* Search Tips */}
        {!query && recentSearches.length === 0 && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Search Tips
            </h3>
            <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
              <p>• Use quotes for exact phrases: "machine learning"</p>
              <p>• Search by type: type:conversation, type:file</p>
              <p>• Search by date: today, yesterday, last week</p>
              <p>• Use filters to narrow down results</p>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default SearchSystem;