interface ElevenLabsPhoneNumberResponse {
  phone_number_id: string;
}

interface CreateTwilioPhoneNumberRequest {
  phone_number: string;
  label: string;
  sid: string;
  token: string;
}

export async function update11LabsAgentNumber(
  phoneNumber: string,
  twilioSid: string,
  agentName: string
): Promise<string> {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    
    if (!apiKey) {
      throw new Error('ELEVENLABS_API_KEY environment variable is not set');
    }

    if (!twilioSid) {
      throw new Error('Twilio SID is required for 11Labs phone number import');
    }

    // First, check if the phone number already exists in 11Labs
    const existingPhoneNumber = await checkExisting11LabsPhoneNumber(phoneNumber);
    if (existingPhoneNumber) {
      console.log(`Phone number ${phoneNumber} already exists in 11Labs with ID: ${existingPhoneNumber}`);
      return existingPhoneNumber;
    }

    // Import the phone number to 11Labs
    const requestBody: CreateTwilioPhoneNumberRequest = {
      phone_number: phoneNumber,
      label: `${agentName} - ${phoneNumber}`,
      sid: process.env.TWILIO_ACCOUNT_SID || '',
      token: process.env.TWILIO_AUTH_TOKEN || ''
    };

    console.log('11Labs request body:', JSON.stringify(requestBody, null, 2));
    console.log('TWILIO_ACCOUNT_SID:', process.env.TWILIO_ACCOUNT_SID);
    console.log('TWILIO_AUTH_TOKEN:', process.env.TWILIO_AUTH_TOKEN ? 'SET' : 'NOT SET');

    const response = await fetch('https://api.elevenlabs.io/v1/convai/phone-numbers', {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json() as ElevenLabsPhoneNumberResponse;
    
    console.log(`Successfully imported phone number ${phoneNumber} to 11Labs with ID: ${data.phone_number_id}`);
    
    return data.phone_number_id;
  } catch (error) {
    console.error('Error updating 11Labs agent phone number:', error);
    throw new Error(`Failed to update 11Labs agent phone number: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Helper function to check if phone number already exists
async function checkExisting11LabsPhoneNumber(phoneNumber: string): Promise<string | null> {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    
    if (!apiKey) {
      return null;
    }

    const response = await fetch('https://api.elevenlabs.io/v1/convai/phone-numbers', {
      method: 'GET',
      headers: {
        'xi-api-key': apiKey
      }
    });

    if (!response.ok) {
      console.log('Could not check existing phone numbers in 11Labs');
      return null;
    }

    const data = await response.json() as any;
    
    // Check if the phone number already exists
    if (data.phone_numbers && Array.isArray(data.phone_numbers)) {
      const existingNumber = data.phone_numbers.find((pn: any) => pn.phone_number === phoneNumber);
      return existingNumber ? existingNumber.phone_number_id : null;
    }
    
    return null;
  } catch (error) {
    console.log('Error checking existing phone numbers:', error);
    return null;
  }
}