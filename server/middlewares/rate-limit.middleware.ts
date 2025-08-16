import rateLimit from 'express-rate-limit';

export const rateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: process.env.NODE_ENV === 'development' ? 1000 : 100, // More permissive in development
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Extract IP from request, handling cases where IP includes port
    const forwarded = req.headers['x-forwarded-for'];
    const ip = forwarded ? forwarded.toString().split(',')[0].trim() : req.ip || req.connection.remoteAddress || 'unknown';
    // Remove port if present (format: IP:port)
    return ip.split(':')[0];
  },
  message: {
    error: 'Too many requests, please try again later.',
    retryAfter: 60
  }
});

