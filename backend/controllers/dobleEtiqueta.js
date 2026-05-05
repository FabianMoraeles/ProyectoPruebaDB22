// Controller específico para evidenciar el doble label de Producto.
// El modelo soporta:  (:Producto:Perecedero)  y  (:Producto:NoPerecedero)
// Aquí exponemos endpoints que MANIPULAN labels directamente (no propiedades).
const { run } = require('../db/neo4j');

const TIPOS = ['Perecedero', 'NoPerecedero'];
const otro = (t) => (t === 'Perecedero' ? 'NoPerecedero' : 'Perecedero');

// -------------------------------------------------------------
// 1) STATS — agrupa por combinación de labels usando labels(p)
//    Cypher:
//      MATCH (p:Producto)
//      WITH labels(p) AS ls, p
//      RETURN ls AS labels, count(p) AS total ORDER BY total DESC
// -------------------------------------------------------------
async function stats(_req, res, next) {
  try {
    const rows = await run(`
      MATCH (p:Producto)
      WITH labels(p) AS ls
      RETURN ls AS labels, count(*) AS total
      ORDER BY total DESC
    `);
    const total = rows.reduce((a, r) => a + (r.total || 0), 0);
    res.json({ total, breakdown: rows });
  } catch (e) { next(e); }
}

// -------------------------------------------------------------
// 2) LIST por tipo — usa el label como filtro real, no una propiedad
//    GET /api/productos-doble/listar/:tipo
//    Cypher:  MATCH (p:Producto:Perecedero) RETURN p, labels(p) AS labels
// -------------------------------------------------------------
async function listarPorTipo(req, res, next) {
  try {
    const tipo = req.params.tipo;
    if (!TIPOS.includes(tipo)) return res.status(400).json({ error: `tipo debe ser ${TIPOS.join(' o ')}` });
    const rows = await run(
      `MATCH (p:Producto:${tipo}) RETURN p, labels(p) AS labels LIMIT 200`
    );
    res.json(rows.map(r => ({ ...r.p.properties, _labels: r.labels })));
  } catch (e) { next(e); }
}

// -------------------------------------------------------------
// 3) CREAR producto con doble label explícito
//    POST /api/productos-doble  body: { tipo: 'Perecedero', SKU, nombre, ... }
//    Cypher:  CREATE (p:Producto:Perecedero $props) RETURN p, labels(p)
// -------------------------------------------------------------
async function crear(req, res, next) {
  try {
    const { tipo, ...props } = req.body || {};
    if (!TIPOS.includes(tipo)) return res.status(400).json({ error: `tipo debe ser ${TIPOS.join(' o ')}` });
    if (!props.SKU) return res.status(400).json({ error: 'SKU es requerido' });
    const rows = await run(
      `CREATE (p:Producto:${tipo} $props) RETURN p, labels(p) AS labels`,
      { props }
    );
    res.status(201).json({ ...rows[0].p.properties, _labels: rows[0].labels });
  } catch (e) { next(e); }
}

// -------------------------------------------------------------
// 4) CAMBIAR tipo — REMOVE label antiguo + SET label nuevo
//    PATCH /api/productos-doble/:sku/cambiar-tipo  body: { tipo: 'NoPerecedero' }
//    Cypher:
//      MATCH (p:Producto {SKU: $sku})
//      REMOVE p:Perecedero SET p:NoPerecedero
//      RETURN p, labels(p) AS labels
// -------------------------------------------------------------
async function cambiarTipo(req, res, next) {
  try {
    const { tipo } = req.body || {};
    const sku = req.params.sku;
    if (!TIPOS.includes(tipo)) return res.status(400).json({ error: `tipo debe ser ${TIPOS.join(' o ')}` });
    const rows = await run(
      `MATCH (p:Producto {SKU: $sku})
       REMOVE p:${otro(tipo)}
       SET p:${tipo}
       RETURN p, labels(p) AS labels`,
      { sku }
    );
    if (!rows.length) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json({ ...rows[0].p.properties, _labels: rows[0].labels });
  } catch (e) { next(e); }
}

// -------------------------------------------------------------
// 5) VERIFICAR — devuelve labels exactos del producto
//    GET /api/productos-doble/:sku/verificar
//    Cypher:  MATCH (p:Producto {SKU: $sku}) RETURN labels(p) AS labels
// -------------------------------------------------------------
async function verificar(req, res, next) {
  try {
    const rows = await run(
      `MATCH (p:Producto {SKU: $sku}) RETURN labels(p) AS labels, p.SKU AS SKU, p.nombre AS nombre`,
      { sku: req.params.sku }
    );
    if (!rows.length) return res.status(404).json({ error: 'Producto no encontrado' });
    const r = rows[0];
    res.json({
      SKU: r.SKU, nombre: r.nombre, labels: r.labels,
      tieneDoble: r.labels.length >= 2,
      esPerecedero: r.labels.includes('Perecedero'),
      esNoPerecedero: r.labels.includes('NoPerecedero'),
    });
  } catch (e) { next(e); }
}

module.exports = { stats, listarPorTipo, crear, cambiarTipo, verificar };
