const express = require('express');
const leadsController = require('../controllers/leadsController');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth);

router.get('/', leadsController.getAllLeads);
router.get('/:id', leadsController.getLeadById);
router.get('/service/:service', leadsController.getLeadsByService);
router.get('/source/:source', leadsController.getLeadsBySource);
router.post('/', leadsController.createLead);
router.put('/:id', leadsController.updateLead);
router.delete('/:id', leadsController.deleteLead);

module.exports = router;
