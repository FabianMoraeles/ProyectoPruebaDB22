# Supply Chain — Neo4j AuraDB

App fullstack (Express + React/Vite + Tailwind) para gestionar una cadena de suministros modelada como grafo en Neo4j / AuraDB.

## Modelo
8 labels: `Proveedor`, `Producto`, `Bodega`, `Inventario`, `Rutas`, `Ordenes`, `Clientes`, `Transporte`.
13 relaciones: `SUMINISTRA, DE_PRODUCTO, ALMACENA, EXISTENCIAS, REORDENA, RUTA_POR, DISTRIBUYE, ENVIA_A, TIENE, ENVIADA_A, GENERADA_POR, TRANSPORTA, USA_RUTA`.
Al menos **5150 nodos** generados por el seed, con el grafo **conexo** (sin nodos aislados).

## Estructura
```
/backend        — Express + neo4j-driver
  /routes       — un archivo por entidad + relaciones, nodos, consultas, carga
  /controllers  — factory CRUD genérico (generic.js)
  /db           — conexión neo4j
  server.js
  .env.example
/frontend       — React (Vite) + Tailwind
  /src
    /pages      — Home, Entidad, Relaciones, Consultas, Carga
    /components — EntityForm, DataTable
    /api        — client.js
/data           — 8 CSV generados
/scripts
  generate-csv.js — genera CSVs procedurales (>5000 nodos)
  seed.js         — carga CSVs en Neo4j, crea constraints/indexes y relaciones
```

## Variables de entorno (`backend/.env`)
```
NEO4J_URI=neo4j+s://XXXXXXXX.databases.neo4j.io
NEO4J_USER=neo4j
NEO4J_PASSWORD=tu_password
PORT=4000
```
Copia `.env.example` como `.env` y rellena credenciales.

## Instalación
```bash
# 1) Backend
cd backend
npm install
cp .env.example .env   # edita con tus credenciales AuraDB

# 2) Frontend
cd ../frontend
npm install
```

## Datos y seed
```bash
# Desde la raíz del proyecto
node scripts/generate-csv.js   # genera /data/*.csv (5150 nodos)
node scripts/seed.js           # crea constraints/índices + carga nodos + relaciones
```
El seed crea índices/constraints en `Producto.SKU`, `Ordenes.numero_orden`, `Bodega.nombre`, `Proveedor.nombre`, `Inventario.id`, `Rutas.id`, `Clientes.nombre`, `Transporte.licencia`, y verifica la conexidad del grafo.

## Ejecución
```bash
# Terminal 1
cd backend && npm start           # http://localhost:4000

# Terminal 2
cd frontend && npm run dev        # http://localhost:5173
```

## Endpoints API (resumen)

### CRUD por entidad
Patrón común para cada `:entity` (proveedores, productos, bodegas, inventario, rutas, ordenes, clientes, transporte):
- `GET    /api/:entity`                      — lista con filtros por query string
- `GET    /api/:entity/stats`                — conteo (agregación)
- `GET    /api/:entity/:id`                  — uno por idKey
- `POST   /api/:entity`                      — crear (1 label, todas sus props)
- `POST   /api/:entity/multi-label`          — crear con 2+ labels (`extraLabels: []`)
- `PUT    /api/:entity/:id`                  — actualizar props de 1 nodo
- `PUT    /api/:entity/many`                 — actualizar props de múltiples nodos (`{filter, props}`)
- `PATCH  /api/:entity/:id/remove-props`     — eliminar propiedades de 1 nodo
- `PATCH  /api/:entity/remove-props-many`    — eliminar propiedades de múltiples nodos
- `DELETE /api/:entity/:id`                  — eliminar 1 nodo
- `DELETE /api/:entity/many`                 — eliminar múltiples nodos por filtro

### Nodos (utilidades globales)
- `GET    /api/nodos/stats`                         — conteo por label
- `PATCH  /api/nodos/add-props`                     — agregar propiedades nuevas a varios nodos
- `POST   /api/nodos/add-label`                     — agregar label adicional a un nodo
- `GET    /api/nodos/aggregate/:label/:op/:prop`    — COUNT/SUM/AVG/MIN/MAX

### Relaciones
- `POST   /api/relaciones`                 — crear relación (3+ props)
- `GET    /api/relaciones/:relType`        — listar por tipo con filtros
- `PUT    /api/relaciones/one`             — actualizar una
- `PUT    /api/relaciones/many`            — actualizar muchas
- `PATCH  /api/relaciones/one/remove-props`
- `PATCH  /api/relaciones/many/remove-props`
- `DELETE /api/relaciones/one`
- `DELETE /api/relaciones/many`

### Consultas especiales
- `GET /api/consultas/stock-bajo`                         — productos con stock < nivel_minimo
- `GET /api/consultas/ruta-corta?origen=&destino=`        — ruta más corta entre 2 bodegas
- `GET /api/consultas/top-proveedor-ordenes`              — top proveedor por órdenes activas
- `GET /api/consultas/clientes-perecederos`               — perecederos entregados (30d)
- `GET /api/consultas/bodegas-capacidad`                  — top bodegas por país
- `GET /api/consultas/transportistas-activos`             — transportistas + rutas

### Carga CSV
- `POST /api/carga/load-csv`    — body `{url, label, keyProp}` — usa `LOAD CSV WITH HEADERS`
- `POST /api/carga/upload`      — multipart `file` + campos `label`, `keyProp` — UNWIND

## Frontend
UI oscura con sidebar, una vista por entidad con tabla, formulario, filtros, creación multi-label, agregado de props extra, borrado simple y masivo. Páginas dedicadas a **Relaciones** y **Consultas** (con botones para cada una de las 6 consultas del enunciado) y **Carga CSV**.

## Notas técnicas
- `neo4j-driver` con `disableLosslessIntegers: true` para serializar enteros nativos.
- Valores `date()` devueltos como string ISO.
- Grafo conexo garantizado porque cada nodo recibe al menos una relación durante el seed (cada Producto recibe `SUMINISTRA` y `ALMACENA`, cada Cliente recibe `DISTRIBUYE` y `GENERADA_POR`, etc.).
- Constraints UNIQUE también actúan como índices automáticos.
