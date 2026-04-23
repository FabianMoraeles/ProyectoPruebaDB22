import { NavLink, Route, Routes, Navigate } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Entidad from './pages/Entidad.jsx';
import Relaciones from './pages/Relaciones.jsx';
import Consultas from './pages/Consultas.jsx';
import Carga from './pages/Carga.jsx';

const entities = [
  { key: 'proveedores', label: 'Proveedores', entityLabel: 'Proveedor', idKey: 'nombre',
    fields: ['nombre', 'pais', 'rating', 'activo', 'categorias', 'fecha_registro'] },
  { key: 'productos', label: 'Productos', entityLabel: 'Producto', idKey: 'SKU',
    fields: ['nombre', 'SKU', 'precio', 'peso', 'perecedero', 'tags'] },
  { key: 'bodegas', label: 'Bodegas', entityLabel: 'Bodega', idKey: 'nombre',
    fields: ['nombre', 'ciudad', 'pais', 'capacidad_total', 'capacidad_disponible', 'activa'] },
  { key: 'inventario', label: 'Inventario', entityLabel: 'Inventario', idKey: 'id',
    fields: ['id', 'cantidad', 'unidad', 'fecha_actualizacion', 'nivel_minimo', 'alerta_stock'] },
  { key: 'rutas', label: 'Rutas', entityLabel: 'Rutas', idKey: 'id',
    fields: ['id', 'distancia_km', 'tiempo_horas', 'costo_promedio', 'activa', 'tipo'] },
  { key: 'ordenes', label: 'Ordenes', entityLabel: 'Ordenes', idKey: 'numero_orden',
    fields: ['numero_orden', 'fecha_emision', 'fecha_entrega', 'total', 'estado', 'prioridad'] },
  { key: 'clientes', label: 'Clientes', entityLabel: 'Clientes', idKey: 'nombre',
    fields: ['nombre', 'segmento', 'ciudad', 'credito_aprobado', 'limite_credito', 'fecha_alta'] },
  { key: 'transporte', label: 'Transporte', entityLabel: 'Transporte', idKey: 'licencia',
    fields: ['nombre', 'vehiculo', 'capacidad_kg', 'licencia', 'disponible', 'rutas_asignadas'] }
];

export default function App() {
  const linkCls = ({ isActive }) =>
    `px-3 py-2 rounded text-sm ${isActive ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`;
  return (
    <div className="min-h-screen flex">
      <aside className="w-60 bg-slate-950 border-r border-slate-800 p-3 flex flex-col gap-1">
        <h1 className="text-lg font-bold text-emerald-400 mb-4">SupplyChain<br /><span className="text-xs text-slate-400">Neo4j AuraDB</span></h1>
        <NavLink to="/" className={linkCls} end>Panel</NavLink>
        <div className="text-xs uppercase text-slate-500 mt-3 mb-1 px-2">Entidades</div>
        {entities.map((e) => (
          <NavLink key={e.key} to={`/entidad/${e.key}`} className={linkCls}>{e.label}</NavLink>
        ))}
        <div className="text-xs uppercase text-slate-500 mt-3 mb-1 px-2">Herramientas</div>
        <NavLink to="/relaciones" className={linkCls}>Relaciones</NavLink>
        <NavLink to="/consultas" className={linkCls}>Consultas</NavLink>
        <NavLink to="/carga" className={linkCls}>Carga CSV</NavLink>
      </aside>
      <main className="flex-1 p-6 overflow-auto">
        <Routes>
          <Route path="/" element={<Home entities={entities} />} />
          <Route path="/entidad/:key" element={<Entidad entities={entities} />} />
          <Route path="/relaciones" element={<Relaciones entities={entities} />} />
          <Route path="/consultas" element={<Consultas />} />
          <Route path="/carga" element={<Carga />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}
