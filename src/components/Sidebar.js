import React from 'react';
import { motion } from 'framer-motion';
import { 
  FiMessageCircle, 
  FiMusic, 
  FiVideo, 
  FiCalendar, 
  FiFileText, 
  FiRss, 
  FiBriefcase, 
  FiSettings,
  FiFolderOpen,
  FiSun,
  FiMoon,
  FiX,
  FiMapPin,
  FiTrendingUp,
  FiShoppingCart,
  FiCompass,
  FiShield,
  FiCpu,
  FiUsers,
  FiActivity
} from 'react-icons/fi';

const Sidebar = ({ 
  onToggle, 
  onThemeToggle, 
  darkMode, 
  currentView, 
  onViewChange, 
  isAdmin = false, 
  user = null 
}) => {
  const mainViews = [
    { icon: FiMessageCircle, label: 'AI Chat', id: 'chat', view: 'chat' },
    { icon: FiActivity, label: 'Dashboard', id: 'dashboard', view: 'dashboard' },
  ];

  const toolsAndFeatures = [
    { icon: FiMusic, label: 'Music Lab', id: 'music', section: 'music' },
    { icon: FiVideo, label: 'Video Studio', id: 'video', section: 'video' },
    { icon: FiCalendar, label: 'Smart Calendar', id: 'calendar', section: 'calendar' },
    { icon: FiFileText, label: 'Notes & Tasks', id: 'notes', section: 'notes' },
    { icon: FiRss, label: 'News Feeds', id: 'news', section: 'news' },
    { icon: FiBriefcase, label: 'Business Tools', id: 'business', section: 'business' },
    { icon: FiTrendingUp, label: 'Fitness Tracker', id: 'fitness', section: 'fitness' },
    { icon: FiMapPin, label: 'Maps & Travel', id: 'maps', section: 'maps' },
    { icon: FiShoppingCart, label: 'Shopping Assistant', id: 'shopping', section: 'shopping' },
    { icon: FiCompass, label: 'Survival Guide', id: 'survival', section: 'survival' },
  ];

  const adminTools = [
    { icon: FiShield, label: 'Admin Panel', id: 'admin', view: 'admin' },
    { icon: FiUsers, label: 'User Management', id: 'users', section: 'users' },
    { icon: FiCpu, label: 'System Monitor', id: 'system', section: 'system' },
    { icon: FiSettings, label: 'Advanced Settings', id: 'admin-settings', section: 'admin-settings' },
  ];

  const handleNavigation = (item) => {
    if (item.view && onViewChange) {
      onViewChange(item.view);
    } else if (item.section) {
      // Handle section navigation within current view
      console.log(`Navigate to section: ${item.section}`);
    }
  };

  const renderMenuItems = (items, title, isAdminSection = false) => (
    <div className="mb-6">
      <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 px-2">
        {title}
      </h3>
      <ul className="space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = item.view ? currentView === item.view : false;
          
          return (
            <motion.li key={item.id}>
              <button
                onClick={() => handleNavigation(item)}
                className={`w-full flex items-center space-x-3 p-3 rounded-lg text-left transition-all group ${
                  isActive
                    ? isAdminSection
                      ? 'bg-gradient-to-r from-red-50 to-purple-50 dark:from-red-900/20 dark:to-purple-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                      : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <div className={`${isActive && isAdminSection ? 'text-red-500' : isActive ? 'text-blue-500' : ''}`}>
                  <Icon size={18} />
                </div>
                <span className="text-sm font-medium flex-1">{item.label}</span>
                {isAdminSection && (
                  <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
                )}
              </button>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );

  return (
    <motion.div 
      initial={{ x: -300 }}
      animate={{ x: 0 }}
      exit={{ x: -300 }}
      className="w-72 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col transition-colors shadow-lg"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-lg">Z</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Zeeky AI</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {isAdmin ? 'Admin Edition' : 'AI Assistant Platform'}
            </p>
          </div>
        </div>
        <button
          onClick={onToggle}
          className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <FiX size={18} />
        </button>
      </div>

      {/* User Info */}
      {user && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-semibold">
                {user.displayName?.charAt(0) || user.email?.charAt(0)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {user.displayName || 'User'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {user.email}
              </p>
            </div>
            {isAdmin && (
              <div className="flex items-center space-x-1 bg-red-100 dark:bg-red-900/30 px-2 py-1 rounded-full">
                <FiShield size={12} className="text-red-600 dark:text-red-400" />
                <span className="text-xs font-semibold text-red-600 dark:text-red-400">Admin</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onThemeToggle}
            className="flex items-center justify-center space-x-2 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
          >
            {darkMode ? <FiSun size={16} /> : <FiMoon size={16} />}
            <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
              {darkMode ? 'Light' : 'Dark'}
            </span>
          </button>
          <button className="flex items-center justify-center space-x-2 p-3 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 transition-all">
            <FiFolderOpen size={16} />
            <span className="text-sm font-medium">Files</span>
          </button>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 overflow-y-auto">
        {/* Main Views */}
        {renderMenuItems(mainViews, 'Main')}
        
        {/* Admin Tools - Only for Admin Users */}
        {isAdmin && renderMenuItems(adminTools, 'Admin Controls', true)}
        
        {/* AI Tools & Features */}
        {renderMenuItems(toolsAndFeatures, 'AI Tools & Features')}
        
        {/* Settings */}
        {renderMenuItems([{ icon: FiSettings, label: 'Settings', id: 'settings', section: 'settings' }], 'System')}
      </nav>

      {/* Recent Conversations & Status */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
            <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
            Recent Activity
          </h3>
          <div className="space-y-2">
            <motion.div 
              whileHover={{ scale: 1.02 }}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-all"
            >
              <p className="text-xs text-gray-600 dark:text-gray-400 truncate">🎵 Music recommendations for workout</p>
              <span className="text-xs text-gray-400">2 minutes ago</span>
            </motion.div>
            <motion.div 
              whileHover={{ scale: 1.02 }}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-all"
            >
              <p className="text-xs text-gray-600 dark:text-gray-400 truncate">📊 Business strategy planning</p>
              <span className="text-xs text-gray-400">15 minutes ago</span>
            </motion.div>
            <motion.div 
              whileHover={{ scale: 1.02 }}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-all"
            >
              <p className="text-xs text-gray-600 dark:text-gray-400 truncate">🏕️ Camping gear checklist</p>
              <span className="text-xs text-gray-400">1 hour ago</span>
            </motion.div>
          </div>
        </div>

        {/* System Status */}
        <div className="pt-3 border-t border-gray-200 dark:border-gray-600">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500 dark:text-gray-400">System Status</span>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span className="text-green-600 dark:text-green-400 font-medium">Online</span>
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-400">
            Version 2.0.0 • {new Date().toLocaleDateString()}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Sidebar;