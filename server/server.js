require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');

const { initSocket } = require('./socket');
const apiRoutes = require('./routes/api');

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
  }
});
initSocket(io);

// Middlewares
app.use(cors());
app.use(express.json());

// Request logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== 'test') {
      console.log(`[${req.method}] ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    project: 'FeastHub — Online Food Delivery & Live Table Reservation Engine',
    database: 'Cloudflare D1 / SQLite Engine'
  });
});

// Mount API routes
app.use('/api', apiRoutes);

// Serve frontend client build if available
const path = require('path');
const fs = require('fs');
const clientDist = path.join(__dirname, '../client/dist');

if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
      return next();
    }
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

const PORT = process.env.PORT || 5000;
if (!server.listening) {
  server.listen(PORT, () => {
    console.log(`===================================================`);
    console.log(` FeastHub Full-Stack Server running on port ${PORT}`);
    console.log(` Web App: http://localhost:${PORT}`);
    console.log(` REST API: http://localhost:${PORT}/api`);
    console.log(` Live Socket.IO: Connected`);
    console.log(` Database: Cloudflare D1 / SQLite Engine`);
    console.log(`===================================================`);
  });
}

module.exports = { app, server };
