import { Request, Response, NextFunction } from 'express';

export interface CustomError extends Error {
  statusCode?: number;
  code?: string;
}

export const errorHandler = (
  error: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('Error:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Default error
  let statusCode = error.statusCode || 500;
  let message = error.message || 'Internal Server Error';

  // Firebase specific errors
  if (error.code === 'auth/user-not-found') {
    statusCode = 404;
    message = 'User not found';
  } else if (error.code === 'auth/wrong-password') {
    statusCode = 401;
    message = 'Invalid credentials';
  } else if (error.code === 'auth/email-already-exists') {
    statusCode = 409;
    message = 'Email already exists';
  } else if (error.code === 'auth/invalid-email') {
    statusCode = 400;
    message = 'Invalid email format';
  }

  // Firestore specific errors
  if (error.code === 'permission-denied') {
    statusCode = 403;
    message = 'Permission denied';
  } else if (error.code === 'not-found') {
    statusCode = 404;
    message = 'Resource not found';
  }

  // Validation errors
  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
  }

  res.status(statusCode).json({
    success: false,
    error: message,
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && { 
      stack: error.stack,
      details: error 
    })
  });
};