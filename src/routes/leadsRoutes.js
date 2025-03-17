const express = require('express');
const leadsController = require('../controllers/leadsController');
const auth = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, leadsController.getAllLeads);
router.get('/unapproved', auth, leadsController.getAllUnapprovedLeads);
// Must place specific routes before params routes to avoid conflicts
router.get('/today-followup', auth, leadsController.getLeadsByFollowup);
router.get('/source/:source', auth, leadsController.getLeadsBySource);
router.get('/domain/:domain', auth, leadsController.getLeadsByDomain);
router.get('/assignee/:assignee_id', auth, leadsController.getLeadsByAssignee);
router.put('/:id/status', auth, leadsController.updateLeadStatus);
router.post('/:id/approve', auth, leadsController.approveLeadToProspectus); // New route for lead approval/conversion
router.get('/:id', auth, leadsController.getLeadById);
router.post('/', auth, leadsController.createLead);
router.put('/:id', auth, leadsController.updateLead);
router.put('/:id/assign', auth, leadsController.assignLead);
router.delete('/:id', auth, leadsController.deleteLead);

module.exports = router;
