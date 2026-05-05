// Algoritmos de Data Science / Graph Analytics sobre el grafo de supply chain.
// Implementados con Cypher puro (compatible con cualquier AuraDB) y, donde aplica,
// con GDS (Graph Data Science) si está disponible en la instancia.
const { run } = require('../db/neo4j');

// ─────────────────────────────────────────────────────────────────────────
// 1) DEGREE CENTRALITY
//    Mide la "importancia" de un nodo por su número de conexiones.
//    Útil para identificar proveedores/bodegas más conectados (hubs).
//
//    Cypher puro:
//      MATCH (p:Proveedor)
//      OPTIONAL MATCH (p)-[r]-()
//      RETURN p.nombre, count(r) AS degree
//      ORDER BY degree DESC LIMIT 10
// ─────────────────────────────────────────────────────────────────────────
async function degreeCentrality(req, res, next) {
  try {
    const label = req.query.label || 'Proveedor';
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
    const rows = await run(`
      MATCH (n:${label})
      OPTIONAL MATCH (n)-[r]-()
      WITH n, count(r) AS degree
      RETURN
        coalesce(n.nombre, n.SKU, n.codigo, toString(id(n))) AS nodo,
        labels(n) AS labels,
        degree
      ORDER BY degree DESC
      LIMIT $limit
    `, { limit });
    res.json({ algorithm: 'Degree Centrality', label, results: rows });
  } catch (e) { next(e); }
}

// ─────────────────────────────────────────────────────────────────────────
// 2) PAGERANK (intenta GDS, fallback a degree-weighted Cypher)
//    PageRank mide importancia recursiva: un nodo es importante si está
//    conectado a otros nodos importantes.
//
//    GDS:
//      CALL gds.pageRank.stream(...) YIELD nodeId, score
//
//    Fallback Cypher (1 iteración weighted-degree):
//      Usa grado ponderado por conexiones de segundo orden.
// ─────────────────────────────────────────────────────────────────────────
async function pageRank(req, res, next) {
  try {
    const label = req.query.label || 'Proveedor';
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));

    // Intento GDS
    try {
      const gds = await run(`
        CALL gds.graph.exists('pageRankGraph') YIELD exists
        WITH exists
        CALL apoc.do.when(exists,
          'CALL gds.graph.drop("pageRankGraph") YIELD graphName RETURN graphName',
          'RETURN null AS graphName',
          {}
        ) YIELD value
        RETURN value
      `).catch(() => null);

      if (gds !== null) {
        await run(`
          CALL gds.graph.project('pageRankGraph', '*', '*')
        `);
        const rows = await run(`
          CALL gds.pageRank.stream('pageRankGraph')
          YIELD nodeId, score
          WITH gds.util.asNode(nodeId) AS n, score
          WHERE '${label}' IN labels(n)
          RETURN
            coalesce(n.nombre, n.SKU, n.codigo, toString(id(n))) AS nodo,
            labels(n) AS labels,
            round(score * 1000) / 1000 AS score
          ORDER BY score DESC LIMIT $limit
        `, { limit });
        await run(`CALL gds.graph.drop('pageRankGraph')`).catch(() => {});
        return res.json({ algorithm: 'PageRank (GDS)', label, results: rows });
      }
    } catch (_) { /* fallback */ }

    // Fallback: weighted-degree de 2 pasos (proxy de PageRank)
    const rows = await run(`
      MATCH (n:${label})
      OPTIONAL MATCH (n)-[]-(vecino)-[]-(vecino2)
      WITH n, count(DISTINCT vecino) AS d1, count(DISTINCT vecino2) AS d2
      RETURN
        coalesce(n.nombre, n.SKU, n.codigo, toString(id(n))) AS nodo,
        labels(n) AS labels,
        d1 AS conexiones_directas,
        d2 AS alcance_2_saltos,
        round((d1 * 0.6 + d2 * 0.4) * 100) / 100 AS score
      ORDER BY score DESC
      LIMIT $limit
    `, { limit });
    res.json({ algorithm: 'PageRank (Cypher fallback - weighted degree)', label, results: rows });
  } catch (e) { next(e); }
}

