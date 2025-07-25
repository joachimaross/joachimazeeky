// Enterprise SSO Manager - SAML 2.0, OpenID Connect, Active Directory Integration
const saml = require('passport-saml');
const passport = require('passport');
const { Strategy: SAMLStrategy } = require('passport-saml');
const { Strategy: OIDCStrategy } = require('passport-azure-ad').OIDCStrategy;
const ldap = require('ldapjs');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const database = require('../../models/database');

class EnterpriseSSO {
  constructor() {
    this.strategies = new Map();
    this.mfaProviders = new Map();
    this.initializeStrategies();
  }

  // Initialize all SSO strategies
  initializeStrategies() {
    this.initializeSAML();
    this.initializeOIDC();
    this.initializeLDAP();
    this.initializeMFA();
  }

  // SAML 2.0 Strategy Configuration
  initializeSAML() {
    const samlStrategy = new SAMLStrategy({
      path: '/auth/saml/callback',
      entryPoint: process.env.SAML_ENTRY_POINT,
      issuer: process.env.SAML_ISSUER || 'zeeky-ai',
      cert: process.env.SAML_CERT,
      privateCert: process.env.SAML_PRIVATE_CERT,
      decryptionPvk: process.env.SAML_DECRYPTION_KEY,
      signatureAlgorithm: 'sha256',
      digestAlgorithm: 'sha256',
      acceptedClockSkewMs: 30000,
      identifierFormat: 'urn:oasis:names:tc:SAML:2.0:nameid-format:persistent',
      validateInResponseTo: true,
      disableRequestedAuthnContext: false,
      authnContext: [
        'urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport',
        'urn:oasis:names:tc:SAML:2.0:ac:classes:X509'
      ],
      forceAuthn: false,
      skipRequestCompression: false,
      authnRequestBinding: 'HTTP-POST',
      additionalParams: {},
      additionalAuthorizeParams: {},
      additionalLogoutParams: {}
    }, async (profile, done) => {
      try {
        const user = await this.processSAMLUser(profile);
        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    });

    passport.use('saml', samlStrategy);
    this.strategies.set('saml', samlStrategy);
  }

  // OpenID Connect Strategy
  initializeOIDC() {
    const oidcStrategy = new OIDCStrategy({
      identityMetadata: process.env.AZURE_AD_METADATA_URL,
      clientID: process.env.AZURE_AD_CLIENT_ID,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
      responseType: 'code id_token',
      responseMode: 'form_post',
      redirectUrl: process.env.AZURE_AD_REDIRECT_URL,
      allowHttpForRedirectUrl: process.env.NODE_ENV !== 'production',
      passReqToCallback: true,
      scope: ['profile', 'offline_access', 'openid', 'email'],
      nonceLifetime: 3600,
      nonceMaxAmount: 5,
      useCookieInsteadOfSession: false,
      cookieEncryptionKeys: [
        { key: process.env.COOKIE_ENCRYPTION_KEY_1, iv: process.env.COOKIE_ENCRYPTION_IV_1 },
        { key: process.env.COOKIE_ENCRYPTION_KEY_2, iv: process.env.COOKIE_ENCRYPTION_IV_2 }
      ],
      clockSkew: 300
    }, async (req, iss, sub, profile, accessToken, refreshToken, done) => {
      try {
        const user = await this.processOIDCUser(profile, accessToken, refreshToken);
        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    });

    passport.use('azuread-openidconnect', oidcStrategy);
    this.strategies.set('oidc', oidcStrategy);
  }

  // LDAP/Active Directory Integration
  initializeLDAP() {
    this.ldapClient = ldap.createClient({
      url: process.env.LDAP_URL || 'ldap://localhost:389',
      bindDN: process.env.LDAP_BIND_DN,
      bindCredentials: process.env.LDAP_BIND_PASSWORD,
      searchBase: process.env.LDAP_SEARCH_BASE,
      searchFilter: process.env.LDAP_SEARCH_FILTER || '(sAMAccountName={{username}})',
      tlsOptions: {
        rejectUnauthorized: process.env.NODE_ENV === 'production'
      },
      timeout: 5000,
      connectTimeout: 10000,
      idleTimeout: 30000,
      reconnect: {
        initialDelay: 100,
        maxDelay: 30000,
        failAfter: 5
      }
    });
  }

  // Multi-Factor Authentication Setup
  initializeMFA() {
    // TOTP (Time-based One-Time Password) Provider
    this.mfaProviders.set('totp', {
      generate: async (userId) => {
        const secret = speakeasy.generateSecret({
          name: `Zeeky AI (${userId})`,
          issuer: 'Zeeky AI Enterprise',
          length: 32
        });

        // Store secret in database
        await database.pgPool.query(`
          INSERT INTO user_mfa (user_id, provider, secret, backup_codes, created_at)
          VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
          ON CONFLICT (user_id, provider) 
          DO UPDATE SET secret = $3, backup_codes = $4, updated_at = CURRENT_TIMESTAMP
        `, [userId, 'totp', secret.base32, this.generateBackupCodes()]);

        // Generate QR code
        const qrCode = await qrcode.toDataURL(secret.otpauth_url);

        return {
          secret: secret.base32,
          qrCode: qrCode,
          manualEntryKey: secret.base32
        };
      },
      verify: async (userId, token) => {
        const result = await database.pgPool.query(
          'SELECT secret FROM user_mfa WHERE user_id = $1 AND provider = $2 AND enabled = true',
          [userId, 'totp']
        );

        if (result.rows.length === 0) {
          throw new Error('TOTP not configured for user');
        }

        const isValid = speakeasy.totp.verify({
          secret: result.rows[0].secret,
          encoding: 'base32',
          token: token,
          window: 2 // Allow 2 time steps tolerance
        });

        return isValid;
      }
    });

    // SMS Provider (placeholder - integrate with Twilio/AWS SNS)
    this.mfaProviders.set('sms', {
      send: async (userId, phoneNumber) => {
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Store code with expiration
        await database.pgPool.query(`
          INSERT INTO user_mfa_codes (user_id, code, expires_at, created_at)
          VALUES ($1, $2, CURRENT_TIMESTAMP + INTERVAL '5 minutes', CURRENT_TIMESTAMP)
        `, [userId, code]);

        // Send SMS (integrate with actual SMS provider)
        console.log(`SMS Code for ${phoneNumber}: ${code}`);
        
        return { success: true };
      },
      verify: async (userId, code) => {
        const result = await database.pgPool.query(`
          SELECT id FROM user_mfa_codes 
          WHERE user_id = $1 AND code = $2 AND expires_at > CURRENT_TIMESTAMP AND used = false
        `, [userId, code]);

        if (result.rows.length === 0) {
          return false;
        }

        // Mark code as used
        await database.pgPool.query(
          'UPDATE user_mfa_codes SET used = true WHERE id = $1',
          [result.rows[0].id]
        );

        return true;
      }
    });

    // Hardware Token Provider (FIDO2/WebAuthn)
    this.mfaProviders.set('webauthn', {
      generateChallenge: async (userId) => {
        const challenge = crypto.randomBytes(32);
        
        await database.pgPool.query(`
          INSERT INTO webauthn_challenges (user_id, challenge, expires_at)
          VALUES ($1, $2, CURRENT_TIMESTAMP + INTERVAL '5 minutes')
        `, [userId, challenge.toString('base64')]);

        return {
          challenge: challenge.toString('base64'),
          timeout: 300000,
          userVerification: 'required'
        };
      },
      verify: async (userId, authenticatorData, clientDataJSON, signature) => {
        // WebAuthn verification logic (implement with @webauthn/server)
        return true; // Placeholder
      }
    });
  }

  // Process SAML user profile
  async processSAMLUser(profile) {
    const email = profile.email || profile.nameID;
    const firstName = profile.firstName || profile.givenName;
    const lastName = profile.lastName || profile.surname;
    const department = profile.department;
    const role = profile.role || 'user';

    // Check if user exists
    let user = await database.getUserByEmail(email);

    if (!user) {
      // Create new user
      user = await database.createUser({
        email: email,
        username: email,
        firstName: firstName,
        lastName: lastName,
        authProvider: 'saml',
        department: department,
        role: role,
        isActive: true,
        lastLogin: new Date()
      });
    } else {
      // Update existing user
      await database.pgPool.query(`
        UPDATE users SET 
          last_login = CURRENT_TIMESTAMP,
          department = $2,
          role = $3,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [user.id, department, role]);
    }

    // Log authentication event
    await database.logEvent(user.id, 'saml_login', {
      provider: 'saml',
      attributes: profile
    });

    return user;
  }

  // Process OIDC user profile
  async processOIDCUser(profile, accessToken, refreshToken) {
    const email = profile._json.email;
    const firstName = profile._json.given_name;
    const lastName = profile._json.family_name;
    const tenantId = profile._json.tid;

    let user = await database.getUserByEmail(email);

    if (!user) {
      user = await database.createUser({
        email: email,
        username: email,
        firstName: firstName,
        lastName: lastName,
        authProvider: 'oidc',
        tenantId: tenantId,
        isActive: true,
        lastLogin: new Date()
      });
    }

    // Store tokens for API access
    await database.pgPool.query(`
      INSERT INTO user_tokens (user_id, provider, access_token, refresh_token, expires_at)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (user_id, provider)
      DO UPDATE SET access_token = $3, refresh_token = $4, expires_at = $5, updated_at = CURRENT_TIMESTAMP
    `, [user.id, 'oidc', accessToken, refreshToken, new Date(Date.now() + 3600000)]);

    await database.logEvent(user.id, 'oidc_login', {
      provider: 'azure_ad',
      tenantId: tenantId
    });

    return user;
  }

  // LDAP Authentication
  async authenticateLDAP(username, password) {
    return new Promise((resolve, reject) => {
      const searchFilter = process.env.LDAP_SEARCH_FILTER.replace('{{username}}', username);
      
      this.ldapClient.search(process.env.LDAP_SEARCH_BASE, {
        filter: searchFilter,
        scope: 'sub',
        attributes: ['mail', 'cn', 'givenName', 'sn', 'department', 'memberOf']
      }, (err, res) => {
        if (err) {
          return reject(err);
        }

        let userDN = null;
        let userAttributes = null;

        res.on('searchEntry', (entry) => {
          userDN = entry.objectName;
          userAttributes = entry.object;
        });

        res.on('error', (err) => {
          reject(err);
        });

        res.on('end', async (result) => {
          if (!userDN) {
            return reject(new Error('User not found in LDAP'));
          }

          // Bind with user credentials
          this.ldapClient.bind(userDN, password, async (bindErr) => {
            if (bindErr) {
              return reject(new Error('Invalid credentials'));
            }

            try {
              // Process LDAP user
              const user = await this.processLDAPUser(userAttributes);
              resolve(user);
            } catch (processErr) {
              reject(processErr);
            }
          });
        });
      });
    });
  }

  // Process LDAP user
  async processLDAPUser(attributes) {
    const email = attributes.mail;
    const firstName = attributes.givenName;
    const lastName = attributes.sn;
    const department = attributes.department;
    const groups = Array.isArray(attributes.memberOf) ? attributes.memberOf : [attributes.memberOf];

    let user = await database.getUserByEmail(email);

    if (!user) {
      user = await database.createUser({
        email: email,
        username: email,
        firstName: firstName,
        lastName: lastName,
        authProvider: 'ldap',
        department: department,
        groups: groups,
        isActive: true,
        lastLogin: new Date()
      });
    }

    await database.logEvent(user.id, 'ldap_login', {
      provider: 'active_directory',
      groups: groups
    });

    return user;
  }

  // Generate backup codes for MFA
  generateBackupCodes() {
    const codes = [];
    for (let i = 0; i < 10; i++) {
      codes.push(Math.random().toString(36).substr(2, 8).toUpperCase());
    }
    return codes;
  }

  // Risk-based authentication
  async assessLoginRisk(userId, request) {
    const ipAddress = request.ip;
    const userAgent = request.get('User-Agent');
    const timestamp = new Date();

    // Get user's login history
    const loginHistory = await database.pgPool.query(`
      SELECT ip_address, user_agent, created_at, location
      FROM user_login_history 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      LIMIT 50
    `, [userId]);

    let riskScore = 0;

    // Check for new IP address
    const knownIPs = loginHistory.rows.map(row => row.ip_address);
    if (!knownIPs.includes(ipAddress)) {
      riskScore += 30;
    }

    // Check for new user agent
    const knownUserAgents = loginHistory.rows.map(row => row.user_agent);
    if (!knownUserAgents.includes(userAgent)) {
      riskScore += 20;
    }

    // Check time-based patterns
    const hour = timestamp.getHours();
    const recentLogins = loginHistory.rows.filter(row => 
      Math.abs(new Date(row.created_at).getHours() - hour) <= 2
    );
    if (recentLogins.length === 0) {
      riskScore += 15;
    }

    // Geographic analysis (placeholder - integrate with IP geolocation service)
    // if (newLocation && distanceFromUsualLocation > 1000km) riskScore += 40;

    // Store login attempt
    await database.pgPool.query(`
      INSERT INTO user_login_history (user_id, ip_address, user_agent, risk_score, created_at)
      VALUES ($1, $2, $3, $4, $5)
    `, [userId, ipAddress, userAgent, riskScore, timestamp]);

    return {
      riskScore: riskScore,
      requiresMFA: riskScore >= 50,
      requiresAdditionalVerification: riskScore >= 75,
      blocked: riskScore >= 90
    };
  }

  // Enterprise password policy validation
  validatePassword(password, userInfo = {}) {
    const policy = {
      minLength: 12,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      maxRepeatingChars: 2,
      preventCommonPasswords: true,
      preventUserInfoInPassword: true,
      passwordHistory: 12 // Remember last 12 passwords
    };

    const violations = [];

    if (password.length < policy.minLength) {
      violations.push(`Password must be at least ${policy.minLength} characters long`);
    }

    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
      violations.push('Password must contain at least one uppercase letter');
    }

    if (policy.requireLowercase && !/[a-z]/.test(password)) {
      violations.push('Password must contain at least one lowercase letter');
    }

    if (policy.requireNumbers && !/\d/.test(password)) {
      violations.push('Password must contain at least one number');
    }

    if (policy.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\?]/.test(password)) {
      violations.push('Password must contain at least one special character');
    }

    // Check for repeating characters
    let repeatingCount = 1;
    let maxRepeating = 1;
    for (let i = 1; i < password.length; i++) {
      if (password[i] === password[i-1]) {
        repeatingCount++;
      } else {
        maxRepeating = Math.max(maxRepeating, repeatingCount);
        repeatingCount = 1;
      }
    }
    if (maxRepeating > policy.maxRepeatingChars) {
      violations.push(`Password cannot have more than ${policy.maxRepeatingChars} repeating characters`);
    }

    // Check against user info
    if (policy.preventUserInfoInPassword && userInfo.email) {
      const emailParts = userInfo.email.split('@')[0].toLowerCase();
      if (password.toLowerCase().includes(emailParts)) {
        violations.push('Password cannot contain parts of your email address');
      }
    }

    return {
      isValid: violations.length === 0,
      violations: violations,
      strength: this.calculatePasswordStrength(password)
    };
  }

  // Calculate password strength score
  calculatePasswordStrength(password) {
    let score = 0;
    
    // Length bonus
    score += Math.min(password.length * 2, 25);
    
    // Character variety bonus
    if (/[a-z]/.test(password)) score += 5;
    if (/[A-Z]/.test(password)) score += 5;
    if (/\d/.test(password)) score += 5;
    if (/[^a-zA-Z\d]/.test(password)) score += 10;
    
    // Pattern penalties
    if (/(.)\1{2,}/.test(password)) score -= 10; // Repeating characters
    if (/123|abc|qwe/i.test(password)) score -= 10; // Common sequences
    
    return Math.max(0, Math.min(100, score));
  }
}

module.exports = EnterpriseSSO;