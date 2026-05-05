/**
 * Generates CSV files under /data with >5000 total nodes across 8 labels.
 * Run once before seeding:  node scripts/generate-csv.js
 */
const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA)) fs.mkdirSync(DATA, { recursive: true });

const rand = (n) => Math.floor(Math.random() * n);
const pick = (arr) => arr[rand(arr.length)];
const isoDate = (d) => d.toISOString().slice(0, 10);
const dateOffset = (days) => isoDate(new Date(Date.now() + days * 86400000));

const paises = ['Guatemala', 'Mexico', 'Honduras', 'El Salvador', 'Costa Rica', 'Panama', 'Colombia', 'USA'];
const ciudades = {
  Guatemala: ['Ciudad de Guatemala', 'Quetzaltenango', 'Escuintla', 'Antigua'],
  Mexico: ['CDMX', 'Monterrey', 'Guadalajara', 'Puebla'],
  Honduras: ['Tegucigalpa', 'San Pedro Sula'],
  'El Salvador': ['San Salvador', 'Santa Ana'],
  'Costa Rica': ['San Jose', 'Alajuela'],
  Panama: ['Panama City', 'Colon'],
  Colombia: ['Bogota', 'Medellin', 'Cali'],
  USA: ['Miami', 'Houston', 'Los Angeles']
};
const categoriasProv = ['alimentos', 'bebidas', 'farmacia', 'ferreteria', 'textil', 'electronica'];
const tagsProd = ['nuevo', 'premium', 'oferta', 'ecologico', 'import', 'congelado'];
const segmentos = ['minorista', 'mayorista', 'corporativo', 'gobierno'];
const estadosOrden = ['activa', 'pendiente', 'en_ruta', 'entregada', 'cancelada'];
const prioridades = ['alta', 'media', 'baja'];
const tiposRuta = ['terrestre', 'maritima', 'aerea'];
const vehiculos = ['camion', 'trailer', 'furgoneta', 'barco', 'avion'];
const unidades = ['unidad', 'kg', 'caja', 'litro', 'pallet'];

function csv(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];
  for (const r of rows) {
    lines.push(headers.map((h) => {
      let v = r[h];
      if (v === null || v === undefined) return '';
      if (Array.isArray(v)) v = v.join('|');
      if (typeof v === 'string' && (v.includes(',') || v.includes('"'))) v = `"${v.replace(/"/g, '""')}"`;
      return v;
    }).join(','));
  }
  return lines.join('\n');
}

// ---- Proveedores (400)
const proveedores = Array.from({ length: 400 }, (_, i) => {
  const pais = pick(paises);
  return {
    nombre: `Proveedor_${i + 1}`,
    pais,
    rating: +(3 + Math.random() * 2).toFixed(2),
    activo: Math.random() > 0.1,
    categorias: Array.from(new Set([pick(categoriasProv), pick(categoriasProv)])).join('|'),
    fecha_registro: dateOffset(-rand(1000))
  };
});

// ---- Productos (1000) — con columna `tipo` para doble label
const productos = Array.from({ length: 1000 }, (_, i) => {
  const esPerecedero = Math.random() < 0.4; // ~40% perecederos
  return {
    nombre: `Producto_${i + 1}`,
    SKU: `SKU-${String(i + 1).padStart(5, '0')}`,
    precio: +(1 + Math.random() * 999).toFixed(2),
    peso: +(0.1 + Math.random() * 50).toFixed(2),
    perecedero: esPerecedero,
    tipo: esPerecedero ? 'Perecedero' : 'NoPerecedero', // ← para doble label
    categoria: pick(['alimentos', 'bebidas', 'farmacia', 'electronica', 'textil', 'ferreteria']),
    tags: [pick(tagsProd), pick(tagsProd)].join('|')
  };
});

