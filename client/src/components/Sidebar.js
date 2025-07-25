import React from 'react';
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
  FiCompass
} from 'react-icons/fi';

const Sidebar = ({ onToggle, onThemeToggle, darkMode, onNavigate, activeSection }) => {
  const menuItems = [
    { icon: FiMessageCircle, label: 'AI Chat', id: 'chat', active: activeSection === 'chat' },
    { icon: FiMusic, label: 'Music Lab', id: 'music', active: activeSection === 'music' },
    { icon: FiVideo, label: 'Video Lab', id: 'video', active: activeSection === 'video' },
    { icon: FiCalendar, label: 'Calendar', id: 'calendar', active: activeSection === 'calendar' },
    { icon: FiFileText, label: 'Notes & Tasks', id: 'notes', active: activeSection === 'notes' },
    { icon: FiRss, label: 'News/Live Feeds', id: 'news', active: activeSection === 'news' },
    { icon: FiBriefcase, label: 'Business Tools', id: 'business', active: activeSection === 'business' },
    { icon: FiTrendingUp, label: 'Fitness Tracker', id: 'fitness', active: activeSection === 'fitness' },
    { icon: FiMapPin, label: 'Maps & Travel', id: 'maps', active: activeSection === 'maps' },
    { icon: FiShoppingCart, label: 'Shopping Assistant', id: 'shopping', active: activeSection === 'shopping' },
    { icon: FiCompass, label: 'Survival Guide', id: 'survival', active: activeSection === 'survival' },
    { icon: FiSettings, label: 'Settings', id: 'settings', active: activeSection === 'settings' },
  ];

  const handleNavigation = (sectionId) => {
    if (onNavigate) {
      onNavigate(sectionId);
    }
  };

  return (
    <div className="w-72 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Zeeky AI</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">All-in-One Assistant</p>
        </div>
        <button
          onClick={onToggle}
          className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
        >
          <FiX size={18} />
        </button>
      </div>

      {/* Quick Actions */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex space-x-2 mb-3">
          <button
            onClick={onThemeToggle}
            className="flex-1 flex items-center justify-center space-x-2 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            {darkMode ? <FiSun size={16} /> : <FiMoon size={16} />}
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {darkMode ? 'Light' : 'Dark'}
            </span>
          </button>
          <button className="flex-1 flex items-center justify-center space-x-2 p-2 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors">
            <FiFolderOpen size={16} />
            <span className="text-sm">Files</span>
          </button>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.label}>
                <button
                  className={`w-full flex items-center space-x-3 p-3 rounded-lg text-left transition-all ${
                    item.active
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <Icon size={18} />
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Recent Conversations */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Recent Chats</h3>
        <div className="space-y-2">
          <div className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
            <p className="text-xs text-gray-600 dark:text-gray-400 truncate">Music recommendations for workout</p>
          </div>
          <div className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
            <p className="text-xs text-gray-600 dark:text-gray-400 truncate">Business strategy planning</p>
          </div>
          <div className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
            <p className="text-xs text-gray-600 dark:text-gray-400 truncate">Camping gear checklist</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;