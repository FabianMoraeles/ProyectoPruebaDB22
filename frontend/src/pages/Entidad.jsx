import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { entity as buildEntity } from '../api/client';
import EntityForm from '../components/EntityForm.jsx';
import DataTable from '../components/DataTable.jsx';

export default function Entidad({ entities }) {
  const { key } = useParams();
  const cfg = entities.find((e) => e.key === key);
  const api = useMemo(() => buildEntity(key), [key]);

  const [rows, setRows] = useState([]);
  const [err, setErr] = useState(null);
  const [msg, setMsg] = useState(null);
  const [filter, setFilter] = useState({});
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    setErr(null);
    try {
      const data = await api.list(filter);
      setRows(data);
    } catch (e) { setErr(e.message); }
  };

  useEffect(() => { load(); setEditing(null); setShowForm(false); setFilter({}); /* eslint-disable-next-line */ }, [key]);

  if (!cfg) return <div>Entidad no encontrada.</div>;

  const handleSave = async (data) => {
    try {
      if (editing) {
        const id = editing.properties[cfg.idKey];
        await api.update(id, data);
        setMsg(`Actualizado ${id}`);
      } else {
        await api.create(data);
        setMsg('Creado');
      }
      setEditing(null); setShowForm(false); await load();
    } catch (e) { setErr(e.message); }
  };

  const handleDelete = async (row) => {
    if (!confirm(`Eliminar ${row.properties[cfg.idKey]}?`)) return;
    try {
      await api.del(row.properties[cfg.idKey]);
      setMsg('Eliminado'); await load();
    } catch (e) { setErr(e.message); }
  };

  const handleRemoveProps = async (row) => {
    const props = prompt('Propiedades a eliminar (separadas por coma):');
    if (!props) return;
    try {
      await api.removeProps(row.properties[cfg.idKey], props.split(',').map((p) => p.trim()).filter(Boolean));
      setMsg('Propiedades eliminadas'); await load();
    } catch (e) { setErr(e.message); }
  };

  const handleBulkUpdate = async () => {
    const props = prompt('JSON con propiedades a actualizar:', '{"activo":true}');
    if (!props) return;
    try {
      const res = await api.updateMany(filter, JSON.parse(props));
      setMsg(`Actualizados: ${res.updated}`); await load();
    } catch (e) { setErr(e.message); }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`¿Eliminar TODOS los nodos que cumplen el filtro? (${Object.keys(filter).length ? JSON.stringify(filter) : 'SIN FILTRO = TODOS'})`)) return;
    try {
      const res = await api.delMany(filter);
      setMsg(`Eliminados: ${res.deleted}`); await load();
    } catch (e) { setErr(e.message); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-bold">{cfg.label}</h1>
          <p className="text-slate-400 text-sm">Label Neo4j: <code>{cfg.entityLabel}</code> · id: <code>{cfg.idKey}</code></p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-primary" onClick={() => { setEditing(null); setShowForm(true); }}>Nuevo</button>
          <button className="btn btn-ghost" onClick={load}>Recargar</button>
        </div>
      </div>

      {err && <div className="mb-3 p-2 bg-rose-900 border border-rose-700 rounded text-rose-100 text-sm">{err}</div>}
      {msg && <div className="mb-3 p-2 bg-emerald-900 border border-emerald-700 rounded text-emerald-100 text-sm">{msg}</div>}

      <div className="card mb-4">
        <div className="text-xs text-slate-400 uppercase mb-2">Filtro (propiedades exactas)</div>
        <div className="flex flex-wrap gap-2">
          {cfg.fields.slice(0, 4).map((f) => (
            <input key={f} placeholder={f}
              value={filter[f] || ''}
              onChange={(e) => setFilter((x) => ({ ...x, [f]: e.target.value }))}
              className="w-40" />
          ))}
          <button className="btn btn-primary" onClick={load}>Filtrar</button>
          <button className="btn btn-ghost" onClick={() => { setFilter({}); setTimeout(load, 0); }}>Limpiar</button>
          <button className="btn btn-ghost" onClick={handleBulkUpdate}>Actualizar varios</button>
          <button className="btn btn-danger" onClick={handleBulkDelete}>Eliminar varios</button>
        </div>
      </div>

      {showForm && (
        <div className="card mb-4">
          <h3 className="font-semibold mb-2">{editing ? 'Editar' : 'Crear nuevo'}</h3>
          <EntityForm fields={cfg.fields} initial={editing?.properties || {}}
            onSave={handleSave} onCancel={() => { setShowForm(false); setEditing(null); }} />
        </div>
      )}

      <div className="card">
        <DataTable rows={rows} idKey={cfg.idKey} fields={cfg.fields}
          onEdit={(r) => { setEditing(r); setShowForm(true); }}
          onDelete={handleDelete}
          onRemoveProps={handleRemoveProps} />
        <div className="text-xs text-slate-400 mt-2">{rows.length} resultado(s)</div>
      </div>
    </div>
  );
}
