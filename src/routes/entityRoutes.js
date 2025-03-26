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
    updateProspectus,
    getAllEditors,
    updateExecutive,
    loginLeads, // Add this import
    getAllEntites,
    getAllAuthors
} = require('../controllers/entityController');
const auth = require('../middleware/auth');

const router = express.Router();

// Executive routes
router.post('/create', createExecutive);
router.post('/login', loginExecutive);
router.get('/all', auth, getAllEntites);
router.put('/:id', auth, updateExecutive);

// Leads login route
router.post('/leads/login', loginLeads); // Add this new route

// Prospectus routes (now handled by executive)
router.post('/prospectus/create', auth, createProspectus);
router.get('/prospectus/all', auth, getProspectus);
router.get('/prospectus/:executiveId', auth, getProspectusByExecutiveId);
router.get('/prospectus/register/:regId', auth, getProspectusByRegId);
router.put('/prospectus/:id', auth, updateProspectus); // Add this new route

// Update the registration route to support pagination query parameters
router.get('/registrations/:executiveId', auth, getRegistrationsByExecutiveId);

// Add this new route with your other routes
router.get('/editors/all', getAllEditors);
router.get('/author/all', getAllAuthors);
router.get('/exec/all', getAllExecutives);

module.exports = router;
