const express = require('express');
const auth = require('../middleware/auth');
const { getAssignedRegistrations, updateAuthorStatus, uploadPaper } = require('../controllers/authorController');

const router = express.Router();

router.get('/assigned-registrations/:executive_id', auth, getAssignedRegistrations);
router.put('/status/:regId', auth, updateAuthorStatus);
router.post('/upload-paper', auth, uploadPaper);

module.exports = router;