// ─────────────────────────────────────────────────────────────────────────
// 3) JACCARD SIMILARITY
//    Encuentra pares de proveedores (o cualquier nodo) más similares
//    según los productos/items que comparten.
//
//    Jaccard = |A ∩ B| / |A ∪ B|
//
//    Cypher:
//      MATCH (a:Proveedor)-[:SUMINISTRA]->(p:Producto)<-[:SUMINISTRA]-(b:Proveedor)
//      WHERE id(a) < id(b)
//      WITH a, b, count(DISTINCT p) AS interseccion
//      MATCH (a)-[:SUMINISTRA]->(pa:Producto)
//      WITH a, b, interseccion, count(DISTINCT pa) AS sizeA
//      MATCH (b)-[:SUMINISTRA]->(pb:Producto)
//      WITH a, b, interseccion, sizeA, count(DISTINCT pb) AS sizeB
//      RETURN a.nombre, b.nombre,
//             interseccion * 1.0 / (sizeA + sizeB - interseccion) AS jaccard
// ─────────────────────────────────────────────────────────────────────────
async function jaccardSimilarity(req, res, next) {
  try {
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
    const rows = await run(`
      MATCH (a:Proveedor)-[:SUMINISTRA]->(p:Producto)<-[:SUMINISTRA]-(b:Proveedor)
      WHERE id(a) < id(b)
      WITH a, b, count(DISTINCT p) AS interseccion
      WHERE interseccion >= 1
      MATCH (a)-[:SUMINISTRA]->(pa:Producto)
      WITH a, b, interseccion, count(DISTINCT pa) AS sizeA
      MATCH (b)-[:SUMINISTRA]->(pb:Producto)
      WITH a, b, interseccion, sizeA, count(DISTINCT pb) AS sizeB
      WITH a, b, interseccion, sizeA, sizeB,
           interseccion * 1.0 / (sizeA + sizeB - interseccion) AS jaccard
      RETURN
        a.nombre AS proveedor_a,
        b.nombre AS proveedor_b,
        interseccion AS productos_comunes,
        sizeA AS productos_a,
        sizeB AS productos_b,
        round(jaccard * 1000) / 1000 AS similaridad_jaccard
      ORDER BY similaridad_jaccard DESC, productos_comunes DESC
      LIMIT $limit
    `, { limit });
    res.json({ algorithm: 'Jaccard Similarity (Proveedores)', results: rows });
  } catch (e) { next(e); }
}

// ─────────────────────────────────────────────────────────────────────────
// 4) TRIANGLE COUNT / CLUSTERING COEFFICIENT
//    Mide qué tan "agrupado" está el grafo. Triángulos = 3 nodos
//    todos conectados entre sí. Indicador de comunidades densas.
//
//    Cypher:
//      MATCH (a)-[]-(b)-[]-(c)-[]-(a)
//      WHERE id(a) < id(b) AND id(b) < id(c)
//      RETURN count(*) AS triangles
// ─────────────────────────────────────────────────────────────────────────
async function triangleCount(_req, res, next) {
  try {
    const rows = await run(`
      MATCH (a)-[]-(b)-[]-(c)-[]-(a)
      WHERE id(a) < id(b) AND id(b) < id(c)
      RETURN count(*) AS total_triangulos
    `);
    const top = await run(`
      MATCH (n)-[]-(b)-[]-(c)-[]-(n)
      WHERE id(b) < id(c) AND id(n) <> id(b) AND id(n) <> id(c)
      WITH n, count(*) AS triangulos
      RETURN
        coalesce(n.nombre, n.SKU, n.codigo, toString(id(n))) AS nodo,
        labels(n) AS labels,
        triangulos
      ORDER BY triangulos DESC
      LIMIT 10
    `);
    res.json({
      algorithm: 'Triangle Counting',
      total_triangulos: rows[0]?.total_triangulos || 0,
      top_nodos: top
    });
  } catch (e) { next(e); }
}

