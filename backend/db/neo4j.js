const neo4j = require('neo4j-driver');
require('dotenv').config();

const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD),
  { disableLosslessIntegers: true }
);

async function verifyConnectivity() {
  try {
    await driver.verifyConnectivity();
    console.log('[Neo4j] Connected to', process.env.NEO4J_URI);
  } catch (e) {
    console.error('[Neo4j] Connection error:', e.message);
  }
}

const DB_NAME = process.env.NEO4J_DATABASE || 'neo4j';

function getSession(database) {
  return driver.session({ database: database || DB_NAME });
}

async function run(cypher, params = {}) {
  const session = getSession();
  try {
    const result = await session.run(cypher, params);
    return result.records.map((r) => {
      const obj = {};
      r.keys.forEach((k) => {
        const v = r.get(k);
        obj[k] = serialize(v);
      });
      return obj;
    });
  } finally {
    await session.close();
  }
}

function serialize(v) {
  if (v === null || v === undefined) return v;
  if (neo4j.isInt && neo4j.isInt(v)) return v.toNumber();
  if (Array.isArray(v)) return v.map(serialize);
  if (v && typeof v === 'object' && v.labels && v.properties) {
    return { id: v.identity?.toNumber?.() ?? v.identity, labels: v.labels, properties: serialize(v.properties) };
  }
  if (v && typeof v === 'object' && v.type && v.properties && v.start !== undefined) {
    return { id: v.identity?.toNumber?.() ?? v.identity, type: v.type, properties: serialize(v.properties), start: v.start, end: v.end };
  }
  if (v && typeof v === 'object' && v.year && v.month) {
    // Neo4j Date/DateTime
    return v.toString();
  }
  if (typeof v === 'object') {
    const out = {};
    for (const k of Object.keys(v)) out[k] = serialize(v[k]);
    return out;
  }
  return v;
}

module.exports = { driver, getSession, run, verifyConnectivity };
