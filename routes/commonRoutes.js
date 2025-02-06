const express = require('express');
const { 
    getAllBankAccounts, 
    getBankAccountById,
    getAllServices,
    getServiceById,
    createService,
    updateService,
    deleteService,
    getAllRegistrations,
    getRegistrationById,
    createRegistration,
    deleteRegistration,
    getAllTransactions,
    createTransaction,
    updateRegistration,
    getAllDepartments,
    getDepartmentById,
    createDepartment,
    updateDepartment,
    deleteDepartment
} = require('../controllers/commonController');
const auth = require('../middleware/auth');

const router = express.Router();

// Bank account routes
router.get('/bank-accounts/all', auth, getAllBankAccounts);
router.get('/bank-accounts/:id', auth, getBankAccountById);

// Service routes
router.get('/services/all', auth, getAllServices);
router.get('/services/:id', auth, getServiceById);
router.post('/services/create', auth, createService);
router.put('/services/:id', auth, updateService);
router.delete('/services/:id', auth, deleteService); // Add this new route

// Registration routes
router.get('/registration/all', auth, getAllRegistrations);
router.get('/registration/:id', auth, getRegistrationById);
router.post('/registration/create', auth, createRegistration);
router.delete('/registration/:id', auth, deleteRegistration);
router.put('/registration/:id', auth, updateRegistration);

// Transaction routes
router.get('/transactions/all', auth, getAllTransactions);
router.post('/transactions/create', auth, createTransaction);

// Department routes
router.get('/departments/all', auth, getAllDepartments);
router.get('/departments/:id', auth, getDepartmentById);
router.post('/departments/create', auth, createDepartment);
router.put('/departments/:id', auth, updateDepartment);
router.delete('/departments/:id', auth, deleteDepartment);

module.exports = router;
