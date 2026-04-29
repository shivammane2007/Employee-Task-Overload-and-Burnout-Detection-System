/**
 * =====================================================
 * Express Server - Entry Point
 * Employee Task Overload and Burnout Detection System
 * =====================================================
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const http = require('http');
const { Server } = require('socket.io');

// Import database
const db = require('./config/db');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const taskRoutes = require('./routes/tasks');
const workloadRoutes = require('./routes/workload');
const alertRoutes = require('./routes/alerts');
const reportRoutes = require('./routes/reports');
const configRoutes = require('./routes/config');
const notificationRoutes = require('./routes/notificationRoutes');
const notificationService = require('./services/notificationService');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST']
    }
});

// Pass IO to the notification service
notificationService.initSocket(io);

// Socket.io Connection Handler
io.on('connection', (socket) => {
    // When a user logs in / connects, they emit "register" with their user ID
    socket.on('register', (userId) => {
        socket.join(`user_${userId}`);
        console.log(`📡 User ${userId} joined their notification room`);
    });

    socket.on('disconnect', () => {
        // Rooms are automatically left upon disconnect
    });
});

// =====================================================
// MIDDLEWARE CONFIGURATION
// =====================================================

// Security headers
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Request logging
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined'));
}

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting - only apply in production
if (process.env.NODE_ENV === 'production') {
    const limiter = rateLimit({
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
        max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
        message: {
            success: false,
            message: 'Too many requests, please try again later.'
        },
        standardHeaders: true,
        legacyHeaders: false
    });
    app.use('/api/', limiter);
}

// =====================================================
// API ROUTES
// =====================================================

// Health check endpoint
app.get('/api/health', async (req, res) => {
    try {
        const dbHealthy = await db.checkHealth();
        res.json({
            success: true,
            status: 'healthy',
            timestamp: new Date().toISOString(),
            database: dbHealthy ? 'connected' : 'disconnected',
            environment: process.env.NODE_ENV || 'development'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            status: 'unhealthy',
            error: error.message
        });
    }
});

// API version info
app.get('/api', (req, res) => {
    res.json({
        success: true,
        name: 'SEAPM API',
        description: 'Employee Task Overload and Burnout Detection System',
        version: '1.0.0',
        endpoints: {
            auth: '/api/auth',
            users: '/api/users',
            tasks: '/api/tasks',
            workload: '/api/workload',
            alerts: '/api/alerts',
            reports: '/api/reports',
            config: '/api/config'
        }
    });
});

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/workload', workloadRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/config', configRoutes);
app.use('/api/notifications', notificationRoutes);

// =====================================================
// ERROR HANDLING
// =====================================================

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.method} ${req.url} not found`
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('❌ Error:', err);

    // Handle specific error types
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: err.errors
        });
    }

    if (err.name === 'UnauthorizedError') {
        return res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
    }

    // Database errors
    if (err.code === '23505') { // Unique violation
        return res.status(400).json({
            success: false,
            message: 'Duplicate entry error'
        });
    }

    if (err.code === '23503') { // Foreign key violation
        return res.status(400).json({
            success: false,
            message: 'Referenced record not found'
        });
    }

    // Default error response
    res.status(err.status || 500).json({
        success: false,
        message: process.env.NODE_ENV === 'development'
            ? err.message
            : 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// =====================================================
// SERVER STARTUP
// =====================================================

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        // Test database connection
        const dbConnected = await db.checkHealth();

        if (!dbConnected) {
            console.error('❌ Cannot connect to database. Please check your configuration.');
            process.exit(1);
        }

        console.log('✅ Database connection established');

        // Start HTTP server
        server.listen(PORT, () => {
            console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 SEAPM Backend Server Started                         ║
║                                                           ║
║   Environment: ${(process.env.NODE_ENV || 'development').padEnd(40)}║
║   Port: ${String(PORT).padEnd(48)}║
║   API URL: http://localhost:${String(PORT).padEnd(29)}║
║   WebSockets: Enabled (Socket.io)                         ║
║                                                           ║
║   Endpoints:                                              ║
║   • Auth:     /api/auth                                   ║
║   • Users:    /api/users                                  ║
║   • Tasks:    /api/tasks                                  ║
║   • Workload: /api/workload                               ║
║   • Alerts:   /api/alerts                                 ║
║   • Reports:  /api/reports                                ║
║   • Config:   /api/config                                 ║
║   • Notification:/api/notifications                       ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
            `);
        });

    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

// Handle graceful shutdown
process.on('SIGTERM', async () => {
    console.log('🛑 SIGTERM received, shutting down gracefully...');
    await db.closePool();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('🛑 SIGINT received, shutting down gracefully...');
    await db.closePool();
    process.exit(0);
});

// Start the server
startServer();

module.exports = server;
