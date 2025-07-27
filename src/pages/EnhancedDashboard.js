import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiCalendar, 
  FiMusic, 
  FiCloud, 
  FiTrendingUp, 
  FiMessageCircle,
  FiFileText,
  FiMapPin,
  FiShoppingCart,
  FiCompass,
  FiCpu,
  FiActivity,
  FiWifi,
  FiBell,
  FiSettings,
  FiUser,
  FiChevronRight,
  FiPlus
} from 'react-icons/fi';

const EnhancedDashboard = ({ user, onSwitchToChat }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedTile, setSelectedTile] = useState(null);
  
  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    
    return () => clearInterval(timer);
  }, []);

  const quickStats = [
    { label: 'Conversations Today', value: '23', icon: FiMessageCircle, color: 'blue' },
    { label: 'Tasks Completed', value: '8', icon: FiFileText, color: 'green' },
    { label: 'AI Requests', value: '47', icon: FiCpu, color: 'purple' },
    { label: 'Active Sessions', value: '3', icon: FiActivity, color: 'orange' }
  ];

  const tiles = [
    {
      id: 'weather',
      title: 'Weather',
      size: 'medium',
      icon: FiCloud,
      color: 'bg-gradient-to-br from-blue-400 to-blue-600',
      content: (
        <div className="text-white p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-3xl font-bold">72°F</div>
              <div className="text-blue-100">Partly Cloudy</div>
            </div>
            <div className="text-5xl">⛅</div>
          </div>
          <div className="flex justify-between text-sm text-blue-100">
            <span>High: 78°F</span>
            <span>Low: 65°F</span>
          </div>
        </div>
      )
    },
    {
      id: 'calendar',
      title: 'Smart Calendar',
      size: 'large',
      icon: FiCalendar,
      color: 'bg-gradient-to-br from-purple-500 to-pink-600',
      content: (
        <div className="text-white p-6">
          <div className="mb-4">
            <div className="text-xl font-bold mb-2">Today's Schedule</div>
            <div className="text-purple-100 text-sm">
              {currentTime.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center space-x-3 bg-white/20 rounded-lg p-3">
              <div className="w-3 h-3 bg-green-400 rounded-full"></div>
              <div>
                <div className="font-medium">Team Standup</div>
                <div className="text-sm text-purple-100">10:00 AM - 10:30 AM</div>
              </div>
            </div>
            <div className="flex items-center space-x-3 bg-white/20 rounded-lg p-3">
              <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
              <div>
                <div className="font-medium">Client Presentation</div>
                <div className="text-sm text-purple-100">2:00 PM - 3:00 PM</div>
              </div>
            </div>
            <div className="flex items-center space-x-3 bg-white/20 rounded-lg p-3">
              <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
              <div>
                <div className="font-medium">AI Development Review</div>
                <div className="text-sm text-purple-100">4:30 PM - 5:30 PM</div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'music',
      title: 'Music Lab',
      size: 'medium',
      icon: FiMusic,
      color: 'bg-gradient-to-br from-green-500 to-emerald-600',
      content: (
        <div className="text-white p-6">
          <div className="mb-4">
            <div className="text-lg font-bold">Now Playing</div>
            <div className="text-green-100 text-sm">Focus Playlist</div>
          </div>
          <div className="bg-white/20 rounded-lg p-4 mb-4">
            <div className="font-medium">Ambient Coding</div>
            <div className="text-sm text-green-100">Lo-Fi Hip Hop</div>
            <div className="flex items-center mt-2 space-x-2">
              <div className="w-full bg-white/30 rounded-full h-1">
                <div className="bg-white rounded-full h-1 w-1/3"></div>
              </div>
              <span className="text-xs">2:34</span>
            </div>
          </div>
          <div className="flex justify-center space-x-4">
            <button className="p-2 bg-white/20 rounded-full">⏮️</button>
            <button className="p-2 bg-white/20 rounded-full">⏸️</button>
            <button className="p-2 bg-white/20 rounded-full">⏭️</button>
          </div>
        </div>
      )
    },
    {
      id: 'fitness',
      title: 'Fitness Tracker',
      size: 'medium',
      icon: FiTrendingUp,
      color: 'bg-gradient-to-br from-red-500 to-pink-600',
      content: (
        <div className="text-white p-6">
          <div className="mb-4">
            <div className="text-lg font-bold">Today's Activity</div>
            <div className="text-red-100 text-sm">Goal: 10,000 steps</div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span>Steps</span>
              <span className="font-bold">7,234</span>
            </div>
            <div className="w-full bg-white/30 rounded-full h-2">
              <div className="bg-white rounded-full h-2 w-3/4"></div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-center text-sm">
              <div>
                <div className="font-bold">2.3</div>
                <div className="text-red-100">Miles</div>
              </div>
              <div>
                <div className="font-bold">342</div>
                <div className="text-red-100">Calories</div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'notes',
      title: 'Quick Notes',
      size: 'medium',
      icon: FiFileText,
      color: 'bg-gradient-to-br from-amber-500 to-orange-600',
      content: (
        <div className="text-white p-6">
          <div className="mb-4">
            <div className="text-lg font-bold">Recent Notes</div>
            <div className="text-amber-100 text-sm">3 new notes today</div>
          </div>
          <div className="space-y-2">
            <div className="bg-white/20 rounded p-2">
              <div className="font-medium text-sm">AI Model Ideas</div>
              <div className="text-xs text-amber-100">5 minutes ago</div>
            </div>
            <div className="bg-white/20 rounded p-2">
              <div className="font-medium text-sm">Meeting Notes</div>
              <div className="text-xs text-amber-100">1 hour ago</div>
            </div>
            <div className="bg-white/20 rounded p-2">
              <div className="font-medium text-sm">Project Roadmap</div>
              <div className="text-xs text-amber-100">2 hours ago</div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'system',
      title: 'System Monitor',
      size: 'large',
      icon: FiCpu,
      color: 'bg-gradient-to-br from-gray-700 to-gray-900',
      content: (
        <div className="text-white p-6">
          <div className="mb-4">
            <div className="text-lg font-bold">System Performance</div>
            <div className="text-gray-300 text-sm">All systems operational</div>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-white/10 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">CPU Usage</span>
                <span className="text-green-400 font-bold">23%</span>
              </div>
              <div className="w-full bg-gray-600 rounded-full h-2">
                <div className="bg-green-400 rounded-full h-2 w-1/4"></div>
              </div>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">Memory</span>
                <span className="text-blue-400 font-bold">67%</span>
              </div>
              <div className="w-full bg-gray-600 rounded-full h-2">
                <div className="bg-blue-400 rounded-full h-2 w-2/3"></div>
              </div>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FiWifi className="text-green-400" />
                <span>Network</span>
              </div>
              <span className="text-green-400">Connected</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FiCpu className="text-blue-400" />
                <span>AI Engine</span>
              </div>
              <span className="text-blue-400">Running</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FiActivity className="text-purple-400" />
                <span>Analytics</span>
              </div>
              <span className="text-purple-400">Active</span>
            </div>
          </div>
        </div>
      )
    }
  ];

  const getTileGridClass = (size) => {
    switch (size) {
      case 'small':
        return 'col-span-1 row-span-1';
      case 'medium':
        return 'col-span-1 row-span-1 md:col-span-2';
      case 'large':
        return 'col-span-1 row-span-2 md:col-span-2';
      default:
        return 'col-span-1 row-span-1';
    }
  };

  return (
    <div className="h-full bg-gray-50 dark:bg-gray-900 overflow-y-auto">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Welcome back, {user?.displayName?.split(' ')[0] || 'User'}! 👋
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {currentTime.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })} • {currentTime.toLocaleTimeString('en-US', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </p>
            </div>
            <button
              onClick={onSwitchToChat}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
            >
              <FiMessageCircle />
              <span>Start Chat</span>
            </button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickStats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg bg-${stat.color}-100 dark:bg-${stat.color}-900/20`}>
                    <stat.icon className={`w-5 h-5 text-${stat.color}-600 dark:text-${stat.color}-400`} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {stat.value}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {stat.label}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Dashboard Tiles */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            AI Dashboard
          </h2>
          <button className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
            <FiPlus />
            <span>Add Tile</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-fr">
          <AnimatePresence>
            {tiles.map((tile, index) => (
              <motion.div
                key={tile.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className={`${getTileGridClass(tile.size)} ${tile.color} rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer relative overflow-hidden group`}
                onClick={() => setSelectedTile(tile)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {/* Tile Header */}
                <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
                  <div className="flex items-center space-x-2">
                    <tile.icon className="w-5 h-5 text-white" />
                    <span className="text-white font-medium text-sm">{tile.title}</span>
                  </div>
                  <FiChevronRight className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>

                {/* Tile Content */}
                <div className="relative h-full">
                  {tile.content}
                </div>

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Tile Modal */}
      <AnimatePresence>
        {selectedTile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedTile(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <selectedTile.icon className="w-6 h-6 text-blue-600" />
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {selectedTile.title}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedTile(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>
              <div className="text-gray-700 dark:text-gray-300">
                <p>Enhanced {selectedTile.title.toLowerCase()} features coming soon!</p>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  This tile will provide advanced AI-powered {selectedTile.title.toLowerCase()} capabilities.
                </p>
              </div>
              <div className="mt-6 flex space-x-3">
                <button className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
                  Configure
                </button>
                <button 
                  onClick={() => setSelectedTile(null)}
                  className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-2 px-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EnhancedDashboard;