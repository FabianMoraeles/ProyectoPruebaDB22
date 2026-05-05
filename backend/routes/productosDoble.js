const router = require('express').Router();
const c = require('../controllers/dobleEtiqueta');

// /api/productos-doble/...
router.get('/stats', c.stats);
router.get('/listar/:tipo', c.listarPorTipo);
router.post('/', c.crear);
router.get('/:sku/verificar', c.verificar);
router.patch('/:sku/cambiar-tipo', c.cambiarTipo);

module.exports = router;
