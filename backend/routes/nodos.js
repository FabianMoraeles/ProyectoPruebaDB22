const router = require('express').Router();
const { run } = require('../db/neo4j');

/**
 * Generic utilities across all labels.
 */

// GLOBAL stats: count per label
// Cypher: MATCH (n) RETURN labels(n)[0] AS label, count(n)
router.get('/stats', async (_req, res, next) => {
  try {
    const rows = await run(
      `MATCH (n) RETURN labels(n) AS labels, count(n) AS total ORDER BY total DESC`
    );
    res.json(rows);
  } catch (e) { next(e); }
});

// ADD a property to many nodes by label
// Cypher: MATCH (n:Label) SET n += $props
router.patch('/add-props', async (req, res, next) => {
  try {
    const { label, filter = {}, props = {} } = req.body;
    const where = Object.keys(filter).map((k) => `n.${k} = $f_${k}`);
    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const params = { props };
    Object.keys(filter).forEach((k) => (params[`f_${k}`] = filter[k]));
    const rows = await run(
      `MATCH (n:${label}) ${whereClause} SET n += $props RETURN count(n) AS updated`,
      params
    );
    res.json(rows[0]);
  } catch (e) { next(e); }
});

// ADD a label to a node (multi-label after the fact)
router.post('/add-label', async (req, res, next) => {
  try {
    const { label, idKey, idValue, newLabel } = req.body;
    const rows = await run(
      `MATCH (n:${label} {${idKey}: $v}) SET n:${newLabel} RETURN n`,
      { v: idValue }
    );
    res.json(rows[0]);
  } catch (e) { next(e); }
});

// Aggregations / analytics (generic)
// Examples: AVG, SUM, COUNT on a property of a label
router.get('/aggregate/:label/:op/:prop', async (req, res, next) => {
  try {
    const { label, op, prop } = req.params;
    const allowed = ['COUNT', 'SUM', 'AVG', 'MIN', 'MAX'];
    const fn = op.toUpperCase();
    if (!allowed.includes(fn)) return res.status(400).json({ error: 'op not allowed' });
    const expr = fn === 'COUNT' ? `count(n.${prop})` : `${fn.toLowerCase()}(n.${prop})`;
    const rows = await run(`MATCH (n:${label}) RETURN ${expr} AS value`);
    res.json(rows[0]);
  } catch (e) { next(e); }
});

module.exports = router;
