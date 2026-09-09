import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { connectDB } from './config/db.js';

import authRoutes from './routes/auth.js';
import leadRoutes from './routes/leads.js';
import employeeRoutes from './routes/employees.js';
import productRoutes from './routes/products.js';
import notificationRoutes from './routes/notifications.js';
import analyticsRoutes from './routes/analytics.js';
import auditRoutes from './routes/audit.js';
import commentRoutes from './routes/comments.js';
import taskRoutes from './routes/tasks.js';
import tagRoutes from './routes/tags.js';
import dashboardRoutes from './routes/dashboard.js';

import { checkAndTrashExpiredLeads } from './utils/trashService.js';
import { runAutomationEngine } from './utils/automationEngine.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
const allowedOrigins = [
  'https://lead-management-tracker.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5000',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or same-origin proxy rewrites)
      if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive CORS for smooth deployment
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/products', productRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Start Server & Connect MongoDB
const startServer = async () => {
  await connectDB();

  // Run initial 24-hour auto-trash check & setup periodic interval (every 1 min)
  await checkAndTrashExpiredLeads();
  setInterval(() => {
    checkAndTrashExpiredLeads();
  }, 60 * 1000);

  // Run automation engine every 5 minutes
  await runAutomationEngine();
  setInterval(() => {
    runAutomationEngine();
  }, 5 * 60 * 1000);

  app.listen(PORT, () => {
    console.log(`[Express Server] Server running on http://localhost:${PORT}`);
  });
};

startServer();
