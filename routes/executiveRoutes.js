const express = require('express');
const { 
    createExecutive, 
    loginExecutive, 
    getAllExecutives,
    createProspectus,
    getProspectus,
    getProspectusByExecutiveId,
    getProspectusByRegId,
    getRegistrationsByExecutiveId,
    updateProspectus
} = require('../controllers/executiveController');
const auth = require('../middleware/auth');

const router = express.Router();

// Executive routes
router.post('/create', createExecutive);
router.post('/login', loginExecutive);
router.get('/all', auth, getAllExecutives);

// Prospectus routes (now handled by executive)
router.post('/prospectus/create', auth, createProspectus);
router.get('/prospectus/all', auth, getProspectus);
router.get('/prospectus/:executiveId', auth, getProspectusByExecutiveId);
router.get('/prospectus/register/:regId', auth, getProspectusByRegId);
router.put('/prospectus/:id', auth, updateProspectus); // Add this new route

// Add new registration route
router.get('/registrations/:executiveId', auth, getRegistrationsByExecutiveId);

module.exports = router;
