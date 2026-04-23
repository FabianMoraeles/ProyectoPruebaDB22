export default function DataTable({ rows, idKey, fields, onEdit, onDelete, onRemoveProps }) {
  if (!rows || rows.length === 0) return <div className="text-slate-400 text-sm">Sin resultados</div>;

  const cols = fields || Object.keys(rows[0].properties || {});

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-400 border-b border-slate-700">
            {cols.map((c) => <th key={c} className="py-1.5 pr-3">{c}</th>)}
            <th className="py-1.5 pr-2">Labels</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.properties?.[idKey] || i} className="border-b border-slate-800 hover:bg-slate-900/40">
              {cols.map((c) => {
                let v = r.properties?.[c];
                if (Array.isArray(v)) v = v.join(', ');
                if (typeof v === 'boolean') v = v ? '✓' : '✗';
                return <td key={c} className="py-1.5 pr-3 align-top">{v === undefined || v === null ? '—' : String(v)}</td>;
              })}
              <td className="py-1.5 pr-2 text-xs text-emerald-400">{(r.labels || []).join(':')}</td>
              <td className="py-1.5 whitespace-nowrap text-right">
                <button className="btn btn-ghost mr-1" onClick={() => onEdit(r)}>Editar</button>
                <button className="btn btn-ghost mr-1" onClick={() => onRemoveProps(r)}>Quitar prop</button>
                <button className="btn btn-danger" onClick={() => onDelete(r)}>Eliminar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
