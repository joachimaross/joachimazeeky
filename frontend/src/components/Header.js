import React from 'react';
import { FiMenu, FiSettings, FiSun, FiMoon } from 'react-icons/fi';
import { useTheme } from '../context/ThemeContext';

const Header = ({ onMenuToggle }) => {
  const { isDarkMode, toggleTheme } = useTheme();

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
        <button className="text-2xl hover:text-blue-500">
          <FiSettings />
        </button>
        <img src="https://i.pravatar.cc/40" alt="Profile" className="w-10 h-10 rounded-full" />
      </div>
    </header>
  );
};

export default Header;