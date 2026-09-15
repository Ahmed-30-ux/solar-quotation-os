const express = require('express');
const router = express.Router();
const leadController = require('../controllers/leadController');
const { auth } = require('../middleware/auth');

router.use(auth);

router.get('/stats', leadController.getStats);
router.get('/', leadController.getAll);
router.get('/:id', leadController.getById);
router.post('/', leadController.create);
router.put('/:id', leadController.update);
router.post('/:id/activities', leadController.addActivity);

module.exports = router;
