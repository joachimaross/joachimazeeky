import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiUser, FiShield, FiSettings, FiActivity, FiAlertCircle, FiLock } from 'react-icons/fi';
import AdminService from '../services/AdminService';
import ErrorReportingService from '../services/ErrorReportingService';
import NotificationService from '../services/NotificationService';
import PerformanceService from '../services/PerformanceService';

const AdminDashboard = () => {
  const [adminProfile, setAdminProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [permissions, setPermissions] = useState({});
  const [systemStats, setSystemStats] = useState({});
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    initializeAdminDashboard();
  }, []);

  const initializeAdminDashboard = async () => {
    try {
      setIsLoading(true);

      // Check if user is admin
      const isAdmin = await AdminService.isAdmin();
      if (!isAdmin) {
        throw new Error('Unauthorized: Admin access required');
      }

      // Get admin profile
      const profile = await AdminService.getAdminProfile();
      setAdminProfile(profile);

      // Get permissions
      const userPermissions = await AdminService.getAdminPermissions();
      setPermissions(userPermissions);

      // Initialize Joachima as super admin if needed
      if (profile.email?.toLowerCase() === 'joachimaross@gmail.com') {
        await AdminService.initializeJoachimaAdmin();
      }

      // Get system statistics
      const stats = await getSystemStatistics();
      setSystemStats(stats);

      // Log admin access
      await AdminService.logAdminAction('admin_dashboard_accessed');

    } catch (error) {
      console.error('Failed to initialize admin dashboard:', error);
      NotificationService.sendSecurityAlert(
        'Unauthorized Admin Access Attempt',
        'Someone attempted to access the admin dashboard without proper permissions',
        { error: error.message }
      );
    } finally {
      setIsLoading(false);
    }
  };

  const getSystemStatistics = async () => {
    const performanceReport = PerformanceService.getPerformanceReport();
    const errorStats = await ErrorReportingService.getErrorStatistics();
    
    return {
      performance: performanceReport,
      errors: errorStats,
      uptime: Date.now() - (window.performance?.timing?.navigationStart || 0),
      memoryUsage: PerformanceService.monitorMemoryUsage(),
      networkInfo: PerformanceService.monitorNetworkConditions?.() || {}
    };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading Admin Dashboard...</p>
        </div>
      </div>
    );
  }

  if (!adminProfile) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <FiLock className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-400">You don't have permission to access the admin dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <FiShield className="w-8 h-8 text-blue-500" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Admin Dashboard
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Welcome back, {adminProfile.displayName}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {adminProfile.role}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Level {adminProfile.adminLevel} Access
                </p>
              </div>
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">
                  {adminProfile.displayName?.charAt(0) || 'A'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: FiActivity },
              { id: 'users', label: 'Users', icon: FiUser },
              { id: 'security', label: 'Security', icon: FiShield },
              { id: 'system', label: 'System', icon: FiSettings },
              { id: 'alerts', label: 'Alerts', icon: FiAlertCircle }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <OverviewTab 
            adminProfile={adminProfile} 
            permissions={permissions}
            systemStats={systemStats}
          />
        )}
        
        {activeTab === 'users' && permissions.viewUsers && (
          <UsersTab permissions={permissions} />
        )}
        
        {activeTab === 'security' && permissions.securitySettings && (
          <SecurityTab permissions={permissions} />
        )}
        
        {activeTab === 'system' && permissions.systemSettings && (
          <SystemTab systemStats={systemStats} />
        )}
        
        {activeTab === 'alerts' && permissions.viewLogs && (
          <AlertsTab />
        )}
      </div>
    </div>
  );
};

// Overview Tab Component
const OverviewTab = ({ adminProfile, permissions, systemStats }) => (
  <div className="space-y-6">
    {/* Welcome Section */}
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white"
    >
      <h2 className="text-2xl font-bold mb-2">
        Welcome, {adminProfile.displayName}! 👋
      </h2>
      <p className="text-blue-100">
        You have {adminProfile.isSuperAdmin ? 'full system access' : 'admin privileges'} 
        to manage Zeeky AI platform.
      </p>
    </motion.div>

    {/* Quick Stats */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        title="System Performance"
        value={`${systemStats.performance?.score || 0}%`}
        icon="📊"
        color="green"
      />
      <StatCard
        title="Active Users"
        value="2,847"
        icon="👥"
        color="blue"
      />
      <StatCard
        title="Error Rate"
        value="0.2%"
        icon="⚠️"
        color="yellow"
      />
      <StatCard
        title="Uptime"
        value="99.9%"
        icon="🚀"
        color="green"
      />
    </div>

    {/* Admin Capabilities */}
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Your Admin Capabilities
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Object.entries(permissions).map(([permission, granted]) => (
          <div
            key={permission}
            className={`p-3 rounded-lg border ${
              granted
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-gray-50 border-gray-200 text-gray-500'
            }`}
          >
            <div className="flex items-center space-x-2">
              <span className={granted ? '✅' : '❌'} />
              <span className="text-sm font-medium capitalize">
                {permission.replace(/([A-Z])/g, ' $1').trim()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Stat Card Component
const StatCard = ({ title, value, icon, color }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm"
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
          {title}
        </p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">
          {value}
        </p>
      </div>
      <div className="text-2xl">{icon}</div>
    </div>
  </motion.div>
);

// Users Tab Component
const UsersTab = ({ permissions }) => (
  <div className="space-y-6">
    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
      User Management
    </h2>
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
      <p className="text-gray-600 dark:text-gray-400">
        User management interface coming soon...
      </p>
    </div>
  </div>
);

// Security Tab Component
const SecurityTab = ({ permissions }) => (
  <div className="space-y-6">
    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
      Security Center
    </h2>
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
      <p className="text-gray-600 dark:text-gray-400">
        Security monitoring and controls coming soon...
      </p>
    </div>
  </div>
);

// System Tab Component
const SystemTab = ({ systemStats }) => (
  <div className="space-y-6">
    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
      System Management
    </h2>
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
      <h3 className="text-lg font-semibold mb-4">Performance Metrics</h3>
      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>Performance Score</span>
            <span>{systemStats.performance?.score || 0}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full" 
              style={{ width: `${systemStats.performance?.score || 0}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Alerts Tab Component
const AlertsTab = () => (
  <div className="space-y-6">
    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
      System Alerts
    </h2>
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
      <p className="text-gray-600 dark:text-gray-400">
        Alert monitoring interface coming soon...
      </p>
    </div>
  </div>
);

export default AdminDashboard;