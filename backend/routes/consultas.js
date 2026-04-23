const router = require('express').Router();
const { run } = require('../db/neo4j');

/**
 * Special Cypher queries required by the spec.
 */

// 1) Productos con stock bajo nivel mínimo por bodega
// Cypher: MATCH (b:Bodega)-[:EXISTENCIAS]->(i:Inventario)-[:DE_PRODUCTO]->(p:Producto)
//         WHERE i.cantidad < i.nivel_minimo
//         RETURN b.nombre, p.nombre, i.cantidad, i.nivel_minimo
router.get('/stock-bajo', async (_req, res, next) => {
  try {
    const rows = await run(`
      MATCH (b:Bodega)-[:EXISTENCIAS]->(i:Inventario)-[:DE_PRODUCTO]->(p:Producto)
      WHERE i.cantidad < i.nivel_minimo
      RETURN b.nombre AS bodega, p.nombre AS producto, p.SKU AS sku,
             i.cantidad AS cantidad, i.nivel_minimo AS nivel_minimo
      ORDER BY bodega, producto
      LIMIT 200
    `);
    res.json(rows);
  } catch (e) { next(e); }
});

// 2) Ruta más corta (menor costo) entre dos bodegas
// Cypher: shortestPath sobre el grafo Bodega-Rutas-Bodega ponderado por costo/distancia
router.get('/ruta-corta', async (req, res, next) => {
  try {
    const { origen, destino } = req.query;
    const rows = await run(`
      MATCH (a:Bodega {nombre: $origen}), (b:Bodega {nombre: $destino})
      MATCH path = shortestPath((a)-[:RUTA_POR|ENVIA_A*..10]-(b))
      WITH path,
           reduce(cost = 0.0, r IN relationships(path) |
             cost + coalesce(r.distancia, 0.0)) AS total_distancia
      RETURN [n IN nodes(path) | coalesce(n.nombre, n.id)] AS nodos,
             [r IN relationships(path) | type(r)] AS rels,
             total_distancia
      ORDER BY total_distancia ASC
      LIMIT 1
    `, { origen, destino });
    res.json(rows[0] || null);
  } catch (e) { next(e); }
});

// 3) Proveedor con mayor volumen de órdenes activas
// Cypher: une Proveedor->Producto<-Ordenes filtrando órdenes activas y suma cantidades
router.get('/top-proveedor-ordenes', async (_req, res, next) => {
  try {
    const rows = await run(`
      MATCH (pr:Proveedor)-[:SUMINISTRA]->(p:Producto)<-[t:TIENE]-(o:Ordenes)
      WHERE o.estado IN ['activa','pendiente','en_ruta']
      RETURN pr.nombre AS proveedor,
             count(DISTINCT o) AS ordenes,
             sum(t.cantidad) AS unidades
      ORDER BY unidades DESC
      LIMIT 10
    `);
    res.json(rows);
  } catch (e) { next(e); }
});

// 4) Clientes que recibieron productos perecederos en los últimos 30 días
// Cypher: Cliente <-GENERADA_POR- Ordenes -TIENE-> Producto {perecedero:true}
router.get('/clientes-perecederos', async (_req, res, next) => {
  try {
    const rows = await run(`
      MATCH (c:Clientes)<-[:GENERADA_POR]-(o:Ordenes)-[:TIENE]->(p:Producto)
      WHERE p.perecedero = true
        AND date(o.fecha_entrega) >= date() - duration({days: 30})
      RETURN c.nombre AS cliente, c.ciudad AS ciudad,
             collect(DISTINCT p.nombre) AS productos,
             count(DISTINCT o) AS ordenes
      ORDER BY ordenes DESC
      LIMIT 50
    `);
    res.json(rows);
  } catch (e) { next(e); }
});

// 5) Bodegas con mayor capacidad disponible por país
// Cypher: top-N por país agrupando por pais
router.get('/bodegas-capacidad', async (_req, res, next) => {
  try {
    const rows = await run(`
      MATCH (b:Bodega)
      WHERE b.activa = true
      WITH b.pais AS pais, b ORDER BY b.capacidad_disponible DESC
      WITH pais, collect({nombre:b.nombre, ciudad:b.ciudad, disponible:b.capacidad_disponible})[0..3] AS top
      RETURN pais, top
      ORDER BY pais
    `);
    res.json(rows);
  } catch (e) { next(e); }
});

// 6) Transportistas activos con sus rutas asignadas
// Cypher: Transporte -USA_RUTA-> Rutas con filtro disponible=true
router.get('/transportistas-activos', async (_req, res, next) => {
  try {
    const rows = await run(`
      MATCH (t:Transporte)
      WHERE t.disponible = true
      OPTIONAL MATCH (t)-[u:USA_RUTA]->(r:Rutas)
      RETURN t.nombre AS transportista, t.vehiculo AS vehiculo,
             t.licencia AS licencia,
             collect({id:r.id, tipo:r.tipo, distancia:r.distancia_km, prioridad:u.prioridad}) AS rutas
      ORDER BY transportista
      LIMIT 200
    `);
    res.json(rows);
  } catch (e) { next(e); }
});

module.exports = router;
