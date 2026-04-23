const { run } = require('../db/neo4j');

/**
 * Generic CRUD controller factory for a node label.
 * Each label gets standardized endpoints.
 */
function buildController(label, idKey) {
  return {
    // CREATE one node (single label, all properties)
    // Cypher: CREATE (n:Label $props) RETURN n
    async create(req, res, next) {
      try {
        const props = req.body || {};
        const rows = await run(`CREATE (n:${label} $props) RETURN n`, { props });
        res.status(201).json(rows[0]?.n);
      } catch (e) { next(e); }
    },

    // CREATE node with 2+ labels (extra labels from body)
    // Cypher: CREATE (n:Label:Extra1:Extra2 $props) RETURN n
    async createMultiLabel(req, res, next) {
      try {
        const { extraLabels = [], ...props } = req.body || {};
        const labels = [label, ...extraLabels].join(':');
        const rows = await run(`CREATE (n:${labels} $props) RETURN n`, { props });
        res.status(201).json(rows[0]?.n);
      } catch (e) { next(e); }
    },

    // READ: list with optional filters (query string)
    // Cypher: MATCH (n:Label) WHERE ... RETURN n
    async list(req, res, next) {
      try {
        const filters = req.query || {};
        const where = Object.keys(filters).map((k) => `n.${k} = $${k}`);
        const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
        const rows = await run(`MATCH (n:${label}) ${whereClause} RETURN n LIMIT 500`, filters);
        res.json(rows.map((r) => r.n));
      } catch (e) { next(e); }
    },

    // READ one by id key
    // Cypher: MATCH (n:Label {idKey: $id}) RETURN n
    async getOne(req, res, next) {
      try {
        const rows = await run(`MATCH (n:${label} {${idKey}: $id}) RETURN n LIMIT 1`, { id: req.params.id });
        if (!rows.length) return res.status(404).json({ error: 'Not found' });
        res.json(rows[0].n);
      } catch (e) { next(e); }
    },

    // COUNT / aggregations
    // Cypher: MATCH (n:Label) RETURN count(n)
    async stats(_req, res, next) {
      try {
        const rows = await run(`MATCH (n:${label}) RETURN count(n) AS total`);
        res.json(rows[0]);
      } catch (e) { next(e); }
    },

    // UPDATE one node props (SET)
    // Cypher: MATCH (n:Label {idKey:$id}) SET n += $props RETURN n
    async updateOne(req, res, next) {
      try {
        const rows = await run(
          `MATCH (n:${label} {${idKey}: $id}) SET n += $props RETURN n`,
          { id: req.params.id, props: req.body }
        );
        res.json(rows[0]?.n);
      } catch (e) { next(e); }
    },

    // UPDATE multiple nodes matching filter
    // Cypher: MATCH (n:Label) WHERE ... SET n += $props RETURN count(n)
    async updateMany(req, res, next) {
      try {
        const { filter = {}, props = {} } = req.body || {};
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
    },

    // REMOVE properties from one node
    // Cypher: MATCH (n:Label {idKey:$id}) REMOVE n.prop1, n.prop2 RETURN n
    async removeProps(req, res, next) {
      try {
        const props = (req.body.props || []).map((p) => `n.${p}`).join(', ');
        if (!props) return res.status(400).json({ error: 'props required' });
        const rows = await run(
          `MATCH (n:${label} {${idKey}: $id}) REMOVE ${props} RETURN n`,
          { id: req.params.id }
        );
        res.json(rows[0]?.n);
      } catch (e) { next(e); }
    },

    // REMOVE properties from multiple nodes
    async removePropsMany(req, res, next) {
      try {
        const { filter = {}, props = [] } = req.body || {};
        const removal = props.map((p) => `n.${p}`).join(', ');
        const where = Object.keys(filter).map((k) => `n.${k} = $f_${k}`);
        const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
        const params = {};
        Object.keys(filter).forEach((k) => (params[`f_${k}`] = filter[k]));
        const rows = await run(
          `MATCH (n:${label}) ${whereClause} REMOVE ${removal} RETURN count(n) AS updated`,
          params
        );
        res.json(rows[0]);
      } catch (e) { next(e); }
    },

    // DELETE one node (with its relationships)
    // Cypher: MATCH (n:Label {idKey:$id}) DETACH DELETE n
    async deleteOne(req, res, next) {
      try {
        await run(`MATCH (n:${label} {${idKey}: $id}) DETACH DELETE n`, { id: req.params.id });
        res.json({ deleted: 1 });
      } catch (e) { next(e); }
    },

    // DELETE many by filter
    async deleteMany(req, res, next) {
      try {
        const filter = req.body || {};
        const where = Object.keys(filter).map((k) => `n.${k} = $${k}`);
        const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
        const rows = await run(
          `MATCH (n:${label}) ${whereClause} WITH n, count(n) AS c DETACH DELETE n RETURN sum(c) AS deleted`,
          filter
        );
        res.json(rows[0]);
      } catch (e) { next(e); }
    }
  };
}

function buildRouter(label, idKey) {
  const router = require('express').Router();
  const c = buildController(label, idKey);
  router.get('/', c.list);
  router.get('/stats', c.stats);
  router.get('/:id', c.getOne);
  router.post('/', c.create);
  router.post('/multi-label', c.createMultiLabel);
  router.put('/many', c.updateMany);
  router.put('/:id', c.updateOne);
  router.patch('/:id/remove-props', c.removeProps);
  router.patch('/remove-props-many', c.removePropsMany);
  router.delete('/many', c.deleteMany);
  router.delete('/:id', c.deleteOne);
  return router;
}

module.exports = { buildController, buildRouter };
