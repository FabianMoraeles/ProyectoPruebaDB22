import { useState } from 'react';
import { api } from '../api/client';
import GraphView from '../components/GraphView';

const QUERIES = [
  { key: 'stock-bajo',  label: '1) Productos con stock bajo nivel mínimo',       path: '/consultas/stock-bajo' },
  { key: 'ruta-corta',  label: '2) Ruta más corta entre 2 bodegas',              path: '/consultas/ruta-corta', params: ['origen', 'destino'] },
  { key: 'top-prov',    label: '3) Proveedor con mayor volumen de órdenes activas', path: '/consultas/top-proveedor-ordenes' },
  { key: 'perecederos', label: '4) Clientes con productos perecederos (30d)',     path: '/consultas/clientes-perecederos' },
  { key: 'bod-cap',     label: '5) Bodegas con mayor capacidad disponible por país', path: '/consultas/bodegas-capacidad' },
  { key: 'trans-act',   label: '6) Transportistas activos y sus rutas',           path: '/consultas/transportistas-activos' },
];

function buildGraph(key, data) {
  const nodesMap = new Map();
  const links = [];

  const node = (id, label, type) => {
    if (!nodesMap.has(id)) nodesMap.set(id, { id, label, type });
  };
  const link = (source, target, label) => links.push({ source, target, label });

  if (!data) return { nodes: [], links: [] };

  if (key === 'stock-bajo') {
    data.slice(0, 80).forEach((r) => {
      node(`b:${r.bodega}`, r.bodega, 'Bodega');
      node(`p:${r.sku}`, r.producto, 'Producto');
      link(`b:${r.bodega}`, `p:${r.sku}`, 'STOCK_BAJO');
    });

  } else if (key === 'ruta-corta' && data?.nodos) {
    data.nodos.forEach((n, i) => {
      const isEdge = i === 0 || i === data.nodos.length - 1;
      node(n, n, isEdge ? 'Bodega' : 'Rutas');
    });
    data.rels.forEach((rel, i) => {
      if (i < data.nodos.length - 1) link(data.nodos[i], data.nodos[i + 1], rel);
    });

  } else if (key === 'top-prov') {
    node('hub', 'Órdenes Activas', 'Ordenes');
    data.forEach((r) => {
      node(`pr:${r.proveedor}`, r.proveedor, 'Proveedor');
      link(`pr:${r.proveedor}`, 'hub', 'SUMINISTRA');
    });

  } else if (key === 'perecederos') {
    data.slice(0, 30).forEach((r) => {
      node(`c:${r.cliente}`, r.cliente, 'Clientes');
      (r.productos ?? []).slice(0, 4).forEach((p) => {
        node(`p:${p}`, p, 'Producto');
        link(`c:${r.cliente}`, `p:${p}`, 'TIENE');
      });
    });

  } else if (key === 'bod-cap') {
    data.forEach((r) => {
      node(`pais:${r.pais}`, r.pais, 'País');
      (r.top ?? []).forEach((b) => {
        node(`b:${b.nombre}`, b.nombre, 'Bodega');
        link(`pais:${r.pais}`, `b:${b.nombre}`, 'EN');
      });
    });

  } else if (key === 'trans-act') {
    data.slice(0, 30).forEach((r) => {
      node(`t:${r.licencia}`, r.transportista, 'Transporte');
      (r.rutas ?? []).filter((rt) => rt.id).slice(0, 5).forEach((rt) => {
        node(`r:${rt.id}`, rt.id, 'Rutas');
        link(`t:${r.licencia}`, `r:${rt.id}`, 'USA_RUTA');
      });
    });
  }

  return { nodes: [...nodesMap.values()], links };
}

export default function Consultas() {
  const [result,  setResult]  = useState(null);
  const [activeKey, setActiveKey] = useState(null);
  const [err,     setErr]     = useState(null);
  const [running, setRunning] = useState(null);
  const [params,  setParams]  = useState({ origen: 'Bodega_1', destino: 'Bodega_5' });
  const [tab,     setTab]     = useState('tabla');

  const run = async (q) => {
    setErr(null); setRunning(q.key); setResult(null); setActiveKey(null); setTab('tabla');
    try {
      let url = q.path;
      if (q.params) {
        const usp = new URLSearchParams();
        q.params.forEach((p) => usp.append(p, params[p] || ''));
        url += '?' + usp.toString();
      }
      const data = await api.get(url);
      setResult(data);
      setActiveKey(q.key);
    } catch (e) { setErr(e.message); }
    finally { setRunning(null); }
  };

  const graph = result && activeKey ? buildGraph(activeKey, result) : null;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Consultas Cypher especiales</h1>
      {err && <div className="mb-3 p-2 bg-rose-900 rounded text-sm">{err}</div>}

      <div className="card mb-4">
        <div className="text-sm text-slate-400 mb-2">Parámetros para consulta 2 (Ruta corta):</div>
        <div className="flex gap-2">
          <input
            placeholder="origen (Bodega)"
            value={params.origen}
            onChange={(e) => setParams((x) => ({ ...x, origen: e.target.value }))}
          />
          <input
            placeholder="destino (Bodega)"
            value={params.destino}
            onChange={(e) => setParams((x) => ({ ...x, destino: e.target.value }))}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        {QUERIES.map((q) => (
          <button
            key={q.key}
            onClick={() => run(q)}
            className={`card text-left hover:border-emerald-500 transition ${
              running === q.key ? 'opacity-50' : ''
            } ${activeKey === q.key ? 'border-emerald-500' : ''}`}
          >
            <div className="font-semibold">{q.label}</div>
            <div className="text-xs text-slate-400 mt-1">GET {q.path}</div>
          </button>
        ))}
      </div>

      {result && (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">
              Resultado ({Array.isArray(result) ? result.length : 1})
            </h3>
            <div className="flex gap-1">
              <button
                onClick={() => setTab('tabla')}
                className={`px-3 py-1 rounded text-sm transition ${
                  tab === 'tabla'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                JSON
              </button>
              <button
                onClick={() => setTab('grafo')}
                className={`px-3 py-1 rounded text-sm transition ${
                  tab === 'grafo'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                Grafo
              </button>
            </div>
          </div>

          {tab === 'tabla' && (
            <pre className="bg-slate-950 p-3 rounded text-xs overflow-auto max-h-[32rem]">
              {JSON.stringify(result, null, 2)}
            </pre>
          )}

          {tab === 'grafo' && graph && (
            <GraphView nodes={graph.nodes} links={graph.links} />
          )}
        </div>
      )}
    </div>
  );
}
