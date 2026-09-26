const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
  listInstallations,
  getInstallation,
  createInstallation,
  updateInstallation,
  updateChecklist,
} = require('../controllers/installationController');

router.use(auth);

router.get('/', listInstallations);
router.get('/:id', getInstallation);
router.post('/', createInstallation);
router.put('/:id', updateInstallation);
router.put('/:id/checklist', updateChecklist);

module.exports = router;
