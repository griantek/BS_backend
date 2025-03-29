const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');
const auth = require('../middleware/auth');

// Public route for client login
router.post('/login', clientController.loginClient);

// Protected routes requiring authentication
router.get('/', auth, clientController.getAllClients);
router.get('/:id', auth, clientController.getClientById);
router.get('/email/:email', auth, clientController.getClientByEmail);
router.post('/', auth, clientController.createClient);
router.put('/:id', auth, clientController.updateClient);
router.delete('/:id', auth, clientController.deleteClient);
router.get('/:id/prospectus', clientController.getClientProspectus);
router.get('/:id/registration/pending', clientController.getPendingClientRegistrations);

// Client payment endpoint
router.post('/payment/submit', auth, clientController.submitClientPayment);

module.exports = router;
