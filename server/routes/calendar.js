// Calendar Integration API Routes (Google Calendar & Outlook)
const express = require('express');
const { google } = require('googleapis');
const database = require('../models/database');
const router = express.Router();

// Google Calendar OAuth2 configuration
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Get authorization URL for Google Calendar
router.get('/google/auth-url', async (req, res) => {
  try {
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events'
      ],
      prompt: 'consent'
    });

    res.json({
      success: true,
      data: {
        authUrl: authUrl
      }
    });

  } catch (error) {
    console.error('Google auth URL generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate authorization URL'
    });
  }
});

// Handle Google Calendar OAuth callback
router.post('/google/callback', async (req, res) => {
  try {
    const { code } = req.body;
    const userId = req.user.userId;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Authorization code is required'
      });
    }

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Store tokens securely in database
    await database.pgPool.query(`
      INSERT INTO user_integrations (user_id, provider, access_token, refresh_token, expires_at)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (user_id, provider) 
      DO UPDATE SET access_token = $3, refresh_token = $4, expires_at = $5, updated_at = CURRENT_TIMESTAMP
    `, [
      userId,
      'google_calendar',
      tokens.access_token,
      tokens.refresh_token,
      new Date(tokens.expiry_date)
    ]);

    // Test the connection by getting user's calendar list
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const calendarList = await calendar.calendarList.list();

    await database.logEvent(userId, 'calendar_connected', {
      provider: 'google',
      calendarCount: calendarList.data.items?.length || 0
    });

    res.json({
      success: true,
      data: {
        provider: 'google',
        calendars: calendarList.data.items?.map(cal => ({
          id: cal.id,
          name: cal.summary,
          primary: cal.primary || false
        })) || []
      }
    });

  } catch (error) {
    console.error('Google Calendar callback error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to connect Google Calendar'
    });
  }
});

// Get user's calendars
router.get('/calendars', async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get stored credentials
    const result = await database.pgPool.query(`
      SELECT provider, access_token, refresh_token, expires_at
      FROM user_integrations 
      WHERE user_id = $1 AND provider IN ('google_calendar', 'outlook_calendar')
    `, [userId]);

    const calendars = [];

    for (const integration of result.rows) {
      try {
        if (integration.provider === 'google_calendar') {
          const googleCalendars = await getGoogleCalendars(integration);
          calendars.push(...googleCalendars);
        } else if (integration.provider === 'outlook_calendar') {
          const outlookCalendars = await getOutlookCalendars(integration);
          calendars.push(...outlookCalendars);
        }
      } catch (providerError) {
        console.warn(`Failed to get calendars from ${integration.provider}:`, providerError);
      }
    }

    res.json({
      success: true,
      data: calendars
    });

  } catch (error) {
    console.error('Get calendars error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve calendars'
    });
  }
});

// Get events from all connected calendars
router.get('/events', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { 
      startDate = new Date().toISOString(),
      endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      maxResults = 50
    } = req.query;

    // Get stored credentials
    const result = await database.pgPool.query(`
      SELECT provider, access_token, refresh_token, expires_at
      FROM user_integrations 
      WHERE user_id = $1 AND provider IN ('google_calendar', 'outlook_calendar')
    `, [userId]);

    const allEvents = [];

    for (const integration of result.rows) {
      try {
        if (integration.provider === 'google_calendar') {
          const googleEvents = await getGoogleEvents(integration, startDate, endDate, maxResults);
          allEvents.push(...googleEvents);
        } else if (integration.provider === 'outlook_calendar') {
          const outlookEvents = await getOutlookEvents(integration, startDate, endDate, maxResults);
          allEvents.push(...outlookEvents);
        }
      } catch (providerError) {
        console.warn(`Failed to get events from ${integration.provider}:`, providerError);
      }
    }

    // Sort events by start time
    allEvents.sort((a, b) => new Date(a.start) - new Date(b.start));

    res.json({
      success: true,
      data: {
        events: allEvents.slice(0, maxResults),
        totalCount: allEvents.length
      }
    });

  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve events'
    });
  }
});

