import React, { useState } from 'react';
import Dashboard from './pages/Dashboard';
import Sidebar from './components/Sidebar';
import Avatar from './components/Avatar';
import SignIn from './components/SignIn';
import ChatBar from './components/ChatBar';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from './firebase';

function App() {
  const [user] = useAuthState(auth);
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleTheme = () => {
    setDarkMode(!darkMode);
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const signOut = () => {
    auth.signOut();
  };

  return (
    <div className={`flex h-screen ${darkMode ? 'dark' : ''}`}>
      {user ? (
        <div className="flex flex-grow bg-gray-50 dark:bg-gray-900 transition-colors">
          {sidebarOpen && <Sidebar onToggle={toggleSidebar} onThemeToggle={toggleTheme} darkMode={darkMode} />}
          <div className="flex-1 flex flex-col">
            <Dashboard sidebarOpen={sidebarOpen} onToggleSidebar={toggleSidebar} />
            <ChatBar />
          </div>
          <div className="fixed bottom-4 right-4 z-50">
            <Avatar />
          </div>
          <button 
            onClick={signOut}
            className="fixed top-4 right-4 z-40 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Sign Out
          </button>
        </div>
      ) : (
        <SignIn />
      )}
    </div>
  );
}

export default App;