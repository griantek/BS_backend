const express = require('express');
const auth = require('../middleware/auth');
const { getAssignedRegistrations, updateAuthorStatus, uploadPaper } = require('../controllers/authorController');

const router = express.Router();

router.get('/assigned-registrations/:executive_id', getAssignedRegistrations);
router.put('/status/:regId', updateAuthorStatus);
router.post('/upload-paper', uploadPaper);

module.exports = router;
