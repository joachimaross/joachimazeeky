#!/usr/bin/env node

/**
 * 👤 Joachima Ross Jr Admin Initialization Script
 * Safely initializes super admin privileges for the platform owner
 */

const admin = require('firebase-admin');
const readline = require('readline');
const fs = require('fs');

class AdminInitializer {
  constructor() {
    this.adminEmails = [
      'joachimaross@gmail.com',
      'joachima.ross.jr@gmail.com', 
      'admin@zeeky.ai',
      'joachima@zeeky.ai'
    ];
    this.serviceAccountPath = null;
    this.projectId = null;
    this.isInitialized = false;
  }

  async run() {
    console.log('👤 Joachima Ross Jr Admin Initialization\n');
    console.log('🔐 This script will grant super admin privileges to Joachima Ross Jr');
    console.log('⚠️  Only run this after the admin user has signed up on the platform\n');

    try {
      await this.getConfiguration();
      await this.initializeFirebase();
      await this.findAndInitializeAdmin();
      await this.verifyAdminSetup();
      
      console.log('\n🎉 Admin initialization completed successfully!');
      console.log('\n📋 Joachima Ross Jr now has:');
      console.log('• Level 10 Super Admin Access');
      console.log('• Full Firebase Management Rights');
      console.log('• Complete Backend Control');
      console.log('• All Enterprise Features');
      console.log('• Security & Compliance Controls');

    } catch (error) {
      console.error('\n❌ Admin initialization failed:', error.message);
      process.exit(1);
    }
  }

  async getConfiguration() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    // Get service account path
    this.serviceAccountPath = await this.question(rl, 
      '📁 Enter path to Firebase service account JSON file: ');
    
    if (!fs.existsSync(this.serviceAccountPath)) {
      throw new Error('Service account file not found!');
    }

    // Get project ID
    this.projectId = await this.question(rl, 
      '🏗️ Enter Firebase Project ID: ');

    rl.close();