// Create new event
router.post('/events', async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      title,
      description,
      startTime,
      endTime,
      calendarId,
      provider = 'google_calendar',
      attendees = [],
      location = '',
      reminders = []
    } = req.body;

    if (!title || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        error: 'Title, start time, and end time are required'
      });
    }

    // Get stored credentials for the specified provider
    const result = await database.pgPool.query(`
      SELECT access_token, refresh_token, expires_at
      FROM user_integrations 
      WHERE user_id = $1 AND provider = $2
    `, [userId, provider]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: `${provider} not connected`
      });
    }

    const integration = result.rows[0];
    let createdEvent;

    if (provider === 'google_calendar') {
      createdEvent = await createGoogleEvent(integration, {
        title,
        description,
        startTime,
        endTime,
        calendarId,
        attendees,
        location,
        reminders
      });
    } else if (provider === 'outlook_calendar') {
      createdEvent = await createOutlookEvent(integration, {
        title,
        description,
        startTime,
        endTime,
        calendarId,
        attendees,
        location,
        reminders
      });
    }

    await database.logEvent(userId, 'calendar_event_created', {
      provider: provider,
      eventId: createdEvent.id,
      title: title
    });

    res.json({
      success: true,
      data: createdEvent
    });

  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create event'
    });
  }
});

// Update event
router.put('/events/:eventId', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { eventId } = req.params;
    const {
      title,
      description,
      startTime,
      endTime,
      calendarId,
      provider = 'google_calendar',
      attendees,
      location,
      reminders
    } = req.body;

    // Get stored credentials
    const result = await database.pgPool.query(`
      SELECT access_token, refresh_token, expires_at
      FROM user_integrations 
      WHERE user_id = $1 AND provider = $2
    `, [userId, provider]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: `${provider} not connected`
      });
    }

    const integration = result.rows[0];
    let updatedEvent;

    if (provider === 'google_calendar') {
      updatedEvent = await updateGoogleEvent(integration, eventId, {
        title,
        description,
        startTime,
        endTime,
        calendarId,
        attendees,
        location,
        reminders
      });
    } else if (provider === 'outlook_calendar') {
      updatedEvent = await updateOutlookEvent(integration, eventId, {
        title,
        description,
        startTime,
        endTime,
        calendarId,
        attendees,
        location,
        reminders
      });
    }

    await database.logEvent(userId, 'calendar_event_updated', {
      provider: provider,
      eventId: eventId
    });

    res.json({
      success: true,
      data: updatedEvent
    });

  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update event'
    });
  }
});

// Delete event
router.delete('/events/:eventId', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { eventId } = req.params;
    const { provider = 'google_calendar', calendarId } = req.query;

    // Get stored credentials
    const result = await database.pgPool.query(`
      SELECT access_token, refresh_token, expires_at
      FROM user_integrations 
      WHERE user_id = $1 AND provider = $2
    `, [userId, provider]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: `${provider} not connected`
      });
    }

    const integration = result.rows[0];

    if (provider === 'google_calendar') {
      await deleteGoogleEvent(integration, eventId, calendarId);
    } else if (provider === 'outlook_calendar') {
      await deleteOutlookEvent(integration, eventId);
    }

    await database.logEvent(userId, 'calendar_event_deleted', {
      provider: provider,
      eventId: eventId
    });

    res.json({
      success: true,
      message: 'Event deleted successfully'
    });

  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete event'
    });
  }
});

// Disconnect calendar integration
router.delete('/integrations/:provider', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { provider } = req.params;

    await database.pgPool.query(`
      DELETE FROM user_integrations 
      WHERE user_id = $1 AND provider = $2
    `, [userId, provider]);

    await database.logEvent(userId, 'calendar_disconnected', {
      provider: provider
    });

    res.json({
      success: true,
      message: `${provider} disconnected successfully`
    });

  } catch (error) {
    console.error('Disconnect integration error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to disconnect integration'
    });
  }
});

