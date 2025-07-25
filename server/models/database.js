// Database integration with PostgreSQL and Redis for Zeeky AI
const { Pool } = require('pg');
const redis = require('redis');
const bcrypt = require('bcryptjs');

class DatabaseManager {
  constructor() {
    // PostgreSQL connection pool
    this.pgPool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/zeeky_ai',
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Redis client for caching and sessions
    this.redisClient = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });

    this.initializeDatabase();
  }

  async initializeDatabase() {
    try {
      // Test PostgreSQL connection
      await this.pgPool.query('SELECT NOW()');
      console.log('PostgreSQL connected successfully');

      // Connect to Redis
      await this.redisClient.connect();
      console.log('Redis connected successfully');

      // Create database tables
      await this.createTables();
    } catch (error) {
      console.error('Database initialization failed:', error);
    }
  }

  async createTables() {
    const createTablesQuery = `
      -- Users table
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255),
        firebase_uid VARCHAR(255) UNIQUE,
        username VARCHAR(100),
        avatar_url TEXT,
        preferences JSONB DEFAULT '{}',
        subscription_tier VARCHAR(50) DEFAULT 'free',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Conversations table
      CREATE TABLE IF NOT EXISTS conversations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255),
        ai_provider VARCHAR(50) DEFAULT 'openai',
        persona VARCHAR(50) DEFAULT 'default',
        context_data JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Messages table
      CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
        content TEXT NOT NULL,
        metadata JSONB DEFAULT '{}',
        tokens_used INTEGER DEFAULT 0,
        processing_time FLOAT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- AI Memory Bank
      CREATE TABLE IF NOT EXISTS ai_memories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        memory_type VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        importance_score FLOAT DEFAULT 0.5,
        access_count INTEGER DEFAULT 0,
        relevance_context JSONB DEFAULT '{}',
        embedding_vector FLOAT[] DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Business data for ChimaCleanz integration
      CREATE TABLE IF NOT EXISTS business_clients (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(50),
        address TEXT,
        service_history JSONB DEFAULT '[]',
        preferences JSONB DEFAULT '{}',
        total_spent DECIMAL(10,2) DEFAULT 0.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Business appointments
      CREATE TABLE IF NOT EXISTS appointments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        client_id UUID REFERENCES business_clients(id) ON DELETE CASCADE,
        service_type VARCHAR(100) NOT NULL,
        scheduled_date TIMESTAMP NOT NULL,
        duration_minutes INTEGER DEFAULT 60,
        status VARCHAR(50) DEFAULT 'scheduled',
        notes TEXT,
        price DECIMAL(10,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Music generation history
      CREATE TABLE IF NOT EXISTS music_generations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        prompt TEXT NOT NULL,
        genre VARCHAR(100),
        mood VARCHAR(100),
        generated_url TEXT,
        provider VARCHAR(50),
        generation_time FLOAT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- File uploads and processing
      CREATE TABLE IF NOT EXISTS file_uploads (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        filename VARCHAR(255) NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        file_type VARCHAR(100) NOT NULL,
        file_size BIGINT NOT NULL,
        file_path TEXT NOT NULL,
        processing_status VARCHAR(50) DEFAULT 'pending',
        processing_result JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Voice profiles for cloning
      CREATE TABLE IF NOT EXISTS voice_profiles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        profile_name VARCHAR(100) NOT NULL,
        voice_data_url TEXT,
        training_status VARCHAR(50) DEFAULT 'pending',
        voice_characteristics JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Analytics and usage tracking
      CREATE TABLE IF NOT EXISTS usage_analytics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        event_type VARCHAR(100) NOT NULL,
        event_data JSONB DEFAULT '{}',
        session_id VARCHAR(255),
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- User integrations table for calendar and other services
      CREATE TABLE IF NOT EXISTS user_integrations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        provider VARCHAR(50) NOT NULL,
        access_token TEXT,
        refresh_token TEXT,
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, provider)
      );

      -- Create indexes for better performance
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);
      CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
      CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
      CREATE INDEX IF NOT EXISTS idx_ai_memories_user_id ON ai_memories(user_id);
      CREATE INDEX IF NOT EXISTS idx_ai_memories_type ON ai_memories(memory_type);
      CREATE INDEX IF NOT EXISTS idx_business_clients_user_id ON business_clients(user_id);
      CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON appointments(user_id);
      CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(scheduled_date);
      CREATE INDEX IF NOT EXISTS idx_usage_analytics_user_id ON usage_analytics(user_id);
      CREATE INDEX IF NOT EXISTS idx_usage_analytics_created_at ON usage_analytics(created_at);
      CREATE INDEX IF NOT EXISTS idx_user_integrations_user_id ON user_integrations(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_integrations_provider ON user_integrations(provider);

      -- Enable Row Level Security
      ALTER TABLE users ENABLE ROW LEVEL SECURITY;
      ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
      ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
      ALTER TABLE ai_memories ENABLE ROW LEVEL SECURITY;
      ALTER TABLE business_clients ENABLE ROW LEVEL SECURITY;
      ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
      ALTER TABLE music_generations ENABLE ROW LEVEL SECURITY;
      ALTER TABLE file_uploads ENABLE ROW LEVEL SECURITY;
      ALTER TABLE voice_profiles ENABLE ROW LEVEL SECURITY;
      ALTER TABLE usage_analytics ENABLE ROW LEVEL SECURITY;
    `;

    await this.pgPool.query(createTablesQuery);
    console.log('Database tables created successfully');
  }

  // User management
  async createUser(userData) {
    const { email, password, firebaseUid, username } = userData;
    const passwordHash = password ? await bcrypt.hash(password, 12) : null;

    const query = `
      INSERT INTO users (email, password_hash, firebase_uid, username)
      VALUES ($1, $2, $3, $4)
      RETURNING id, email, username, created_at
    `;

    const result = await this.pgPool.query(query, [email, passwordHash, firebaseUid, username]);
    return result.rows[0];
  }

  async getUserById(userId) {
    const query = 'SELECT * FROM users WHERE id = $1';
    const result = await this.pgPool.query(query, [userId]);
    return result.rows[0];
  }

  async getUserByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await this.pgPool.query(query, [email]);
    return result.rows[0];
  }

  // Conversation management
  async createConversation(userId, title, aiProvider = 'openai', persona = 'default') {
    const query = `
      INSERT INTO conversations (user_id, title, ai_provider, persona)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const result = await this.pgPool.query(query, [userId, title, aiProvider, persona]);
    return result.rows[0];
  }

  async getConversations(userId, limit = 50) {
    const query = `
      SELECT c.*, 
             COUNT(m.id) as message_count,
             MAX(m.created_at) as last_message_at
      FROM conversations c
      LEFT JOIN messages m ON c.id = m.conversation_id
      WHERE c.user_id = $1
      GROUP BY c.id
      ORDER BY last_message_at DESC NULLS LAST
      LIMIT $2
    `;

    const result = await this.pgPool.query(query, [userId, limit]);
    return result.rows;
  }

  // Message management
  async saveMessage(conversationId, userId, role, content, metadata = {}) {
    const query = `
      INSERT INTO messages (conversation_id, user_id, role, content, metadata)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const result = await this.pgPool.query(query, [
      conversationId, userId, role, content, JSON.stringify(metadata)
    ]);

    // Update conversation timestamp
    await this.pgPool.query(
      'UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [conversationId]
    );

    return result.rows[0];
  }

  async getMessages(conversationId, limit = 100) {
    const query = `
      SELECT * FROM messages 
      WHERE conversation_id = $1 
      ORDER BY created_at ASC 
      LIMIT $2
    `;

    const result = await this.pgPool.query(query, [conversationId, limit]);
    return result.rows;
  }

  // AI Memory management
  async saveMemory(userId, memoryType, content, importanceScore = 0.5, relevanceContext = {}) {
    const query = `
      INSERT INTO ai_memories (user_id, memory_type, content, importance_score, relevance_context)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const result = await this.pgPool.query(query, [
      userId, memoryType, content, importanceScore, JSON.stringify(relevanceContext)
    ]);

    return result.rows[0];
  }

  async getRelevantMemories(userId, context, limit = 10) {
    // Simple relevance matching - can be enhanced with vector similarity
    const query = `
      SELECT * FROM ai_memories 
      WHERE user_id = $1 
      ORDER BY importance_score DESC, last_accessed DESC 
      LIMIT $2
    `;

    const result = await this.pgPool.query(query, [userId, limit]);
    
    // Update access count and timestamp
    const memoryIds = result.rows.map(m => m.id);
    if (memoryIds.length > 0) {
      await this.pgPool.query(
        'UPDATE ai_memories SET access_count = access_count + 1, last_accessed = CURRENT_TIMESTAMP WHERE id = ANY($1)',
        [memoryIds]
      );
    }

    return result.rows;
  }

  // Cache management with Redis
  async setCache(key, value, expirationSeconds = 300) {
    await this.redisClient.setEx(key, expirationSeconds, JSON.stringify(value));
  }

  async getCache(key) {
    const value = await this.redisClient.get(key);
    return value ? JSON.parse(value) : null;
  }

  async deleteCache(key) {
    await this.redisClient.del(key);
  }

  // Session management
  async saveSession(sessionId, userId, sessionData) {
    const key = `session:${sessionId}`;
    const data = { userId, ...sessionData, lastActive: Date.now() };
    await this.setCache(key, data, 24 * 60 * 60); // 24 hours
  }

  async getSession(sessionId) {
    const key = `session:${sessionId}`;
    return await this.getCache(key);
  }

  async deleteSession(sessionId) {
    const key = `session:${sessionId}`;
    await this.deleteCache(key);
  }

  // Analytics
  async logEvent(userId, eventType, eventData = {}, sessionId = null, ipAddress = null, userAgent = null) {
    const query = `
      INSERT INTO usage_analytics (user_id, event_type, event_data, session_id, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;

    await this.pgPool.query(query, [
      userId, eventType, JSON.stringify(eventData), sessionId, ipAddress, userAgent
    ]);
  }

  // Health check
  async healthCheck() {
    try {
      // Check PostgreSQL
      const pgResult = await this.pgPool.query('SELECT 1');
      
      // Check Redis
      const redisResult = await this.redisClient.ping();
      
      return {
        postgresql: pgResult.rowCount === 1,
        redis: redisResult === 'PONG',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Database health check failed: ${error.message}`);
    }
  }

  // Cleanup and close connections
  async close() {
    await this.pgPool.end();
    await this.redisClient.quit();
  }
}

module.exports = new DatabaseManager();