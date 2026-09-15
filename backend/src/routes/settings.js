const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { auth, adminOnly } = require('../middleware/auth');

router.use(auth);

router.get('/company', settingsController.getCompany);
router.put('/company', adminOnly, settingsController.updateCompany);

router.get('/pricing-rules', adminOnly, settingsController.getPricingRules);
router.put('/pricing-rules', adminOnly, settingsController.updatePricingRules);

router.get('/sizing-rules', adminOnly, settingsController.getAllSizingRules);
router.put('/sizing-rules', adminOnly, settingsController.upsertSizingRules);

router.get('/template', adminOnly, settingsController.getTemplate);
router.put('/template', adminOnly, settingsController.updateTemplate);

router.get('/team', adminOnly, settingsController.getTeamMembers);
router.post('/team', adminOnly, settingsController.addTeamMember);

router.get('/followups', settingsController.getFollowups);

module.exports = router;