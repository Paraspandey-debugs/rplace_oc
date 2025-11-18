import rateLimit from 'express-rate-limit'

export const placementLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 requests per windowMs
  message: { ok: false, error: 'rate-limit', retryAfter: 60 },
  standardHeaders: true,
  legacyHeaders: false,
})

export const snapshotLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute for snapshots
  message: { ok: false, error: 'rate-limit', retryAfter: 60 },
  standardHeaders: true,
  legacyHeaders: false,
})