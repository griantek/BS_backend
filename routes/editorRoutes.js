const express = require('express');
const { loginEditor } = require('../controllers/editorController');
const auth = require('../middleware/auth');

const router = express.Router();

// Public routes
router.post('/login', loginEditor);

// Protected routes (add these later)
// router.get('/profile', auth, getEditorProfile);
// router.put('/profile', auth, updateEditorProfile);
// etc...

module.exports = router;
