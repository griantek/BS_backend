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
    getRegistrationForApproval,
    assignRegistration,
    updateRegistrationToPending,
    getDashboardData,
} = require('../controllers/adminController');
const auth = require('../middleware/auth');

const router = express.Router();

// Public admin routes
router.post('/login', loginAdmin);
router.post('/create', createAdmin);

// Dashboard route
router.get('/dashboard', auth, getDashboardData);

// Protected Service routes
router.post('/services/create', auth, createService);
router.get('/services/all', auth, getAllServices);

// Role Management routes (protected)
router.get('/roles/all', auth, getAllRoles);
router.get('/roles/:id', auth, getRoleById);
router.post('/roles/create', auth, createRole);
router.put('/roles/:id', auth, updateRole);
router.delete('/roles/:id', auth, deleteRole);
router.get('/roles/:id/permissions', getRoleWithPermissions);

// Permissions
router.get('/permissions/all', auth, getAllPermissions);
router.get('/permissions/entity-type/:entity_type', auth, getPermissionsByEntityType);

// Registration Management routes
router.get('/registrations/forApproval', auth, getRegistrationForApproval);
router.put('/registrations/:registrationId/assign', auth, assignRegistration);
router.put('/registrations/:registrationId/pending', auth, updateRegistrationToPending);

module.exports = router;
