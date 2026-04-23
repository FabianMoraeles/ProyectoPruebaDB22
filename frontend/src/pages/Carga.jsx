import { useState } from 'react';
import { api } from '../api/client';

export default function Carga() {
  const [url, setUrl] = useState('');
  const [label, setLabel] = useState('Proveedor');
  const [keyProp, setKeyProp] = useState('nombre');
  const [file, setFile] = useState(null);
  const [res, setRes] = useState(null);
  const [err, setErr] = useState(null);

  const loadUrl = async () => {
    setErr(null);
    try { setRes(await api.post('/carga/load-csv', { url, label, keyProp })); }
    catch (e) { setErr(e.message); }
  };

  const uploadFile = async () => {
    setErr(null);
    if (!file) return setErr('Selecciona archivo');
    const fd = new FormData();
    fd.append('file', file); fd.append('label', label); fd.append('keyProp', keyProp);
    try {
      const r = await fetch('/api/carga/upload', { method: 'POST', body: fd });
      if (!r.ok) throw new Error((await r.json()).error || 'Error');
      setRes(await r.json());
    } catch (e) { setErr(e.message); }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Carga CSV</h1>
      {err && <div className="mb-3 p-2 bg-rose-900 rounded text-sm">{err}</div>}

      <div className="card mb-4">
        <h3 className="font-semibold mb-2">Opción A — LOAD CSV por URL (recomendado AuraDB)</h3>
        <p className="text-xs text-slate-400 mb-2">El CSV debe estar publicado en HTTPS accesible por AuraDB.</p>
        <div className="grid grid-cols-3 gap-2">
          <input placeholder="URL HTTPS del CSV" value={url} onChange={(e) => setUrl(e.target.value)} className="col-span-3" />
          <input placeholder="Label" value={label} onChange={(e) => setLabel(e.target.value)} />
          <input placeholder="keyProp (ej. nombre)" value={keyProp} onChange={(e) => setKeyProp(e.target.value)} />
          <button className="btn btn-primary" onClick={loadUrl}>Cargar por URL</button>
        </div>
      </div>

      <div className="card mb-4">
        <h3 className="font-semibold mb-2">Opción B — Subir archivo local</h3>
        <div className="grid grid-cols-3 gap-2">
          <input type="file" accept=".csv" onChange={(e) => setFile(e.target.files?.[0])} className="col-span-3" />
          <input placeholder="Label" value={label} onChange={(e) => setLabel(e.target.value)} />
          <input placeholder="keyProp" value={keyProp} onChange={(e) => setKeyProp(e.target.value)} />
          <button className="btn btn-primary" onClick={uploadFile}>Subir & cargar</button>
        </div>
      </div>

      {res && <div className="card"><pre className="text-xs">{JSON.stringify(res, null, 2)}</pre></div>}
    </div>
  );
}
