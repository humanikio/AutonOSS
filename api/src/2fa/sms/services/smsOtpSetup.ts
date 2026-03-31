// Main SMS OTP Setup Service
// This file orchestrates the SMS OTP setup process

export { verifyPhoneFormat, maskPhoneNumber, type PhoneValidationResult } from './smsOtpSetup/verifyPhoneFormat';
export { sendTestCode } from './smsOtpSetup/sendTestCode';
export { verifyTestNumber } from './smsOtpSetup/verifyTestNumber';
export { saveConfig } from './smsOtpSetup/saveConfig';