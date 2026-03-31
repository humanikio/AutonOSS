interface SmsOtpSetupResponse {
  success: boolean;
  data?: {
    testCodeSent: boolean;
  };
  error?: string;
  message?: string;
}

interface SmsOtpSetupContinueResponse {
  success: boolean;
  data?: {
    enabled: boolean;
    verified: boolean;
  };
  error?: string;
  message?: string;
}

interface SmsOtpStatusResponse {
  success: boolean;
  data?: {
    enabled: boolean;
    phoneNumber?: string; // Masked phone number
    enrolledAt?: string;
  };
  error?: string;
}

class SmsOtpService {
  private apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  private baseUrl = '/api/2fa/sms';

  private async getAuthToken(): Promise<string | null> {
    try {
      const { auth } = await import('@/lib/firebase/firebase');
      if (auth.currentUser) {
        const token = await auth.currentUser.getIdToken();
        return token;
      }
      return null;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const token = await this.getAuthToken();
    if (!token) {
      throw new Error('No authentication token available');
    }

    const url = `${this.apiUrl}${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
      ...options,
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || `HTTP error! status: ${response.status}`);
    }
    
    return data;
  }

  async setupSmsOtp(phoneNumber: string): Promise<SmsOtpSetupResponse> {
    try {
      const data = await this.request('/setup', {
        method: 'POST',
        body: JSON.stringify({ phoneNumber }),
      });
      return data;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to setup SMS OTP'
      };
    }
  }

  async setupContinue(phoneNumber: string, testCode: string): Promise<SmsOtpSetupContinueResponse> {
    try {
      const data = await this.request('/setup-continue', {
        method: 'POST',
        body: JSON.stringify({ phoneNumber, testCode }),
      });
      return data;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to complete SMS OTP setup'
      };
    }
  }

  async getStatus(): Promise<SmsOtpStatusResponse> {
    try {
      const data = await this.request('/status');
      return data;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get SMS OTP status'
      };
    }
  }
}

export const smsOtpService = new SmsOtpService();