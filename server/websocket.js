// Real-time WebSocket communication for Zeeky AI
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const database = require('./models/database');

class ZeekyWebSocketServer {
  constructor(server) {
    this.wss = new WebSocket.Server({ 
      server,
      verifyClient: this.verifyClient.bind(this)
    });
    
    this.clients = new Map(); // userId -> Set of WebSocket connections
    this.rooms = new Map(); // roomId -> Set of WebSocket connections
    
    this.wss.on('connection', this.handleConnection.bind(this));
    
    console.log('WebSocket server initialized');
  }

  // Verify client authentication
  async verifyClient(info) {
    try {
      const url = new URL(info.req.url, 'ws://localhost');
      const token = url.searchParams.get('token');
      
      if (!token) return false;
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      info.req.user = decoded;
      
      return true;
    } catch (error) {
      console.warn('WebSocket authentication failed:', error.message);
      return false;
    }
  }

  // Handle new WebSocket connection
  handleConnection(ws, req) {
    const userId = req.user.userId;
    
    // Add client to tracking
    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Set());
    }
    this.clients.get(userId).add(ws);

    // Set up client properties
    ws.userId = userId;
    ws.isAlive = true;
    ws.rooms = new Set();
    
    console.log(`WebSocket client connected: ${userId}`);

    // Handle messages
    ws.on('message', (data) => this.handleMessage(ws, data));
    
    // Handle disconnection
    ws.on('close', () => this.handleDisconnection(ws));
    
    // Handle pong for heartbeat
    ws.on('pong', () => { ws.isAlive = true; });
    
    // Send welcome message
    this.sendToClient(ws, {
      type: 'CONNECTION_ESTABLISHED',
      data: {
        userId: userId,
        timestamp: new Date().toISOString()
      }
    });

    // Log connection event
    database.logEvent(userId, 'websocket_connect', {
      userAgent: req.headers['user-agent'],
      ip: req.socket.remoteAddress
    });
  }

  // Handle incoming messages
  async handleMessage(ws, data) {
    try {
      const message = JSON.parse(data);
      const { type, payload } = message;

      switch (type) {
        case 'JOIN_ROOM':
          await this.handleJoinRoom(ws, payload);
          break;

        case 'LEAVE_ROOM':
          await this.handleLeaveRoom(ws, payload);
          break;

        case 'CHAT_MESSAGE':
          await this.handleChatMessage(ws, payload);
          break;

        case 'TYPING_START':
          await this.handleTypingStart(ws, payload);
          break;

        case 'TYPING_STOP':
          await this.handleTypingStop(ws, payload);
          break;

        case 'VOICE_STATUS':
          await this.handleVoiceStatus(ws, payload);
          break;

        case 'SCREEN_SHARE':
          await this.handleScreenShare(ws, payload);
          break;

        case 'AI_PROCESSING':
          await this.handleAIProcessing(ws, payload);
          break;

        case 'FILE_SHARE':
          await this.handleFileShare(ws, payload);
          break;

        case 'HEARTBEAT':
          this.sendToClient(ws, { type: 'PONG', timestamp: Date.now() });
          break;

        default:
          console.warn(`Unknown WebSocket message type: ${type}`);
      }

      // Log message event
      database.logEvent(ws.userId, 'websocket_message', {
        messageType: type,
        payloadSize: data.length
      });

    } catch (error) {
      console.error('WebSocket message handling error:', error);
      this.sendToClient(ws, {
        type: 'ERROR',
        data: {
          message: 'Failed to process message',
          error: error.message
        }
      });
    }
  }

  // Handle room joining
  async handleJoinRoom(ws, payload) {
    const { roomId } = payload;
    
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Set());
    }
    
    this.rooms.get(roomId).add(ws);
    ws.rooms.add(roomId);
    
    // Notify room members
    this.broadcastToRoom(roomId, {
      type: 'USER_JOINED',
      data: {
        userId: ws.userId,
        roomId: roomId,
        timestamp: new Date().toISOString()
      }
    }, ws);

    console.log(`User ${ws.userId} joined room ${roomId}`);
  }

  // Handle room leaving
  async handleLeaveRoom(ws, payload) {
    const { roomId } = payload;
    
    if (this.rooms.has(roomId)) {
      this.rooms.get(roomId).delete(ws);
      if (this.rooms.get(roomId).size === 0) {
        this.rooms.delete(roomId);
      }
    }
    
    ws.rooms.delete(roomId);
    
    // Notify room members
    this.broadcastToRoom(roomId, {
      type: 'USER_LEFT',
      data: {
        userId: ws.userId,
        roomId: roomId,
        timestamp: new Date().toISOString()
      }
    }, ws);

    console.log(`User ${ws.userId} left room ${roomId}`);
  }

  // Handle chat messages
  async handleChatMessage(ws, payload) {
    const { conversationId, message, messageType = 'text' } = payload;
    
    try {
      // Save message to database
      const savedMessage = await database.saveMessage(
        conversationId,
        ws.userId,
        'user',
        message,
        { messageType, timestamp: new Date().toISOString() }
      );

      // Broadcast to conversation participants
      this.broadcastToRoom(conversationId, {
        type: 'NEW_MESSAGE',
        data: savedMessage
      });

      // Trigger AI response if needed
      if (messageType === 'text') {
        this.triggerAIResponse(conversationId, ws.userId, message);
      }

    } catch (error) {
      console.error('Chat message handling error:', error);
      this.sendToClient(ws, {
        type: 'MESSAGE_ERROR',
        data: { error: error.message }
      });
    }
  }

  // Handle typing indicators
  async handleTypingStart(ws, payload) {
    const { conversationId } = payload;
    
    this.broadcastToRoom(conversationId, {
      type: 'TYPING_START',
      data: {
        userId: ws.userId,
        conversationId: conversationId,
        timestamp: new Date().toISOString()
      }
    }, ws);
  }

  async handleTypingStop(ws, payload) {
    const { conversationId } = payload;
    
    this.broadcastToRoom(conversationId, {
      type: 'TYPING_STOP',
      data: {
        userId: ws.userId,
        conversationId: conversationId,
        timestamp: new Date().toISOString()
      }
    }, ws);
  }

  // Handle voice status
  async handleVoiceStatus(ws, payload) {
    const { isListening, isSpeaking, roomId } = payload;
    
    this.broadcastToRoom(roomId, {
      type: 'VOICE_STATUS_UPDATE',
      data: {
        userId: ws.userId,
        isListening,
        isSpeaking,
        timestamp: new Date().toISOString()
      }
    }, ws);
  }

  // Handle screen sharing
  async handleScreenShare(ws, payload) {
    const { action, roomId } = payload; // action: 'start' | 'stop'
    
    this.broadcastToRoom(roomId, {
      type: 'SCREEN_SHARE_UPDATE',
      data: {
        userId: ws.userId,
        action: action,
        timestamp: new Date().toISOString()
      }
    }, ws);
  }

  // Handle AI processing updates
  async handleAIProcessing(ws, payload) {
    const { status, conversationId } = payload; // status: 'started' | 'completed' | 'error'
    
    this.broadcastToRoom(conversationId, {
      type: 'AI_PROCESSING_UPDATE',
      data: {
        status: status,
        conversationId: conversationId,
        timestamp: new Date().toISOString()
      }
    });
  }

  // Handle file sharing
  async handleFileShare(ws, payload) {
    const { fileInfo, roomId } = payload;
    
    this.broadcastToRoom(roomId, {
      type: 'FILE_SHARED',
      data: {
        userId: ws.userId,
        fileInfo: fileInfo,
        roomId: roomId,
        timestamp: new Date().toISOString()
      }
    }, ws);
  }

  // Trigger AI response
  async triggerAIResponse(conversationId, userId, message) {
    try {
      // Notify that AI is processing
      this.broadcastToRoom(conversationId, {
        type: 'AI_PROCESSING_START',
        data: {
          conversationId: conversationId,
          timestamp: new Date().toISOString()
        }
      });

      // Here you would integrate with your AI processing system
      // For now, we'll simulate a response
      setTimeout(async () => {
        try {
          // Simulate AI response (integrate with your actual AI service)
          const aiResponse = `AI response to: "${message}"`;
          
          // Save AI response to database
          const savedResponse = await database.saveMessage(
            conversationId,
            'system', // or specific AI user ID
            'assistant',
            aiResponse,
            { 
              provider: 'openai',
              processingTime: Math.random() * 1000,
              timestamp: new Date().toISOString()
            }
          );

          // Broadcast AI response
          this.broadcastToRoom(conversationId, {
            type: 'AI_RESPONSE',
            data: savedResponse
          });

        } catch (error) {
          this.broadcastToRoom(conversationId, {
            type: 'AI_ERROR',
            data: { error: error.message }
          });
        }
      }, 1000 + Math.random() * 2000); // Simulate processing time

    } catch (error) {
      console.error('AI response trigger error:', error);
    }
  }

  // Handle client disconnection
  handleDisconnection(ws) {
    const userId = ws.userId;
    
    // Remove from client tracking
    if (this.clients.has(userId)) {
      this.clients.get(userId).delete(ws);
      if (this.clients.get(userId).size === 0) {
        this.clients.delete(userId);
      }
    }

    // Remove from all rooms
    ws.rooms.forEach(roomId => {
      if (this.rooms.has(roomId)) {
        this.rooms.get(roomId).delete(ws);
        
        // Notify room members
        this.broadcastToRoom(roomId, {
          type: 'USER_DISCONNECTED',
          data: {
            userId: userId,
            roomId: roomId,
            timestamp: new Date().toISOString()
          }
        });
        
        // Clean up empty rooms
        if (this.rooms.get(roomId).size === 0) {
          this.rooms.delete(roomId);
        }
      }
    });

    console.log(`WebSocket client disconnected: ${userId}`);

    // Log disconnection event
    if (userId) {
      database.logEvent(userId, 'websocket_disconnect', {
        duration: Date.now() - (ws.connectedAt || 0)
      });
    }
  }

  // Send message to specific client
  sendToClient(ws, message) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  // Send message to all clients of a user
  sendToUser(userId, message) {
    if (this.clients.has(userId)) {
      this.clients.get(userId).forEach(ws => {
        this.sendToClient(ws, message);
      });
    }
  }

  // Broadcast to all clients in a room
  broadcastToRoom(roomId, message, excludeWs = null) {
    if (this.rooms.has(roomId)) {
      this.rooms.get(roomId).forEach(ws => {
        if (ws !== excludeWs) {
          this.sendToClient(ws, message);
        }
      });
    }
  }

  // Broadcast to all connected clients
  broadcast(message, excludeWs = null) {
    this.wss.clients.forEach(ws => {
      if (ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
        this.sendToClient(ws, message);
      }
    });
  }

  // Heartbeat to keep connections alive
  startHeartbeat() {
    setInterval(() => {
      this.wss.clients.forEach(ws => {
        if (!ws.isAlive) {
          return ws.terminate();
        }
        
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000); // 30 seconds
  }

  // Get connection statistics
  getStats() {
    return {
      connectedClients: this.wss.clients.size,
      activeUsers: this.clients.size,
      activeRooms: this.rooms.size,
      roomDetails: Array.from(this.rooms.entries()).map(([roomId, clients]) => ({
        roomId,
        clientCount: clients.size
      }))
    };
  }

  // Graceful shutdown
  close() {
    this.wss.clients.forEach(ws => {
      ws.close(1000, 'Server shutdown');
    });
    this.wss.close();
  }
}

module.exports = ZeekyWebSocketServer;