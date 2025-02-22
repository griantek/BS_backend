require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const executiveRoutes = require('./routes/executiveRoutes');
const superAdminRoutes = require('./routes/superAdminRoutes');
const commonRoutes = require('./routes/commonRoutes');
const editorRoutes = require('./routes/editorRoutes');

const app = express();

app.use(cors({
  origin: "https://bs-frontend-two.vercel.app", // Allow only your frontend
  methods: "GET, POST, PUT, DELETE, OPTIONS",
  allowedHeaders: "Content-Type, Authorization",
  credentials: true // Allow cookies & authentication headers
}));

app.use(bodyParser.json());

// Add health check route before other routes
app.get('/test', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0'
    });
});

// API Routes
app.use('/api/executive', executiveRoutes); // Keep original prospectus route path but use executive router
app.use('/api/superadmin', superAdminRoutes);  // Only this route for both superadmin and services
app.use('/api/common', commonRoutes);  // Changed from finance to common
app.use('/api/editor', editorRoutes); // Add editor routes

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
