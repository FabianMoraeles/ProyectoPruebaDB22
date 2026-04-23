const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { run } = require('../db/neo4j');

// CSV must be accessible to the Neo4j server via HTTPS URL or import dir.
// This endpoint accepts a public CSV URL and the label, then runs LOAD CSV.
const upload = multer({ dest: path.join(__dirname, '..', 'uploads') });

// POST /api/carga/load-csv
// body: { url: "https://...csv", label: "Proveedor", keyProp: "nombre" }
// Cypher: LOAD CSV WITH HEADERS FROM $url AS row MERGE (n:Label {key: row.key}) SET n += row
router.post('/load-csv', async (req, res, next) => {
  try {
    const { url, label, keyProp } = req.body;
    if (!url || !label || !keyProp) return res.status(400).json({ error: 'url, label, keyProp required' });
    const query = `
      LOAD CSV WITH HEADERS FROM $url AS row
      MERGE (n:${label} {${keyProp}: row.${keyProp}})
      SET n += row
      RETURN count(n) AS loaded
    `;
    const rows = await run(query, { url });
    res.json(rows[0]);
  } catch (e) { next(e); }
});

// POST /api/carga/upload  (multipart/form-data field: file)
// Reads a local CSV and bulk-creates nodes through UNWIND.
router.post('/upload', upload.single('file'), async (req, res, next) => {
  try {
    const { label, keyProp } = req.body;
    if (!req.file) return res.status(400).json({ error: 'file required' });
    const content = fs.readFileSync(req.file.path, 'utf-8').trim();
    const [headerLine, ...lines] = content.split(/\r?\n/);
    const headers = headerLine.split(',');
    const data = lines.map((l) => {
      const cols = l.split(',');
      const obj = {};
      headers.forEach((h, i) => (obj[h.trim()] = cols[i]?.trim()));
      return obj;
    });
    const rows = await run(
      `UNWIND $rows AS row
       MERGE (n:${label} {${keyProp}: row.${keyProp}})
       SET n += row
       RETURN count(n) AS loaded`,
      { rows: data }
    );
    fs.unlinkSync(req.file.path);
    res.json(rows[0]);
  } catch (e) { next(e); }
});

module.exports = router;
