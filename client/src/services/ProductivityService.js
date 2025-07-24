class ProductivityService {
  constructor() {
    this.calendars = new Map();
    this.tasks = new Map();
    this.reminders = new Map();
    this.habits = new Map();
    this.goals = new Map();
    this.projects = new Map();
    this.notes = new Map();
    this.workflows = new Map();
    
    // External integrations
    this.googleCalendar = null;
    this.appleCalendar = null;
    this.outlookCalendar = null;
    this.notionAPI = null;
    this.zapierAPI = null;
    this.shortcutsAPI = null;
    
    // AI assistants for productivity
    this.scheduleOptimizer = null;
    this.taskPrioritizer = null;
    this.timeTracker = null;
    this.focusManager = null;
    
    this.settings = {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      workingHours: { start: '09:00', end: '17:00' },
      workingDays: [1, 2, 3, 4, 5], // Monday to Friday
      defaultReminderTime: 15, // minutes before
      pomodoroLength: 25, // minutes
      shortBreakLength: 5,
      longBreakLength: 15,
      autoScheduling: true,
      smartNotifications: true
    };
    
    this.priorityLevels = {
      LOW: { value: 1, color: '#6B7280', label: 'Low' },
      MEDIUM: { value: 2, color: '#F59E0B', label: 'Medium' },
      HIGH: { value: 3, color: '#EF4444', label: 'High' },
      URGENT: { value: 4, color: '#DC2626', label: 'Urgent' }
    };
    
    this.taskStatuses = {
      TODO: 'todo',
      IN_PROGRESS: 'in_progress', 
      WAITING: 'waiting',
      COMPLETED: 'completed',
      CANCELLED: 'cancelled'
    };
    
    this.initialize();
  }

  async initialize() {
    try {
      console.log('📅 Initializing Productivity Service...');
      
      // Load saved data
      this.loadFromStorage();
      
      // Initialize external integrations
      await this.initializeIntegrations();
      
      // Setup AI assistants
      this.initializeAIAssistants();
      
      // Start background processes
      this.startBackgroundTasks();
      
      console.log('✅ Productivity Service ready');
    } catch (error) {
      console.error('Failed to initialize productivity service:', error);
    }
  }

  // Calendar Management
  async createEvent(eventData) {
    const event = {
      id: this.generateId(),
      title: eventData.title,
      description: eventData.description || '',
      startTime: new Date(eventData.startTime),
      endTime: new Date(eventData.endTime),
      location: eventData.location || '',
      attendees: eventData.attendees || [],
      reminders: eventData.reminders || [{ minutes: this.settings.defaultReminderTime }],
      calendar: eventData.calendar || 'default',
      recurrence: eventData.recurrence || null,
      priority: eventData.priority || 'MEDIUM',
      tags: eventData.tags || [],
      created: new Date(),
      updated: new Date(),
      status: 'confirmed'
    };

    // Validate event doesn't conflict
    const conflicts = this.checkEventConflicts(event);
    if (conflicts.length > 0 && !eventData.forceCreate) {
      throw new Error(`Event conflicts with: ${conflicts.map(c => c.title).join(', ')}`);
    }

    // Add to calendar
    this.calendars.set(event.id, event);
    
    // Sync with external calendars
    if (this.settings.autoSync) {
      await this.syncToExternalCalendars(event);
    }
    
    // Set up reminders
    this.scheduleReminders(event);
    
    // Update AI scheduling optimizer
    this.scheduleOptimizer?.learnFromEvent(event);
    
    this.saveToStorage();
    this.onEventCreated?.(event);
    
    return event;
  }

  async createEventFromConversation(message) {
    // Extract event details from natural language
    const eventDetails = this.parseEventFromText(message);
    
    if (eventDetails) {
      return await this.createEvent(eventDetails);
    }
    
    throw new Error('Could not extract event details from message');
  }

  parseEventFromText(text) {
    // Simple NLP for event extraction
    const patterns = {
      title: /(?:meeting|call|appointment|event)(?:\s+(?:with|about|for))?\s+(.+?)(?:\s+(?:on|at|from))/i,
      date: /(?:on|for)\s+(\w+(?:\s+\d{1,2}(?:st|nd|rd|th)?)?(?:\s+\d{4})?)/i,
      time: /(?:at|from)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i,
      duration: /(?:for)\s+(\d+)\s*(hour|minute)s?/i,
      location: /(?:at|in)\s+([^,]+?)(?:\s+(?:on|at|from)|$)/i
    };

    const extracted = {};
    
    for (const [key, pattern] of Object.entries(patterns)) {
      const match = text.match(pattern);
      if (match) {
        extracted[key] = match[1].trim();
      }
    }

    if (extracted.title) {
      return {
        title: extracted.title,
        startTime: this.parseDateTime(extracted.date, extracted.time),
        endTime: this.calculateEndTime(extracted.date, extracted.time, extracted.duration),
        location: extracted.location || ''
      };
    }

    return null;
  }

  parseDateTime(dateStr, timeStr) {
    const now = new Date();
    let date = new Date(now);
    
    if (dateStr) {
      // Simple date parsing - would be more sophisticated in production
      if (dateStr.toLowerCase().includes('tomorrow')) {
        date.setDate(date.getDate() + 1);
      } else if (dateStr.toLowerCase().includes('next week')) {
        date.setDate(date.getDate() + 7);
      }
    }
    
    if (timeStr) {
      const timeParts = timeStr.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
      if (timeParts) {
        let hours = parseInt(timeParts[1]);
        const minutes = parseInt(timeParts[2] || '0');
        const meridian = timeParts[3]?.toLowerCase();
        
        if (meridian === 'pm' && hours < 12) hours += 12;
        if (meridian === 'am' && hours === 12) hours = 0;
        
        date.setHours(hours, minutes, 0, 0);
      }
    }
    
    return date;
  }

  checkEventConflicts(newEvent) {
    const conflicts = [];
    
    for (const [id, event] of this.calendars) {
      if (id === newEvent.id) continue;
      
      if (this.eventsOverlap(newEvent, event)) {
        conflicts.push(event);
      }
    }
    
    return conflicts;
  }

  eventsOverlap(event1, event2) {
    return event1.startTime < event2.endTime && event2.startTime < event1.endTime;
  }

  // Task Management
  createTask(taskData) {
    const task = {
      id: this.generateId(),
      title: taskData.title,
      description: taskData.description || '',
      priority: taskData.priority || 'MEDIUM',
      status: taskData.status || this.taskStatuses.TODO,
      dueDate: taskData.dueDate ? new Date(taskData.dueDate) : null,
      estimatedTime: taskData.estimatedTime || null, // in minutes
      actualTime: 0,
      tags: taskData.tags || [],
      project: taskData.project || null,
      dependencies: taskData.dependencies || [],
      assignee: taskData.assignee || 'self',
      created: new Date(),
      updated: new Date(),
      completedAt: null,
      notes: [],
      subtasks: [],
      recurrence: taskData.recurrence || null
    };

    this.tasks.set(task.id, task);
    
    // Auto-schedule if enabled
    if (this.settings.autoScheduling && task.dueDate) {
      this.autoScheduleTask(task);
    }
    
    // Update AI prioritizer
    this.taskPrioritizer?.learnFromTask(task);
    
    this.saveToStorage();
    this.onTaskCreated?.(task);
    
    return task;
  }

  updateTask(taskId, updates) {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error('Task not found');
    
    Object.assign(task, updates, { updated: new Date() });
    
    if (updates.status === this.taskStatuses.COMPLETED && !task.completedAt) {
      task.completedAt = new Date();
      this.onTaskCompleted?.(task);
    }
    
    this.tasks.set(taskId, task);
    this.saveToStorage();
    
    return task;
  }

  prioritizeTasks(criteria = 'smart') {
    const tasks = Array.from(this.tasks.values())
      .filter(task => task.status !== this.taskStatuses.COMPLETED);
      
    switch (criteria) {
      case 'deadline':
        return tasks.sort((a, b) => {
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return a.dueDate - b.dueDate;
        });
        
      case 'priority':
        return tasks.sort((a, b) => 
          this.priorityLevels[b.priority].value - this.priorityLevels[a.priority].value
        );
        
      case 'smart':
        return this.smartPrioritize(tasks);
        
      default:
        return tasks;
    }
  }

  smartPrioritize(tasks) {
    // AI-based task prioritization
    return tasks.map(task => ({
      ...task,
      smartScore: this.calculateSmartScore(task)
    })).sort((a, b) => b.smartScore - a.smartScore);
  }

  calculateSmartScore(task) {
    let score = 0;
    
    // Priority weight
    score += this.priorityLevels[task.priority].value * 25;
    
    // Deadline urgency
    if (task.dueDate) {
      const daysUntilDue = (task.dueDate - new Date()) / (1000 * 60 * 60 * 24);
      if (daysUntilDue <= 1) score += 50;
      else if (daysUntilDue <= 3) score += 30;
      else if (daysUntilDue <= 7) score += 15;
    }
    
    // Estimated effort (shorter tasks get slight boost)
    if (task.estimatedTime) {
      if (task.estimatedTime <= 30) score += 10;
      else if (task.estimatedTime <= 60) score += 5;
    }
    
    // Age of task (older tasks get boost)
    const ageInDays = (new Date() - task.created) / (1000 * 60 * 60 * 24);
    score += Math.min(ageInDays * 2, 20);
    
    return score;
  }

  // Goal and Habit Tracking
  createGoal(goalData) {
    const goal = {
      id: this.generateId(),
      title: goalData.title,
      description: goalData.description || '',
      category: goalData.category || 'personal',
      type: goalData.type || 'outcome', // outcome, process, performance
      target: goalData.target,
      currentValue: goalData.currentValue || 0,
      unit: goalData.unit || '',
      deadline: goalData.deadline ? new Date(goalData.deadline) : null,
      milestones: goalData.milestones || [],
      habits: goalData.habits || [],
      status: 'active',
      created: new Date(),
      updated: new Date(),
      progress: []
    };

    this.goals.set(goal.id, goal);
    
    // Create related habits
    goal.habits.forEach(habitData => {
      this.createHabit({ ...habitData, goalId: goal.id });
    });
    
    this.saveToStorage();
    this.onGoalCreated?.(goal);
    
    return goal;
  }

  createHabit(habitData) {
    const habit = {
      id: this.generateId(),
      title: habitData.title,
      description: habitData.description || '',
      category: habitData.category || 'health',
      frequency: habitData.frequency || 'daily', // daily, weekly, monthly
      target: habitData.target || 1,
      unit: habitData.unit || 'times',
      reminders: habitData.reminders || [],
      goalId: habitData.goalId || null,
      streak: 0,
      longestStreak: 0,
      created: new Date(),
      updated: new Date(),
      completions: new Map() // date -> count
    };

    this.habits.set(habit.id, habit);
    
    // Schedule reminders
    habit.reminders.forEach(reminder => {
      this.scheduleHabitReminder(habit, reminder);
    });
    
    this.saveToStorage();
    this.onHabitCreated?.(habit);
    
    return habit;
  }

  logHabit(habitId, date = new Date(), count = 1) {
    const habit = this.habits.get(habitId);
    if (!habit) throw new Error('Habit not found');
    
    const dateKey = date.toISOString().split('T')[0];
    const currentCount = habit.completions.get(dateKey) || 0;
    habit.completions.set(dateKey, currentCount + count);
    
    // Update streak
    this.updateHabitStreak(habit);
    
    // Update related goal
    if (habit.goalId) {
      this.updateGoalProgress(habit.goalId, count);
    }
    
    habit.updated = new Date();
    this.habits.set(habitId, habit);
    this.saveToStorage();
    
    this.onHabitLogged?.(habit, count);
    
    return habit;
  }

  updateHabitStreak(habit) {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const todayCount = habit.completions.get(today) || 0;
    const yesterdayCount = habit.completions.get(yesterday) || 0;
    
    if (todayCount >= habit.target) {
      if (yesterdayCount >= habit.target || habit.streak === 0) {
        habit.streak += 1;
      } else {
        habit.streak = 1;
      }
    } else if (yesterdayCount < habit.target) {
      habit.streak = 0;
    }
    
    habit.longestStreak = Math.max(habit.longestStreak, habit.streak);
  }

  // Reminder System
  createReminder(reminderData) {
    const reminder = {
      id: this.generateId(),
      title: reminderData.title,
      message: reminderData.message || reminderData.title,
      time: new Date(reminderData.time),
      type: reminderData.type || 'notification', // notification, email, sms
      recurring: reminderData.recurring || false,
      recurrence: reminderData.recurrence || null,
      contextual: reminderData.contextual || false,
      conditions: reminderData.conditions || [],
      priority: reminderData.priority || 'MEDIUM',
      category: reminderData.category || 'general',
      created: new Date(),
      triggered: false,
      snoozed: false
    };

    this.reminders.set(reminder.id, reminder);
    this.scheduleReminder(reminder);
    
    this.saveToStorage();
    this.onReminderCreated?.(reminder);
    
    return reminder;
  }

  scheduleReminder(reminder) {
    const now = new Date();
    const timeUntil = reminder.time - now;
    
    if (timeUntil > 0) {
      setTimeout(() => {
        this.triggerReminder(reminder);
      }, timeUntil);
    }
  }

  triggerReminder(reminder) {
    if (reminder.contextual && !this.checkReminderConditions(reminder)) {
      // Reschedule for later check
      setTimeout(() => this.triggerReminder(reminder), 5 * 60 * 1000); // 5 minutes
      return;
    }
    
    reminder.triggered = true;
    this.reminders.set(reminder.id, reminder);
    
    this.onReminderTriggered?.(reminder);
    
    // Handle recurring reminders
    if (reminder.recurring && reminder.recurrence) {
      this.scheduleRecurringReminder(reminder);
    }
    
    this.saveToStorage();
  }

  checkReminderConditions(reminder) {
    // Check contextual conditions (location, calendar, etc.)
    return reminder.conditions.every(condition => {
      switch (condition.type) {
        case 'location':
          return this.checkLocationCondition(condition);
        case 'calendar':
          return this.checkCalendarCondition(condition);
        case 'time_range':
          return this.checkTimeRangeCondition(condition);
        default:
          return true;
      }
    });
  }

  // Note-taking and Documentation
  createNote(noteData) {
    const note = {
      id: this.generateId(),
      title: noteData.title || 'Untitled Note',
      content: noteData.content || '',
      tags: noteData.tags || [],
      category: noteData.category || 'general',
      project: noteData.project || null,
      format: noteData.format || 'text', // text, markdown, rich
      attachments: noteData.attachments || [],
      created: new Date(),
      updated: new Date(),
      archived: false,
      shared: false,
      collaborators: noteData.collaborators || []
    };

    this.notes.set(note.id, note);
    this.saveToStorage();
    
    this.onNoteCreated?.(note);
    
    return note;
  }

  searchNotes(query, options = {}) {
    const notes = Array.from(this.notes.values());
    const searchTerm = query.toLowerCase();
    
    let results = notes.filter(note => {
      if (note.archived && !options.includeArchived) return false;
      
      return (
        note.title.toLowerCase().includes(searchTerm) ||
        note.content.toLowerCase().includes(searchTerm) ||
        note.tags.some(tag => tag.toLowerCase().includes(searchTerm))
      );
    });
    
    // Apply filters
    if (options.category) {
      results = results.filter(note => note.category === options.category);
    }
    
    if (options.tags) {
      results = results.filter(note => 
        options.tags.every(tag => note.tags.includes(tag))
      );
    }
    
    // Sort by relevance
    results.sort((a, b) => {
      const aScore = this.calculateRelevanceScore(a, searchTerm);
      const bScore = this.calculateRelevanceScore(b, searchTerm);
      return bScore - aScore;
    });
    
    return results;
  }

  calculateRelevanceScore(note, searchTerm) {
    let score = 0;
    
    // Title matches are weighted higher
    if (note.title.toLowerCase().includes(searchTerm)) {
      score += 10;
    }
    
    // Content matches
    const contentMatches = (note.content.toLowerCase().match(new RegExp(searchTerm, 'g')) || []).length;
    score += contentMatches * 2;
    
    // Tag matches
    const tagMatches = note.tags.filter(tag => tag.toLowerCase().includes(searchTerm)).length;
    score += tagMatches * 5;
    
    // Recency boost
    const ageInDays = (new Date() - note.updated) / (1000 * 60 * 60 * 24);
    score += Math.max(0, 5 - ageInDays);
    
    return score;
  }

  // Workflow Automation
  createWorkflow(workflowData) {
    const workflow = {
      id: this.generateId(),
      name: workflowData.name,
      description: workflowData.description || '',
      trigger: workflowData.trigger,
      actions: workflowData.actions,
      conditions: workflowData.conditions || [],
      enabled: workflowData.enabled !== false,
      category: workflowData.category || 'general',
      created: new Date(),
      updated: new Date(),
      executionCount: 0,
      lastExecution: null
    };

    this.workflows.set(workflow.id, workflow);
    
    // Register trigger
    this.registerWorkflowTrigger(workflow);
    
    this.saveToStorage();
    this.onWorkflowCreated?.(workflow);
    
    return workflow;
  }

  registerWorkflowTrigger(workflow) {
    switch (workflow.trigger.type) {
      case 'event_created':
        this.onEventCreated = (event) => this.executeWorkflow(workflow, { event });
        break;
      case 'task_completed':
        this.onTaskCompleted = (task) => this.executeWorkflow(workflow, { task });
        break;
      case 'time_based':
        this.scheduleWorkflowExecution(workflow);
        break;
      case 'keyword':
        // Would hook into message processing
        break;
    }
  }

  async executeWorkflow(workflow, context = {}) {
    if (!workflow.enabled) return;
    
    // Check conditions
    if (!this.checkWorkflowConditions(workflow, context)) {
      return;
    }
    
    console.log(`🔄 Executing workflow: ${workflow.name}`);
    
    try {
      for (const action of workflow.actions) {
        await this.executeWorkflowAction(action, context);
      }
      
      workflow.executionCount++;
      workflow.lastExecution = new Date();
      this.workflows.set(workflow.id, workflow);
      
      this.onWorkflowExecuted?.(workflow, context);
      
    } catch (error) {
      console.error(`Workflow execution failed: ${workflow.name}`, error);
      this.onWorkflowError?.(workflow, error);
    }
  }

  async executeWorkflowAction(action, context) {
    switch (action.type) {
      case 'create_task':
        this.createTask(action.data);
        break;
      case 'send_email':
        await this.sendEmail(action.data);
        break;
      case 'create_reminder':
        this.createReminder(action.data);
        break;
      case 'webhook':
        await this.callWebhook(action.data);
        break;
      case 'zapier':
        await this.triggerZapier(action.data);
        break;
    }
  }

  // Time Tracking and Pomodoro
  startTimeTracking(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error('Task not found');
    
    const session = {
      id: this.generateId(),
      taskId,
      startTime: new Date(),
      endTime: null,
      duration: 0,
      type: 'work',
      paused: false,
      pausedTime: 0
    };
    
    this.timeTracker = session;
    this.onTimeTrackingStarted?.(session);
    
    return session;
  }

  stopTimeTracking() {
    if (!this.timeTracker) return null;
    
    this.timeTracker.endTime = new Date();
    this.timeTracker.duration = this.timeTracker.endTime - this.timeTracker.startTime - this.timeTracker.pausedTime;
    
    // Update task
    const task = this.tasks.get(this.timeTracker.taskId);
    if (task) {
      task.actualTime += Math.round(this.timeTracker.duration / (1000 * 60)); // Convert to minutes
      this.tasks.set(task.id, task);
    }
    
    const completedSession = { ...this.timeTracker };
    this.timeTracker = null;
    
    this.onTimeTrackingStopped?.(completedSession);
    this.saveToStorage();
    
    return completedSession;
  }

  startPomodoro(taskId) {
    const session = this.startTimeTracking(taskId);
    session.type = 'pomodoro';
    session.planned_duration = this.settings.pomodoroLength * 60 * 1000;
    
    // Set timer for pomodoro completion
    setTimeout(() => {
      this.completePomodoro();
    }, session.planned_duration);
    
    return session;
  }

  completePomodoro() {
    if (this.timeTracker?.type === 'pomodoro') {
      this.stopTimeTracking();
      this.onPomodoroCompleted?.();
      
      // Suggest break
      this.suggestBreak();
    }
  }

  suggestBreak() {
    const breakReminder = {
      title: 'Time for a break!',
      message: 'You\'ve completed a pomodoro session. Take a 5-minute break.',
      time: new Date(Date.now() + 1000), // Immediate
      type: 'notification',
      category: 'productivity'
    };
    
    this.createReminder(breakReminder);
  }

  // External Integrations
  async initializeIntegrations() {
    // Google Calendar
    if (process.env.REACT_APP_GOOGLE_CALENDAR_API_KEY) {
      this.googleCalendar = {
        apiKey: process.env.REACT_APP_GOOGLE_CALENDAR_API_KEY,
        sync: this.syncWithGoogleCalendar.bind(this)
      };
    }
    
    // Notion
    if (process.env.REACT_APP_NOTION_API_KEY) {
      this.notionAPI = {
        apiKey: process.env.REACT_APP_NOTION_API_KEY,
        sync: this.syncWithNotion.bind(this)
      };
    }
    
    // Zapier
    if (process.env.REACT_APP_ZAPIER_WEBHOOK_URL) {
      this.zapierAPI = {
        webhookUrl: process.env.REACT_APP_ZAPIER_WEBHOOK_URL,
        trigger: this.triggerZapier.bind(this)
      };
    }
  }

  async syncWithGoogleCalendar() {
    // Implementation for Google Calendar sync
    console.log('🔄 Syncing with Google Calendar...');
  }

  async syncWithNotion() {
    // Implementation for Notion sync
    console.log('🔄 Syncing with Notion...');
  }

  async triggerZapier(data) {
    if (!this.zapierAPI?.webhookUrl) return;
    
    try {
      await fetch(this.zapierAPI.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } catch (error) {
      console.error('Zapier trigger failed:', error);
    }
  }

  // AI Assistants
  initializeAIAssistants() {
    this.scheduleOptimizer = {
      learnFromEvent: (event) => {
        // Learn from scheduling patterns
      },
      optimizeSchedule: (events) => {
        // Suggest optimal scheduling
        return events;
      }
    };
    
    this.taskPrioritizer = {
      learnFromTask: (task) => {
        // Learn from task completion patterns
      },
      suggestPriorities: (tasks) => {
        // AI-suggested task priorities
        return this.smartPrioritize(tasks);
      }
    };
    
    this.focusManager = {
      suggestFocusTime: () => {
        // Suggest optimal focus periods
        const now = new Date();
        const hour = now.getHours();
        
        // Most people are most focused 9-11 AM and 2-4 PM
        if ((hour >= 9 && hour <= 11) || (hour >= 14 && hour <= 16)) {
          return { optimal: true, quality: 'high' };
        }
        
        return { optimal: false, quality: 'medium' };
      }
    };
  }

  // Background Tasks
  startBackgroundTasks() {
    // Check for due reminders every minute
    setInterval(() => {
      this.checkDueReminders();
    }, 60 * 1000);
    
    // Daily habit check
    setInterval(() => {
      this.checkDailyHabits();
    }, 60 * 60 * 1000); // Every hour
    
    // Weekly goal review
    setInterval(() => {
      this.reviewGoals();
    }, 24 * 60 * 60 * 1000); // Daily
  }

  checkDueReminders() {
    const now = new Date();
    
    for (const [id, reminder] of this.reminders) {
      if (!reminder.triggered && reminder.time <= now) {
        this.triggerReminder(reminder);
      }
    }
  }

  checkDailyHabits() {
    const today = new Date().toISOString().split('T')[0];
    
    for (const [id, habit] of this.habits) {
      if (habit.frequency === 'daily') {
        const todayCount = habit.completions.get(today) || 0;
        
        if (todayCount < habit.target) {
          this.onHabitMissed?.(habit);
        }
      }
    }
  }

  reviewGoals() {
    for (const [id, goal] of this.goals) {
      if (goal.status === 'active') {
        const progress = this.calculateGoalProgress(goal);
        
        if (progress.percentage >= 100) {
          goal.status = 'completed';
          this.onGoalCompleted?.(goal);
        } else if (goal.deadline && new Date() > goal.deadline) {
          goal.status = 'overdue';
          this.onGoalOverdue?.(goal);
        }
        
        this.goals.set(id, goal);
      }
    }
    
    this.saveToStorage();
  }

  // Utility Methods
  generateId() {
    return Date.now() + Math.random().toString(36).substr(2, 9);
  }

  loadFromStorage() {
    try {
      const data = {
        calendars: localStorage.getItem('zeeky_calendars'),
        tasks: localStorage.getItem('zeeky_tasks'),
        reminders: localStorage.getItem('zeeky_reminders'),
        habits: localStorage.getItem('zeeky_habits'),
        goals: localStorage.getItem('zeeky_goals'),
        notes: localStorage.getItem('zeeky_notes'),
        workflows: localStorage.getItem('zeeky_workflows')
      };
      
      for (const [key, value] of Object.entries(data)) {
        if (value) {
          const parsed = JSON.parse(value);
          this[key] = new Map(parsed);
        }
      }
      
      console.log('📚 Productivity data loaded from storage');
    } catch (error) {
      console.warn('Could not load productivity data:', error);
    }
  }

  saveToStorage() {
    try {
      const data = {
        calendars: Array.from(this.calendars.entries()),
        tasks: Array.from(this.tasks.entries()),
        reminders: Array.from(this.reminders.entries()),
        habits: Array.from(this.habits.entries()),
        goals: Array.from(this.goals.entries()),
        notes: Array.from(this.notes.entries()),
        workflows: Array.from(this.workflows.entries())
      };
      
      for (const [key, value] of Object.entries(data)) {
        localStorage.setItem(`zeeky_${key}`, JSON.stringify(value));
      }
    } catch (error) {
      console.warn('Could not save productivity data:', error);
    }
  }

  getStatus() {
    return {
      calendars: this.calendars.size,
      tasks: this.tasks.size,
      reminders: this.reminders.size,
      habits: this.habits.size,
      goals: this.goals.size,
      notes: this.notes.size,
      workflows: this.workflows.size,
      isTracking: !!this.timeTracker,
      currentSession: this.timeTracker
    };
  }

  getAnalytics() {
    const completedTasks = Array.from(this.tasks.values())
      .filter(task => task.status === this.taskStatuses.COMPLETED);
      
    const activeHabits = Array.from(this.habits.values())
      .filter(habit => habit.streak > 0);
      
    const completedGoals = Array.from(this.goals.values())
      .filter(goal => goal.status === 'completed');
    
    return {
      productivity: {
        tasksCompleted: completedTasks.length,
        averageTaskTime: this.calculateAverageTaskTime(completedTasks),
        habitStreaks: activeHabits.map(h => ({ name: h.title, streak: h.streak })),
        goalsAchieved: completedGoals.length
      },
      timeTracking: {
        totalTimeTracked: this.calculateTotalTimeTracked(),
        pomodorosCompleted: this.countPomodorosCompleted()
      }
    };
  }

  // Cleanup
  destroy() {
    this.calendars.clear();
    this.tasks.clear();
    this.reminders.clear();
    this.habits.clear();
    this.goals.clear();
    this.notes.clear();
    this.workflows.clear();
    
    this.timeTracker = null;
    
    console.log('📅 Productivity Service destroyed');
  }
}

export default ProductivityService;