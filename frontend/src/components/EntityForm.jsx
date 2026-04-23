import { useState } from 'react';

export default function EntityForm({ fields, initial = {}, onSave, onCancel }) {
  const [data, setData] = useState(() => {
    const o = {};
    fields.forEach((f) => (o[f] = initial[f] ?? ''));
    return o;
  });
  const [extraLabels, setExtraLabels] = useState('');
  const [extraProps, setExtraProps] = useState('');

  const set = (k, v) => setData((x) => ({ ...x, [k]: v }));

  const submit = (e) => {
    e.preventDefault();
    const body = {};
    for (const k of Object.keys(data)) {
      let v = data[k];
      if (v === '') continue;
      if (v === 'true') v = true;
      else if (v === 'false') v = false;
      else if (!isNaN(v) && typeof v === 'string' && v.trim() !== '') v = Number(v);
      body[k] = v;
    }
    if (extraLabels.trim()) body.extraLabels = extraLabels.split(',').map((s) => s.trim()).filter(Boolean);
    if (extraProps.trim()) {
      try { Object.assign(body, JSON.parse(extraProps)); } catch {}
    }
    onSave(body);
  };

  return (
    <form onSubmit={submit} className="grid grid-cols-2 gap-3">
      {fields.map((f) => (
        <label key={f} className="text-sm">
          <span className="text-slate-400">{f}</span>
          <input className="w-full" value={data[f] ?? ''} onChange={(e) => set(f, e.target.value)} />
        </label>
      ))}
      <label className="text-sm col-span-2">
        <span className="text-slate-400">Labels adicionales (coma, opcional — permite nodo multi-label)</span>
        <input className="w-full" value={extraLabels} onChange={(e) => setExtraLabels(e.target.value)} placeholder="Premium, Destacado" />
      </label>
      <label className="text-sm col-span-2">
        <span className="text-slate-400">Propiedades extra (JSON, opcional — agrega nuevas propiedades)</span>
        <input className="w-full" value={extraProps} onChange={(e) => setExtraProps(e.target.value)} placeholder='{"descuento":0.1}' />
      </label>
      <div className="col-span-2 flex gap-2 mt-2">
        <button type="submit" className="btn btn-primary">Guardar</button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  );
}
