require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const executiveRoutes = require('./routes/executiveRoutes');
const superAdminRoutes = require('./routes/superAdminRoutes');

const app = express();

app.use(cors());
app.use(bodyParser.json());

// API Routes
app.use('/api/executive', executiveRoutes);
app.use('/api/prospectus', executiveRoutes); // Keep original prospectus route path but use executive router
app.use('/api/superadmin', superAdminRoutes);  // Only this route for both superadmin and services

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
