const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { verifyConnectivity } = require('./db/neo4j');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Entity routes
app.use('/api/proveedores', require('./routes/proveedores'));
app.use('/api/productos', require('./routes/productos'));
app.use('/api/productos-doble', require('./routes/productosDoble'));
app.use('/api/bodegas', require('./routes/bodegas'));
app.use('/api/inventario', require('./routes/inventario'));
app.use('/api/rutas', require('./routes/rutas'));
app.use('/api/ordenes', require('./routes/ordenes'));
app.use('/api/clientes', require('./routes/clientes'));
app.use('/api/transporte', require('./routes/transporte'));

// Generic/admin routes
app.use('/api/relaciones', require('./routes/relaciones'));
app.use('/api/nodos', require('./routes/nodos'));
app.use('/api/consultas', require('./routes/consultas'));
app.use('/api/data-science', require('./routes/dataScience'));
app.use('/api/carga', require('./routes/carga'));

app.get('/', (_req, res) => res.json({ ok: true, msg: 'Supply Chain Neo4j API' }));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, async () => {
  console.log(`[API] listening on http://localhost:${PORT}`);
  await verifyConnectivity();
});
