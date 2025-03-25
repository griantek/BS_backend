require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const entityRoutes = require('./src/routes/entityRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const commonRoutes = require('./src/routes/commonRoutes');
const editorRoutes = require('./src/routes/editorRoutes');
const leadsRoutes = require('./src/routes/leadsRoutes');
const clientRoutes = require('./src/routes/clientRoutes');

const app = express();

app.use(cors({
  origin: "https://bs-frontend-two.vercel.app", // Allow only your frontend
  methods: "GET, POST, PUT, DELETE, OPTIONS",
  allowedHeaders: "Content-Type, Authorization",
  credentials: true // Allow cookies & authentication headers
}));

app.use(bodyParser.json());

// Add health check route before other routes
app.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0'
    });
});

// API Routes
app.use('/api/entity', entityRoutes); // Keep original prospectus route path but use entity router
app.use('/api/admin', adminRoutes);  // Only this route for both admin and services
app.use('/api/common', commonRoutes);  // Changed from finance to common
app.use('/api/editor', editorRoutes); // Add editor routes
app.use('/api/leads', leadsRoutes); // Add leads routes
app.use('/api/clients', clientRoutes); // Add client routes

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
