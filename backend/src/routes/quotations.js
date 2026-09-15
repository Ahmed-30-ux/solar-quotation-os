const express = require('express');
const router = express.Router();
const quotationController = require('../controllers/quotationController');
const { auth } = require('../middleware/auth');

router.use(auth);

router.get('/', quotationController.getAll);
router.get('/:id', quotationController.getById);
router.get('/:id/pdf', quotationController.downloadPdf);
router.post('/generate', quotationController.generate);
router.put('/:id/status', quotationController.updateStatus);

module.exports = router;