// ---- Bodegas (200)
const bodegas = Array.from({ length: 200 }, (_, i) => {
  const pais = pick(paises);
  const cap = 5000 + rand(45000);
  return {
    nombre: `Bodega_${i + 1}`,
    ciudad: pick(ciudades[pais]),
    pais,
    capacidad_total: cap,
    capacidad_disponible: rand(cap),
    activa: Math.random() > 0.08
  };
});

// ---- Inventario (1500) — each tied to a producto
const inventario = Array.from({ length: 1500 }, (_, i) => {
  const min = 10 + rand(200);
  const qty = rand(min * 3);
  return {
    id: `INV-${String(i + 1).padStart(5, '0')}`,
    cantidad: qty,
    unidad: pick(unidades),
    fecha_actualizacion: dateOffset(-rand(60)),
    nivel_minimo: min,
    alerta_stock: qty < min
  };
});

// ---- Rutas (1000)
const rutas = Array.from({ length: 1000 }, (_, i) => ({
  id: `RUT-${String(i + 1).padStart(5, '0')}`,
  distancia_km: +(10 + Math.random() * 3000).toFixed(2),
  tiempo_horas: +(0.5 + Math.random() * 80).toFixed(2),
  costo_promedio: +(50 + Math.random() * 5000).toFixed(2),
  activa: Math.random() > 0.1,
  tipo: pick(tiposRuta)
}));

// ---- Ordenes (1500)
const ordenes = Array.from({ length: 1500 }, (_, i) => {
  const em = -rand(60);
  return {
    numero_orden: `ORD-${String(i + 1).padStart(6, '0')}`,
    fecha_emision: dateOffset(em),
    fecha_entrega: dateOffset(em + 3 + rand(20)),
    total: +(50 + Math.random() * 10000).toFixed(2),
    estado: pick(estadosOrden),
    prioridad: pick(prioridades)
  };
});

// ---- Clientes (700)
const clientes = Array.from({ length: 700 }, (_, i) => {
  const pais = pick(paises);
  return {
    nombre: `Cliente_${i + 1}`,
    segmento: pick(segmentos),
    ciudad: pick(ciudades[pais]),
    credito_aprobado: Math.random() > 0.3,
    limite_credito: +(1000 + Math.random() * 50000).toFixed(2),
    fecha_alta: dateOffset(-rand(1500))
  };
});

// ---- Transporte (300)
const transporte = Array.from({ length: 300 }, (_, i) => ({
  nombre: `Transportista_${i + 1}`,
  vehiculo: pick(vehiculos),
  capacidad_kg: +(500 + Math.random() * 30000).toFixed(2),
  licencia: `LIC-${String(i + 1).padStart(5, '0')}`,
  disponible: Math.random() > 0.2,
  rutas_asignadas: [pick(rutas).id, pick(rutas).id].join('|')
}));

fs.writeFileSync(path.join(DATA, 'proveedores.csv'), csv(proveedores));
fs.writeFileSync(path.join(DATA, 'productos.csv'), csv(productos));
fs.writeFileSync(path.join(DATA, 'bodegas.csv'), csv(bodegas));
fs.writeFileSync(path.join(DATA, 'inventario.csv'), csv(inventario));
fs.writeFileSync(path.join(DATA, 'rutas.csv'), csv(rutas));
fs.writeFileSync(path.join(DATA, 'ordenes.csv'), csv(ordenes));
fs.writeFileSync(path.join(DATA, 'clientes.csv'), csv(clientes));
fs.writeFileSync(path.join(DATA, 'transporte.csv'), csv(transporte));

const total = proveedores.length + productos.length + bodegas.length + inventario.length +
  rutas.length + ordenes.length + clientes.length + transporte.length;

console.log(`Generated CSVs in ${DATA}`);
console.log(`Proveedores=${proveedores.length} Productos=${productos.length} Bodegas=${bodegas.length}`);
console.log(`Inventario=${inventario.length} Rutas=${rutas.length} Ordenes=${ordenes.length}`);
console.log(`Clientes=${clientes.length} Transporte=${transporte.length}`);
console.log(`TOTAL NODES = ${total}`);
