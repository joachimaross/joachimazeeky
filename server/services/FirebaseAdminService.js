const admin = require('firebase-admin');

class FirebaseAdminService {
  constructor() {
    this.isInitialized = false;
    this.init();
  }

  init() {
    try {
      if (!admin.apps.length) {
        const serviceAccount = {
          type: "service_account",
          project_id: process.env.FIREBASE_ADMIN_PROJECT_ID,
          private_key_id: process.env.FIREBASE_ADMIN_PRIVATE_KEY_ID,
          private_key: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          client_email: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
          client_id: process.env.FIREBASE_ADMIN_CLIENT_ID,
          auth_uri: "https://accounts.google.com/o/oauth2/auth",
          token_uri: "https://oauth2.googleapis.com/token",
          auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
          client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_ADMIN_CLIENT_EMAIL}`
        };

        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          databaseURL: `https://${process.env.FIREBASE_ADMIN_PROJECT_ID}-default-rtdb.firebaseio.com/`,
          storageBucket: `${process.env.FIREBASE_ADMIN_PROJECT_ID}.appspot.com`
        });

        this.isInitialized = true;
        console.log('✅ Firebase Admin SDK initialized successfully');
      }
    } catch (error) {
      console.error('❌ Firebase Admin SDK initialization failed:', error);
      this.isInitialized = false;
    }
  }

  // Set custom claims for admin users
  async setAdminClaims(uid, adminLevel = 5, isSuperAdmin = false) {
    try {
      if (!this.isInitialized) {
        throw new Error('Firebase Admin SDK not initialized');
      }

      const customClaims = {
        admin: true,
        adminLevel,
        superAdmin: isSuperAdmin,
        lastClaimUpdate: Date.now()
      };

      await admin.auth().setCustomUserClaims(uid, customClaims);
      
      console.log(`✅ Admin claims set for user ${uid}:`, customClaims);
      return true;
    } catch (error) {
      console.error('❌ Error setting admin claims:', error);
      throw error;
    }
  }

  // Initialize Joachima Ross Jr as super admin
  async initializeJoachimaAsAdmin(email = 'joachimaross@gmail.com') {
    try {
      if (!this.isInitialized) {
        throw new Error('Firebase Admin SDK not initialized');
      }

      // Find user by email
      const userRecord = await admin.auth().getUserByEmail(email);
      
      // Set super admin claims
      await this.setAdminClaims(userRecord.uid, 10, true);

      // Update user profile in Firestore
      const db = admin.firestore();
      await db.collection('admin_profiles').doc(userRecord.uid).set({
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: 'Joachima Ross Jr',
        role: 'Super Administrator',
        adminLevel: 10,
        isSuperAdmin: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        permissions: {
          fullSystemAccess: true,
          manageFirebase: true,
          viewAllData: true,
          deleteUsers: true,
          manageBackend: true,
          enterpriseControls: true,
          securitySettings: true,
          billingAccess: true,
          deploymentControls: true
        }
      }, { merge: true });

      console.log(`✅ Joachima Ross Jr initialized as Super Admin: ${userRecord.uid}`);
      return userRecord;
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        console.log(`ℹ️ User ${email} not found. They need to sign up first.`);
        return null;
      }
      console.error('❌ Error initializing Joachima as admin:', error);
      throw error;
    }
  }

  // Get user custom claims
  async getUserClaims(uid) {
    try {
      if (!this.isInitialized) {
        throw new Error('Firebase Admin SDK not initialized');
      }

      const userRecord = await admin.auth().getUser(uid);
      return userRecord.customClaims || {};
    } catch (error) {
      console.error('❌ Error getting user claims:', error);
      throw error;
    }
  }

  // Remove admin access
  async removeAdminClaims(uid) {
    try {
      if (!this.isInitialized) {
        throw new Error('Firebase Admin SDK not initialized');
      }

      await admin.auth().setCustomUserClaims(uid, {
        admin: false,
        adminLevel: 0,
        superAdmin: false,
        lastClaimUpdate: Date.now()
      });

      console.log(`✅ Admin claims removed for user ${uid}`);
      return true;
    } catch (error) {
      console.error('❌ Error removing admin claims:', error);
      throw error;
    }
  }

  // List all admin users
  async listAdminUsers() {
    try {
      if (!this.isInitialized) {
        throw new Error('Firebase Admin SDK not initialized');
      }

      const adminUsers = [];
      let nextPageToken;

      do {
        const listUsersResult = await admin.auth().listUsers(1000, nextPageToken);
        
        listUsersResult.users.forEach((userRecord) => {
          if (userRecord.customClaims?.admin) {
            adminUsers.push({
              uid: userRecord.uid,
              email: userRecord.email,
              displayName: userRecord.displayName,
              adminLevel: userRecord.customClaims.adminLevel || 0,
              isSuperAdmin: userRecord.customClaims.superAdmin || false,
              lastSignIn: userRecord.metadata.lastSignInTime,
              creationTime: userRecord.metadata.creationTime
            });
          }
        });

        nextPageToken = listUsersResult.pageToken;
      } while (nextPageToken);

      return adminUsers.sort((a, b) => b.adminLevel - a.adminLevel);
    } catch (error) {
      console.error('❌ Error listing admin users:', error);
      throw error;
    }
  }

  // Send admin notification
  async sendAdminNotification(title, body, data = {}) {
    try {
      if (!this.isInitialized) {
        throw new Error('Firebase Admin SDK not initialized');
      }

      const adminUsers = await this.listAdminUsers();
      const tokens = [];

      // Get FCM tokens for admin users
      const db = admin.firestore();
      for (const admin of adminUsers) {
        const userDoc = await db.collection('users').doc(admin.uid).get();
        if (userDoc.exists && userDoc.data().fcmToken) {
          tokens.push(userDoc.data().fcmToken);
        }
      }

      if (tokens.length === 0) {
        console.log('ℹ️ No admin FCM tokens found');
        return;
      }

      const message = {
        notification: {
          title,
          body
        },
        data: {
          type: 'admin_notification',
          ...data
        },
        tokens
      };

      const response = await admin.messaging().sendMulticast(message);
      console.log(`✅ Admin notification sent to ${response.successCount} admins`);
      
      return response;
    } catch (error) {
      console.error('❌ Error sending admin notification:', error);
      throw error;
    }
  }

  // Verify ID token and check admin status
  async verifyAdminToken(idToken) {
    try {
      if (!this.isInitialized) {
        throw new Error('Firebase Admin SDK not initialized');
      }

      const decodedToken = await admin.auth().verifyIdToken(idToken);
      
      return {
        uid: decodedToken.uid,
        email: decodedToken.email,
        isAdmin: decodedToken.admin === true,
        adminLevel: decodedToken.adminLevel || 0,
        isSuperAdmin: decodedToken.superAdmin === true
      };
    } catch (error) {
      console.error('❌ Error verifying admin token:', error);
      throw error;
    }
  }

  // Create audit log entry
  async createAuditLog(adminUid, action, details = {}) {
    try {
      if (!this.isInitialized) {
        throw new Error('Firebase Admin SDK not initialized');
      }

      const db = admin.firestore();
      const logEntry = {
        adminUid,
        action,
        details,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        ip: details.ip || 'unknown',
        userAgent: details.userAgent || 'unknown'
      };

      await db.collection('audit_logs').add(logEntry);
      console.log(`✅ Audit log created: ${action} by ${adminUid}`);
    } catch (error) {
      console.error('❌ Error creating audit log:', error);
    }
  }

  // Get Firestore instance
  getFirestore() {
    if (!this.isInitialized) {
      throw new Error('Firebase Admin SDK not initialized');
    }
    return admin.firestore();
  }

  // Get Auth instance
  getAuth() {
    if (!this.isInitialized) {
      throw new Error('Firebase Admin SDK not initialized');
    }
    return admin.auth();
  }

  // Get Storage instance
  getStorage() {
    if (!this.isInitialized) {
      throw new Error('Firebase Admin SDK not initialized');
    }
    return admin.storage();
  }

  // Get Messaging instance
  getMessaging() {
    if (!this.isInitialized) {
      throw new Error('Firebase Admin SDK not initialized');
    }
    return admin.messaging();
  }
}

// Export singleton instance
const firebaseAdminService = new FirebaseAdminService();
module.exports = firebaseAdminService;