// Helper functions for Google Calendar
async function getGoogleCalendars(integration) {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: integration.access_token,
    refresh_token: integration.refresh_token
  });

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  const response = await calendar.calendarList.list();

  return response.data.items?.map(cal => ({
    id: cal.id,
    name: cal.summary,
    provider: 'google',
    primary: cal.primary || false,
    backgroundColor: cal.backgroundColor,
    foregroundColor: cal.foregroundColor
  })) || [];
}

async function getGoogleEvents(integration, startDate, endDate, maxResults) {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: integration.access_token,
    refresh_token: integration.refresh_token
  });

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin: startDate,
    timeMax: endDate,
    maxResults: maxResults,
    singleEvents: true,
    orderBy: 'startTime'
  });

  return response.data.items?.map(event => ({
    id: event.id,
    title: event.summary,
    description: event.description,
    start: event.start.dateTime || event.start.date,
    end: event.end.dateTime || event.end.date,
    location: event.location,
    attendees: event.attendees?.map(a => ({
      email: a.email,
      name: a.displayName,
      status: a.responseStatus
    })) || [],
    provider: 'google',
    calendarId: event.organizer?.email,
    htmlLink: event.htmlLink
  })) || [];
}

async function createGoogleEvent(integration, eventData) {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: integration.access_token,
    refresh_token: integration.refresh_token
  });

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  
  const event = {
    summary: eventData.title,
    description: eventData.description,
    location: eventData.location,
    start: {
      dateTime: eventData.startTime,
      timeZone: 'UTC'
    },
    end: {
      dateTime: eventData.endTime,
      timeZone: 'UTC'
    },
    attendees: eventData.attendees?.map(email => ({ email })) || [],
    reminders: {
      useDefault: false,
      overrides: eventData.reminders?.map(minutes => ({
        method: 'popup',
        minutes: minutes
      })) || [{ method: 'popup', minutes: 10 }]
    }
  };

  const response = await calendar.events.insert({
    calendarId: eventData.calendarId || 'primary',
    resource: event
  });

  return {
    id: response.data.id,
    title: response.data.summary,
    start: response.data.start.dateTime,
    end: response.data.end.dateTime,
    provider: 'google',
    htmlLink: response.data.htmlLink
  };
}

async function updateGoogleEvent(integration, eventId, eventData) {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: integration.access_token,
    refresh_token: integration.refresh_token
  });

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  
  const event = {
    summary: eventData.title,
    description: eventData.description,
    location: eventData.location,
    start: {
      dateTime: eventData.startTime,
      timeZone: 'UTC'
    },
    end: {
      dateTime: eventData.endTime,
      timeZone: 'UTC'
    }
  };

  const response = await calendar.events.update({
    calendarId: eventData.calendarId || 'primary',
    eventId: eventId,
    resource: event
  });

  return {
    id: response.data.id,
    title: response.data.summary,
    start: response.data.start.dateTime,
    end: response.data.end.dateTime,
    provider: 'google'
  };
}

async function deleteGoogleEvent(integration, eventId, calendarId) {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: integration.access_token,
    refresh_token: integration.refresh_token
  });

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  
  await calendar.events.delete({
    calendarId: calendarId || 'primary',
    eventId: eventId
  });
}

// Placeholder functions for Outlook integration
// In production, you'd implement these using Microsoft Graph API
async function getOutlookCalendars(integration) {
  // Placeholder implementation
  return [];
}

async function getOutlookEvents(integration, startDate, endDate, maxResults) {
  // Placeholder implementation
  return [];
}

async function createOutlookEvent(integration, eventData) {
  // Placeholder implementation
  throw new Error('Outlook integration not yet implemented');
}

async function updateOutlookEvent(integration, eventId, eventData) {
  // Placeholder implementation
  throw new Error('Outlook integration not yet implemented');
}

async function deleteOutlookEvent(integration, eventId) {
  // Placeholder implementation
  throw new Error('Outlook integration not yet implemented');
}

module.exports = router;