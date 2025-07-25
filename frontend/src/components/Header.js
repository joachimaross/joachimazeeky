import React, { useState } from 'react';
import { FiMenu, FiSettings, FiSun, FiMoon, FiX } from 'react-icons/fi';
import { useTheme } from '../context/ThemeContext';

const Header = ({ onMenuToggle }) => {
  const { isDarkMode, toggleTheme } = useTheme();
  const [showSettings, setShowSettings] = useState(false);

  return (
    <header className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="flex items-center">
        <button onClick={onMenuToggle} className="mr-4 text-2xl hover:text-blue-500">
          <FiMenu />
        </button>
        <h1 className="text-xl font-bold tracking-wider">ZEEKY AI</h1>
      </div>
      <div className="flex items-center space-x-4">
        <button onClick={toggleTheme} className="text-2xl hover:text-blue-500">
          {isDarkMode ? <FiSun /> : <FiMoon />}
        </button>
        <button 
          onClick={() => setShowSettings(true)} 
          className="text-2xl hover:text-blue-500 transition-colors duration-200"
        >
          <FiSettings />
        </button>
        <img src="https://i.pravatar.cc/40" alt="Profile" className="w-10 h-10 rounded-full" />
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Settings</h2>
              <button 
                onClick={() => setShowSettings(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <FiX size={24} />
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Theme Setting */}
              <div className="flex items-center justify-between">
                <span className="text-gray-700 dark:text-gray-300">Dark Mode</span>
                <button
                  onClick={toggleTheme}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isDarkMode ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isDarkMode ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Voice Settings */}
              <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Voice Settings</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 dark:text-gray-300">Voice Commands</span>
                    <input type="checkbox" defaultChecked className="text-blue-600" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 dark:text-gray-300">Voice Feedback</span>
                    <input type="checkbox" defaultChecked className="text-blue-600" />
                  </div>
                </div>
              </div>

              {/* Notifications */}
              <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Notifications</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 dark:text-gray-300">Desktop Notifications</span>
                    <input type="checkbox" defaultChecked className="text-blue-600" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 dark:text-gray-300">Sound Alerts</span>
                    <input type="checkbox" className="text-blue-600" />
                  </div>
                </div>
              </div>

              {/* Data & Privacy */}
              <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Data & Privacy</h3>
                <div className="space-y-2">
                  <button className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400">
                    Clear Chat History
                  </button>
                  <br />
                  <button className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400">
                    Export Data
                  </button>
                  <br />
                  <button className="text-sm text-red-600 hover:text-red-800 dark:text-red-400">
                    Delete Account
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
              <button
                onClick={() => setShowSettings(false)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;