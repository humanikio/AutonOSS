# PulseLine Backend API

## Setup Instructions

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Firebase Setup
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `your-firebase-project-id`
3. Go to Project Settings → Service Accounts
4. Generate new private key
5. Copy the credentials to `.env` file

### 3. Environment Variables
Copy `.env.example` to `.env` and fill in:
- `FIREBASE_PRIVATE_KEY`: From Firebase service account
- `FIREBASE_CLIENT_EMAIL`: From Firebase service account  
- `JWT_SECRET`: Generate a secure random string

### 4. Start Development Server
```bash
npm run dev
```

Server will run on: http://localhost:8000

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create account
- `POST /api/auth/login` - Login  
- `GET /api/auth/profile` - Get user profile (protected)
- `POST /api/auth/logout` - Logout (protected)

### Health Check
- `GET /health` - Server health status

## Project Structure
```
src/
├── config/          # Firebase configuration
├── controllers/     # Route controllers
├── middleware/      # Auth, logging, error handling
├── routes/          # API route definitions
└── server.ts        # Main server file
```

## Security Features
- JWT token authentication
- Tenant-based data isolation
- Rate limiting
- Request validation
- Error handling
- CORS protection

## Testing
```bash
# Test signup
curl -X POST http://localhost:8000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password123","companyName":"Test Corp"}'

# Test login  
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password123"}'
```