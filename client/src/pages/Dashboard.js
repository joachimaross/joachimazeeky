import React, { useState } from 'react';
import { FiMenu, FiSun, FiMoon, FiSettings } from 'react-icons/fi';
import LiveTile from '../../../frontend/src/components/LiveTile';

const Dashboard = ({ sidebarOpen, onToggleSidebar }) => {
  const [tiles] = useState([
    { id: 1, title: 'Weather', size: 'small', content: 'Weather content' },
    { id: 2, title: 'Calendar', size: 'medium', content: 'Calendar content' },
    { id: 3, title: 'Music', size: 'large', content: 'Music player' },
    { id: 4, title: 'News', size: 'medium', content: 'Latest news' },
    { id: 5, title: 'Fitness', size: 'small', content: 'Workout tracker' },
    { id: 6, title: 'Notes', size: 'medium', content: 'Quick notes' },
    { id: 7, title: 'Social', size: 'small', content: 'Social media' },
    { id: 8, title: 'Survival Guide', size: 'large', content: 'Outdoor tips' },
  ]);

  const getTileSize = (size) => {
    switch (size) {
      case 'small':
        return 'col-span-1 row-span-1 h-32';
      case 'medium':
        return 'col-span-2 row-span-1 h-32';
      case 'large':
        return 'col-span-2 row-span-2 h-64';
      default:
        return 'col-span-1 row-span-1 h-32';
    }
  };

  const renderTileContent = (tile) => {
    switch (tile.title) {
      case 'Weather':
        return (
          <div className="p-4 text-center">
            <div className="text-2xl mb-2">☀️</div>
            <div className="text-lg font-bold">72°F</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Sunny</div>
          </div>
        );
      case 'Calendar':
        return (
          <div className="p-4">
            <div className="text-sm font-bold mb-2">Today's Events</div>
            <div className="space-y-1">
              <div className="text-xs">10:00 AM - Team Meeting</div>
              <div className="text-xs">2:00 PM - Client Call</div>
            </div>
          </div>
        );
      case 'Music':
        return (
          <div className="p-4 flex flex-col justify-center items-center h-full">
            <div className="text-4xl mb-4">🎵</div>
            <div className="text-sm font-bold">Now Playing</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Spotify Integration</div>
            <div className="flex space-x-2 mt-4">
              <button className="p-2 bg-green-500 text-white rounded-full">⏮</button>
              <button className="p-2 bg-green-500 text-white rounded-full">⏸</button>
              <button className="p-2 bg-green-500 text-white rounded-full">⏭</button>
            </div>
          </div>
        );
      case 'News':
        return (
          <div className="p-4">
            <div className="text-sm font-bold mb-2">Latest News</div>
            <div className="space-y-2">
              <div className="text-xs">Breaking: Tech updates...</div>
              <div className="text-xs">Markets rise 2%...</div>
            </div>
          </div>
        );
      case 'Fitness':
        return (
          <div className="p-4 text-center">
            <div className="text-2xl mb-2">💪</div>
            <div className="text-sm font-bold">8,432</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Steps today</div>
          </div>
        );
      case 'Notes':
        return (
          <div className="p-4">
            <div className="text-sm font-bold mb-2">Quick Notes</div>
            <textarea 
              className="w-full h-16 text-xs bg-transparent border-none resize-none focus:outline-none"
              placeholder="Type your notes here..."
            />
          </div>
        );
      case 'Social':
        return (
          <div className="p-4 text-center">
            <div className="text-xl mb-2">📱</div>
            <div className="text-xs">Auto-posting</div>
            <div className="text-xs text-green-500">Active</div>
          </div>
        );
      case 'Survival Guide':
        return (
          <div className="p-4">
            <div className="text-sm font-bold mb-2">🏕️ Survival Tips</div>
            <div className="space-y-2">
              <div className="text-xs">• Water: 1 gallon/person/day</div>
              <div className="text-xs">• Fire: Tinder, kindling, fuel</div>
              <div className="text-xs">• Shelter: Stay dry & warm</div>
              <div className="text-xs">• Signal: Mirror, whistle, smoke</div>
            </div>
          </div>
        );
      default:
        return <div className="p-4">{tile.content}</div>;
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center space-x-4">
          {!sidebarOpen && (
            <button
              onClick={onToggleSidebar}
              className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <FiMenu size={20} />
            </button>
          )}
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Zeeky AI Dashboard</h1>
        </div>
        <div className="flex items-center space-x-2">
          <button className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <FiSettings size={20} />
          </button>
        </div>
      </div>

      {/* Live Tiles Grid */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="grid grid-cols-4 gap-4 auto-rows-min max-w-6xl mx-auto">
          {tiles.map((tile) => (
            <div
              key={tile.id}
              className={`${getTileSize(tile.size)} bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-200 cursor-pointer`}
            >
              <LiveTile title={tile.title}>
                {renderTileContent(tile)}
              </LiveTile>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;