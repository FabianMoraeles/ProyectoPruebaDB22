import { useState } from 'react';
import { api } from '../api/client';

const QUERIES = [
  { key: 'stock-bajo', label: '1) Productos con stock bajo nivel mínimo', path: '/consultas/stock-bajo' },
  { key: 'ruta-corta', label: '2) Ruta más corta entre 2 bodegas', path: '/consultas/ruta-corta', params: ['origen', 'destino'] },
  { key: 'top-prov', label: '3) Proveedor con mayor volumen de órdenes activas', path: '/consultas/top-proveedor-ordenes' },
  { key: 'perecederos', label: '4) Clientes con productos perecederos (30d)', path: '/consultas/clientes-perecederos' },
  { key: 'bod-cap', label: '5) Bodegas con mayor capacidad disponible por país', path: '/consultas/bodegas-capacidad' },
  { key: 'trans-act', label: '6) Transportistas activos y sus rutas', path: '/consultas/transportistas-activos' }
];

export default function Consultas() {
  const [result, setResult] = useState(null);
  const [err, setErr] = useState(null);
  const [running, setRunning] = useState(null);
  const [params, setParams] = useState({ origen: 'Bodega_1', destino: 'Bodega_5' });

  const run = async (q) => {
    setErr(null); setRunning(q.key); setResult(null);
    try {
      let url = q.path;
      if (q.params) {
        const usp = new URLSearchParams();
        q.params.forEach((p) => usp.append(p, params[p] || ''));
        url += '?' + usp.toString();
      }
      setResult(await api.get(url));
    } catch (e) { setErr(e.message); }
    finally { setRunning(null); }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Consultas Cypher especiales</h1>
      {err && <div className="mb-3 p-2 bg-rose-900 rounded text-sm">{err}</div>}

      <div className="card mb-4">
        <div className="text-sm text-slate-400 mb-2">Parámetros para consulta 2 (Ruta corta):</div>
        <div className="flex gap-2">
          <input placeholder="origen (Bodega)" value={params.origen} onChange={(e) => setParams((x) => ({ ...x, origen: e.target.value }))} />
          <input placeholder="destino (Bodega)" value={params.destino} onChange={(e) => setParams((x) => ({ ...x, destino: e.target.value }))} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        {QUERIES.map((q) => (
          <button key={q.key} onClick={() => run(q)}
            className={`card text-left hover:border-emerald-500 transition ${running === q.key ? 'opacity-50' : ''}`}>
            <div className="font-semibold">{q.label}</div>
            <div className="text-xs text-slate-400 mt-1">GET {q.path}</div>
          </button>
        ))}
      </div>

      {result && (
        <div className="card">
          <h3 className="font-semibold mb-2">Resultado ({Array.isArray(result) ? result.length : 1})</h3>
          <pre className="bg-slate-950 p-3 rounded text-xs overflow-auto max-h-[32rem]">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
