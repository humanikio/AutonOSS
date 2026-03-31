interface TotpEnrollmentResponse {
  success: boolean;
  data?: {
    qrCode: string;
    setupKey: string;
    backupCodes: string[];
  };
  error?: string;
}

interface TotpVerificationResponse {
  success: boolean;
  data?: {
    valid: boolean;
    enabled?: boolean;
    backupCodes?: string[];
  };
  error?: string;
}

interface TotpStatusResponse {
  success: boolean;
  data?: {
    enabled: boolean;
    enrolledAt?: string;
    backupCodesRemaining: number;
  };
  error?: string;
}

interface TotpDisableResponse {
  success: boolean;
  message?: string;
  error?: string;
}

interface BackupCodesResponse {
  success: boolean;
  data?: {
    backupCodes: string[];
  };
  message?: string;
  error?: string;
}

class TotpService {
  private apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  private baseUrl = '/api/2fa/totp';

  private async getAuthToken(): Promise<string | null> {
    // Import auth dynamically to avoid SSR issues
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

  async getStatus(): Promise<TotpStatusResponse> {
    try {
      const data = await this.request('/status');
      return data;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get TOTP status'
      };
    }
  }

  async enroll(userEmail: string): Promise<TotpEnrollmentResponse> {
    try {
      const data = await this.request('/enroll', {
        method: 'POST',
        body: JSON.stringify({ userEmail }),
      });
      return data;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start TOTP enrollment'
      };
    }
  }

  async verifyEnrollment(code: string): Promise<TotpVerificationResponse> {
    try {
      const data = await this.request('/verify-enrollment', {
        method: 'POST',
        body: JSON.stringify({ code }),
      });
      return data;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to verify enrollment'
      };
    }
  }

  async verify(code: string, isBackupCode = false): Promise<TotpVerificationResponse> {
    try {
      const data = await this.request('/verify', {
        method: 'POST',
        body: JSON.stringify({ code, isBackupCode }),
      });
      return data;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to verify TOTP code'
      };
    }
  }

  async disable(verificationCode: string): Promise<TotpDisableResponse> {
    try {
      const data = await this.request('/disable', {
        method: 'POST',
        body: JSON.stringify({ verificationCode }),
      });
      return data;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to disable TOTP'
      };
    }
  }

  async regenerateBackupCodes(verificationCode: string): Promise<BackupCodesResponse> {
    try {
      const data = await this.request('/backup-codes/regenerate', {
        method: 'POST',
        body: JSON.stringify({ verificationCode }),
      });
      return data;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to regenerate backup codes'
      };
    }
  }
}

export const totpService = new TotpService();