// ─────────────────────────────────────────────────────────────────────────
// 5) RECOMENDACIÓN POR VECINOS COMUNES (Collaborative filtering simple)
//    Dado un cliente, recomienda productos basado en lo que clientes
//    similares ya pidieron.
//
//    Cypher:
//      MATCH (c1:Clientes {nombre:$cliente})<-[:ENVIADA_A]-(o1:Ordenes)-[:TIENE]->(p:Producto)
//      MATCH (p)<-[:TIENE]-(o2:Ordenes)-[:ENVIADA_A]->(c2:Clientes)
//      WHERE c1 <> c2
//      MATCH (c2)<-[:ENVIADA_A]-(o3:Ordenes)-[:TIENE]->(rec:Producto)
//      WHERE NOT (c1)<-[:ENVIADA_A]-(:Ordenes)-[:TIENE]->(rec)
//      RETURN rec.nombre, count(*) AS score
// ─────────────────────────────────────────────────────────────────────────
async function recomendaciones(req, res, next) {
  try {
    const cliente = req.query.cliente;
    if (!cliente) return res.status(400).json({ error: 'parámetro cliente es requerido' });
    const rows = await run(`
      MATCH (c1:Clientes {nombre: $cliente})<-[:ENVIADA_A]-(o1:Ordenes)-[:TIENE]->(p:Producto)
      MATCH (p)<-[:TIENE]-(o2:Ordenes)-[:ENVIADA_A]->(c2:Clientes)
      WHERE c1 <> c2
      WITH c1, c2, count(DISTINCT p) AS productos_comunes
      WHERE productos_comunes >= 1
      MATCH (c2)<-[:ENVIADA_A]-(o3:Ordenes)-[:TIENE]->(rec:Producto)
      WHERE NOT EXISTS {
        MATCH (c1)<-[:ENVIADA_A]-(:Ordenes)-[:TIENE]->(rec)
      }
      WITH rec, sum(productos_comunes) AS score, count(DISTINCT c2) AS clientes_similares
      RETURN
        rec.SKU AS SKU,
        rec.nombre AS producto,
        labels(rec) AS labels,
        score,
        clientes_similares
      ORDER BY score DESC
      LIMIT 10
    `, { cliente });
    res.json({ algorithm: 'Collaborative Filtering (vecinos comunes)', cliente, recomendaciones: rows });
  } catch (e) { next(e); }
}

// ─────────────────────────────────────────────────────────────────────────
// 6) BETWEENNESS-LIKE: nodos "puente"
//    Nodos por los que pasan más caminos cortos entre pares.
//    Aproximación con shortestPath sobre subconjunto de nodos.
// ─────────────────────────────────────────────────────────────────────────
async function nodosPuente(req, res, next) {
  try {
    const limit = Math.min(20, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const rows = await run(`
      MATCH (b1:Bodega), (b2:Bodega) WHERE id(b1) < id(b2)
      WITH b1, b2 LIMIT 200
      MATCH path = shortestPath((b1)-[:RUTA_POR|ENVIA_A*..6]-(b2))
      WHERE length(path) > 1
      UNWIND nodes(path)[1..-1] AS intermedio
      WITH intermedio, count(*) AS apariciones
      RETURN
        coalesce(intermedio.nombre, intermedio.codigo, toString(id(intermedio))) AS nodo,
        labels(intermedio) AS labels,
        apariciones
      ORDER BY apariciones DESC
      LIMIT $limit
    `, { limit });
    res.json({ algorithm: 'Betweenness aproximado (sobre 200 pares de bodegas)', results: rows });
  } catch (e) { next(e); }
}

// ─────────────────────────────────────────────────────────────────────────
// 7) RESUMEN: estadísticas globales del grafo
// ─────────────────────────────────────────────────────────────────────────
async function resumen(_req, res, next) {
  try {
    const rows = await run(`
      MATCH (n) WITH count(n) AS nodos
      MATCH ()-[r]->() WITH nodos, count(r) AS relaciones
      RETURN nodos, relaciones,
             round((relaciones * 1.0 / nodos) * 100) / 100 AS densidad_promedio
    `);
    res.json({ algorithm: 'Resumen global', ...rows[0] });
  } catch (e) { next(e); }
}

module.exports = {
  degreeCentrality, pageRank, jaccardSimilarity, triangleCount,
  recomendaciones, nodosPuente, resumen
};
