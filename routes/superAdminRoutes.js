const express = require('express');
const { 
    loginSuperAdmin, 
    createSuperAdmin,
    createService,
    getAllServices
} = require('../controllers/superAdminController');
const auth = require('../middleware/auth');

const router = express.Router();

// Public SuperAdmin routes
router.post('/login', loginSuperAdmin);
router.post('/create', createSuperAdmin);

// Protected Service routes
router.post('/services/create', auth, createService);
router.get('/services/all', auth, getAllServices);

module.exports = router;
