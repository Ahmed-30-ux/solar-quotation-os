const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { auth, adminOnly } = require('../middleware/auth');

router.use(auth);

router.get('/overview', dashboardController.getOverview);
router.get('/team-performance', adminOnly, dashboardController.getTeamPerformance);

module.exports = router;