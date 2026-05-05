import { useEffect, useState } from 'react';
import { api } from '../api/client';

const TIPOS = ['Perecedero', 'NoPerecedero'];

function CypherSnippet({ children }) {
  return (
    <pre className="text-xs bg-slate-950 border border-slate-800 rounded p-2 overflow-x-auto text-emerald-300 whitespace-pre-wrap">
      {children}
    </pre>
  );
}

function LabelChips({ labels }) {
  return (
    <div className="flex flex-wrap gap-1">
      {(labels || []).map((l) => {
        const color =
          l === 'Perecedero' ? 'bg-rose-700 border-rose-500'
          : l === 'NoPerecedero' ? 'bg-sky-700 border-sky-500'
          : 'bg-slate-700 border-slate-500';
        return (
          <span key={l} className={`px-2 py-0.5 rounded text-xs border ${color} text-white font-mono`}>
            :{l}
          </span>
        );
      })}
    </div>
  );
}

export default function DobleEtiqueta() {
  const [stats, setStats] = useState(null);
  const [tipo, setTipo] = useState('Perecedero');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [form, setForm] = useState({
    tipo: 'Perecedero', SKU: '', nombre: '', precio: 0, peso: 0, categoria: '', tags: ''
  });
  const [verificar, setVerificar] = useState({ sku: '', resultado: null });

  const cargarStats = () =>
    api.get('/productos-doble/stats').then(setStats).catch(e => setMsg({ type: 'error', text: e.message }));

  const cargarPorTipo = (t) => {
    setLoading(true);
    api.get(`/productos-doble/listar/${t}`)
      .then(setItems)
      .catch(e => setMsg({ type: 'error', text: e.message }))
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargarStats(); }, []);
  useEffect(() => { cargarPorTipo(tipo); }, [tipo]);

  const crear = async (e) => {
    e.preventDefault();
    setMsg(null);
    try {
      const payload = {
        tipo: form.tipo,
        SKU: form.SKU,
        nombre: form.nombre,
        precio: Number(form.precio) || 0,
        peso: Number(form.peso) || 0,
        categoria: form.categoria,
        tags: form.tags.split(',').map(s => s.trim()).filter(Boolean),
      };
      const r = await api.post('/productos-doble', payload);
      setMsg({ type: 'ok', text: `Creado ${r.SKU} con labels: ${r._labels.join(', ')}` });
      cargarStats(); cargarPorTipo(tipo);
    } catch (e) { setMsg({ type: 'error', text: e.message }); }
  };

  const cambiar = async (sku, currentLabels) => {
    const actual = currentLabels.find(l => TIPOS.includes(l));
    const nuevo = actual === 'Perecedero' ? 'NoPerecedero' : 'Perecedero';
    if (!confirm(`Cambiar ${sku} de :${actual} a :${nuevo}?`)) return;
    try {
      const r = await api.patch(`/productos-doble/${encodeURIComponent(sku)}/cambiar-tipo`, { tipo: nuevo });
      setMsg({ type: 'ok', text: `Ahora ${r.SKU} → labels: ${r._labels.join(', ')}` });
      cargarStats(); cargarPorTipo(tipo);
    } catch (e) { setMsg({ type: 'error', text: e.message }); }
  };

  const verifSku = async () => {
    if (!verificar.sku) return;
    try {
      const r = await api.get(`/productos-doble/${encodeURIComponent(verificar.sku)}/verificar`);
      setVerificar(v => ({ ...v, resultado: r }));
    } catch (e) { setVerificar(v => ({ ...v, resultado: { error: e.message } })); }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-100">Clasificación de productos</h1>
      <p className="text-slate-400 mt-1">
        Gestión de la taxonomía <code className="text-emerald-400">Perecedero</code> /{' '}
        <code className="text-emerald-400">NoPerecedero</code> sobre productos. La categoría se modela como
        sub-label en el grafo, no como propiedad.
      </p>

      {msg && (
        <div className={`mt-3 p-3 rounded border ${
          msg.type === 'error'
            ? 'bg-rose-900 border-rose-700 text-rose-100'
            : 'bg-emerald-900 border-emerald-700 text-emerald-100'
        }`}>{msg.text}</div>
      )}

      {/* STATS */}
      <section className="mt-6">
        <h2 className="text-xl font-semibold mb-2">1. Distribución por combinación de labels</h2>
        <CypherSnippet>
{`MATCH (p:Producto)
WITH labels(p) AS ls
RETURN ls AS labels, count(*) AS total
ORDER BY total DESC`}
        </CypherSnippet>
        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="card">
            <div className="text-xs text-slate-400 uppercase">Total productos</div>
            <div className="text-3xl font-bold text-emerald-400">{stats?.total ?? '—'}</div>
          </div>
          {stats?.breakdown?.map((b, i) => (
            <div key={i} className="card">
              <LabelChips labels={b.labels} />
              <div className="text-2xl font-bold mt-2">{b.total}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CREAR */}
      <section className="mt-8">
        <h2 className="text-xl font-semibold mb-2">2. Crear producto con doble label</h2>
        <CypherSnippet>{`CREATE (p:Producto:\${tipo} $props) RETURN p, labels(p)`}</CypherSnippet>
        <form onSubmit={crear} className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
          <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
            className="bg-slate-800 border border-slate-700 rounded px-2 py-1.5">
            {TIPOS.map(t => <option key={t}>{t}</option>)}
          </select>
          <input required placeholder="SKU" value={form.SKU} onChange={e => setForm(f => ({ ...f, SKU: e.target.value }))}
            className="bg-slate-800 border border-slate-700 rounded px-2 py-1.5" />
          <input required placeholder="Nombre" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
            className="bg-slate-800 border border-slate-700 rounded px-2 py-1.5" />
          <input placeholder="Categoría" value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
            className="bg-slate-800 border border-slate-700 rounded px-2 py-1.5" />
          <input type="number" placeholder="Precio" value={form.precio} onChange={e => setForm(f => ({ ...f, precio: e.target.value }))}
            className="bg-slate-800 border border-slate-700 rounded px-2 py-1.5" />
          <input type="number" placeholder="Peso" value={form.peso} onChange={e => setForm(f => ({ ...f, peso: e.target.value }))}
            className="bg-slate-800 border border-slate-700 rounded px-2 py-1.5" />
          <input placeholder="tags (a,b,c)" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
            className="bg-slate-800 border border-slate-700 rounded px-2 py-1.5 col-span-2 md:col-span-1" />
          <button className="bg-emerald-600 hover:bg-emerald-500 rounded px-3 py-1.5 text-white">Crear</button>
        </form>
      </section>

      {/* LISTADO + CAMBIAR TIPO */}
      <section className="mt-8">
        <div className="flex items-end justify-between flex-wrap gap-2 mb-2">
          <h2 className="text-xl font-semibold">3. Listar por sub-label</h2>
          <div className="flex gap-1">
            {TIPOS.map(t => (
              <button key={t} onClick={() => setTipo(t)}
                className={`px-3 py-1 rounded text-sm border ${
                  tipo === t ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300'
                }`}>:{t}</button>
            ))}
          </div>
        </div>
        <CypherSnippet>{`MATCH (p:Producto:${tipo}) RETURN p, labels(p) AS labels LIMIT 200`}</CypherSnippet>

        <div className="mt-3 card overflow-x-auto">
          {loading ? <div className="text-slate-400">Cargando...</div> : (
            <table className="w-full text-sm">
              <thead className="text-slate-400 text-left text-xs uppercase">
                <tr>
                  <th className="py-1 pr-3">SKU</th>
                  <th className="py-1 pr-3">Nombre</th>
                  <th className="py-1 pr-3">Categoría</th>
                  <th className="py-1 pr-3">labels(p)</th>
                  <th className="py-1 pr-3">Acción</th>
                </tr>
              </thead>
              <tbody>
                {items.slice(0, 30).map((it) => (
                  <tr key={it.SKU} className="border-t border-slate-800">
                    <td className="py-1 pr-3 font-mono">{it.SKU}</td>
                    <td className="py-1 pr-3">{it.nombre}</td>
                    <td className="py-1 pr-3 text-slate-400">{it.categoria || '—'}</td>
                    <td className="py-1 pr-3"><LabelChips labels={it._labels} /></td>
                    <td className="py-1 pr-3">
                      <button onClick={() => cambiar(it.SKU, it._labels)}
                        className="text-xs bg-amber-700 hover:bg-amber-600 text-white px-2 py-0.5 rounded">
                        Cambiar tipo
                      </button>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr><td colSpan={5} className="text-slate-500 py-3 text-center">Sin resultados.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
        <p className="text-xs text-slate-400 mt-2">
          El botón <em>Cambiar tipo</em> ejecuta:{' '}
          <code className="text-emerald-400">REMOVE p:OldLabel SET p:NewLabel</code> — manipulación pura de labels, sin tocar propiedades.
        </p>
      </section>

      {/* VERIFICAR */}
      <section className="mt-8 mb-12">
        <h2 className="text-xl font-semibold mb-2">4. Verificar labels de un producto</h2>
        <CypherSnippet>{`MATCH (p:Producto {SKU: $sku}) RETURN labels(p) AS labels`}</CypherSnippet>
        <div className="mt-3 flex gap-2">
          <input placeholder="SKU exacto"
            value={verificar.sku}
            onChange={e => setVerificar(v => ({ ...v, sku: e.target.value }))}
            className="bg-slate-800 border border-slate-700 rounded px-2 py-1.5 flex-1 max-w-sm" />
          <button onClick={verifSku} className="bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded text-white">
            Verificar
          </button>
        </div>
        {verificar.resultado && (
          <div className="mt-3 card">
            {verificar.resultado.error ? (
              <div className="text-rose-400">{verificar.resultado.error}</div>
            ) : (
              <>
                <div className="text-sm">
                  <strong>{verificar.resultado.SKU}</strong> — {verificar.resultado.nombre}
                </div>
                <div className="mt-2"><LabelChips labels={verificar.resultado.labels} /></div>
                <div className="mt-2 text-xs text-slate-400 space-y-0.5">
                  <div>tieneDoble: <code>{String(verificar.resultado.tieneDoble)}</code></div>
                  <div>esPerecedero: <code>{String(verificar.resultado.esPerecedero)}</code></div>
                  <div>esNoPerecedero: <code>{String(verificar.resultado.esNoPerecedero)}</code></div>
                </div>
              </>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
