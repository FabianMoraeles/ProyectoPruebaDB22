import { useEffect, useState } from 'react';
import { api } from '../api/client';

function CypherSnippet({ children }) {
  return (
    <pre className="text-xs bg-slate-950 border border-slate-800 rounded p-2 overflow-x-auto text-emerald-300 whitespace-pre-wrap">
      {children}
    </pre>
  );
}

function ResultTable({ rows, cols }) {
  if (!rows || rows.length === 0) return <div className="text-slate-500 text-sm py-2">Sin resultados.</div>;
  const keys = cols || Object.keys(rows[0]);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-slate-400 text-left text-xs uppercase">
          <tr>{keys.map((k) => <th key={k} className="py-1 pr-3">{k}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-slate-800">
              {keys.map((k) => {
                const v = r[k];
                let txt = '';
                if (Array.isArray(v)) txt = v.join(', ');
                else if (v == null) txt = '—';
                else if (typeof v === 'object') txt = JSON.stringify(v);
                else txt = String(v);
                return <td key={k} className="py-1 pr-3 font-mono text-xs max-w-xs truncate">{txt}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Section({ title, descripcion, cypher, onRun, children, loading }) {
  return (
    <section className="mt-6 card">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-emerald-400">{title}</h2>
          <p className="text-slate-400 text-sm mt-1">{descripcion}</p>
        </div>
        <button onClick={onRun} disabled={loading}
          className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded px-3 py-1.5 text-white text-sm">
          {loading ? 'Corriendo...' : 'Ejecutar'}
        </button>
      </div>
      {cypher && <div className="mt-3"><CypherSnippet>{cypher}</CypherSnippet></div>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default function DataScience() {
  const [resumen, setResumen] = useState(null);
  const [degree, setDegree] = useState(null);
  const [degreeLabel, setDegreeLabel] = useState('Proveedor');
  const [pagerank, setPagerank] = useState(null);
  const [pagerankLabel, setPagerankLabel] = useState('Proveedor');
  const [jaccard, setJaccard] = useState(null);
  const [triangle, setTriangle] = useState(null);
  const [puente, setPuente] = useState(null);
  const [reco, setReco] = useState(null);
  const [recoCliente, setRecoCliente] = useState('');
  const [loading, setLoading] = useState({});
  const [err, setErr] = useState(null);

  const runner = (key, fn, set) => async () => {
    setLoading((l) => ({ ...l, [key]: true }));
    setErr(null);
    try { set(await fn()); }
    catch (e) { setErr(`${key}: ${e.message}`); }
    finally { setLoading((l) => ({ ...l, [key]: false })); }
  };

  useEffect(() => {
    api.get('/data-science/resumen').then(setResumen).catch((e) => setErr(e.message));
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-100">Data Science / Graph Analytics</h1>
      <p className="text-slate-400 mt-1">
        Algoritmos de análisis de grafos aplicados al supply chain. Implementados con Cypher puro
        (compatible con cualquier AuraDB) + GDS donde está disponible.
      </p>

      {err && <div className="mt-3 p-3 rounded border bg-rose-900 border-rose-700 text-rose-100">{err}</div>}

      {resumen && (
        <div className="mt-6 grid grid-cols-3 gap-3">
          <div className="card">
            <div className="text-xs text-slate-400 uppercase">Nodos totales</div>
            <div className="text-3xl font-bold text-emerald-400">{resumen.nodos?.toLocaleString?.() || '—'}</div>
          </div>
          <div className="card">
            <div className="text-xs text-slate-400 uppercase">Relaciones</div>
            <div className="text-3xl font-bold text-emerald-400">{resumen.relaciones?.toLocaleString?.() || '—'}</div>
          </div>
          <div className="card">
            <div className="text-xs text-slate-400 uppercase">Densidad (rels/nodo)</div>
            <div className="text-3xl font-bold text-emerald-400">{resumen.densidad_promedio || '—'}</div>
          </div>
        </div>
      )}

      {/* 1. Degree Centrality */}
      <Section
        title="1. Degree Centrality"
        descripcion="Mide la importancia de un nodo por su número de conexiones. Identifica hubs en la red."
        cypher={`MATCH (n:${degreeLabel})
OPTIONAL MATCH (n)-[r]-()
WITH n, count(r) AS degree
RETURN n.nombre, labels(n), degree
ORDER BY degree DESC LIMIT 10`}
        loading={loading.degree}
        onRun={runner('degree', () => api.get(`/data-science/degree?label=${degreeLabel}&limit=10`), setDegree)}
      >
        <div className="flex gap-2 mb-3">
          <label className="text-sm text-slate-400">Label:</label>
          <select value={degreeLabel} onChange={(e) => setDegreeLabel(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm">
            {['Proveedor', 'Bodega', 'Producto', 'Clientes', 'Transporte'].map((l) => <option key={l}>{l}</option>)}
          </select>
        </div>
        {degree && <ResultTable rows={degree.results} />}
      </Section>

      {/* 2. PageRank */}
      <Section
        title="2. PageRank"
        descripcion="Importancia recursiva: un nodo es importante si está conectado a otros nodos importantes. Usa GDS si está disponible, fallback a weighted-degree."
        cypher={`CALL gds.pageRank.stream('grafo')
YIELD nodeId, score
RETURN gds.util.asNode(nodeId).nombre, score
ORDER BY score DESC LIMIT 10`}
        loading={loading.pagerank}
        onRun={runner('pagerank', () => api.get(`/data-science/pagerank?label=${pagerankLabel}&limit=10`), setPagerank)}
      >
        <div className="flex gap-2 mb-3">
          <label className="text-sm text-slate-400">Label:</label>
          <select value={pagerankLabel} onChange={(e) => setPagerankLabel(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm">
            {['Proveedor', 'Bodega', 'Producto', 'Clientes', 'Transporte'].map((l) => <option key={l}>{l}</option>)}
          </select>
        </div>
        {pagerank && (
          <>
            <div className="text-xs text-slate-400 mb-1">Algoritmo: <code>{pagerank.algorithm}</code></div>
            <ResultTable rows={pagerank.results} />
          </>
        )}
      </Section>

      {/* 3. Jaccard */}
      <Section
        title="3. Jaccard Similarity entre Proveedores"
        descripcion="Encuentra pares de proveedores más similares según los productos que ambos suministran. |A ∩ B| / |A ∪ B|."
        cypher={`MATCH (a:Proveedor)-[:SUMINISTRA]->(p:Producto)<-[:SUMINISTRA]-(b:Proveedor)
WHERE id(a) < id(b)
WITH a, b, count(DISTINCT p) AS interseccion
MATCH (a)-[:SUMINISTRA]->(pa) WITH a,b,interseccion, count(DISTINCT pa) AS sizeA
MATCH (b)-[:SUMINISTRA]->(pb) WITH a,b,interseccion, sizeA, count(DISTINCT pb) AS sizeB
RETURN a.nombre, b.nombre, interseccion*1.0/(sizeA+sizeB-interseccion) AS jaccard
ORDER BY jaccard DESC LIMIT 10`}
        loading={loading.jaccard}
        onRun={runner('jaccard', () => api.get('/data-science/jaccard?limit=10'), setJaccard)}
      >
        {jaccard && <ResultTable rows={jaccard.results} />}
      </Section>

      {/* 4. Triangle Count */}
      <Section
        title="4. Triangle Counting / Clustering Coefficient"
        descripcion="Cuenta triángulos en el grafo (3 nodos conectados entre sí). Indicador de agrupamiento y comunidades densas."
        cypher={`MATCH (a)-[]-(b)-[]-(c)-[]-(a)
WHERE id(a) < id(b) AND id(b) < id(c)
RETURN count(*) AS total_triangulos`}
        loading={loading.triangle}
        onRun={runner('triangle', () => api.get('/data-science/triangle'), setTriangle)}
      >
        {triangle && (
          <>
            <div className="card mb-3 inline-block px-4 py-2">
              <div className="text-xs text-slate-400 uppercase">Total triángulos en el grafo</div>
              <div className="text-2xl font-bold text-emerald-400">{triangle.total_triangulos}</div>
            </div>
            <div className="text-sm text-slate-300 mt-2 mb-1">Top nodos con más triángulos:</div>
            <ResultTable rows={triangle.top_nodos} />
          </>
        )}
      </Section>

      {/* 5. Betweenness aproximado */}
      <Section
        title="5. Nodos Puente (Betweenness aproximado)"
        descripcion="Nodos por los que pasan más caminos cortos entre bodegas. Identifica nodos críticos cuya eliminación desconectaría partes del grafo."
        cypher={`MATCH (b1:Bodega), (b2:Bodega) WHERE id(b1) < id(b2)
WITH b1, b2 LIMIT 200
MATCH path = shortestPath((b1)-[:RUTA_POR|ENVIA_A*..6]-(b2))
UNWIND nodes(path)[1..-1] AS intermedio
RETURN intermedio.nombre, count(*) AS apariciones
ORDER BY apariciones DESC LIMIT 10`}
        loading={loading.puente}
        onRun={runner('puente', () => api.get('/data-science/puente?limit=10'), setPuente)}
      >
        {puente && <ResultTable rows={puente.results} />}
      </Section>

      {/* 6. Recomendaciones */}
      <Section
        title="6. Sistema de Recomendación (Collaborative Filtering)"
        descripcion="Recomienda productos a un cliente basado en lo que clientes similares ya pidieron (vecinos comunes en el grafo)."
        cypher={`MATCH (c1:Clientes {nombre:$cliente})<-[:ENVIADA_A]-(:Ordenes)-[:TIENE]->(p:Producto)
MATCH (p)<-[:TIENE]-(:Ordenes)-[:ENVIADA_A]->(c2:Clientes)
WHERE c1 <> c2
MATCH (c2)<-[:ENVIADA_A]-(:Ordenes)-[:TIENE]->(rec:Producto)
WHERE NOT (c1)<-[:ENVIADA_A]-(:Ordenes)-[:TIENE]->(rec)
RETURN rec.nombre, count(*) AS score ORDER BY score DESC LIMIT 10`}
        loading={loading.reco}
        onRun={runner('reco', () => {
          if (!recoCliente) throw new Error('Ingresa un nombre de cliente');
          return api.get(`/data-science/recomendaciones?cliente=${encodeURIComponent(recoCliente)}`);
        }, setReco)}
      >
        <div className="flex gap-2 mb-3">
          <input value={recoCliente} onChange={(e) => setRecoCliente(e.target.value)}
            placeholder="Nombre exacto del cliente"
            className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm flex-1 max-w-sm" />
        </div>
        {reco && (
          <>
            <div className="text-xs text-slate-400 mb-1">Recomendaciones para: <code>{reco.cliente}</code></div>
            <ResultTable rows={reco.recomendaciones} />
          </>
        )}
      </Section>
    </div>
  );
}
