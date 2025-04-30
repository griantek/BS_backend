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
    getFinancialData,
    getRegistrationsFinancialData,
    getProspectusFinancialData,
    getLeadsFinancialData,
    getTransactionsFinancialData,
} = require('../controllers/adminController');
const auth = require('../middleware/auth');

const router = express.Router();

// Public admin routes
router.post('/login', loginAdmin);
router.post('/create', createAdmin);

// Dashboard routes
router.get('/dashboard', getDashboardData);

// Financial Data routes (split into smaller chunks)
router.get('/financial-data', getFinancialData); // Original route (returns large payload)
router.get('/financial-data/registrations', getRegistrationsFinancialData);

// Protected Service routes
router.post('/services/create', auth, createService);
router.get('/services/all', auth, getAllServices);

// Role Management routes (protected)
router.get('/roles/all', auth, getAllRoles);
router.get('/roles/:id', auth, getRoleById);
router.post('/roles/create', auth, createRole);
router.put('/roles/:id', auth, updateRole);
router.delete('/roles/:id', auth, deleteRole);
router.get('/roles/:id/permissions', auth, getRoleWithPermissions);

// Permissions
router.get('/permissions/all', auth, getAllPermissions);
router.get('/permissions/entity-type/:entity_type', auth, getPermissionsByEntityType);

// Registration Management routes
router.get('/registrations/forApproval', auth, getRegistrationForApproval);
router.put('/registrations/:registrationId/assign', auth, assignRegistration);
router.put('/registrations/:registrationId/pending', auth, updateRegistrationToPending);

module.exports = router;
