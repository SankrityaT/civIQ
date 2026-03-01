// Created by Sankritya on Feb 27, 2026
// Animated Knowledge Graph Visualization — canvas-based network with spreading amoeba effect
"use client";
import { useRef, useEffect, useState, useCallback } from "react";
import { TreeStructure, MagnifyingGlassMinus, MagnifyingGlassPlus, ArrowsOut } from "@phosphor-icons/react";

interface GraphNode {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  targetAlpha: number;
  type: "document" | "section" | "concept" | "entity";
  label: string;
  lit: boolean;
  litAt: number;
}

interface GraphEdge {
  from: string;
  to: string;
  alpha: number;
  targetAlpha: number;
}

const COLORS = {
  document: "#f59e0b",
  section: "#6366f1",
  concept: "#10b981",
  entity: "#ef4444",
};

const NODE_RADIUS = {
  document: 8,
  section: 5,
  concept: 4,
  entity: 3,
};

interface KnowledgeGraphProps {
  className?: string;
  stats?: { documents: number; sections: number; chunks: number; nodes: number; edges: number; concepts: number };
  animate?: boolean;
}

export default function KnowledgeGraph({ className = "", stats, animate = true }: KnowledgeGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<GraphNode[]>([]);
  const edgesRef = useRef<GraphEdge[]>([]);
  const frameRef = useRef<number>(0);
  const [dimensions, setDimensions] = useState({ w: 600, h: 400 });
  const [liveStats, setLiveStats] = useState<{ nodes: number; edges: number; live: boolean } | null>(null);
  const litCountRef = useRef(0);
  const lastSpawnRef = useRef(0);
  
  // Interactive state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });

  const buildGraphFromData = useCallback((
    apiNodes: Array<{ id: string; label: string; type: string }>,
    apiEdges: Array<{ source: string; target: string; weight: number }>,
  ) => {
    const cx = dimensions.w / 2;
    const cy = dimensions.h / 2;

    // Group by type for radial placement
    const byType: Record<string, typeof apiNodes> = { document: [], section: [], concept: [] };
    for (const n of apiNodes) {
      const t = n.type in byType ? n.type : "concept";
      byType[t].push(n);
    }

    const nodes: GraphNode[] = [];
    const nodePos: Record<string, { x: number; y: number }> = {};

    // Document — center
    byType.document.forEach((n, i) => {
      const angle = (i / Math.max(byType.document.length, 1)) * Math.PI * 2;
      const r = 20 + Math.random() * 15;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      nodePos[n.id] = { x, y };
      nodes.push({ id: n.id, x, y, vx: 0, vy: 0, radius: NODE_RADIUS.document, color: COLORS.document, alpha: 0, targetAlpha: animate ? 0 : 0.9, type: "document", label: n.label, lit: !animate, litAt: 0 });
    });

    // Section — inner ring
    byType.section.forEach((n, i) => {
      const angle = (i / Math.max(byType.section.length, 1)) * Math.PI * 2 + Math.random() * 0.2;
      const r = 60 + Math.random() * 40;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      nodePos[n.id] = { x, y };
      nodes.push({ id: n.id, x, y, vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3, radius: NODE_RADIUS.section, color: COLORS.section, alpha: 0, targetAlpha: animate ? 0 : 0.85, type: "section", label: n.label, lit: !animate, litAt: 0 });
    });

    // Concept — outer ring
    byType.concept.forEach((n, i) => {
      const angle = (i / Math.max(byType.concept.length, 1)) * Math.PI * 2 + Math.random() * 0.4;
      const r = 110 + Math.random() * 60;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      nodePos[n.id] = { x, y };
      nodes.push({ id: n.id, x, y, vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4, radius: NODE_RADIUS.concept, color: COLORS.concept, alpha: 0, targetAlpha: animate ? 0 : 0.8, type: "concept", label: n.label, lit: !animate, litAt: 0 });
    });

    const edges: GraphEdge[] = apiEdges.map(e => ({
      from: e.source,
      to: e.target,
      alpha: 0,
      targetAlpha: animate ? 0 : 0.25 * e.weight,
    }));

    nodesRef.current = nodes;
    edgesRef.current = edges;
    litCountRef.current = animate ? 0 : nodes.length;
    lastSpawnRef.current = 0;
  }, [dimensions, animate]);

  const buildFallbackGraph = useCallback(() => {
    const docs = stats?.documents ?? 1;
    const secs = stats?.sections ?? 16;
    const concepts = stats?.concepts ?? 21;
    const cx = dimensions.w / 2;
    const cy = dimensions.h / 2;
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    for (let i = 0; i < docs; i++) {
      const angle = (i / docs) * Math.PI * 2;
      nodes.push({ id: `doc-${i}`, x: cx + Math.cos(angle) * 25, y: cy + Math.sin(angle) * 25, vx: 0, vy: 0, radius: NODE_RADIUS.document, color: COLORS.document, alpha: 0, targetAlpha: animate ? 0 : 0.9, type: "document", label: `Document ${i + 1}`, lit: !animate, litAt: 0 });
    }
    for (let i = 0; i < secs; i++) {
      const angle = (i / secs) * Math.PI * 2 + Math.random() * 0.3;
      const r = 65 + Math.random() * 45;
      nodes.push({ id: `sec-${i}`, x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r, vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3, radius: NODE_RADIUS.section, color: COLORS.section, alpha: 0, targetAlpha: animate ? 0 : 0.8, type: "section", label: `Section ${i + 1}`, lit: !animate, litAt: 0 });
      edges.push({ from: `doc-${i % docs}`, to: `sec-${i}`, alpha: 0, targetAlpha: animate ? 0 : 0.3 });
    }
    for (let i = 0; i < concepts; i++) {
      const angle = (i / concepts) * Math.PI * 2 + Math.random() * 0.5;
      const r = 110 + Math.random() * 60;
      nodes.push({ id: `concept-${i}`, x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r, vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4, radius: NODE_RADIUS.concept, color: COLORS.concept, alpha: 0, targetAlpha: animate ? 0 : 0.8, type: "concept", label: `Concept ${i + 1}`, lit: !animate, litAt: 0 });
      edges.push({ from: `sec-${i % secs}`, to: `concept-${i}`, alpha: 0, targetAlpha: animate ? 0 : 0.25 });
    }
    nodesRef.current = nodes;
    edgesRef.current = edges;
    litCountRef.current = animate ? 0 : nodes.length;
    lastSpawnRef.current = 0;
  }, [stats, dimensions, animate]);

  const buildGraph = useCallback(() => {
    fetch("/api/knowledge-graph")
      .then(r => r.json())
      .then(data => {
        if (data.nodes?.length > 0) {
          setLiveStats({ nodes: data.meta.totalNodes, edges: data.meta.totalEdges, live: data.meta.live });
          buildGraphFromData(data.nodes, data.edges);
        } else {
          buildFallbackGraph();
        }
      })
      .catch(() => buildFallbackGraph());
  }, [buildGraphFromData, buildFallbackGraph]);

  // Resize observer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setDimensions({ w: Math.floor(width), h: Math.floor(height) });
        }
      }
    });
    ro.observe(parent);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    buildGraph();
  }, [buildGraph]);

  // Mouse interaction handlers
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom(z => Math.max(0.5, Math.min(3, z * delta)));
    };

    const handleMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - lastMouseRef.current.x;
      const dy = e.clientY - lastMouseRef.current.y;
      setPan(p => ({ x: p.x + dx, y: p.y + dy }));
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.w * dpr;
    canvas.height = dimensions.h * dpr;
    ctx.scale(dpr, dpr);

    let running = true;

    function tick() {
      if (!running || !ctx) return;
      const nodes = nodesRef.current;
      const edges = edgesRef.current;
      const now = Date.now();

      // Light up nodes progressively (spreading from center)
      if (animate && litCountRef.current < nodes.length) {
        if (now - lastSpawnRef.current > 60) {
          lastSpawnRef.current = now;
          // Find the next unlit node closest to an already-lit node
          let bestIdx = -1;
          let bestDist = Infinity;
          for (let i = 0; i < nodes.length; i++) {
            if (nodes[i].lit) continue;
            if (litCountRef.current === 0) {
              // Start from center documents
              if (nodes[i].type === "document") { bestIdx = i; break; }
              continue;
            }
            // Find distance to nearest lit node
            let minD = Infinity;
            for (let j = 0; j < nodes.length; j++) {
              if (!nodes[j].lit) continue;
              const dx = nodes[i].x - nodes[j].x;
              const dy = nodes[i].y - nodes[j].y;
              minD = Math.min(minD, Math.sqrt(dx * dx + dy * dy));
            }
            if (minD < bestDist) {
              bestDist = minD;
              bestIdx = i;
            }
          }
          if (bestIdx >= 0) {
            nodes[bestIdx].lit = true;
            nodes[bestIdx].litAt = now;
            nodes[bestIdx].targetAlpha = nodes[bestIdx].type === "document" ? 0.95 : 0.8;
            litCountRef.current++;
            // Light up connected edges
            for (const edge of edges) {
              if (edge.from === nodes[bestIdx].id || edge.to === nodes[bestIdx].id) {
                const otherIdField = edge.from === nodes[bestIdx].id ? edge.to : edge.from;
                const otherNode = nodes.find((n) => n.id === otherIdField);
                if (otherNode?.lit) {
                  edge.targetAlpha = 0.3;
                }
              }
            }
          }
        }
      }

      // Physics: gentle drift + soft repulsion
      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        n.vx *= 0.99;
        n.vy *= 0.99;
        // Soft boundary bounce
        if (n.x < 20) n.vx += 0.05;
        if (n.x > dimensions.w - 20) n.vx -= 0.05;
        if (n.y < 20) n.vy += 0.05;
        if (n.y > dimensions.h - 20) n.vy -= 0.05;
        // Alpha lerp
        n.alpha += (n.targetAlpha - n.alpha) * 0.08;
      }

      // Edge alpha lerp
      for (const e of edges) {
        e.alpha += (e.targetAlpha - e.alpha) * 0.06;
      }

      // Draw with zoom and pan transform
      ctx.clearRect(0, 0, dimensions.w, dimensions.h);
      ctx.save();
      ctx.translate(dimensions.w / 2 + pan.x, dimensions.h / 2 + pan.y);
      ctx.scale(zoom, zoom);
      ctx.translate(-dimensions.w / 2, -dimensions.h / 2);

      // Edges
      for (const edge of edges) {
        if (edge.alpha < 0.02) continue;
        const fromNode = nodes.find((n) => n.id === edge.from);
        const toNode = nodes.find((n) => n.id === edge.to);
        if (!fromNode || !toNode) continue;
        ctx.beginPath();
        ctx.moveTo(fromNode.x, fromNode.y);
        ctx.lineTo(toNode.x, toNode.y);
        ctx.strokeStyle = `rgba(148, 163, 184, ${edge.alpha})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }

      // Nodes
      for (const node of nodes) {
        if (node.alpha < 0.02) continue;

        // Glow effect for recently lit nodes
        const timeSinceLit = now - node.litAt;
        if (node.lit && timeSinceLit < 1500) {
          const glowAlpha = Math.max(0, (1 - timeSinceLit / 1500) * 0.4 * node.alpha);
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius * 3, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${hexToRgb(node.color)}, ${glowAlpha})`;
          ctx.fill();
        }

        // Node body
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${hexToRgb(node.color)}, ${node.alpha})`;
        ctx.fill();

        // White core dot
        if (node.radius > 4) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius * 0.35, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${node.alpha * 0.6})`;
          ctx.fill();
        }
      }

      ctx.restore();
      frameRef.current = requestAnimationFrame(tick);
    }

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      running = false;
      cancelAnimationFrame(frameRef.current);
    };
  }, [dimensions, animate]);

  return (
    <div className={`relative rounded-2xl overflow-hidden ${className}`} style={{ background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)" }}>
      {/* Legend */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-3">
        <div className="flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur-sm px-2.5 py-1">
          <TreeStructure size={12} weight="fill" className="text-amber-400" />
          <span className="text-[10px] font-medium text-white/70">Knowledge Graph</span>
        </div>
      </div>
      {/* Interactive controls */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5">
        <button
          onClick={() => setZoom(z => Math.min(3, z * 1.2))}
          className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm text-white/70 transition hover:bg-white/20 hover:text-white"
          title="Zoom in"
        >
          <MagnifyingGlassPlus size={14} weight="bold" />
        </button>
        <button
          onClick={() => setZoom(z => Math.max(0.5, z * 0.8))}
          className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm text-white/70 transition hover:bg-white/20 hover:text-white"
          title="Zoom out"
        >
          <MagnifyingGlassMinus size={14} weight="bold" />
        </button>
        <button
          onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
          className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm text-white/70 transition hover:bg-white/20 hover:text-white"
          title="Reset view"
        >
          <ArrowsOut size={14} weight="bold" />
        </button>
      </div>
      <div className="absolute bottom-3 left-3 z-10 flex items-center gap-3 flex-wrap">
        {Object.entries(COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-[9px] text-white/50 capitalize">{type}</span>
          </div>
        ))}
      </div>
      {/* Stats overlay */}
      {(liveStats || stats) && (
        <div className="absolute bottom-3 right-3 z-10 text-right">
          <p className="text-[10px] text-white/40 uppercase tracking-wider">{liveStats?.live ? "Live" : "Cached"}</p>
          <p className="text-sm font-bold text-white/80 tabular-nums">{liveStats?.nodes ?? stats?.nodes ?? 0} <span className="text-[10px] font-normal text-white/40">nodes</span></p>
          <p className="text-sm font-bold text-white/80 tabular-nums">{liveStats?.edges ?? stats?.edges ?? 0} <span className="text-[10px] font-normal text-white/40">edges</span></p>
        </div>
      )}
      <canvas
        ref={canvasRef}
        className="h-full w-full cursor-grab active:cursor-grabbing"
        style={{ width: dimensions.w, height: dimensions.h }}
      />
    </div>
  );
}

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return "255, 255, 255";
  return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
}
