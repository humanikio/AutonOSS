import * as dotenv from 'dotenv';
import FormData from 'form-data';
import axios from 'axios';

// Load environment variables
dotenv.config();

/**
 * Script to fetch a stored email from Mailgun and re-send it to our inbound webhook
 * This is useful for testing or re-processing emails that failed initially
 *
 * Usage: npx tsx scripts/refetchMailgunEmail.ts
 */

const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY;
// Use localhost for testing the fixed code before deploying
const API_BASE_URL = process.env.TEST_LOCAL === 'true'
  ? 'http://localhost:8000'
  : (process.env.API_BASE_URL || 'http://localhost:8000');

// Email storage details from the webhook event
const STORAGE_URL = 'https://storage-us-west1.api.mailgun.net/v3/domains/humanik.io/messages/BAAkAQGOY-dO4jY4XFJI_KHc9peuzNw4ag';
const RECIPIENT_EMAIL = 'c3ViLTg5YmIwZDcwLWJjYjAtNDJlYS04ZGFkLTdjODBkYWE2MGU1ZC5jMTk1YTMxYy0yOTExLTQ1NzMtYWM5MC04Y2EwMWJkZjE2ZGMuM2UwMWVlYjUtNjlhOC00Y2Y4LWJmZTYtZDg3ZDA4YTY1N2I2.6fb9b877@humanik.io';

async function fetchAndResendEmail() {
  try {
    console.log('🔍 Fetching stored email from Mailgun...');
    console.log(`Storage URL: ${STORAGE_URL}`);

    if (!MAILGUN_API_KEY) {
      throw new Error('MAILGUN_API_KEY not found in environment variables');
    }

    // Step 1: Fetch the stored MIME message from Mailgun
    const response = await axios.get(STORAGE_URL, {
      auth: {
        username: 'api',
        password: MAILGUN_API_KEY
      },
      responseType: 'json' // Mailgun returns the parsed email data
    });

    console.log('✅ Email fetched successfully from Mailgun storage');
    console.log('📧 Email details:', {
      sender: response.data.sender,
      recipient: response.data.recipient,
      subject: response.data.subject,
      attachmentCount: response.data.attachments?.length || 0
    });

    // Step 2: Prepare form data to POST to our webhook
    const form = new FormData();

    // Add all the email metadata fields (ensure all values are strings)
    const appendField = (key: string, value: any) => {
      if (value !== undefined && value !== null) {
        form.append(key, String(value));
      }
    };

    appendField('recipient', response.data.recipient || RECIPIENT_EMAIL);
    appendField('sender', response.data.sender);
    appendField('from', response.data.from || response.data.sender);
    appendField('subject', response.data.subject);
    appendField('body-plain', response.data['body-plain'] || response.data['body-text']);
    appendField('body-html', response.data['body-html']);
    appendField('stripped-text', response.data['stripped-text']);
    appendField('stripped-html', response.data['stripped-html']);
    appendField('Message-Id', response.data['Message-Id']);
    appendField('In-Reply-To', response.data['In-Reply-To']);
    appendField('References', response.data['References']);

    if (response.data['message-headers']) {
      appendField('message-headers', JSON.stringify(response.data['message-headers']));
    }

    if (response.data['content-id-map']) {
      const cidMap = typeof response.data['content-id-map'] === 'string'
        ? response.data['content-id-map']
        : JSON.stringify(response.data['content-id-map']);
      appendField('content-id-map', cidMap);
    }

    // Add authentication fields (generate new ones for testing)
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const token = Math.random().toString(36).substring(2);

    form.append('timestamp', timestamp);
    form.append('token', token);

    // Generate signature (HMAC SHA256)
    const crypto = require('crypto');
    const webhookSecret = process.env.MAILGUN_INBOUND_WEBHOOK_SECRET;
    if (webhookSecret) {
      const signature = crypto
        .createHmac('sha256', webhookSecret)
        .update(`${timestamp}${token}`)
        .digest('hex');
      form.append('signature', signature);
    }

    // Step 3: Download and attach files if present
    if (response.data.attachments && response.data.attachments.length > 0) {
      console.log(`📎 Processing ${response.data.attachments.length} attachments...`);

      for (let i = 0; i < response.data.attachments.length; i++) {
        const attachment = response.data.attachments[i];
        console.log(`  - Downloading: ${attachment.name} (${attachment['content-type']})`);

        try {
          // Download the attachment from Mailgun
          const attachmentResponse = await axios.get(attachment.url, {
            auth: {
              username: 'api',
              password: MAILGUN_API_KEY
            },
            responseType: 'arraybuffer'
          });

          // Add to form data as a buffer with proper options
          const buffer = Buffer.from(attachmentResponse.data);
          form.append(`attachment-${i + 1}`, buffer, {
            filename: attachment.name || `attachment-${i + 1}`,
            contentType: attachment['content-type'] || 'application/octet-stream',
            knownLength: buffer.length
          });

          console.log(`  ✅ Downloaded: ${attachment.name}`);
        } catch (error) {
          console.error(`  ❌ Failed to download ${attachment.name}:`, error);
        }
      }
    }

    // Step 4: Send to our webhook endpoint
    const webhookUrl = `${API_BASE_URL}/api/webhook/email/inbound`;
    console.log(`\n📤 Sending email to webhook: ${webhookUrl}`);

    const webhookResponse = await axios.post(webhookUrl, form, {
      headers: {
        ...form.getHeaders()
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity
    });

    console.log('✅ Email sent to webhook successfully');
    console.log('Response:', webhookResponse.data);

  } catch (error) {
    console.error('❌ Error:', error);
    if (axios.isAxiosError(error)) {
      console.error('Response data:', error.response?.data);
      console.error('Response status:', error.response?.status);
    }
  }
}

// Run the script
fetchAndResendEmail();
