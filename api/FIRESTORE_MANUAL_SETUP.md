# Manual Firestore Setup for Auton OTP Phone Number

## 🔥 Firebase Console Setup Instructions

### Step 1: Access Firestore
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **your-firebase-project-id**
3. Click on **Firestore Database** in the left sidebar
4. Click **Start collection**

### Step 2: Create Collection Structure
1. **Collection ID**: `admin`
2. Click **Next**

### Step 3: Create First Document
1. **Document ID**: `global`
2. Add field:
   - **Field**: `placeholder`
   - **Type**: `string`
   - **Value**: `admin`
3. Click **Save**

### Step 4: Create Sub-collection
1. Click on the `global` document you just created
2. Click **Start collection**
3. **Collection ID**: `phoneNumbers`
4. Click **Next**

### Step 5: Add Phone Number Document
1. **Document ID**: `PNec5f195cf7c4e370a3ae5eaef4b31a71`
2. Add the following fields exactly:

```
capabilities (map):
  ├── fax (boolean): false
  ├── mms (boolean): true
  ├── sms (boolean): true
  └── voice (boolean): true

countryCode (string): US
createdAt (string): 2025-08-21T20:16:22-04:00
description (string): Designated Auton phone number for OTP/2FA SMS sending
friendlyName (string): Phone Number +1XXXXXXXXXX
isOtpDesignated (boolean): true
numberType (string): local
phoneNumber (string): +1XXXXXXXXXX
purchasedAt (string): 2025-08-21T20:16:22-04:00
sessionId (string): cs_test_1755821782047
setupAt (timestamp): [current date/time]
status (string): active
twilioSid (string): PNec5f195cf7c4e370a3ae5eaef4b31a71
updatedAt (timestamp): [current date/time]
```

### Step 6: Verify Setup
Your final Firestore structure should look like:
```
admin/
└── global/
    └── phoneNumbers/
        └── PNec5f195cf7c4e370a3ae5eaef4b31a71/
            ├── capabilities: {fax: false, mms: true, sms: true, voice: true}
            ├── countryCode: "US"
            ├── phoneNumber: "+1XXXXXXXXXX"
            ├── status: "active"
            ├── twilioSid: "PNec5f195cf7c4e370a3ae5eaef4b31a71"
            └── ... (other fields)
```

## 🎉 Once Complete
- The SMS OTP system will automatically use +1XXXXXXXXXX for all 2FA messages
- All tenants will receive OTP codes from this designated Auton number
- No more tenant-specific phone number requirements for 2FA

## 🔍 Testing
After setup, test the SMS OTP flow in your frontend - it should now use the global Auton phone number!