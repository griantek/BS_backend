const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');
const auth = require('../middleware/auth');

// Public route for client login
router.post('/login', clientController.loginClient);

// === Specific routes must come before generic parameter routes ===
// Registration and Quotation data route
router.get('/prosReg/:regId', auth, clientController.getProspectusRegistrationData);
router.get('/registration-history/:clientId', auth, clientController.getClientRegistrationHistory);

// Combined data route for registration, quotations, and journal data
router.post('/combined-data/', auth, clientController.getCombinedRegistrationData);

// Protected routes requiring authentication
router.get('/', auth, clientController.getAllClients);
router.get('/email/:email', auth, clientController.getClientByEmail);
router.get('/:id/prospectus',auth, clientController.getClientProspectus);
router.get('/:id/registration/pending',auth, clientController.getPendingClientRegistrations);
router.get('/:id/registration/registered',auth, clientController.getRegisteredClientRegistrations);
router.get('/:id/registration/quotationReview',auth, clientController.getClientQuotationReviewRegistration);
router.get('/:id/registration/',auth, clientController.getClientRegistrations);

// Client payment endpoint
router.post('/payment/submit', auth, clientController.submitClientPayment);

// Place generic ID route last
router.get('/:id', auth, clientController.getClientById);
router.post('/', auth, clientController.createClient);
router.put('/:id', auth, clientController.updateClient);
router.delete('/:id', auth, clientController.deleteClient);

module.exports = router;
