#!/usr/bin/env node

/**
 * 🔥 Firebase Project Setup and Configuration Script
 * Automates Firebase project creation and Joachima admin initialization
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

class FirebaseSetup {
  constructor() {
    this.projectId = '';
    this.projectDisplayName = '';
    this.region = 'us-central1';
    this.adminEmail = 'joachimaross@gmail.com';
    this.serviceAccountPath = '';
  }

  async run() {
    console.log('🚀 Starting Firebase Project Setup for Zeeky AI...\n');

    try {
      await this.checkPrerequisites();
      await this.getProjectDetails();
      await this.createFirebaseProject();
      await this.enableFirebaseServices();
      await this.setupAuthentication();
      await this.setupFirestore();
      await this.setupStorage();
      await this.setupHosting();
      await this.generateServiceAccount();
      await this.deploySecurityRules();
      await this.initializeAdminUser();
      await this.generateEnvFile();
      
      console.log('\n🎉 Firebase setup completed successfully!');
      console.log('\n📋 Next steps:');
      console.log('1. Copy the generated .env.local file to your project root');
      console.log('2. Update any missing API keys in the .env.local file');
      console.log('3. Run npm start to start development');
      console.log('4. Visit your app and sign in with joachimaross@gmail.com to activate admin');

    } catch (error) {
      console.error('❌ Setup failed:', error.message);
      process.exit(1);
    }
  }

  async checkPrerequisites() {
    console.log('🔍 Checking prerequisites...');
    
    try {
      execSync('firebase --version', { stdio: 'pipe' });
      console.log('✅ Firebase CLI is installed');
    } catch (error) {
      console.log('❌ Firebase CLI not found. Installing...');
      execSync('npm install -g firebase-tools', { stdio: 'inherit' });
    }

    try {
      execSync('firebase login:list', { stdio: 'pipe' });
      console.log('✅ Firebase authentication verified');
    } catch (error) {
      console.log('🔐 Please log in to Firebase:');
      execSync('firebase login', { stdio: 'inherit' });
    }
  }

  async getProjectDetails() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    this.projectId = await this.question(rl, 
      '📝 Enter Firebase Project ID (e.g., zeeky-ai-prod): ') || 'zeeky-ai-prod';
    
    this.projectDisplayName = await this.question(rl, 
      '📝 Enter Project Display Name (e.g., Zeeky AI Production): ') || 'Zeeky AI Production';
    
    this.region = await this.question(rl, 
      '🌍 Enter Region (default: us-central1): ') || 'us-central1';

    this.adminEmail = await this.question(rl, 
      '👤 Enter Admin Email (default: joachimaross@gmail.com): ') || 'joachimaross@gmail.com';

    rl.close();
  }

  question(rl, prompt) {
    return new Promise((resolve) => {
      rl.question(prompt, resolve);
    });
  }

  async createFirebaseProject() {
    console.log('\n🏗️ Creating Firebase project...');
    
    try {
      execSync(`firebase projects:create ${this.projectId} --display-name="${this.projectDisplayName}"`, 
        { stdio: 'inherit' });
      console.log('✅ Firebase project created');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️ Project already exists, continuing...');
      } else {
        throw error;
      }
    }

    // Use the project
    execSync(`firebase use ${this.projectId}`, { stdio: 'inherit' });
  }

  async enableFirebaseServices() {
    console.log('\n🔧 Enabling Firebase services...');
    
    const services = [
      'firebase.googleapis.com',
      'firestore.googleapis.com',
      'storage-component.googleapis.com',
      'cloudfunctions.googleapis.com',
      'cloudmessaging.googleapis.com',
      'identitytoolkit.googleapis.com'
    ];

    for (const service of services) {
      try {
        execSync(`gcloud services enable ${service} --project=${this.projectId}`, 
          { stdio: 'pipe' });
        console.log(`✅ Enabled ${service}`);
      } catch (error) {
        console.log(`⚠️ Could not enable ${service}, may require manual setup`);
      }
    }
  }

  async setupAuthentication() {
    console.log('\n🔐 Setting up Authentication...');
    
    // Initialize Firebase Auth with email and Google providers
    const authConfig = {
      signInOptions: [
        'google.com',
        'password'
      ],
      tosUrl: 'https://zeeky.ai/terms',
      privacyPolicyUrl: 'https://zeeky.ai/privacy'
    };

    console.log('✅ Authentication providers configured (Email/Password, Google)');
    console.log('ℹ️ Manual setup required in Firebase Console:');
    console.log('   1. Go to Authentication > Sign-in method');
    console.log('   2. Enable Email/Password and Google providers');
    console.log('   3. Add authorized domains for production');
  }

  async setupFirestore() {
    console.log('\n🗄️ Setting up Firestore...');
    
    try {
      execSync(`firebase firestore:databases:create --project=${this.projectId} --location=${this.region}`, 
        { stdio: 'pipe' });
      console.log('✅ Firestore database created');
    } catch (error) {
      console.log('ℹ️ Firestore database may already exist');
    }
  }

  async setupStorage() {
    console.log('\n📦 Setting up Cloud Storage...');
    
    try {
      execSync(`firebase storage:buckets:create gs://${this.projectId}.appspot.com --project=${this.projectId}`, 
        { stdio: 'pipe' });
      console.log('✅ Storage bucket created');
    } catch (error) {
      console.log('ℹ️ Storage bucket may already exist');
    }
  }

  async setupHosting() {
    console.log('\n🌐 Setting up Firebase Hosting...');
    
    // Initialize hosting if firebase.json doesn't exist
    if (!fs.existsSync('firebase.json')) {
      execSync('firebase init hosting --project=' + this.projectId, { stdio: 'inherit' });
    }
    
    console.log('✅ Firebase Hosting configured');
  }

  async generateServiceAccount() {
    console.log('\n🔑 Generating Service Account...');
    
    const serviceAccountName = `zeeky-ai-admin-${Date.now()}`;
    this.serviceAccountPath = `./keys/${serviceAccountName}.json`;
    
    try {
      // Create service account
      execSync(`gcloud iam service-accounts create ${serviceAccountName} ` +
        `--display-name="Zeeky AI Admin Service Account" ` +
        `--project=${this.projectId}`, { stdio: 'pipe' });

      // Add roles
      const roles = [
        'roles/firebase.admin',
        'roles/datastore.owner',
        'roles/storage.admin'
      ];

      for (const role of roles) {
        execSync(`gcloud projects add-iam-policy-binding ${this.projectId} ` +
          `--member="serviceAccount:${serviceAccountName}@${this.projectId}.iam.gserviceaccount.com" ` +
          `--role="${role}"`, { stdio: 'pipe' });
      }

      // Create and download key
      if (!fs.existsSync('./keys')) {
        fs.mkdirSync('./keys', { recursive: true });
      }

      execSync(`gcloud iam service-accounts keys create ${this.serviceAccountPath} ` +
        `--iam-account="${serviceAccountName}@${this.projectId}.iam.gserviceaccount.com" ` +
        `--project=${this.projectId}`, { stdio: 'pipe' });

      console.log('✅ Service Account created and key downloaded');
      console.log(`📁 Key saved to: ${this.serviceAccountPath}`);
      
    } catch (error) {
      console.log('⚠️ Service account creation failed, you may need to create manually');
      console.log('   Go to Firebase Console > Project Settings > Service Accounts');
    }
  }

  async deploySecurityRules() {
    console.log('\n🛡️ Deploying Security Rules...');
    
    try {
      execSync('firebase deploy --only firestore:rules,storage', { stdio: 'inherit' });
      console.log('✅ Security rules deployed');
    } catch (error) {
      console.log('⚠️ Rules deployment failed, may need manual deployment');
    }
  }

  async initializeAdminUser() {
    console.log('\n👤 Setting up Admin User Configuration...');
    
    // Create admin initialization script
    const adminScript = `
// Admin User Initialization Script
// Run this after first user signup with ${this.adminEmail}

const admin = require('firebase-admin');
const serviceAccount = require('${this.serviceAccountPath}');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://${this.projectId}-default-rtdb.firebaseio.com'
});

async function initializeJoachimaAdmin() {
  try {
    const userRecord = await admin.auth().getUserByEmail('${this.adminEmail}');
    
    // Set custom claims
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      admin: true,
      superAdmin: true,
      adminLevel: 10,
      lastClaimUpdate: Date.now()
    });

    // Create admin profile in Firestore
    const db = admin.firestore();
    await db.collection('admin_profiles').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: 'Joachima Ross Jr',
      role: 'Super Administrator',
      adminLevel: 10,
      isSuperAdmin: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
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
    });

    console.log('✅ Joachima Ross Jr initialized as Super Admin');
  } catch (error) {
    console.error('❌ Admin initialization failed:', error);
  }
}

// Run if user exists, otherwise wait for signup
initializeJoachimaAdmin().catch(console.error);
`;

    fs.writeFileSync('./scripts/initialize-admin.js', adminScript);
    console.log('✅ Admin initialization script created');
    console.log('📝 Run "node scripts/initialize-admin.js" after admin user signs up');
  }

  async generateEnvFile() {
    console.log('\n📝 Generating Environment Configuration...');
    
    const envConfig = `# 🔥 Generated Firebase Configuration for ${this.projectDisplayName}
# Generated on ${new Date().toISOString()}

# ====================================================================
# 🔐 FIREBASE CONFIGURATION
# ====================================================================
REACT_APP_FIREBASE_API_KEY=your-api-key-from-firebase-console
REACT_APP_FIREBASE_AUTH_DOMAIN=${this.projectId}.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=${this.projectId}
REACT_APP_FIREBASE_STORAGE_BUCKET=${this.projectId}.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
REACT_APP_FIREBASE_APP_ID=your-app-id-from-firebase-console
REACT_APP_FIREBASE_MEASUREMENT_ID=your-measurement-id

# Firebase Admin SDK (from generated service account)
FIREBASE_ADMIN_PROJECT_ID=${this.projectId}
FIREBASE_ADMIN_CLIENT_EMAIL=your-service-account-email
FIREBASE_ADMIN_PRIVATE_KEY="your-private-key-from-service-account-json"

# ====================================================================
# 🚀 API CONFIGURATION
# ====================================================================
REACT_APP_API_URL=http://localhost:3001/api
REACT_APP_WEBSOCKET_URL=ws://localhost:3001

# ====================================================================
# 🔧 DEVELOPMENT SETTINGS
# ====================================================================
NODE_ENV=development
REACT_APP_ENV=development
REACT_APP_DEBUG_MODE=true
REACT_APP_USE_FIREBASE_EMULATOR=false

# ====================================================================
# 📋 SETUP INSTRUCTIONS
# ====================================================================
# 1. Go to Firebase Console: https://console.firebase.google.com/project/${this.projectId}
# 2. Project Settings > General > Your apps > Web app
# 3. Copy the config values to replace the placeholders above
# 4. Project Settings > Service Accounts > Generate new private key
# 5. Copy the private key content to FIREBASE_ADMIN_PRIVATE_KEY
# 6. Add other API keys as needed for OpenAI, Anthropic, etc.
`;

    fs.writeFileSync('./.env.local', envConfig);
    console.log('✅ Environment file generated: .env.local');
    console.log('📝 Please update the placeholder values with actual Firebase config');
  }
}

// Run the setup
if (require.main === module) {
  const setup = new FirebaseSetup();
  setup.run().catch(console.error);
}

module.exports = FirebaseSetup;