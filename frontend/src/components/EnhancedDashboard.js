import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Enhanced Live Tile Components
const LiveTile = ({ id, type, title, data, size, onAction, onResize }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(null);

  const getTileContent = () => {
    switch (type) {
      case 'chat':
        return <ChatTile data={data} onAction={onAction} />;
      case 'weather':
        return <WeatherTile data={data} onAction={onAction} />;
      case 'calendar':
        return <CalendarTile data={data} onAction={onAction} />;
      case 'music':
        return <MusicTile data={data} onAction={onAction} />;
      case 'fitness':
        return <FitnessTile data={data} onAction={onAction} />;
      case 'news':
        return <NewsTile data={data} onAction={onAction} />;
      case 'files':
        return <FilesTile data={data} onAction={onAction} />;
      case 'voice':
        return <VoiceTile data={data} onAction={onAction} />;
      case 'avatar':
        return <AvatarTile data={data} onAction={onAction} />;
      case 'analytics':
        return <AnalyticsTile data={data} onAction={onAction} />;
      case 'social':
        return <SocialTile data={data} onAction={onAction} />;
      case 'tasks':
        return <TasksTile data={data} onAction={onAction} />;
      default:
        return <DefaultTile data={data} onAction={onAction} />;
    }
  };

  const refreshTile = useCallback(async () => {
    setIsLoading(true);
    try {
      await onAction('refresh', { tileId: id });
    } catch (error) {
      console.error(`Error refreshing tile ${id}:`, error);
    } finally {
      setIsLoading(false);
    }
  }, [id, onAction]);

  useEffect(() => {
    // Auto-refresh for certain tile types
    const autoRefreshTypes = ['weather', 'news', 'calendar', 'analytics', 'social'];
    if (autoRefreshTypes.includes(type)) {
      const interval = setInterval(refreshTile, 60000); // Refresh every minute
      setRefreshInterval(interval);
      return () => {
        if (interval) clearInterval(interval);
      };
    }
  }, [type, refreshTile]);

  return (
    <motion.div
      className={`live-tile ${type}-tile relative overflow-hidden rounded-lg shadow-lg bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 hover:border-blue-500 transition-all duration-300`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      style={{ height: '100%', minHeight: '200px' }}
    >
      {/* Tile Header */}
      <div className="tile-header flex items-center justify-between p-3 bg-black bg-opacity-20 backdrop-blur-sm">
        <h3 className="text-white font-semibold text-sm truncate">{title}</h3>
        <div className="flex items-center space-x-1">
          {isLoading && (
            <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
          )}
          <button
            onClick={refreshTile}
            className="p-1 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
            disabled={isLoading}
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 0 0 4.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 0 1-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <button
            onClick={() => onAction('expand', { tileId: id })}
            className="p-1 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Tile Content */}
      <div className="tile-content p-3 h-full">
        {getTileContent()}
      </div>

      {/* Real-time indicator */}
      <div className="absolute top-2 right-2">
        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
      </div>
    </motion.div>
  );
};

// Individual Tile Components
const ChatTile = ({ data, onAction }) => (
  <div className="h-full flex flex-col">
    <div className="flex-1 overflow-y-auto mb-3">
      {data?.messages?.slice(-3).map((msg, idx) => (
        <div key={idx} className={`mb-2 p-2 rounded text-sm ${
          msg.role === 'user' ? 'bg-blue-600 text-white ml-4' : 'bg-gray-700 text-gray-200 mr-4'
        }`}>
          {msg.content}
        </div>
      )) || <div className="text-gray-400 text-center">No recent messages</div>}
    </div>
    <button
      onClick={() => onAction('openChat')}
      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded transition-colors"
    >
      Open Chat
    </button>
  </div>
);

const WeatherTile = ({ data, onAction }) => (
  <div className="h-full flex flex-col items-center justify-center text-center">
    <div className="text-4xl mb-2">{data?.icon || '🌤️'}</div>
    <div className="text-2xl font-bold text-white mb-1">{data?.temperature || '22°C'}</div>
    <div className="text-sm text-gray-300 mb-1">{data?.condition || 'Clear'}</div>
    <div className="text-xs text-gray-400">{data?.location || 'Toronto, ON'}</div>
    <div className="mt-3 text-xs text-gray-400">
      H: {data?.high || '25°'} L: {data?.low || '18°'}
    </div>
  </div>
);

const CalendarTile = ({ data, onAction }) => (
  <div className="h-full">
    <div className="text-center mb-3">
      <div className="text-lg font-bold text-white">{new Date().getDate()}</div>
      <div className="text-xs text-gray-300">{new Date().toLocaleDateString('en', { month: 'short' })}</div>
    </div>
    <div className="space-y-2">
      {data?.events?.slice(0, 3).map((event, idx) => (
        <div key={idx} className="text-xs bg-gray-700 p-2 rounded">
          <div className="font-semibold text-white truncate">{event.title}</div>
          <div className="text-gray-400">{event.time}</div>
        </div>
      )) || (
        <div className="text-gray-400 text-center text-sm">No upcoming events</div>
      )}
    </div>
    <button
      onClick={() => onAction('openCalendar')}
      className="w-full mt-3 bg-green-600 hover:bg-green-700 text-white py-1 px-2 rounded text-xs transition-colors"
    >
      View Calendar
    </button>
  </div>
);

const MusicTile = ({ data, onAction }) => (
  <div className="h-full flex flex-col">
    <div className="flex-1">
      {data?.currentTrack ? (
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-600 rounded-lg mx-auto mb-2 flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
            </svg>
          </div>
          <div className="text-sm font-semibold text-white truncate">{data.currentTrack.title}</div>
          <div className="text-xs text-gray-400 truncate">{data.currentTrack.artist}</div>
        </div>
      ) : (
        <div className="text-center text-gray-400">No music playing</div>
      )}
    </div>
    <div className="flex justify-center space-x-2 mt-3">
      <button onClick={() => onAction('previousTrack')} className="p-2 hover:bg-gray-700 rounded">
        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
        </svg>
      </button>
      <button onClick={() => onAction('togglePlay')} className="p-2 hover:bg-gray-700 rounded">
        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d={data?.isPlaying ? "M6 19h4V5H6v14zm8-14v14h4V5h-4z" : "M8 5v14l11-7z"}/>
        </svg>
      </button>
      <button onClick={() => onAction('nextTrack')} className="p-2 hover:bg-gray-700 rounded">
        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
        </svg>
      </button>
    </div>
  </div>
);

const FitnessTile = ({ data, onAction }) => (
  <div className="h-full flex flex-col">
    <div className="text-center mb-3">
      <div className="text-2xl font-bold text-white">{data?.steps || '8,432'}</div>
      <div className="text-xs text-gray-400">steps today</div>
    </div>
    <div className="flex justify-around text-center mb-3">
      <div>
        <div className="text-sm font-semibold text-white">{data?.calories || '312'}</div>
        <div className="text-xs text-gray-400">cal</div>
      </div>
      <div>
        <div className="text-sm font-semibold text-white">{data?.distance || '4.2'}</div>
        <div className="text-xs text-gray-400">km</div>
      </div>
    </div>
    <div className="flex-1">
      <div className="bg-gray-700 rounded-full h-2 mb-2">
        <div 
          className="bg-green-500 h-2 rounded-full transition-all duration-500"
          style={{ width: `${Math.min((data?.steps || 8432) / 10000 * 100, 100)}%` }}
        ></div>
      </div>
      <div className="text-xs text-gray-400 text-center">Goal: 10,000 steps</div>
    </div>
  </div>
);

const NewsTile = ({ data, onAction }) => (
  <div className="h-full">
    <div className="space-y-2">
      {data?.articles?.slice(0, 2).map((article, idx) => (
        <div key={idx} className="bg-gray-700 p-2 rounded cursor-pointer hover:bg-gray-600 transition-colors"
             onClick={() => onAction('openArticle', { url: article.url })}>
          <div className="text-xs font-semibold text-white line-clamp-2">{article.title}</div>
          <div className="text-xs text-gray-400 mt-1">{article.source}</div>
        </div>
      )) || (
        <div className="text-gray-400 text-center text-sm">Loading news...</div>
      )}
    </div>
  </div>
);

const FilesTile = ({ data, onAction }) => (
  <div className="h-full">
    <div className="space-y-2">
      {data?.recentFiles?.slice(0, 3).map((file, idx) => (
        <div key={idx} className="flex items-center space-x-2 bg-gray-700 p-2 rounded cursor-pointer hover:bg-gray-600 transition-colors"
             onClick={() => onAction('openFile', { file })}>
          <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-white truncate">{file.name}</div>
            <div className="text-xs text-gray-400">{file.size}</div>
          </div>
        </div>
      )) || (
        <div className="text-gray-400 text-center text-sm">No recent files</div>
      )}
    </div>
    <button
      onClick={() => onAction('uploadFile')}
      className="w-full mt-3 bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded text-xs transition-colors"
    >
      Upload File
    </button>
  </div>
);

const VoiceTile = ({ data, onAction }) => {
  const [isListening, setIsListening] = useState(false);

  const toggleVoice = () => {
    setIsListening(!isListening);
    onAction('toggleVoice', { isListening: !isListening });
  };

  return (
    <div className="h-full flex flex-col items-center justify-center">
      <button
        onClick={toggleVoice}
        className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 transition-all duration-300 ${
          isListening 
            ? 'bg-red-600 hover:bg-red-700 animate-pulse' 
            : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12,2A3,3 0 0,1 15,5V11A3,3 0 0,1 12,14A3,3 0 0,1 9,11V5A3,3 0 0,1 12,2M19,11C19,14.53 16.39,17.44 13,17.93V21H11V17.93C7.61,17.44 5,14.53 5,11H7A5,5 0 0,0 12,16A5,5 0 0,0 17,11H19Z" />
        </svg>
      </button>
      <div className="text-center">
        <div className="text-sm font-semibold text-white">
          {isListening ? 'Listening...' : 'Voice Assistant'}
        </div>
        <div className="text-xs text-gray-400 mt-1">
          {data?.lastCommand || 'Say "Hey Zeeky" to start'}
        </div>
      </div>
    </div>
  );
};

const AvatarTile = ({ data, onAction }) => (
  <div className="h-full flex flex-col items-center justify-center">
    <div className="relative">
      <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center mb-3">
        <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12,2A2,2 0 0,1 14,4C14,4.74 13.6,5.39 13,5.73V7A1,1 0 0,1 12,8A1,1 0 0,1 11,7V5.73C10.4,5.39 10,4.74 10,4A2,2 0 0,1 12,2M21,9V7H15L13.5,7.5C13.1,7.66 12.7,7.5 12.5,7.1C12.3,6.7 12.46,6.3 12.86,6.1L15,5A1,1 0 0,1 16,6V7H19V9A1,1 0 0,1 20,10A1,1 0 0,1 21,9M7.5,8C7.5,8.83 8.17,9.5 9,9.5H11V16A2,2 0 0,0 13,18H15V20A2,2 0 0,1 13,22H11A2,2 0 0,1 9,20V18H7A2,2 0 0,1 5,16V10C5,9.17 5.67,8.5 6.5,8.5H7.5V8Z" />
        </svg>
      </div>
      <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-gray-800 flex items-center justify-center">
        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
      </div>
    </div>
    <div className="text-center">
      <div className="text-sm font-semibold text-white">Zeeky AI</div>
      <div className="text-xs text-gray-400">{data?.status || 'Online'}</div>
    </div>
    <button
      onClick={() => onAction('openAvatar')}
      className="mt-3 bg-purple-600 hover:bg-purple-700 text-white py-1 px-3 rounded text-xs transition-colors"
    >
      Interact
    </button>
  </div>
);

const AnalyticsTile = ({ data, onAction }) => (
  <div className="h-full">
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-xs text-gray-400">Usage Today</span>
        <span className="text-sm font-semibold text-white">{data?.todayUsage || '2.4h'}</span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-xs text-gray-400">Queries</span>
        <span className="text-sm font-semibold text-white">{data?.queries || '47'}</span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-xs text-gray-400">Efficiency</span>
        <span className="text-sm font-semibold text-green-400">{data?.efficiency || '94%'}</span>
      </div>
    </div>
    <div className="mt-4">
      <div className="flex justify-between text-xs text-gray-400 mb-1">
        <span>Weekly Goal</span>
        <span>{data?.weeklyProgress || '68%'}</span>
      </div>
      <div className="bg-gray-700 rounded-full h-2">
        <div 
          className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
          style={{ width: `${data?.weeklyProgress || 68}%` }}
        ></div>
      </div>
    </div>
  </div>
);

const SocialTile = ({ data, onAction }) => (
  <div className="h-full">
    <div className="space-y-2">
      {data?.posts?.slice(0, 2).map((post, idx) => (
        <div key={idx} className="bg-gray-700 p-2 rounded">
          <div className="flex items-center space-x-2 mb-1">
            <div className="w-6 h-6 bg-blue-600 rounded-full"></div>
            <span className="text-xs font-semibold text-white">{post.user}</span>
          </div>
          <div className="text-xs text-gray-300 line-clamp-2">{post.content}</div>
        </div>
      )) || (
        <div className="text-gray-400 text-center text-sm">No recent posts</div>
      )}
    </div>
    <button
      onClick={() => onAction('openSocial')}
      className="w-full mt-3 bg-pink-600 hover:bg-pink-700 text-white py-1 px-2 rounded text-xs transition-colors"
    >
      View Feed
    </button>
  </div>
);

const TasksTile = ({ data, onAction }) => (
  <div className="h-full">
    <div className="space-y-2">
      {data?.tasks?.slice(0, 3).map((task, idx) => (
        <div key={idx} className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={task.completed}
            onChange={() => onAction('toggleTask', { taskId: task.id })}
            className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
          />
          <span className={`text-xs flex-1 ${task.completed ? 'line-through text-gray-500' : 'text-white'}`}>
            {task.title}
          </span>
        </div>
      )) || (
        <div className="text-gray-400 text-center text-sm">No tasks</div>
      )}
    </div>
    <button
      onClick={() => onAction('addTask')}
      className="w-full mt-3 bg-orange-600 hover:bg-orange-700 text-white py-1 px-2 rounded text-xs transition-colors"
    >
      Add Task
    </button>
  </div>
);

const DefaultTile = ({ data, onAction }) => (
  <div className="h-full flex items-center justify-center">
    <div className="text-center">
      <div className="text-4xl mb-2">🔧</div>
      <div className="text-sm text-gray-400">Custom Tile</div>
      <button
        onClick={() => onAction('configure')}
        className="mt-2 bg-gray-600 hover:bg-gray-700 text-white py-1 px-3 rounded text-xs transition-colors"
      >
        Configure
      </button>
    </div>
  </div>
);

// Main Enhanced Dashboard Component
const EnhancedDashboard = () => {
  const [tiles, setTiles] = useState([
    { id: 'chat', type: 'chat', title: 'AI Chat', x: 0, y: 0, w: 2, h: 2 },
    { id: 'weather', type: 'weather', title: 'Weather', x: 2, y: 0, w: 1, h: 1 },
    { id: 'calendar', type: 'calendar', title: 'Calendar', x: 3, y: 0, w: 1, h: 2 },
    { id: 'music', type: 'music', title: 'Music', x: 0, y: 2, w: 2, h: 1 },
    { id: 'fitness', type: 'fitness', title: 'Fitness', x: 2, y: 1, w: 1, h: 1 },
    { id: 'news', type: 'news', title: 'News', x: 0, y: 3, w: 2, h: 1 },
    { id: 'files', type: 'files', title: 'Files', x: 2, y: 2, w: 1, h: 1 },
    { id: 'voice', type: 'voice', title: 'Voice', x: 3, y: 2, w: 1, h: 1 },
    { id: 'avatar', type: 'avatar', title: 'Zeeky Avatar', x: 0, y: 4, w: 1, h: 1 },
    { id: 'analytics', type: 'analytics', title: 'Analytics', x: 1, y: 4, w: 1, h: 1 },
    { id: 'social', type: 'social', title: 'Social', x: 2, y: 3, w: 1, h: 1 },
    { id: 'tasks', type: 'tasks', title: 'Tasks', x: 3, y: 3, w: 1, h: 1 }
  ]);

  const [tileData, setTileData] = useState({
    chat: { messages: [] },
    weather: { temperature: '22°C', condition: 'Clear', icon: '☀️', high: '25°', low: '18°', location: 'Toronto, ON' },
    calendar: { events: [] },
    music: { currentTrack: null, isPlaying: false },
    fitness: { steps: 8432, calories: 312, distance: 4.2 },
    news: { articles: [] },
    files: { recentFiles: [] },
    voice: { lastCommand: null },
    avatar: { status: 'Online' },
    analytics: { todayUsage: '2.4h', queries: 47, efficiency: '94%', weeklyProgress: 68 },
    social: { posts: [] },
    tasks: { tasks: [] }
  });

  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedTile, setSelectedTile] = useState(null);

  // Load initial data
  useEffect(() => {
    loadTileData();
  }, []);

  const loadTileData = async () => {
    try {
      // Load data for each tile type
      await Promise.all([
        loadWeatherData(),
        loadCalendarData(),
        loadNewsData(),
        loadFilesData(),
        loadSocialData(),
        loadTasksData()
      ]);
    } catch (error) {
      console.error('Error loading tile data:', error);
    }
  };

  const loadWeatherData = async () => {
    try {
      // Mock weather data - integrate with actual weather API
      const weatherData = {
        temperature: '22°C',
        condition: 'Partly Cloudy',
        icon: '⛅',
        high: '25°',
        low: '18°',
        location: 'Toronto, ON'
      };
      setTileData(prev => ({ ...prev, weather: weatherData }));
    } catch (error) {
      console.error('Error loading weather data:', error);
    }
  };

  const loadCalendarData = async () => {
    try {
      // Mock calendar data - integrate with actual calendar API
      const calendarData = {
        events: [
          { title: 'Team Meeting', time: '10:00 AM' },
          { title: 'Lunch with Client', time: '12:30 PM' },
          { title: 'Code Review', time: '3:00 PM' }
        ]
      };
      setTileData(prev => ({ ...prev, calendar: calendarData }));
    } catch (error) {
      console.error('Error loading calendar data:', error);
    }
  };

  const loadNewsData = async () => {
    try {
      // Mock news data - integrate with actual news API
      const newsData = {
        articles: [
          { title: 'AI Technology Breakthrough in Healthcare', source: 'Tech News', url: '#' },
          { title: 'Climate Change Summit Begins Tomorrow', source: 'World News', url: '#' }
        ]
      };
      setTileData(prev => ({ ...prev, news: newsData }));
    } catch (error) {
      console.error('Error loading news data:', error);
    }
  };

  const loadFilesData = async () => {
    try {
      // Mock files data - integrate with actual file system
      const filesData = {
        recentFiles: [
          { name: 'Project Report.pdf', size: '2.4 MB' },
          { name: 'Meeting Notes.docx', size: '1.1 MB' },
          { name: 'Budget.xlsx', size: '856 KB' }
        ]
      };
      setTileData(prev => ({ ...prev, files: filesData }));
    } catch (error) {
      console.error('Error loading files data:', error);
    }
  };

  const loadSocialData = async () => {
    try {
      // Mock social data - integrate with actual social APIs
      const socialData = {
        posts: [
          { user: 'John Doe', content: 'Just launched our new AI feature! 🚀' },
          { user: 'Jane Smith', content: 'Great meeting today, excited for the next steps.' }
        ]
      };
      setTileData(prev => ({ ...prev, social: socialData }));
    } catch (error) {
      console.error('Error loading social data:', error);
    }
  };

  const loadTasksData = async () => {
    try {
      // Mock tasks data - integrate with actual task management
      const tasksData = {
        tasks: [
          { id: 1, title: 'Review pull requests', completed: false },
          { id: 2, title: 'Update documentation', completed: true },
          { id: 3, title: 'Plan sprint meeting', completed: false }
        ]
      };
      setTileData(prev => ({ ...prev, tasks: tasksData }));
    } catch (error) {
      console.error('Error loading tasks data:', error);
    }
  };

  const handleTileAction = useCallback(async (action, params) => {
    const { tileId } = params || {};
    
    switch (action) {
      case 'refresh':
        await refreshTileData(tileId);
        break;
      case 'expand':
        setSelectedTile(tileId);
        break;
      case 'openChat':
        // Navigate to chat interface
        window.location.href = '/chat';
        break;
      case 'openCalendar':
        // Open calendar interface
        console.log('Opening calendar...');
        break;
      case 'togglePlay':
        setTileData(prev => ({
          ...prev,
          music: { ...prev.music, isPlaying: !prev.music.isPlaying }
        }));
        break;
      case 'toggleVoice':
        // Handle voice toggle
        console.log('Voice toggled:', params.isListening);
        break;
      case 'toggleTask':
        setTileData(prev => ({
          ...prev,
          tasks: {
            ...prev.tasks,
            tasks: prev.tasks.tasks.map(task =>
              task.id === params.taskId 
                ? { ...task, completed: !task.completed }
                : task
            )
          }
        }));
        break;
      case 'uploadFile':
        // Handle file upload
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.multiple = true;
        fileInput.onchange = (e) => {
          const files = Array.from(e.target.files);
          console.log('Files selected:', files);
          // Process files here
        };
        fileInput.click();
        break;
      default:
        console.log('Unhandled action:', action, params);
    }
  }, []);

  const refreshTileData = async (tileId) => {
    switch (tileId) {
      case 'weather':
        await loadWeatherData();
        break;
      case 'calendar':
        await loadCalendarData();
        break;
      case 'news':
        await loadNewsData();
        break;
      case 'files':
        await loadFilesData();
        break;
      case 'social':
        await loadSocialData();
        break;
      case 'tasks':
        await loadTasksData();
        break;
      default:
        console.log('Refreshing tile:', tileId);
    }
  };

  // Simplified grid management without react-grid-layout
  const handleTileReorder = (dragIndex, dropIndex) => {
    const draggedTile = tiles[dragIndex];
    const remainingTiles = tiles.filter((_, index) => index !== dragIndex);
    const newTiles = [
      ...remainingTiles.slice(0, dropIndex),
      draggedTile,
      ...remainingTiles.slice(dropIndex)
    ];
    setTiles(newTiles);
  };

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      {/* Dashboard Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Zeeky AI Dashboard</h1>
          <p className="text-gray-400">Your intelligent assistant workspace</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsEditMode(!isEditMode)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              isEditMode 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
            }`}
          >
            {isEditMode ? 'Exit Edit' : 'Edit Layout'}
          </button>
          <button
            onClick={loadTileData}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
          >
            Refresh All
          </button>
        </div>
      </div>

      {/* Simplified Responsive Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-min">
        {tiles.map((tile, index) => (
          <motion.div
            key={tile.id}
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className={`
              ${tile.type === 'chat' ? 'md:col-span-2 md:row-span-2' : ''}
              ${tile.type === 'calendar' ? 'md:row-span-2' : ''}
              ${tile.type === 'news' ? 'md:col-span-2' : ''}
              ${tile.type === 'files' ? 'lg:col-span-2' : ''}
            `}
            style={{ minHeight: '200px' }}
          >
            <LiveTile
              id={tile.id}
              type={tile.type}
              title={tile.title}
              data={tileData[tile.id]}
              onAction={handleTileAction}
            />
          </motion.div>
        ))}
      </div>

      {/* Tile Expansion Modal */}
      <AnimatePresence>
        {selectedTile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedTile(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">
                  {tiles.find(t => t.id === selectedTile)?.title}
                </h2>
                <button
                  onClick={() => setSelectedTile(null)}
                  className="text-gray-400 hover:text-white"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="text-gray-300">
                Expanded view for {selectedTile} tile would go here...
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EnhancedDashboard;