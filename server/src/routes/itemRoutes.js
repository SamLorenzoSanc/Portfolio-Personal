const express = require('express');
const router = express.Router();
const {
  getItems,
  getItemByIdOrSlug,
  createItem,
  updateItem,
  deleteItem
} = require('../controllers/itemController');
const { protect } = require('../middlewares/authMiddleware');
const uploadFields = require('../middlewares/uploadMiddleware');

// Rutas públicas (Visitantes - US-04)
router.get('/', getItems);
router.get('/:idOrSlug', getItemByIdOrSlug);

// Rutas protegidas (Administrador - US-03)
router.post('/', protect, uploadFields, createItem);
router.put('/:id', protect, uploadFields, updateItem);
router.delete('/:id', protect, deleteItem);

module.exports = router;