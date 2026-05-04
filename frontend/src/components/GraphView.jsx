import { useCallback, useRef } from 'react';
import ForceGraph2D from 'react-force-graph-2d';

const TYPE_COLOR = {
  Bodega:     '#10b981',
  Producto:   '#3b82f6',
  Proveedor:  '#f59e0b',
  Clientes:   '#8b5cf6',
  Transporte: '#ef4444',
  Rutas:      '#06b6d4',
  País:       '#ec4899',
  Ordenes:    '#64748b',
};

export default function GraphView({ nodes, links }) {
  const fgRef = useRef();

  const paintNode = useCallback((node, ctx, globalScale) => {
    const r = 6;
    const color = TYPE_COLOR[node.type] || '#94a3b8';

    ctx.beginPath();
    ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    const fontSize = Math.max(10 / globalScale, 2);
    ctx.font = `${fontSize}px Inter, sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const label = node.label?.length > 16 ? node.label.slice(0, 14) + '…' : (node.label ?? '');
    ctx.fillText(label, node.x, node.y + r + 2);
  }, []);

  if (!nodes?.length) return null;

  const usedTypes = [...new Set(nodes.map((n) => n.type))];

  return (
    <div className="rounded border border-slate-700 overflow-hidden bg-slate-950">
      <div className="px-3 py-2 text-xs text-slate-400 border-b border-slate-700 flex gap-4 flex-wrap">
        <span className="text-slate-300 font-medium mr-1">Tipos:</span>
        {usedTypes.map((type) => (
          <span key={type} className="flex items-center gap-1">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ background: TYPE_COLOR[type] ?? '#94a3b8' }}
            />
            {type}
          </span>
        ))}
        <span className="ml-auto text-slate-500">{nodes.length} nodos · {links.length} relaciones</span>
      </div>
      <ForceGraph2D
        ref={fgRef}
        graphData={{ nodes, links }}
        height={440}
        nodeCanvasObject={paintNode}
        nodeCanvasObjectMode={() => 'replace'}
        linkLabel="label"
        linkDirectionalArrowLength={5}
        linkDirectionalArrowRelPos={1}
        linkColor={() => 'rgba(148,163,184,0.45)'}
        linkWidth={1.2}
        backgroundColor="#0f172a"
        onEngineStop={() => fgRef.current?.zoomToFit(300, 50)}
      />
    </div>
  );
}
