/**
 * Seed script — loads CSV files from /data into Neo4j.
 *
 * Strategy:
 *  1. If data files missing, auto-generate them via generate-csv.js logic.
 *  2. Create uniqueness constraints + indexes on SKU, numero_orden, Bodega.nombre, etc.
 *  3. Bulk insert nodes via UNWIND (works against AuraDB without file-system access).
 *  4. Create relationships so the graph is CONEXO (no isolated nodes).
 *  5. Print verification counts.
 *
 * Usage:  node scripts/seed.js
 */

const fs = require('fs');
const path = require('path');
const neo4j = require('neo4j-driver');
require('dotenv').config({ path: path.join(__dirname, '..', 'backend', '.env') });

const DATA = path.join(__dirname, '..', 'data');

// --- auto-generate CSVs if missing ---
if (!fs.existsSync(path.join(DATA, 'proveedores.csv'))) {
  console.log('CSV files missing — generating...');
  require('./generate-csv.js');
}

function parseCSV(file) {
  const content = fs.readFileSync(path.join(DATA, file), 'utf-8').trim();
  const [headerLine, ...lines] = content.split(/\r?\n/);
  const headers = headerLine.split(',');
  return lines.map((line) => {
    const cols = line.match(/("([^"]|"")*"|[^,]*)(,|$)/g)?.map((c) => c.replace(/,$/, '').replace(/^"|"$/g, '').replace(/""/g, '"')) || line.split(',');
    const obj = {};
    headers.forEach((h, i) => {
      let v = cols[i];
      if (v === undefined || v === '') { obj[h] = null; return; }
      if (v === 'true') v = true;
      else if (v === 'false') v = false;
      else if (/^-?\d+$/.test(v)) v = parseInt(v, 10);
      else if (/^-?\d+\.\d+$/.test(v)) v = parseFloat(v);
      else if (h === 'categorias' || h === 'tags' || h === 'rutas_asignadas') v = v.split('|').filter(Boolean);
      obj[h] = v;
    });
    return obj;
  });
}

const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD),
  { disableLosslessIntegers: true }
);

