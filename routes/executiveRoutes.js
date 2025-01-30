const express = require('express');
const { 
    createExecutive, 
    loginExecutive, 
    getAllExecutives,
    createProspectus,
    getProspectus,
    getProspectusByExecutiveId,
    getProspectusByRegId
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
router.get('/prospectus/executive/:executiveId', auth, getProspectusByExecutiveId);
router.get('/prospectus/register/:regId', auth, getProspectusByRegId);

module.exports = router;
