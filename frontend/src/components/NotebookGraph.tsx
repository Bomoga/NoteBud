"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  forceSimulation,
  forceManyBody,
  forceLink,
  forceCenter,
  forceCollide,
  type Simulation,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from "d3-force";
import type { NotebookResponse } from "../lib/api";
import type { AllLinksEdge } from "../lib/api/links";

const PALETTE: [string, string][] = [
  ["#7c3aed", "#5b21b6"],
  ["#0284c7", "#0369a1"],
  ["#059669", "#047857"],
  ["#d97706", "#b45309"],
  ["#e11d48", "#be123c"],
  ["#4338ca", "#3730a3"],
  ["#0d9488", "#0f766e"],
  ["#ea580c", "#c2410c"],
];

function nodeColor(str: string): [string, string] {
  let hash = 0;
  for (const c of str) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff;
  return PALETTE[hash % PALETTE.length];
}

interface GraphNode extends SimulationNodeDatum {
  id: string;
  title: string;
  course_code: string;
}

interface GraphLink extends SimulationLinkDatum<GraphNode> {
  edgeId: string;
  link_type: "prerequisite" | "related-to";
}

interface Props {
  notebooks: NotebookResponse[];
  links: AllLinksEdge[];
}

const NODE_R = 22;
const NODE_R_HOVER = 27;
// How many pixels the pointer must move before a mousedown is treated as a drag
const DRAG_THRESHOLD = 4;