async function runWrite(cypher, params = {}) {
  const session = driver.session();
  try { return await session.run(cypher, params); } finally { await session.close(); }
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function rand(n) { return Math.floor(Math.random() * n); }

async function main() {
  console.log('Loading CSVs...');
  const proveedores = parseCSV('proveedores.csv');
  const productos = parseCSV('productos.csv');
  const bodegas = parseCSV('bodegas.csv');
  const inventario = parseCSV('inventario.csv');
  const rutas = parseCSV('rutas.csv');
  const ordenes = parseCSV('ordenes.csv');
  const clientes = parseCSV('clientes.csv');
  const transporte = parseCSV('transporte.csv');

  console.log('Creating constraints & indexes...');
  const constraints = [
    'CREATE CONSTRAINT prov_nombre IF NOT EXISTS FOR (n:Proveedor) REQUIRE n.nombre IS UNIQUE',
    'CREATE CONSTRAINT prod_sku    IF NOT EXISTS FOR (n:Producto) REQUIRE n.SKU IS UNIQUE',
    'CREATE CONSTRAINT bod_nombre  IF NOT EXISTS FOR (n:Bodega) REQUIRE n.nombre IS UNIQUE',
    'CREATE CONSTRAINT inv_id      IF NOT EXISTS FOR (n:Inventario) REQUIRE n.id IS UNIQUE',
    'CREATE CONSTRAINT rut_id      IF NOT EXISTS FOR (n:Rutas) REQUIRE n.id IS UNIQUE',
    'CREATE CONSTRAINT ord_num     IF NOT EXISTS FOR (n:Ordenes) REQUIRE n.numero_orden IS UNIQUE',
    'CREATE CONSTRAINT cli_nombre  IF NOT EXISTS FOR (n:Clientes) REQUIRE n.nombre IS UNIQUE',
    'CREATE CONSTRAINT trans_lic   IF NOT EXISTS FOR (n:Transporte) REQUIRE n.licencia IS UNIQUE'
  ];
  for (const c of constraints) { try { await runWrite(c); } catch (e) { console.warn(c, e.message); } }

  const batch = async (label, rows, unwindCypher) => {
    const size = 500;
    for (let i = 0; i < rows.length; i += size) {
      const chunk = rows.slice(i, i + size);
      await runWrite(unwindCypher, { rows: chunk });
    }
    console.log(`  ${label}: ${rows.length} inserted`);
  };

  console.log('Inserting nodes...');
  await batch('Proveedor', proveedores,
    `UNWIND $rows AS r MERGE (n:Proveedor {nombre: r.nombre})
     SET n.pais=r.pais, n.rating=toFloat(r.rating), n.activo=r.activo,
         n.categorias=r.categorias, n.fecha_registro=date(r.fecha_registro)`);
  await batch('Producto', productos,
    `UNWIND $rows AS r MERGE (n:Producto {SKU: r.SKU})
     SET n.nombre=r.nombre, n.precio=toFloat(r.precio), n.peso=toFloat(r.peso),
         n.perecedero=r.perecedero, n.tags=r.tags`);
  await batch('Bodega', bodegas,
    `UNWIND $rows AS r MERGE (n:Bodega {nombre: r.nombre})
     SET n.ciudad=r.ciudad, n.pais=r.pais, n.capacidad_total=toInteger(r.capacidad_total),
         n.capacidad_disponible=toInteger(r.capacidad_disponible), n.activa=r.activa`);
  await batch('Inventario', inventario,
    `UNWIND $rows AS r MERGE (n:Inventario {id: r.id})
     SET n.cantidad=toInteger(r.cantidad), n.unidad=r.unidad,
         n.fecha_actualizacion=date(r.fecha_actualizacion),
         n.nivel_minimo=toInteger(r.nivel_minimo), n.alerta_stock=r.alerta_stock`);
  await batch('Rutas', rutas,
    `UNWIND $rows AS r MERGE (n:Rutas {id: r.id})
     SET n.distancia_km=toFloat(r.distancia_km), n.tiempo_horas=toFloat(r.tiempo_horas),
         n.costo_promedio=toFloat(r.costo_promedio), n.activa=r.activa, n.tipo=r.tipo`);
  await batch('Ordenes', ordenes,
    `UNWIND $rows AS r MERGE (n:Ordenes {numero_orden: r.numero_orden})
     SET n.fecha_emision=date(r.fecha_emision), n.fecha_entrega=date(r.fecha_entrega),
         n.total=toFloat(r.total), n.estado=r.estado, n.prioridad=r.prioridad`);
  await batch('Clientes', clientes,
    `UNWIND $rows AS r MERGE (n:Clientes {nombre: r.nombre})
     SET n.segmento=r.segmento, n.ciudad=r.ciudad, n.credito_aprobado=r.credito_aprobado,
         n.limite_credito=toFloat(r.limite_credito), n.fecha_alta=date(r.fecha_alta)`);
  await batch('Transporte', transporte,
    `UNWIND $rows AS r MERGE (n:Transporte {licencia: r.licencia})
     SET n.nombre=r.nombre, n.vehiculo=r.vehiculo, n.capacidad_kg=toFloat(r.capacidad_kg),
         n.disponible=r.disponible, n.rutas_asignadas=r.rutas_asignadas`);

  // --- RELATIONSHIPS (grafo conexo) ---
  console.log('Building relationships (making graph connected)...');

  // Proveedor -SUMINISTRA-> Producto (each Producto receives from 1-2 providers, every Proveedor hits >=1 Producto)
  const suministra = [];
  productos.forEach((p, i) => {
    suministra.push({ prov: proveedores[i % proveedores.length].nombre, sku: p.SKU,
      precio: +(p.precio * 0.6).toFixed(2), fecha_entrega: '2026-01-15', periodo: 'mensual' });
    if (Math.random() > 0.5) {
      suministra.push({ prov: pick(proveedores).nombre, sku: p.SKU,
        precio: +(p.precio * 0.7).toFixed(2), fecha_entrega: '2026-02-01', periodo: 'trimestral' });
    }
  });
  await batch('SUMINISTRA', suministra,
    `UNWIND $rows AS r
     MATCH (a:Proveedor {nombre:r.prov}),(b:Producto {SKU:r.sku})
     MERGE (a)-[s:SUMINISTRA]->(b)
     SET s.precio=toFloat(r.precio), s.fecha_entrega=date(r.fecha_entrega), s.periodo=r.periodo`);

  // Inventario -DE_PRODUCTO-> Producto
  const deProducto = inventario.map((inv, i) => ({
    inv: inv.id, sku: productos[i % productos.length].SKU,
    dimensional: 'unitario', estado: true, minimo: inv.nivel_minimo
  }));
  await batch('DE_PRODUCTO', deProducto,
    `UNWIND $rows AS r
     MATCH (a:Inventario {id:r.inv}),(b:Producto {SKU:r.sku})
     MERGE (a)-[x:DE_PRODUCTO]->(b)
     SET x.dimensional=r.dimensional, x.estado=r.estado, x.minimo=toInteger(r.minimo)`);

  // Bodega -ALMACENA-> Producto (cada producto almacenado en >=1 bodega)
  const almacena = productos.map((p, i) => ({
    bod: bodegas[i % bodegas.length].nombre, sku: p.SKU,
    cantidad: 50 + rand(500), lote: `L-${rand(9999)}`, fecha_ingreso: '2026-03-01'
  }));
  await batch('ALMACENA', almacena,
    `UNWIND $rows AS r
     MATCH (a:Bodega {nombre:r.bod}),(b:Producto {SKU:r.sku})
     MERGE (a)-[x:ALMACENA]->(b)
     SET x.cantidad=toInteger(r.cantidad), x.lote=r.lote, x.fecha_ingreso=date(r.fecha_ingreso)`);

  // Bodega -EXISTENCIAS-> Inventario
  const existencias = inventario.map((inv, i) => ({
    bod: bodegas[i % bodegas.length].nombre, inv: inv.id,
    encargado: `Encargado_${rand(50)}`, estado: 'revisado', fecha_revision: '2026-04-10'
  }));
  await batch('EXISTENCIAS', existencias,
    `UNWIND $rows AS r
     MATCH (a:Bodega {nombre:r.bod}),(b:Inventario {id:r.inv})
     MERGE (a)-[x:EXISTENCIAS]->(b)
     SET x.encargado=r.encargado, x.estado=r.estado, x.fecha_revision=date(r.fecha_revision)`);

  // Bodega -REORDENA-> Producto (cada bodega reordena >=1 producto)
  const reordena = bodegas.map((b, i) => ({
    bod: b.nombre, sku: productos[(i * 3) % productos.length].SKU,
    cantidad: 100 + rand(1000), fecha: '2026-04-15', fecha_ingreso: '2026-04-22'
  }));
  await batch('REORDENA', reordena,
    `UNWIND $rows AS r
     MATCH (a:Bodega {nombre:r.bod}),(b:Producto {SKU:r.sku})
     MERGE (a)-[x:REORDENA]->(b)
     SET x.cantidad=toInteger(r.cantidad), x.fecha=date(r.fecha), x.fecha_ingreso=date(r.fecha_ingreso)`);

  // Bodega -RUTA_POR-> Rutas  y Rutas -ENVIA_A-> Bodega (cada ruta conecta 2 bodegas)
  const rutaPor = [];
  const enviaA = [];
  rutas.forEach((r, i) => {
    const b1 = bodegas[i % bodegas.length].nombre;
    const b2 = bodegas[(i + 1) % bodegas.length].nombre;
    rutaPor.push({ bod: b1, rut: r.id, orden: 1, estado: true, tipo: r.tipo });
    enviaA.push({ rut: r.id, bod: b2, distancia: r.distancia_km, horas: r.tiempo_horas, confirmado: true });
  });
  await batch('RUTA_POR', rutaPor,
    `UNWIND $rows AS r
     MATCH (a:Bodega {nombre:r.bod}),(b:Rutas {id:r.rut})
     MERGE (a)-[x:RUTA_POR]->(b)
     SET x.orden=toInteger(r.orden), x.estado=r.estado, x.tipo=r.tipo`);
  await batch('ENVIA_A', enviaA,
    `UNWIND $rows AS r
     MATCH (a:Rutas {id:r.rut}),(b:Bodega {nombre:r.bod})
     MERGE (a)-[x:ENVIA_A]->(b)
     SET x.distancia=toFloat(r.distancia), x.horas=toFloat(r.horas), x.confirmado=r.confirmado`);

  // Bodega -DISTRIBUYE-> Clientes (cada cliente recibe de >=1 bodega)
  const distribuye = clientes.map((c, i) => ({
    bod: bodegas[i % bodegas.length].nombre, cli: c.nombre,
    dias_entrega: 1 + rand(7), costo: +(50 + Math.random() * 500).toFixed(2), zona: c.ciudad
  }));
  await batch('DISTRIBUYE', distribuye,
    `UNWIND $rows AS r
     MATCH (a:Bodega {nombre:r.bod}),(b:Clientes {nombre:r.cli})
     MERGE (a)-[x:DISTRIBUYE]->(b)
     SET x.dias_entrega=toInteger(r.dias_entrega), x.costo=toFloat(r.costo), x.zona=r.zona`);

  // Ordenes -TIENE-> Producto  (each order has 1-3 products)
  const tiene = [];
  ordenes.forEach((o) => {
    const n = 1 + rand(3);
    for (let i = 0; i < n; i++) {
      const p = pick(productos);
      tiene.push({ ord: o.numero_orden, sku: p.SKU,
        cantidad: 1 + rand(20), precio_unitario: p.precio, descuento: +(Math.random() * 0.2).toFixed(2) });
    }
  });
  await batch('TIENE', tiene,
    `UNWIND $rows AS r
     MATCH (a:Ordenes {numero_orden:r.ord}),(b:Producto {SKU:r.sku})
     MERGE (a)-[x:TIENE]->(b)
     SET x.cantidad=toInteger(r.cantidad), x.precio_unitario=toFloat(r.precio_unitario), x.descuento=toFloat(r.descuento)`);

  // Ordenes -ENVIADA_A-> Bodega
  const enviada = ordenes.map((o, i) => ({
    ord: o.numero_orden, bod: bodegas[i % bodegas.length].nombre,
    fecha: o.fecha_emision, llegada: o.estado === 'entregada', guia: `G-${rand(999999)}`
  }));
  await batch('ENVIADA_A', enviada,
    `UNWIND $rows AS r
     MATCH (a:Ordenes {numero_orden:r.ord}),(b:Bodega {nombre:r.bod})
     MERGE (a)-[x:ENVIADA_A]->(b)
     SET x.fecha=date(r.fecha), x.llegada=r.llegada, x.guia=r.guia`);

  // Ordenes -GENERADA_POR-> Clientes (every order has a client)
  const generada = ordenes.map((o, i) => ({
    ord: o.numero_orden, cli: clientes[i % clientes.length].nombre,
    fecha: o.fecha_emision, metodo_pago: pick(['tarjeta', 'efectivo', 'transferencia']),
    generada_por: 'portal_web'
  }));
  await batch('GENERADA_POR', generada,
    `UNWIND $rows AS r
     MATCH (a:Ordenes {numero_orden:r.ord}),(b:Clientes {nombre:r.cli})
     MERGE (a)-[x:GENERADA_POR]->(b)
     SET x.fecha=date(r.fecha), x.metodo_pago=r.metodo_pago, x.generada_por=r.generada_por`);

  // Transporte -TRANSPORTA-> Ordenes (each order has a transporter)
  const transporta = ordenes.map((o, i) => ({
    lic: transporte[i % transporte.length].licencia, ord: o.numero_orden,
    costo: +(100 + Math.random() * 2000).toFixed(2), estado: o.estado !== 'cancelada', fecha: o.fecha_emision
  }));
  await batch('TRANSPORTA', transporta,
    `UNWIND $rows AS r
     MATCH (a:Transporte {licencia:r.lic}),(b:Ordenes {numero_orden:r.ord})
     MERGE (a)-[x:TRANSPORTA]->(b)
     SET x.costo=toFloat(r.costo), x.estado=r.estado, x.fecha=date(r.fecha)`);

  // Transporte -USA_RUTA-> Rutas (each transporter uses >=2 rutas)
  const usaRuta = [];
  transporte.forEach((t, i) => {
    usaRuta.push({ lic: t.licencia, rut: rutas[i % rutas.length].id,
      prioridad: pick(['alta', 'media', 'baja']), activo: true, frecuencia: 1 + rand(10) });
    usaRuta.push({ lic: t.licencia, rut: rutas[(i + 7) % rutas.length].id,
      prioridad: pick(['alta', 'media', 'baja']), activo: true, frecuencia: 1 + rand(10) });
  });
  await batch('USA_RUTA', usaRuta,
    `UNWIND $rows AS r
     MATCH (a:Transporte {licencia:r.lic}),(b:Rutas {id:r.rut})
     MERGE (a)-[x:USA_RUTA]->(b)
     SET x.prioridad=r.prioridad, x.activo=r.activo, x.frecuencia=toInteger(r.frecuencia)`);

  console.log('\nVerifying graph is connected (checking for orphan nodes)...');
  const orphan = await runWrite('MATCH (n) WHERE NOT (n)--() RETURN labels(n) AS l, count(n) AS c');
  if (orphan.records.length === 0) {
    console.log('  ✓ No orphan nodes — graph is CONEXO.');
  } else {
    console.warn('  ⚠ Orphan nodes found:', orphan.records.map((r) => ({ l: r.get('l'), c: r.get('c').toNumber() })));
  }

  const counts = await runWrite('MATCH (n) RETURN labels(n)[0] AS label, count(n) AS total ORDER BY total DESC');
  console.log('\nNode counts:');
  counts.records.forEach((r) => console.log(`  ${r.get('label')}: ${r.get('total').toNumber ? r.get('total').toNumber() : r.get('total')}`));

  await driver.close();
  console.log('\nSeed complete.');
}

main().catch((e) => { console.error(e); driver.close(); process.exit(1); });
