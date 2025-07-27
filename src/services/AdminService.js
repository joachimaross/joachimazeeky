import { auth, db } from '../firebase-config';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';

class AdminService {
  constructor() {
    this.adminEmails = [
      'joachimaross@gmail.com',
      'joachima.ross.jr@gmail.com',
      'admin@zeeky.ai',
      'joachima@zeeky.ai'
    ];
    this.superAdminEmail = 'joachimaross@gmail.com';
  }

  // Check if current user is admin
  async isAdmin(user = null) {
    try {
      const currentUser = user || auth.currentUser;
      if (!currentUser) return false;

      // Check if email is in admin list
      const isAdminEmail = this.adminEmails.includes(currentUser.email?.toLowerCase());
      
      // Check custom claims
      const idTokenResult = await currentUser.getIdTokenResult();
      const isAdminClaim = idTokenResult.claims.admin === true;
      const isSuperAdmin = idTokenResult.claims.superAdmin === true;

      return isAdminEmail || isAdminClaim || isSuperAdmin;
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }

  // Check if current user is super admin (Joachima Ross Jr)
  async isSuperAdmin(user = null) {
    try {
      const currentUser = user || auth.currentUser;
      if (!currentUser) return false;

      // Check if it's the super admin email
      const isSuperAdminEmail = currentUser.email?.toLowerCase() === this.superAdminEmail;
      
      // Check custom claims
      const idTokenResult = await currentUser.getIdTokenResult();
      const isSuperAdminClaim = idTokenResult.claims.superAdmin === true;

      return isSuperAdminEmail || isSuperAdminClaim;
    } catch (error) {
      console.error('Error checking super admin status:', error);
      return false;
    }
  }

  // Get admin profile with full privileges
  async getAdminProfile(userId = null) {
    try {
      const currentUser = auth.currentUser;
      const targetUserId = userId || currentUser?.uid;
      
      if (!targetUserId) throw new Error('No user ID provided');

      // Verify admin access
      const hasAdminAccess = await this.isAdmin();
      if (!hasAdminAccess) {
        throw new Error('Unauthorized: Admin access required');
      }

      const userDoc = await getDoc(doc(db, 'users', targetUserId));
      const adminDoc = await getDoc(doc(db, 'admin_profiles', targetUserId));

      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      const userProfile = userDoc.data();
      const adminProfile = adminDoc.exists() ? adminDoc.data() : {};

      return {
        ...userProfile,
        ...adminProfile,
        isAdmin: true,
        isSuperAdmin: await this.isSuperAdmin(),
        adminLevel: await this.getAdminLevel(),
        permissions: await this.getAdminPermissions(),
        lastAdminAccess: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting admin profile:', error);
      throw error;
    }
  }

  // Get admin access level
  async getAdminLevel() {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return 0;

      const isSuperAdmin = await this.isSuperAdmin();
      if (isSuperAdmin) return 10; // Highest level

      const isAdmin = await this.isAdmin();
      if (isAdmin) return 5; // Standard admin level

      return 0; // No admin access
    } catch (error) {
      console.error('Error getting admin level:', error);
      return 0;
    }
  }

  // Get admin permissions
  async getAdminPermissions() {
    try {
      const adminLevel = await this.getAdminLevel();
      const isSuperAdmin = await this.isSuperAdmin();

      const permissions = {
        // Basic admin permissions (level 5+)
        viewUsers: adminLevel >= 5,
        editUsers: adminLevel >= 5,
        viewAnalytics: adminLevel >= 5,
        manageContent: adminLevel >= 5,
        viewLogs: adminLevel >= 5,

        // Advanced admin permissions (level 8+)
        manageAdmins: adminLevel >= 8,
        systemSettings: adminLevel >= 8,
        manageIntegrations: adminLevel >= 8,

        // Super admin permissions (level 10)
        fullSystemAccess: isSuperAdmin,
        manageFirebase: isSuperAdmin,
        viewAllData: isSuperAdmin,
        deleteUsers: isSuperAdmin,
        manageBackend: isSuperAdmin,
        enterpriseControls: isSuperAdmin,
        securitySettings: isSuperAdmin,
        billingAccess: isSuperAdmin,
        deploymentControls: isSuperAdmin
      };

      return permissions;
    } catch (error) {
      console.error('Error getting admin permissions:', error);
      return {};
    }
  }

  // Initialize admin profile for Joachima Ross Jr
  async initializeJoachimaAdmin() {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('User must be authenticated');
      }

      // Check if this is Joachima's email
      const isJoachima = this.adminEmails.includes(currentUser.email?.toLowerCase());
      
      if (!isJoachima) {
        throw new Error('Unauthorized: This function is only for Joachima Ross Jr');
      }

      // Create/update admin profile
      const adminProfile = {
        uid: currentUser.uid,
        email: currentUser.email,
        displayName: 'Joachima Ross Jr',
        role: 'Super Administrator',
        adminLevel: 10,
        isSuperAdmin: true,
        permissions: {
          fullSystemAccess: true,
          manageFirebase: true,
          viewAllData: true,
          deleteUsers: true,
          manageBackend: true,
          enterpriseControls: true,
          securitySettings: true,
          billingAccess: true,
          deploymentControls: true,
          manageAdmins: true,
          systemSettings: true,
          manageIntegrations: true,
          viewUsers: true,
          editUsers: true,
          viewAnalytics: true,
          manageContent: true,
          viewLogs: true
        },
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        adminNotes: 'Primary system administrator and owner',
        securityClearance: 'ULTRA',
        twoFactorEnabled: true
      };

      // Save to admin_profiles collection
      await setDoc(doc(db, 'admin_profiles', currentUser.uid), adminProfile, { merge: true });

      // Update user profile with admin flags
      await setDoc(doc(db, 'users', currentUser.uid), {
        isAdmin: true,
        isSuperAdmin: true,
        adminLevel: 10,
        lastAdminAccess: new Date().toISOString()
      }, { merge: true });

      // Log admin initialization
      await this.logAdminAction('admin_profile_initialized', {
        targetUser: currentUser.uid,
        adminLevel: 10,
        permissions: Object.keys(adminProfile.permissions)
      });

      return adminProfile;
    } catch (error) {
      console.error('Error initializing Joachima admin profile:', error);
      throw error;
    }
  }

  // Get all admin users
  async getAllAdmins() {
    try {
      const hasPermission = await this.hasPermission('viewUsers');
      if (!hasPermission) {
        throw new Error('Unauthorized: Insufficient permissions');
      }

      const adminsQuery = query(
        collection(db, 'admin_profiles')
      );

      const querySnapshot = await getDocs(adminsQuery);
      const admins = [];

      querySnapshot.forEach((doc) => {
        admins.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return admins.sort((a, b) => b.adminLevel - a.adminLevel);
    } catch (error) {
      console.error('Error getting all admins:', error);
      throw error;
    }
  }

  // Check specific permission
  async hasPermission(permission) {
    try {
      const permissions = await this.getAdminPermissions();
      return permissions[permission] === true;
    } catch (error) {
      console.error('Error checking permission:', error);
      return false;
    }
  }

  // Log admin actions for audit trail
  async logAdminAction(action, details = {}) {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const logEntry = {
        userId: currentUser.uid,
        email: currentUser.email,
        action,
        details,
        timestamp: new Date().toISOString(),
        ip: await this.getUserIP(),
        userAgent: navigator.userAgent
      };

      await setDoc(doc(collection(db, 'admin_logs')), logEntry);
    } catch (error) {
      console.error('Error logging admin action:', error);
    }
  }

  // Get user's IP address
  async getUserIP() {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      return 'unknown';
    }
  }

  // Admin panel navigation permissions
  getAdminNavigation() {
    return {
      dashboard: { 
        label: 'Admin Dashboard', 
        path: '/admin', 
        permission: 'viewAnalytics',
        icon: '📊' 
      },
      users: { 
        label: 'User Management', 
        path: '/admin/users', 
        permission: 'viewUsers',
        icon: '👥' 
      },
      analytics: { 
        label: 'Analytics', 
        path: '/admin/analytics', 
        permission: 'viewAnalytics',
        icon: '📈' 
      },
      logs: { 
        label: 'System Logs', 
        path: '/admin/logs', 
        permission: 'viewLogs',
        icon: '📋' 
      },
      settings: { 
        label: 'System Settings', 
        path: '/admin/settings', 
        permission: 'systemSettings',
        icon: '⚙️' 
      },
      security: { 
        label: 'Security Center', 
        path: '/admin/security', 
        permission: 'securitySettings',
        icon: '🔒' 
      },
      integrations: { 
        label: 'Integrations', 
        path: '/admin/integrations', 
        permission: 'manageIntegrations',
        icon: '🔌' 
      },
      backend: { 
        label: 'Backend Controls', 
        path: '/admin/backend', 
        permission: 'manageBackend',
        icon: '🖥️' 
      },
      enterprise: { 
        label: 'Enterprise Controls', 
        path: '/admin/enterprise', 
        permission: 'enterpriseControls',
        icon: '🏢' 
      }
    };
  }
}

// Create singleton instance
const adminService = new AdminService();

export default adminService;