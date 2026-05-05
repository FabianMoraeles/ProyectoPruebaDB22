const router = require('express').Router();
const c = require('../controllers/dataScience');

router.get('/resumen', c.resumen);
router.get('/degree', c.degreeCentrality);
router.get('/pagerank', c.pageRank);
router.get('/jaccard', c.jaccardSimilarity);
router.get('/triangle', c.triangleCount);
router.get('/puente', c.nodosPuente);
router.get('/recomendaciones', c.recomendaciones);

module.exports = router;
