const express = require('express');
const { 
    loginSuperAdmin, 
    createSuperAdmin,
    createService,
    getAllServices,
    getAllRoles,
    getRoleById,
    createRole,
    updateRole,
    deleteRole
} = require('../controllers/superAdminController');
const auth = require('../middleware/auth');

const router = express.Router();

// Public SuperAdmin routes
router.post('/login', loginSuperAdmin);
router.post('/create', createSuperAdmin);

// Protected Service routes
router.post('/services/create', auth, createService);
router.get('/services/all', auth, getAllServices);

// Role Management routes (protected)
router.get('/roles/all', auth, getAllRoles);
router.get('/roles/:id', auth, getRoleById);
router.post('/roles/create', auth, createRole);
router.put('/roles/:id', auth, updateRole);
router.delete('/roles/:id', auth, deleteRole);

module.exports = router;
