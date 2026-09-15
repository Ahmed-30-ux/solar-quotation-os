const express = require('express');
const multer = require('multer');
const router = express.Router();
const productController = require('../controllers/productController');
const { auth, adminOnly } = require('../middleware/auth');

router.use(auth);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.get('/categories', productController.getCategories);
router.get('/price-history', productController.getPriceHistory);
router.get('/', productController.getAll);
router.get('/:id', productController.getById);
router.post('/', adminOnly, productController.create);
router.post('/import', adminOnly, upload.single('file'), productController.importCSV);
router.put('/bulk-prices', adminOnly, productController.bulkUpdatePrices);
router.put('/:id', adminOnly, productController.update);
router.delete('/:id', adminOnly, productController.remove);

module.exports = router;