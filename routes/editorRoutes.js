const express = require('express');
const { 
    loginEditor,
    getAllJournalData,
    getJournalDataById,
    createJournalData,
    updateJournalData,
    deleteJournalData,
    triggerStatusUpload
} = require('../controllers/editorController');
const auth = require('../middleware/auth');

const router = express.Router();

// Public routes
router.post('/login', loginEditor);

// Journal Data routes
router.get('/journal-data/all',  getAllJournalData);
router.get('/journal-data/:id', auth, getJournalDataById);
router.post('/journal-data/create', auth, createJournalData);
router.put('/journal-data/:id', auth, updateJournalData);
router.delete('/journal-data/:id', auth, deleteJournalData);

// Status Upload route
router.post('/trigger-status-upload', auth, triggerStatusUpload);

module.exports = router;
