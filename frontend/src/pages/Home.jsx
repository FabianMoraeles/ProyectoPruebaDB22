import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Link } from 'react-router-dom';

export default function Home({ entities }) {
  const [stats, setStats] = useState([]);
  const [err, setErr] = useState(null);

  useEffect(() => {
    api.get('/nodos/stats').then(setStats).catch((e) => setErr(e.message));
  }, []);

  const total = stats.reduce((s, r) => s + (r.total || 0), 0);

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-100">Panel general</h1>
      <p className="text-slate-400 mt-1">Cadena de suministros modelada en Neo4j / AuraDB.</p>

      {err && <div className="mt-4 p-3 bg-rose-900 border border-rose-700 rounded text-rose-100">{err}</div>}

      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card">
          <div className="text-xs text-slate-400 uppercase">Nodos totales</div>
          <div className="text-3xl font-bold text-emerald-400">{total.toLocaleString()}</div>
        </div>
        {stats.slice(0, 7).map((s, i) => (
          <div key={i} className="card">
            <div className="text-xs text-slate-400 uppercase">{(s.labels || [])[0] || '—'}</div>
            <div className="text-2xl font-bold">{(s.total || 0).toLocaleString()}</div>
          </div>
        ))}
      </div>

      <h2 className="text-xl font-semibold mt-8 mb-3">Entidades</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {entities.map((e) => (
          <Link to={`/entidad/${e.key}`} key={e.key}
            className="card hover:border-emerald-500 hover:bg-slate-700 transition">
            <div className="font-semibold text-slate-100">{e.label}</div>
            <div className="text-xs text-slate-400 mt-1">label: <code>{e.entityLabel}</code></div>
            <div className="text-xs text-slate-400">id: <code>{e.idKey}</code></div>
          </Link>
        ))}
      </div>

      <h2 className="text-xl font-semibold mt-8 mb-3">Accesos rápidos</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Link to="/consultas" className="card hover:border-emerald-500 hover:bg-slate-700 transition">
          <div className="font-semibold">Consultas avanzadas</div>
          <div className="text-xs text-slate-400 mt-1">stock bajo, rutas, top proveedores…</div>
        </Link>
        <Link to="/relaciones" className="card hover:border-emerald-500 hover:bg-slate-700 transition">
          <div className="font-semibold">Relaciones</div>
          <div className="text-xs text-slate-400 mt-1">CRUD de aristas del grafo</div>
        </Link>
        <Link to="/carga" className="card hover:border-emerald-500 hover:bg-slate-700 transition">
          <div className="font-semibold">Carga CSV</div>
          <div className="text-xs text-slate-400 mt-1">LOAD CSV o subida manual</div>
        </Link>
      </div>
    </div>
  );
}
