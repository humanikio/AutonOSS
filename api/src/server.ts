import dotenv from 'dotenv';

// Load environment variables FIRST
dotenv.config();

import express, { Application, Request, Response } from 'express';
import { PromptGenerationService } from './services/promptGenerationService';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

// Import main routes
import apiRoutes from './routes';

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';

const app: Application = express();
const PORT = process.env.PORT || 8000;

// Trust proxy for accurate IP addresses (required for rate limiting)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(compression());

// CORS configuration
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'http://localhost:3000'
];

app.use(cors({
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id', 'x-internal-service']
}));

// Rate limiting - Stripe-style (100 requests per second per IP)
const limiter = rateLimit({
  windowMs: 1000, // 1 second window
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // 100 requests per second
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipFailedRequests: true,
  skipSuccessfulRequests: false,
  // Skip rate limiting in development
  skip: () => {
    return process.env.NODE_ENV === 'development';
  }
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(requestLogger);

// Root endpoint for Render health checks (HEAD /)
app.head('/', (_req: Request, res: Response) => {
  res.status(200).end();
});

// Root endpoint (GET /)
app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    name: 'PulseLine Backend API',
    status: 'OK',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    documentation: '/health'
  });
});

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: '1.0.0'
  });
});

// API Routes
app.use('/api', apiRoutes);

// 404 handler
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Error handling middleware
app.use(errorHandler);

// Initialize services
PromptGenerationService.initialize();

// Start server
app.listen(PORT, () => {
  console.log(`🚀 PulseLine Backend Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
  console.log(`📝 API Documentation: http://localhost:${PORT}/health`);
  console.log(`🤖 OpenAI Integration: ${process.env.OPENAI_API_KEY ? 'Enabled' : 'Disabled (using fallback templates)'}`);
});

export default app;