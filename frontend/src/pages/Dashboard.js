import React, { useState } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

import Header from '../components/Header';
import ChatBar from '../components/ChatBar';
import LiveTile from '../components/LiveTile';
import ChatHistory from '../components/ChatHistory';
import useWebSocket from '../hooks/useWebSocket';

const ResponsiveGridLayout = WidthProvider(Responsive);

const Dashboard = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(true);
  // Connect to the WebSocket server
  const { messages, sendMessage } = useWebSocket('ws://localhost:8080');

  // Example layout definition for the grid
  const layout = [
    { i: 'chat', x: 0, y: 0, w: 8, h: 5, minW: 4, minH: 3 },
    { i: 'news', x: 8, y: 0, w: 4, h: 2, minW: 2, minH: 2 },
    { i: 'calendar', x: 8, y: 2, w: 4, h: 3, minW: 2, minH: 3 },
  ];

  const tileComponents = {
    chat: { title: 'Zeeky Chat' },
    news: { title: 'News Feed' },
    calendar: { title: 'Calendar' },
  };

  return (
    <div className="flex flex-col h-screen font-sans">
      <Header onMenuToggle={() => setIsMenuOpen(!isMenuOpen)} />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Left Side Panel would go here, toggled by isMenuOpen */}
        {isMenuOpen && (
          <aside className="w-64 bg-gray-100 dark:bg-gray-800 p-4 overflow-y-auto">
            <h2 className="font-bold text-lg mb-4">Tools & Features</h2>
            {/* Menu items go here */}
            <ul>
                <li className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md cursor-pointer">Productivity</li>
                <li className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md cursor-pointer">Media</li>
                <li className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md cursor-pointer">Learning</li>
            </ul>
          </aside>
        )}

        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4">
            <ResponsiveGridLayout className="layout" layouts={{ lg: layout }}
              breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
              cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
              rowHeight={100}>
              {layout.map(item => {
                const tileInfo = tileComponents[item.i];
                return (
                  <div key={item.i} className="bg-gray-100 dark:bg-gray-800 rounded-lg shadow-md">
                    <LiveTile title={tileInfo?.title || 'Module'}>
                      {item.i === 'chat' && <ChatHistory messages={messages} />}
                    </LiveTile>
                  </div>
                );
              })}
            </ResponsiveGridLayout>
          </div>
          <ChatBar onSendMessage={sendMessage} />
        </main>
      </div>
    </div>
  );
};

export default Dashboard;