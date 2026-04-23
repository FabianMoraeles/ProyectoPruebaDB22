/**
 * Borra TODO el contenido de la base (nodos + relaciones + constraints/índices).
 * Úsalo sólo si quieres empezar de cero.
 *   node scripts/wipe.js
 */
const path = require('path');
const neo4j = require('neo4j-driver');
require('dotenv').config({ path: path.join(__dirname, '..', 'backend', '.env') });

const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
);
const DB = process.env.NEO4J_DATABASE || 'neo4j';

(async () => {
  const s = driver.session({ database: DB });
  try {
    console.log('Borrando nodos y relaciones...');
    // batched para no exceder heap
    let deleted;
    do {
      const r = await s.run('MATCH (n) WITH n LIMIT 5000 DETACH DELETE n RETURN count(n) AS c');
      deleted = r.records[0].get('c').toNumber ? r.records[0].get('c').toNumber() : r.records[0].get('c');
      console.log(`  eliminados: ${deleted}`);
    } while (deleted > 0);

    console.log('Eliminando constraints...');
    const cons = await s.run('SHOW CONSTRAINTS YIELD name');
    for (const rec of cons.records) await s.run(`DROP CONSTRAINT ${rec.get('name')}`);

    console.log('Eliminando índices...');
    const idx = await s.run('SHOW INDEXES YIELD name, type WHERE type <> "LOOKUP"');
    for (const rec of idx.records) await s.run(`DROP INDEX ${rec.get('name')}`);

    console.log('Listo — base limpia.');
  } finally { await s.close(); await driver.close(); }
})();
