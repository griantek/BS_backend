const express = require('express');
const auth = require('../middleware/auth');
const { getAssignedRegistrations } = require('../controllers/authorController');

const router = express.Router();

router.get('/assigned-registrations/:executive_id', getAssignedRegistrations);

module.exports = router;
