import React from 'react';
import EnhancedDashboard from './EnhancedDashboard';

const Dashboard = ({ sidebarOpen, onToggleSidebar, onSwitchToChat, user }) => {
  return (
    <EnhancedDashboard 
      user={user}
      onSwitchToChat={onSwitchToChat}
    />
  );
};

export default Dashboard;