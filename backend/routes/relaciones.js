const router = require('express').Router();
const { run } = require('../db/neo4j');

/**
 * Relationship CRUD routes.
 * Body conventions:
 *  - fromLabel, fromKey, fromValue  -> identifies start node
 *  - toLabel,   toKey,   toValue    -> identifies end node
 *  - relType    -> :SUMINISTRA, :ALMACENA, etc.
 *  - props      -> object with relationship properties
 */

// CREATE a relationship with 3+ properties
// Cypher: MATCH (a:FromLabel {key:$fv}),(b:ToLabel {key:$tv}) CREATE (a)-[r:TYPE $props]->(b)
router.post('/', async (req, res, next) => {
  try {
    const { fromLabel, fromKey, fromValue, toLabel, toKey, toValue, relType, props = {} } = req.body;
    const rows = await run(
      `MATCH (a:${fromLabel} {${fromKey}: $fv}), (b:${toLabel} {${toKey}: $tv})
       CREATE (a)-[r:${relType} $props]->(b)
       RETURN a, r, b`,
      { fv: fromValue, tv: toValue, props }
    );
    res.status(201).json(rows[0]);
  } catch (e) { next(e); }
});

// LIST relationships of given type with optional filters
// Cypher: MATCH (a)-[r:TYPE]->(b) WHERE ... RETURN a,r,b
router.get('/:relType', async (req, res, next) => {
  try {
    const filters = req.query;
    const where = Object.keys(filters).map((k) => `r.${k} = $${k}`);
    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const rows = await run(
      `MATCH (a)-[r:${req.params.relType}]->(b) ${whereClause} RETURN a, r, b LIMIT 200`,
      filters
    );
    res.json(rows);
  } catch (e) { next(e); }
});

// UPDATE properties of one relationship
// Cypher: MATCH (a {...})-[r:TYPE]->(b {...}) SET r += $props RETURN r
router.put('/one', async (req, res, next) => {
  try {
    const { fromLabel, fromKey, fromValue, toLabel, toKey, toValue, relType, props } = req.body;
    const rows = await run(
      `MATCH (a:${fromLabel} {${fromKey}: $fv})-[r:${relType}]->(b:${toLabel} {${toKey}: $tv})
       SET r += $props RETURN r`,
      { fv: fromValue, tv: toValue, props }
    );
    res.json(rows[0]);
  } catch (e) { next(e); }
});

// UPDATE multiple relationships by type and filter
// Cypher: MATCH ()-[r:TYPE]->() WHERE ... SET r += $props RETURN count(r)
router.put('/many', async (req, res, next) => {
  try {
    const { relType, filter = {}, props = {} } = req.body;
    const where = Object.keys(filter).map((k) => `r.${k} = $f_${k}`);
    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const params = { props };
    Object.keys(filter).forEach((k) => (params[`f_${k}`] = filter[k]));
    const rows = await run(
      `MATCH ()-[r:${relType}]->() ${whereClause} SET r += $props RETURN count(r) AS updated`,
      params
    );
    res.json(rows[0]);
  } catch (e) { next(e); }
});

// REMOVE properties from ONE relationship
// Cypher: MATCH ...-[r:TYPE]->... REMOVE r.x, r.y RETURN r
router.patch('/one/remove-props', async (req, res, next) => {
  try {
    const { fromLabel, fromKey, fromValue, toLabel, toKey, toValue, relType, props = [] } = req.body;
    const removal = props.map((p) => `r.${p}`).join(', ');
    const rows = await run(
      `MATCH (a:${fromLabel} {${fromKey}: $fv})-[r:${relType}]->(b:${toLabel} {${toKey}: $tv})
       REMOVE ${removal} RETURN r`,
      { fv: fromValue, tv: toValue }
    );
    res.json(rows[0]);
  } catch (e) { next(e); }
});

// REMOVE properties from MANY relationships
router.patch('/many/remove-props', async (req, res, next) => {
  try {
    const { relType, filter = {}, props = [] } = req.body;
    const removal = props.map((p) => `r.${p}`).join(', ');
    const where = Object.keys(filter).map((k) => `r.${k} = $f_${k}`);
    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const params = {};
    Object.keys(filter).forEach((k) => (params[`f_${k}`] = filter[k]));
    const rows = await run(
      `MATCH ()-[r:${relType}]->() ${whereClause} REMOVE ${removal} RETURN count(r) AS updated`,
      params
    );
    res.json(rows[0]);
  } catch (e) { next(e); }
});

// DELETE ONE relationship
// Cypher: MATCH (a)-[r:TYPE]->(b) DELETE r
router.delete('/one', async (req, res, next) => {
  try {
    const { fromLabel, fromKey, fromValue, toLabel, toKey, toValue, relType } = req.body;
    await run(
      `MATCH (a:${fromLabel} {${fromKey}: $fv})-[r:${relType}]->(b:${toLabel} {${toKey}: $tv})
       DELETE r`,
      { fv: fromValue, tv: toValue }
    );
    res.json({ deleted: 1 });
  } catch (e) { next(e); }
});

// DELETE MANY relationships by type and filter
router.delete('/many', async (req, res, next) => {
  try {
    const { relType, filter = {} } = req.body;
    const where = Object.keys(filter).map((k) => `r.${k} = $${k}`);
    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const rows = await run(
      `MATCH ()-[r:${relType}]->() ${whereClause} WITH r, count(r) AS c DELETE r RETURN sum(c) AS deleted`,
      filter
    );
    res.json(rows[0]);
  } catch (e) { next(e); }
});

module.exports = router;
