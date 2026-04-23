import { useState } from 'react';
import { api } from '../api/client';

const REL_TYPES = [
  'SUMINISTRA', 'DE_PRODUCTO', 'ALMACENA', 'EXISTENCIAS', 'REORDENA',
  'RUTA_POR', 'DISTRIBUYE', 'ENVIA_A', 'TIENE', 'ENVIADA_A',
  'GENERADA_POR', 'TRANSPORTA', 'USA_RUTA'
];

export default function Relaciones({ entities }) {
  const [form, setForm] = useState({
    fromLabel: 'Proveedor', fromKey: 'nombre', fromValue: '',
    toLabel: 'Producto', toKey: 'SKU', toValue: '',
    relType: 'SUMINISTRA', props: '{"precio":10.5,"fecha_entrega":"2026-05-01","periodo":"mensual"}'
  });
  const [list, setList] = useState([]);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  const set = (k, v) => setForm((x) => ({ ...x, [k]: v }));

  const create = async () => {
    setErr(null);
    try {
      const res = await api.post('/relaciones', { ...form, props: JSON.parse(form.props) });
      setMsg('Relación creada'); setList([res, ...list]);
    } catch (e) { setErr(e.message); }
  };

  const list_ = async () => {
    try { setList(await api.get(`/relaciones/${form.relType}`)); }
    catch (e) { setErr(e.message); }
  };

  const updateOne = async () => {
    try {
      const props = JSON.parse(prompt('Props a actualizar (JSON):', '{"descuento":0.1}'));
      await api.put('/relaciones/one', { ...form, props });
      setMsg('Relación actualizada');
    } catch (e) { setErr(e.message); }
  };

  const updateMany = async () => {
    try {
      const filter = JSON.parse(prompt('Filtro (JSON):', '{}') || '{}');
      const props = JSON.parse(prompt('Props (JSON):', '{"activo":true}'));
      const res = await api.put('/relaciones/many', { relType: form.relType, filter, props });
      setMsg(`Actualizadas: ${res.updated}`);
    } catch (e) { setErr(e.message); }
  };

  const removeOne = async () => {
    try {
      const props = prompt('Propiedades a quitar (coma):', 'descuento').split(',').map((s) => s.trim()).filter(Boolean);
      await api.patch('/relaciones/one/remove-props', { ...form, props });
      setMsg('Propiedades quitadas');
    } catch (e) { setErr(e.message); }
  };

  const removeMany = async () => {
    try {
      const filter = JSON.parse(prompt('Filtro (JSON):', '{}') || '{}');
      const props = prompt('Propiedades a quitar (coma):', 'descuento').split(',').map((s) => s.trim()).filter(Boolean);
      const res = await api.patch('/relaciones/many/remove-props', { relType: form.relType, filter, props });
      setMsg(`Actualizadas: ${res.updated}`);
    } catch (e) { setErr(e.message); }
  };

  const delOne = async () => {
    try { await api.del('/relaciones/one', form); setMsg('Relación eliminada'); }
    catch (e) { setErr(e.message); }
  };

  const delMany = async () => {
    try {
      const filter = JSON.parse(prompt('Filtro (JSON):', '{}') || '{}');
      const res = await api.del('/relaciones/many', { relType: form.relType, filter });
      setMsg(`Eliminadas: ${res.deleted}`);
    } catch (e) { setErr(e.message); }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Relaciones</h1>
      {err && <div className="mb-3 p-2 bg-rose-900 rounded text-sm">{err}</div>}
      {msg && <div className="mb-3 p-2 bg-emerald-900 rounded text-sm">{msg}</div>}

      <div className="card mb-4 grid grid-cols-2 gap-3">
        <label className="text-sm"><span className="text-slate-400">Tipo de relación</span>
          <select value={form.relType} onChange={(e) => set('relType', e.target.value)} className="w-full">
            {REL_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </label>
        <div />
        <div>
          <div className="text-emerald-400 font-semibold mb-1">Nodo origen</div>
          <select className="w-full mb-1" value={form.fromLabel} onChange={(e) => {
            const ent = entities.find((x) => x.entityLabel === e.target.value);
            set('fromLabel', e.target.value); set('fromKey', ent?.idKey || 'nombre');
          }}>
            {entities.map((e) => <option key={e.key}>{e.entityLabel}</option>)}
          </select>
          <input className="w-full mb-1" placeholder="idKey" value={form.fromKey} onChange={(e) => set('fromKey', e.target.value)} />
          <input className="w-full" placeholder="valor" value={form.fromValue} onChange={(e) => set('fromValue', e.target.value)} />
        </div>
        <div>
          <div className="text-emerald-400 font-semibold mb-1">Nodo destino</div>
          <select className="w-full mb-1" value={form.toLabel} onChange={(e) => {
            const ent = entities.find((x) => x.entityLabel === e.target.value);
            set('toLabel', e.target.value); set('toKey', ent?.idKey || 'nombre');
          }}>
            {entities.map((e) => <option key={e.key}>{e.entityLabel}</option>)}
          </select>
          <input className="w-full mb-1" placeholder="idKey" value={form.toKey} onChange={(e) => set('toKey', e.target.value)} />
          <input className="w-full" placeholder="valor" value={form.toValue} onChange={(e) => set('toValue', e.target.value)} />
        </div>
        <label className="col-span-2 text-sm">
          <span className="text-slate-400">Propiedades (JSON, 3+ campos recomendado)</span>
          <textarea className="w-full h-20 font-mono text-xs" value={form.props} onChange={(e) => set('props', e.target.value)} />
        </label>
        <div className="col-span-2 flex flex-wrap gap-2">
          <button className="btn btn-primary" onClick={create}>Crear relación</button>
          <button className="btn btn-ghost" onClick={list_}>Listar tipo</button>
          <button className="btn btn-ghost" onClick={updateOne}>Actualizar una</button>
          <button className="btn btn-ghost" onClick={updateMany}>Actualizar varias</button>
          <button className="btn btn-ghost" onClick={removeOne}>Quitar props (una)</button>
          <button className="btn btn-ghost" onClick={removeMany}>Quitar props (varias)</button>
          <button className="btn btn-danger" onClick={delOne}>Eliminar una</button>
          <button className="btn btn-danger" onClick={delMany}>Eliminar varias</button>
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold mb-2">Resultado</h3>
        <pre className="bg-slate-950 p-2 rounded text-xs overflow-auto max-h-96">{JSON.stringify(list, null, 2)}</pre>
      </div>
    </div>
  );
}
