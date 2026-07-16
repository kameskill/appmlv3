require('dotenv').config()

const express = require('express')
const cors = require('cors')
const rateLimit = require('express-rate-limit')
const connectDB = require('./config/db')

const app = express()

// Connect to MongoDB
connectDB()

// ─────────────────────────────────────────────────────────────
// CORS
// ─────────────────────────────────────────────────────────────

const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'http://localhost:5173',
    'http://localhost:3000'
]

app.use(
    cors({
        origin: (origin, callback) => {
            // Allow requests without an origin, such as Postman.
            if (!origin || allowedOrigins.includes(origin)) {
                return callback(null, true)
            }

            return callback(new Error('Not allowed by CORS'))
        },
        credentials: true
    })
)

// ─────────────────────────────────────────────────────────────
// Body parsing
// ─────────────────────────────────────────────────────────────

app.use(express.json({ limit: '10kb' }))
app.use(express.urlencoded({ extended: false }))

// Rate limiting is disabled locally.
const isProduction = process.env.NODE_ENV === 'production'

// ─────────────────────────────────────────────────────────────
// Rate limiters
// ─────────────────────────────────────────────────────────────

// General API limiter for production.
// This is intentionally generous because the dashboard loads
// several API resources at the same time.
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,

    standardHeaders: true,
    legacyHeaders: false,

    // Disable this limiter during local development.
    skip: () => !isProduction,

    message: {
        success: false,
        message: 'Too many requests. Please wait a moment and try again.'
    }
})

// Login and password-reset verification protection
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,

    standardHeaders: true,
    legacyHeaders: false,

    skip: () => !isProduction,

    message: {
        success: false,
        message: 'Too many authentication attempts. Please try again later.'
    }
})

// OTP request protection
const otpLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 5,

    standardHeaders: true,
    legacyHeaders: false,

    skip: () => !isProduction,

    message: {
        success: false,
        message: 'Too many OTP requests. Please wait before requesting another code.'
    }
})

// Only appointment creation should use this limiter.
// Reading bookings and checking available slots should not count.
const bookingLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 20,

    standardHeaders: true,
    legacyHeaders: false,

    skip: () => !isProduction,

    message: {
        success: false,
        message: 'Too many booking attempts. Please try again later.'
    }
})

// Contact-form protection
const contactLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,

    standardHeaders: true,
    legacyHeaders: false,

    skip: () => !isProduction,

    message: {
        success: false,
        message: 'Too many messages sent. Please try again later.'
    }
})

// ─────────────────────────────────────────────────────────────
// Selective limiter middleware
// ─────────────────────────────────────────────────────────────

const applyAuthLimiter = (req, res, next) => {
    if (req.method !== 'POST') {
        return next()
    }

    // Apply the stricter OTP limiter only to OTP-sending routes.
    if (
        req.path === '/register/send-otp' ||
        req.path === '/password/send-otp'
    ) {
        return otpLimiter(req, res, next)
    }

    // Apply authentication limiting to login and password reset.
    if (
        req.path === '/login' ||
        req.path === '/password/reset'
    ) {
        return authLimiter(req, res, next)
    }

    return next()
}

const applyBookingLimiter = (req, res, next) => {
    // Limit only POST /api/appointments.
    // GET /my and GET /availability are not limited by this.
    if (req.method === 'POST' && req.path === '/') {
        return bookingLimiter(req, res, next)
    }

    return next()
}

const applyContactLimiter = (req, res, next) => {
    if (req.method === 'POST' && req.path === '/') {
        return contactLimiter(req, res, next)
    }

    return next()
}

// ─────────────────────────────────────────────────────────────
// General production API protection
// ─────────────────────────────────────────────────────────────

app.use('/api', apiLimiter)

// ─────────────────────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────────────────────

app.use(
    '/api/auth',
    applyAuthLimiter,
    require('./routes/auth')
)

app.use(
    '/api/appointments',
    applyBookingLimiter,
    require('./routes/appointments')
)

app.use(
    '/api/admin',
    require('./routes/admin')
)

app.use(
    '/api/contact',
    applyContactLimiter,
    require('./routes/contact')
)

app.use(
    '/api/notifications',
    require('./routes/notifications')
)

// ─────────────────────────────────────────────────────────────
// Health check
// ─────────────────────────────────────────────────────────────

app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Timmy Tails API is running',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
    })
})

// ─────────────────────────────────────────────────────────────
// 404 handler
// ─────────────────────────────────────────────────────────────

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    })
})

// ─────────────────────────────────────────────────────────────
// Global error handler
// ─────────────────────────────────────────────────────────────

app.use((err, req, res, next) => {
    console.error(err.stack || err)

    res.status(500).json({
        success: false,
        message:
            process.env.NODE_ENV === 'production'
                ? 'Server error'
                : err.message
    })
})

// ─────────────────────────────────────────────────────────────
// Start server
// ─────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
    console.log(
        `🐾 Timmy Tails API running on port ${PORT} ` +
        `[${process.env.NODE_ENV || 'development'}]`
    )
})

module.exports = app