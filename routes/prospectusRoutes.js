const express = require('express');
const { 
    createProspectus, 
    getProspectus,
    getProspectusByExecutiveId,
    getProspectusByRegId 
} = require('../controllers/prospectusController');
const auth = require('../middleware/auth');

const router = express.Router();

// All routes protected
router.post('/create', auth, createProspectus);
router.get('/all', auth, getProspectus);
router.get('/executive/:executiveId', auth, getProspectusByExecutiveId);
router.get('/register/:regId', auth, getProspectusByRegId);

module.exports = router;
