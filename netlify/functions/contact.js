/**
 * 📧 Netlify Function: Contact Form Handler
 * Processes contact form submissions with spam protection
 */

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const data = JSON.parse(event.body);
    const { name, email, subject, message, honeypot } = data;

    // Basic spam protection - honeypot field
    if (honeypot) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Spam detected' })
      };
    }

    // Validation
    if (!name || !email || !message) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields' })
      };
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid email format' })
      };
    }

    // Rate limiting (simple implementation)
    const userAgent = event.headers['user-agent'] || '';
    const clientIP = event.headers['client-ip'] || event.headers['x-forwarded-for'] || '';

    // Here you could integrate with your email service (SendGrid, Mailgun, etc.)
    // For now, we'll just log and return success

    console.log('Contact form submission:', {
      name,
      email,
      subject: subject || 'No subject',
      message: message.substring(0, 100) + '...',
      clientIP,
      userAgent,
      timestamp: new Date().toISOString()
    });

    // In a real implementation, you'd send the email here
    // Example with SendGrid:
    /*
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    
    const msg = {
      to: 'joachimaross@gmail.com',
      from: 'noreply@zeeky.ai',
      subject: `Contact Form: ${subject || 'New Message'}`,
      html: `
        <h3>New Contact Form Submission</h3>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Subject:</strong> ${subject || 'No subject'}</p>
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, '<br>')}</p>
        <hr>
        <p><small>Submitted at: ${new Date().toISOString()}</small></p>
      `
    };
    
    await sgMail.send(msg);
    */

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Thank you for your message! We will get back to you soon.',
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('Contact form error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: 'Failed to process contact form'
      })
    };
  }
};