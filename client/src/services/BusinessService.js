class BusinessService {
  constructor() {
    this.businessName = 'ChimaCleanz';
    this.clients = this.loadClients();
    this.jobs = this.loadJobs();
    this.invoices = this.loadInvoices();
    this.settings = this.loadSettings();
  }

  // Client Management
  loadClients() {
    const saved = localStorage.getItem('chimacleanz_clients');
    return saved ? JSON.parse(saved) : [];
  }

  saveClients() {
    localStorage.setItem('chimacleanz_clients', JSON.stringify(this.clients));
  }

  addClient(clientData) {
    const newClient = {
      id: `client_${Date.now()}`,
      ...clientData,
      createdAt: Date.now(),
      totalJobs: 0,
      totalRevenue: 0,
      status: 'active'
    };
    
    this.clients.push(newClient);
    this.saveClients();
    return newClient;
  }

  updateClient(clientId, updates) {
    const clientIndex = this.clients.findIndex(c => c.id === clientId);
    if (clientIndex !== -1) {
      this.clients[clientIndex] = { ...this.clients[clientIndex], ...updates };
      this.saveClients();
      return this.clients[clientIndex];
    }
    return null;
  }

  getClient(clientId) {
    return this.clients.find(c => c.id === clientId);
  }

  getClients(filters = {}) {
    let filtered = [...this.clients];
    
    if (filters.status) {
      filtered = filtered.filter(c => c.status === filters.status);
    }
    
    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(search) ||
        c.email.toLowerCase().includes(search) ||
        c.phone.includes(search)
      );
    }
    
    return filtered.sort((a, b) => b.createdAt - a.createdAt);
  }

  // Job Management
  loadJobs() {
    const saved = localStorage.getItem('chimacleanz_jobs');
    return saved ? JSON.parse(saved) : [];
  }

  saveJobs() {
    localStorage.setItem('chimacleanz_jobs', JSON.stringify(this.jobs));
  }

  createJob(jobData) {
    const newJob = {
      id: `job_${Date.now()}`,
      ...jobData,
      createdAt: Date.now(),
      status: 'scheduled',
      progress: 0
    };
    
    this.jobs.push(newJob);
    this.saveJobs();
    
    // Update client stats
    this.updateClientStats(jobData.clientId);
    
    return newJob;
  }

  updateJob(jobId, updates) {
    const jobIndex = this.jobs.findIndex(j => j.id === jobId);
    if (jobIndex !== -1) {
      this.jobs[jobIndex] = { ...this.jobs[jobIndex], ...updates };
      this.saveJobs();
      
      // Update client stats if job is completed
      if (updates.status === 'completed') {
        this.updateClientStats(this.jobs[jobIndex].clientId);
      }
      
      return this.jobs[jobIndex];
    }
    return null;
  }

  getJob(jobId) {
    return this.jobs.find(j => j.id === jobId);
  }

  getJobs(filters = {}) {
    let filtered = [...this.jobs];
    
    if (filters.status) {
      filtered = filtered.filter(j => j.status === filters.status);
    }
    
    if (filters.clientId) {
      filtered = filtered.filter(j => j.clientId === filters.clientId);
    }
    
    if (filters.dateRange) {
      const { start, end } = filters.dateRange;
      filtered = filtered.filter(j => 
        j.scheduledDate >= start && j.scheduledDate <= end
      );
    }
    
    return filtered.sort((a, b) => b.scheduledDate - a.scheduledDate);
  }

  getTodaysJobs() {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0)).getTime();
    const endOfDay = new Date(today.setHours(23, 59, 59, 999)).getTime();
    
    return this.jobs.filter(job => 
      job.scheduledDate >= startOfDay && 
      job.scheduledDate <= endOfDay
    );
  }

  getUpcomingJobs(days = 7) {
    const now = Date.now();
    const future = now + (days * 24 * 60 * 60 * 1000);
    
    return this.jobs.filter(job => 
      job.scheduledDate >= now && 
      job.scheduledDate <= future &&
      job.status !== 'completed' &&
      job.status !== 'cancelled'
    ).sort((a, b) => a.scheduledDate - b.scheduledDate);
  }

  // Invoice Management
  loadInvoices() {
    const saved = localStorage.getItem('chimacleanz_invoices');
    return saved ? JSON.parse(saved) : [];
  }

  saveInvoices() {
    localStorage.setItem('chimacleanz_invoices', JSON.stringify(this.invoices));
  }

  generateInvoice(jobId) {
    const job = this.getJob(jobId);
    const client = this.getClient(job.clientId);
    
    if (!job || !client) return null;
    
    const invoice = {
      id: `inv_${Date.now()}`,
      invoiceNumber: `CHC-${String(this.invoices.length + 1).padStart(4, '0')}`,
      jobId: jobId,
      clientId: job.clientId,
      clientName: client.name,
      clientEmail: client.email,
      clientAddress: client.address,
      services: job.services,
      subtotal: job.estimatedCost,
      tax: job.estimatedCost * 0.08, // 8% tax
      total: job.estimatedCost * 1.08,
      status: 'pending',
      createdAt: Date.now(),
      dueDate: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days
      paidAt: null
    };
    
    this.invoices.push(invoice);
    this.saveInvoices();
    
    return invoice;
  }

  updateInvoiceStatus(invoiceId, status, paidAt = null) {
    const invoiceIndex = this.invoices.findIndex(i => i.id === invoiceId);
    if (invoiceIndex !== -1) {
      this.invoices[invoiceIndex].status = status;
      if (paidAt) this.invoices[invoiceIndex].paidAt = paidAt;
      this.saveInvoices();
      return this.invoices[invoiceIndex];
    }
    return null;
  }

  getInvoices(filters = {}) {
    let filtered = [...this.invoices];
    
    if (filters.status) {
      filtered = filtered.filter(i => i.status === filters.status);
    }
    
    if (filters.clientId) {
      filtered = filtered.filter(i => i.clientId === filters.clientId);
    }
    
    return filtered.sort((a, b) => b.createdAt - a.createdAt);
  }

  // Estimate Generation
  generateEstimate(serviceData) {
    const basePrices = {
      'house_cleaning': {
        small: 80,
        medium: 120,
        large: 180,
        xlarge: 250
      },
      'deep_cleaning': {
        small: 150,
        medium: 220,
        large: 320,
        xlarge: 450
      },
      'office_cleaning': {
        small: 60,
        medium: 100,
        large: 160,
        xlarge: 220
      },
      'carpet_cleaning': {
        small: 100,
        medium: 150,
        large: 220,
        xlarge: 300
      },
      'window_cleaning': {
        small: 40,
        medium: 60,
        large: 90,
        xlarge: 130
      }
    };

    const addOns = {
      'inside_appliances': 25,
      'inside_cabinets': 30,
      'garage_cleaning': 50,
      'basement_cleaning': 40,
      'organizing': 35
    };

    let totalCost = 0;
    
    // Base service cost
    for (const service of serviceData.services) {
      const basePrice = basePrices[service.type]?.[serviceData.propertySize] || 100;
      totalCost += basePrice;
    }
    
    // Add-ons
    for (const addOn of serviceData.addOns || []) {
      totalCost += addOns[addOn] || 0;
    }
    
    // Frequency discount
    if (serviceData.frequency === 'weekly') {
      totalCost *= 0.85; // 15% discount
    } else if (serviceData.frequency === 'biweekly') {
      totalCost *= 0.9; // 10% discount
    } else if (serviceData.frequency === 'monthly') {
      totalCost *= 0.95; // 5% discount
    }
    
    return {
      subtotal: Math.round(totalCost),
      tax: Math.round(totalCost * 0.08),
      total: Math.round(totalCost * 1.08),
      breakdown: {
        baseServices: Math.round(totalCost * 0.8),
        addOns: Math.round(totalCost * 0.2),
        frequencyDiscount: serviceData.frequency !== 'one_time' ? Math.round(totalCost * 0.1) : 0
      }
    };
  }

  // Analytics and Reports
  getBusinessAnalytics(timeframe = 'month') {
    const now = Date.now();
    let startDate;
    
    switch (timeframe) {
      case 'week':
        startDate = now - (7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = now - (30 * 24 * 60 * 60 * 1000);
        break;
      case 'quarter':
        startDate = now - (90 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = now - (365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = now - (30 * 24 * 60 * 60 * 1000);
    }
    
    const relevantJobs = this.jobs.filter(job => job.createdAt >= startDate);
    const relevantInvoices = this.invoices.filter(inv => inv.createdAt >= startDate);
    
    const completedJobs = relevantJobs.filter(job => job.status === 'completed');
    const paidInvoices = relevantInvoices.filter(inv => inv.status === 'paid');
    
    return {
      totalJobs: relevantJobs.length,
      completedJobs: completedJobs.length,
      completionRate: relevantJobs.length > 0 ? (completedJobs.length / relevantJobs.length) * 100 : 0,
      totalRevenue: paidInvoices.reduce((sum, inv) => sum + inv.total, 0),
      averageJobValue: completedJobs.length > 0 ? 
        completedJobs.reduce((sum, job) => sum + job.estimatedCost, 0) / completedJobs.length : 0,
      newClients: this.clients.filter(client => client.createdAt >= startDate).length,
      pendingInvoices: relevantInvoices.filter(inv => inv.status === 'pending').length,
      overdueInvoices: relevantInvoices.filter(inv => 
        inv.status === 'pending' && inv.dueDate < now
      ).length
    };
  }

  getTopClients(limit = 5) {
    return this.clients
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, limit);
  }

  getServicePopularity() {
    const serviceCount = {};
    
    this.jobs.forEach(job => {
      job.services.forEach(service => {
        serviceCount[service.type] = (serviceCount[service.type] || 0) + 1;
      });
    });
    
    return Object.entries(serviceCount)
      .sort(([,a], [,b]) => b - a)
      .map(([service, count]) => ({ service, count }));
  }

  // Helper Methods
  updateClientStats(clientId) {
    const client = this.getClient(clientId);
    const clientJobs = this.jobs.filter(job => job.clientId === clientId);
    const completedJobs = clientJobs.filter(job => job.status === 'completed');
    
    if (client) {
      client.totalJobs = clientJobs.length;
      client.totalRevenue = completedJobs.reduce((sum, job) => sum + job.estimatedCost, 0);
      this.saveClients();
    }
  }

  // Settings Management
  loadSettings() {
    const saved = localStorage.getItem('chimacleanz_settings');
    return saved ? JSON.parse(saved) : {
      businessInfo: {
        name: 'ChimaCleanz',
        address: '',
        phone: '',
        email: '',
        website: ''
      },
      defaultTax: 0.08,
      paymentTerms: 30,
      currency: 'USD'
    };
  }

  saveSettings() {
    localStorage.setItem('chimacleanz_settings', JSON.stringify(this.settings));
  }

  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();
  }

  // Communication Templates
  getEmailTemplates() {
    return {
      appointment_confirmation: {
        subject: 'Cleaning Appointment Confirmed - ChimaCleanz',
        body: `Dear {{clientName}},

Your cleaning appointment has been confirmed for {{date}} at {{time}}.

Service Details:
{{serviceDetails}}

Estimated Cost: ${{cost}}

We look forward to providing you with exceptional cleaning service!

Best regards,
ChimaCleanz Team`
      },
      appointment_reminder: {
        subject: 'Reminder: Cleaning Service Tomorrow - ChimaCleanz',
        body: `Dear {{clientName}},

This is a friendly reminder that your cleaning service is scheduled for tomorrow, {{date}} at {{time}}.

Please ensure someone is available to provide access to the property.

If you need to reschedule, please contact us at least 24 hours in advance.

Thank you,
ChimaCleanz Team`
      },
      invoice_sent: {
        subject: 'Invoice #{{invoiceNumber}} - ChimaCleanz',
        body: `Dear {{clientName}},

Thank you for choosing ChimaCleanz! Attached is your invoice for the cleaning service completed on {{serviceDate}}.

Invoice Total: ${{total}}
Due Date: {{dueDate}}

Payment can be made via cash, check, or online payment.

We appreciate your business!

Best regards,
ChimaCleanz Team`
      }
    };
  }

  // Auto-responder for calls/texts
  generateAutoResponse(type, context = {}) {
    const responses = {
      missed_call: `Hi! Thanks for calling ChimaCleanz. We're currently busy making homes sparkle! ✨ Please leave a message and we'll get back to you within 2 hours, or text us for faster service. For immediate booking, visit our website!`,
      
      text_inquiry: `Hello! Thanks for your interest in ChimaCleanz! 🏠✨ We'd love to help make your home spotless. What type of cleaning service are you looking for? (House cleaning, deep cleaning, office cleaning, etc.)`,
      
      booking_request: `Great! We'd be happy to schedule your cleaning service. To provide you with an accurate quote, could you please tell us:
1. Property size (bedrooms/bathrooms)
2. Type of cleaning needed
3. Preferred date/time
4. Any special requests

We typically respond within 30 minutes during business hours!`,
      
      after_hours: `Thanks for contacting ChimaCleanz! 🌙 We've received your message and will respond first thing in the morning. For urgent matters, please call our emergency line. Have a great evening!`
    };
    
    return responses[type] || responses.text_inquiry;
  }
}

export default new BusinessService();