    console.log('\n✅ Configuration loaded');
  }

  question(rl, prompt) {
    return new Promise((resolve) => {
      rl.question(prompt, resolve);
    });
  }

  async initializeFirebase() {
    try {
      const serviceAccount = require(this.serviceAccountPath);
      
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: `https://${this.projectId}-default-rtdb.firebaseio.com/`,
        storageBucket: `${this.projectId}.appspot.com`
      });

      this.isInitialized = true;
      console.log('✅ Firebase Admin SDK initialized');
    } catch (error) {
      throw new Error(`Firebase initialization failed: ${error.message}`);
    }
  }

  async findAndInitializeAdmin() {
    console.log('\n🔍 Searching for admin user...');

    for (const email of this.adminEmails) {
      try {
        console.log(`   Checking ${email}...`);
        const userRecord = await admin.auth().getUserByEmail(email);
        
        if (userRecord) {
          console.log(`✅ Found user: ${email}`);
          await this.setupSuperAdmin(userRecord);
          return;
        }
      } catch (error) {
        if (error.code === 'auth/user-not-found') {
          console.log(`   ⚪ ${email} - Not found`);
          continue;
        } else {
          console.error(`   ❌ ${email} - Error: ${error.message}`);
        }
      }
    }

    throw new Error('No admin user found! Please ensure Joachima has signed up first.');
  }

  async setupSuperAdmin(userRecord) {
    console.log('\n🚀 Setting up super admin privileges...');

    try {
      // Set custom claims for maximum admin access
      const customClaims = {
        admin: true,
        superAdmin: true,
        adminLevel: 10,
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
        lastClaimUpdate: Date.now(),
        initializedBy: 'admin-initialization-script',
        initializedAt: new Date().toISOString()
      };

      await admin.auth().setCustomUserClaims(userRecord.uid, customClaims);
      console.log('✅ Custom claims set');

      // Create comprehensive admin profile in Firestore
      const adminProfile = {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName || 'Joachima Ross Jr',
        role: 'Super Administrator & Platform Owner',
        adminLevel: 10,
        isSuperAdmin: true,
        isOwner: true,
        permissions: customClaims.permissions,
        
        // Security & Audit
        securityClearance: 'ULTRA',
        twoFactorEnabled: false, // Will be prompted to enable
        lastLogin: null,
        loginCount: 0,
        
        // Administrative Details
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        initializedAt: admin.firestore.FieldValue.serverTimestamp(),
        adminNotes: 'Primary system administrator, platform owner, and super user with unrestricted access.',
        
        // Contact & Profile
        title: 'Chief Executive Officer & Founder',
        department: 'Executive',
        location: 'Global',
        timezone: 'America/New_York',
        
        // Platform Control
        canCreateAdmins: true,
        canDeleteAdmins: true,
        canModifySystem: true,
        canAccessFinancials: true,
        canManageInfrastructure: true,
        
        // Emergency Access
        emergencyContact: true,
        backupAccess: true,
        disasterRecoveryAccess: true
      };

      const db = admin.firestore();
      await db.collection('admin_profiles').doc(userRecord.uid).set(adminProfile, { merge: true });
      console.log('✅ Admin profile created in Firestore');

      // Add to users collection with admin flags
      await db.collection('users').doc(userRecord.uid).set({
        isAdmin: true,
        isSuperAdmin: true,
        isOwner: true,
        adminLevel: 10,
        lastAdminAccess: admin.firestore.FieldValue.serverTimestamp(),
        adminInitialized: true
      }, { merge: true });
      console.log('✅ User profile updated with admin flags');

      // Create audit log entry
      await db.collection('admin_logs').add({
        adminId: userRecord.uid,
        action: 'super_admin_initialized',
        details: {
          email: userRecord.email,
          adminLevel: 10,
          permissions: Object.keys(customClaims.permissions),
          initializedBy: 'system',
          method: 'admin-initialization-script'
        },
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        severity: 'critical',
        category: 'admin_management'
      });
      console.log('✅ Audit log entry created');

      // Create system notification
      await db.collection('system_notifications').add({
        type: 'admin_initialized',
        title: 'Super Admin Initialized',
        message: `Super Admin privileges granted to ${userRecord.email}`,
        details: {
          userId: userRecord.uid,
          email: userRecord.email,
          adminLevel: 10
        },
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        read: false,
        priority: 'high'
      });
      console.log('✅ System notification created');

      console.log(`\n🎯 Super Admin Setup Complete for: ${userRecord.email}`);
      console.log(`   User ID: ${userRecord.uid}`);
      console.log(`   Admin Level: 10 (Maximum)`);
      console.log(`   Permissions: ${Object.keys(customClaims.permissions).length} granted`);

    } catch (error) {
      throw new Error(`Super admin setup failed: ${error.message}`);
    }
  }

  async verifyAdminSetup() {
    console.log('\n🔍 Verifying admin setup...');

    try {
      // Find the admin user again
      let adminUser = null;
      for (const email of this.adminEmails) {
        try {
          adminUser = await admin.auth().getUserByEmail(email);
          if (adminUser) break;
        } catch (error) {
          // Continue searching
        }
      }

      if (!adminUser) {
        throw new Error('Admin user not found during verification');
      }

      // Verify custom claims
      const userRecord = await admin.auth().getUser(adminUser.uid);
      const claims = userRecord.customClaims || {};

      if (!claims.superAdmin || claims.adminLevel !== 10) {
        throw new Error('Custom claims not properly set');
      }
      console.log('✅ Custom claims verified');

      // Verify Firestore profile
      const db = admin.firestore();
      const adminDoc = await db.collection('admin_profiles').doc(adminUser.uid).get();
      
      if (!adminDoc.exists) {
        throw new Error('Admin profile not found in Firestore');
      }

      const adminData = adminDoc.data();
      if (!adminData.isSuperAdmin || adminData.adminLevel !== 10) {
        throw new Error('Admin profile data inconsistent');
      }
      console.log('✅ Firestore profile verified');

      // Check if user can access admin endpoints (simulation)
      console.log('✅ Admin verification completed');

      return true;

    } catch (error) {
      throw new Error(`Admin verification failed: ${error.message}`);
    }
  }

  // Method to revoke admin access (for emergency use)
  async revokeAdminAccess(email) {
    try {
      const userRecord = await admin.auth().getUserByEmail(email);
      
      // Remove custom claims
      await admin.auth().setCustomUserClaims(userRecord.uid, {
        admin: false,
        superAdmin: false,
        adminLevel: 0
      });

      // Update Firestore
      const db = admin.firestore();
      await db.collection('admin_profiles').doc(userRecord.uid).delete();
      
      console.log(`✅ Admin access revoked for ${email}`);
    } catch (error) {
      console.error(`❌ Failed to revoke admin access: ${error.message}`);
    }
  }

  // Method to list all admins
  async listAdmins() {
    try {
      const db = admin.firestore();
      const adminsSnapshot = await db.collection('admin_profiles').get();
      
      console.log('\n👥 Current Admins:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      adminsSnapshot.forEach(doc => {
        const admin = doc.data();
        console.log(`📧 ${admin.email}`);
        console.log(`   Level: ${admin.adminLevel} | Role: ${admin.role}`);
        console.log(`   Super Admin: ${admin.isSuperAdmin ? '✅' : '❌'}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      });

    } catch (error) {
      console.error(`❌ Failed to list admins: ${error.message}`);
    }
  }
}

// Command line interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0] || 'init';

  const initializer = new AdminInitializer();

  switch (command) {
    case 'init':
      initializer.run().catch(console.error);
      break;
    case 'list':
      initializer.listAdmins().catch(console.error);
      break;
    case 'revoke':
      const email = args[1];
      if (!email) {
        console.error('❌ Email required for revoke command');
        process.exit(1);
      }
      initializer.revokeAdminAccess(email).catch(console.error);
      break;
    default:
      console.log('Usage:');
      console.log('  node initialize-admin.js init    - Initialize admin');
      console.log('  node initialize-admin.js list    - List all admins');
      console.log('  node initialize-admin.js revoke <email> - Revoke admin access');
  }
}

module.exports = AdminInitializer;