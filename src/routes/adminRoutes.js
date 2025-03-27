const express = require('express');
const { 
    loginAdmin, 
    createAdmin,
    createService,
    getAllServices,
    getAllRoles,
    getRoleById,
    createRole,
    updateRole,
    deleteRole,
    getAllPermissions,
    getRoleWithPermissions,
    getPermissionsByEntityType,
    approveRegistration,
    assignRegistration  // Add this new import
} = require('../controllers/adminController');
const auth = require('../middleware/auth');

const router = express.Router();

// Public admin routes
router.post('/login', loginAdmin);
router.post('/create', createAdmin);

// Protected Service routes
router.post('/services/create', auth, createService);
router.get('/services/all', auth, getAllServices);

// Role Management routes (protected)
router.get('/roles/all', auth, getAllRoles);
router.get('/roles/:id', auth, getRoleById);
router.post('/roles/create', auth, createRole);
router.put('/roles/:id', auth, updateRole);
router.delete('/roles/:id', auth, deleteRole);
router.get('/roles/:id/permissions',  getRoleWithPermissions);

// Permissions
router.get('/permissions/all',auth,  getAllPermissions);
router.get('/permissions/entity-type/:entity_type',auth, getPermissionsByEntityType);  // Add this new route

// Registration Management routes
router.get('/registrations/pending', auth, approveRegistration);
router.put('/registrations/:registrationId/assign', auth, assignRegistration); // Add this new route

module.exports = router;
