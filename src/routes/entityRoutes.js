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
    loginLeads,
    getAllEntites,
    getAllAuthors,
    getAllEditorsAndAuthors,
    updateUserProfile,
    verifyPassword,
    changePassword,
    getJournalDataByExecutive,
    deleteEntity,
    deleteProspectus,
    softDeleteProspectus,
    restoreProspectus,
    getDeletedProspectus
} = require('../controllers/entityController');
const auth = require('../middleware/auth');

const router = express.Router();

// Executive routes
router.post('/create', createExecutive);
router.post('/login', loginExecutive);
router.put('/:id', auth, updateExecutive);

// Leads login route
router.post('/leads/login', loginLeads);

// Prospectus routes (now handled by executive)
router.post('/prospectus/create', auth, createProspectus);
router.get('/prospectus/all', auth, getProspectus);
router.get('/prospectus/:executiveId', auth, getProspectusByExecutiveId);
router.get('/prospectus/register/:regId', auth, getProspectusByRegId);
router.put('/prospectus/:id', auth, updateProspectus);
router.delete('/prospectus/delete', auth, deleteProspectus);

// Add new soft delete and restore routes
router.put('/prospectus/:id/soft-delete', auth, softDeleteProspectus);
router.put('/prospectus/:id/restore', auth, restoreProspectus);
router.get('/prospectus/deleted/all', auth, getDeletedProspectus);

// Update the registration route to support pagination query parameters
router.get('/registrations/:executiveId', auth, getRegistrationsByExecutiveId);

// Add this new route with your other routes
router.get('/all', auth, getAllEntites);
router.get('/editors/all', getAllEditors);
router.get('/author/all', getAllAuthors);
router.get('/exec/all', getAllExecutives);
router.get('/editors-authors/all',  getAllEditorsAndAuthors);

// Add new routes for profile management
router.post('/verify-password', auth, verifyPassword);
router.put('/:id/user-profile', auth, updateUserProfile);
router.put('/:id/change-password', auth, changePassword);

// Add this route for getting journal data from leads
router.post('/journal-data-by-executive',  getJournalDataByExecutive);

// Add the new route for entity deletion
router.delete('/:id', auth, deleteEntity);

module.exports = router;