export default function NotebookGraph({ notebooks, links }: Props) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const [dims, setDims] = useState({ w: 300, h: 300 });
  const dimsRef = useRef({ w: 300, h: 300 });

  const simRef = useRef<Simulation<GraphNode, GraphLink> | null>(null);
  const nodesRef = useRef<GraphNode[]>([]);

  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // ── Zoom / pan ────────────────────────────────────────────────────────────
  const [transform, setTransformState] = useState({ x: 0, y: 0, k: 1 });
  const transformRef = useRef({ x: 0, y: 0, k: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  const applyTransform = useCallback((next: { x: number; y: number; k: number }) => {
    transformRef.current = next;
    setTransformState(next);
  }, []);

  // Wheel zoom — imperative so we can call preventDefault on a non-passive listener
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    const t = transformRef.current;
    const newK = Math.max(0.15, Math.min(5, t.k * factor));
    const rect = svgRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    // Keep the world point under the cursor stationary
    const nx = t.x - (mx - t.x) * (newK / t.k - 1);
    const ny = t.y - (my - t.y) * (newK / t.k - 1);
    applyTransform({ x: nx, y: ny, k: newK });
  }, [applyTransform]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    svg.addEventListener("wheel", handleWheel, { passive: false });
    return () => svg.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  // ── Node drag ─────────────────────────────────────────────────────────────
  const draggingNodeIdRef = useRef<string | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const dragMovedRef = useRef(false);
  const dragPointerStartRef = useRef({ x: 0, y: 0 });

  // Convert client coords → simulation world coords (undoes zoom/pan transform)
  const clientToWorld = useCallback((clientX: number, clientY: number) => {
    const rect = svgRef.current!.getBoundingClientRect();
    const t = transformRef.current;
    return {
      x: (clientX - rect.left - t.x) / t.k,
      y: (clientY - rect.top  - t.y) / t.k,
    };
  }, []);

  const onNodeMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation(); // keep the background pan from starting
    e.preventDefault();
    draggingNodeIdRef.current = nodeId;
    setDraggingNodeId(nodeId);
    dragMovedRef.current = false;
    dragPointerStartRef.current = { x: e.clientX, y: e.clientY };

    const node = nodesRef.current.find((n) => n.id === nodeId);
    if (node) {
      node.fx = node.x;
      node.fy = node.y;
    }
    // Reheat so connected nodes react to the drag
    simRef.current?.alphaTarget(0.3).restart();
  }, []);

  // ── Shared SVG pointer handlers ───────────────────────────────────────────
  const onBgMouseDown = useCallback((e: React.MouseEvent) => {
    isPanningRef.current = true;
    setIsPanning(true);
    panStartRef.current = {
      x: e.clientX - transformRef.current.x,
      y: e.clientY - transformRef.current.y,
    };
    e.preventDefault();
  }, []);

  const onSvgMouseMove = useCallback((e: React.MouseEvent) => {
    // Node drag takes priority
    if (draggingNodeIdRef.current) {
      const dx = e.clientX - dragPointerStartRef.current.x;
      const dy = e.clientY - dragPointerStartRef.current.y;
      if (!dragMovedRef.current && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
        dragMovedRef.current = true;
      }
      const world = clientToWorld(e.clientX, e.clientY);
      const node = nodesRef.current.find((n) => n.id === draggingNodeIdRef.current);
      if (node) {
        node.fx = world.x;
        node.fy = world.y;
      }
      return;
    }

    if (!isPanningRef.current) return;
    applyTransform({
      ...transformRef.current,
      x: e.clientX - panStartRef.current.x,
      y: e.clientY - panStartRef.current.y,
    });
  }, [applyTransform, clientToWorld]);

  const onSvgMouseUp = useCallback((e: React.MouseEvent) => {
    if (draggingNodeIdRef.current) {
      const nodeId = draggingNodeIdRef.current;
      const wasDrag = dragMovedRef.current;

      // Unpin the node so the simulation can carry it naturally
      const node = nodesRef.current.find((n) => n.id === nodeId);
      if (node) { node.fx = null; node.fy = null; }
      simRef.current?.alphaTarget(0);

      draggingNodeIdRef.current = null;
      setDraggingNodeId(null);

      // If the pointer barely moved it was a click → navigate
      if (!wasDrag) {
        router.push(`/backpack/${nodeId}/notes`);
      }
      return;
    }

    isPanningRef.current = false;
    setIsPanning(false);
  }, [router]);

  const onSvgMouseLeave = useCallback(() => {
    // Release drag/pan when cursor exits the canvas — no navigation
    if (draggingNodeIdRef.current) {
      const node = nodesRef.current.find((n) => n.id === draggingNodeIdRef.current);
      if (node) { node.fx = null; node.fy = null; }
      simRef.current?.alphaTarget(0);
      draggingNodeIdRef.current = null;
      setDraggingNodeId(null);
    }
    isPanningRef.current = false;
    setIsPanning(false);
  }, []);

  // ── ResizeObserver ────────────────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let raf = 0;
    const ro = new ResizeObserver(([entry]) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const { width, height } = entry.contentRect;
        dimsRef.current = { w: width, h: height };
        setDims({ w: width, h: height });
        if (simRef.current) {
          simRef.current
            .force("center", forceCenter(width / 2, height / 2))
            .alpha(0.08)
            .restart();
        }
      });
    });
    ro.observe(el);
    return () => { ro.disconnect(); cancelAnimationFrame(raf); };
  }, []);

  // ── Simulation ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (notebooks.length === 0) return;

    const prevPos: Record<string, { x: number; y: number }> = {};
    for (const n of nodesRef.current) {
      if (n.x !== undefined && n.y !== undefined) prevPos[n.id] = { x: n.x, y: n.y };
    }

    const nodes: GraphNode[] = notebooks.map((nb) => ({
      id: nb.id,
      title: nb.title,
      course_code: nb.course_code,
      x: prevPos[nb.id]?.x,
      y: prevPos[nb.id]?.y,
    }));
    nodesRef.current = nodes;

    const nodeIds = new Set(nodes.map((n) => n.id));
    const edges: GraphLink[] = links
      .filter((l) => nodeIds.has(l.from_notebook_id) && nodeIds.has(l.to_notebook_id))
      .map((l) => ({
        edgeId: l.id,
        source: l.from_notebook_id,
        target: l.to_notebook_id,
        link_type: l.link_type as "prerequisite" | "related-to",
      }));

    const { w, h } = dimsRef.current;
    const sim = forceSimulation<GraphNode>(nodes)
      .force("charge", forceManyBody<GraphNode>().strength(-220))
      .force(
        "link",
        forceLink<GraphNode, GraphLink>(edges)
          .id((d) => d.id)
          .distance(100)
          .strength(0.6)
      )
      .force("center", forceCenter(w / 2, h / 2))
      .force("collide", forceCollide<GraphNode>(NODE_R + 8))
      .alphaDecay(0.03);

    simRef.current = sim;

    sim.on("tick", () => {
      const pos: Record<string, { x: number; y: number }> = {};
      for (const n of nodes) {
        pos[n.id] = { x: n.x ?? dimsRef.current.w / 2, y: n.y ?? dimsRef.current.h / 2 };
      }
      setPositions({ ...pos });
    });

    const timeout = setTimeout(() => sim.stop(), 3000);
    return () => {
      clearTimeout(timeout);
      sim.stop();
      simRef.current = null;
    };
  }, [notebooks, links]);

  // ── Render helpers ────────────────────────────────────────────────────────
  const nodeIds = new Set(notebooks.map((n) => n.id));
  const edges: GraphLink[] = links
    .filter((l) => nodeIds.has(l.from_notebook_id) && nodeIds.has(l.to_notebook_id))
    .map((l) => ({
      edgeId: l.id,
      source: l.from_notebook_id,
      target: l.to_notebook_id,
      link_type: l.link_type as "prerequisite" | "related-to",
    }));

  const getPos = useCallback(
    (id: string) => positions[id] ?? { x: dimsRef.current.w / 2, y: dimsRef.current.h / 2 },
    [positions]
  );

  if (notebooks.length === 0) {
    return (
      <div ref={containerRef} className="flex-1 flex items-center justify-center">
        <p className="text-sm text-slate-400 text-center px-4">No notebooks yet</p>
      </div>
    );
  }

  const { x: tx, y: ty, k } = transform;

  return (
    <div ref={containerRef} className="flex-1 min-h-0 relative">
      {links.length === 0 && (
        <p className="absolute bottom-3 left-0 right-0 text-center text-[11px] text-slate-400 pointer-events-none">
          No connections yet — link notebooks from inside a notebook
        </p>
      )}
      <svg
        ref={svgRef}
        width={dims.w}
        height={dims.h}
        className="w-full h-full"
        style={{ cursor: isPanning ? "grabbing" : "default" }}
        onMouseMove={onSvgMouseMove}
        onMouseUp={onSvgMouseUp}
        onMouseLeave={onSvgMouseLeave}
      >
        <defs>
          {notebooks.map((nb) => {
            const [c1, c2] = nodeColor(nb.course_code || nb.title);
            return (
              <radialGradient key={nb.id} id={`ng-${nb.id}`} cx="35%" cy="35%" r="65%">
                <stop offset="0%" stopColor={c1} stopOpacity="0.9" />
                <stop offset="100%" stopColor={c2} stopOpacity="1" />
              </radialGradient>
            );
          })}
          <marker id="arrow-prereq" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 z" fill="#a78bfa" opacity="0.7" />
          </marker>
          <marker id="arrow-related" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 z" fill="#7dd3fc" opacity="0.7" />
          </marker>
        </defs>

        {/* Background rect for pan — sits behind all nodes */}
        <rect
          width={dims.w}
          height={dims.h}
          fill="transparent"
          style={{ cursor: isPanning ? "grabbing" : "grab" }}
          onMouseDown={onBgMouseDown}
        />

        <g transform={`translate(${tx},${ty}) scale(${k})`}>
          {edges.map((edge) => {
            const sid = typeof edge.source === "object" ? (edge.source as GraphNode).id : edge.source as string;
            const tid = typeof edge.target === "object" ? (edge.target as GraphNode).id : edge.target as string;
            const sp = getPos(sid);
            const tp = getPos(tid);
            const isPrereq = edge.link_type === "prerequisite";
            return (
              <line
                key={edge.edgeId}
                x1={sp.x} y1={sp.y}
                x2={tp.x} y2={tp.y}
                stroke={isPrereq ? "#a78bfa" : "#7dd3fc"}
                strokeWidth={1.5}
                strokeOpacity={0.6}
                markerEnd={isPrereq ? "url(#arrow-prereq)" : "url(#arrow-related)"}
              />
            );
          })}

          {notebooks.map((nb) => {
            const { x, y } = getPos(nb.id);
            const isHovered = hoveredId === nb.id;
            const isDragging = draggingNodeId === nb.id;
            const r = isHovered ? NODE_R_HOVER : NODE_R;
            const label = nb.course_code.length > 10
              ? nb.course_code.slice(0, 9) + "…"
              : nb.course_code;

            return (
              <g
                key={nb.id}
                transform={`translate(${x},${y})`}
                style={{ cursor: isDragging ? "grabbing" : "grab" }}
                onMouseEnter={() => setHoveredId(nb.id)}
                onMouseLeave={() => setHoveredId(null)}
                onMouseDown={(e) => onNodeMouseDown(e, nb.id)}
              >
                <title>{nb.course_code} · {nb.title}</title>
                <circle
                  r={r}
                  fill={`url(#ng-${nb.id})`}
                  stroke={isDragging ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.5)"}
                  strokeWidth={isDragging ? 2.5 : isHovered ? 2 : 1.5}
                  style={{ transition: isDragging ? "none" : "r 0.15s ease" }}
                />
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={isHovered ? 13 : 11}
                  fontWeight="700"
                  fill="rgba(255,255,255,0.95)"
                  style={{ pointerEvents: "none", userSelect: "none" }}
                >
                  {(nb.course_code || nb.title).charAt(0).toUpperCase()}
                </text>
                {isHovered && !isDragging && (
                  <text
                    y={NODE_R_HOVER + 4}
                    textAnchor="middle"
                    fontSize={10}
                    fill="currentColor"
                    className="text-slate-500"
                    style={{ pointerEvents: "none", userSelect: "none" }}
                  >
                    {label}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
