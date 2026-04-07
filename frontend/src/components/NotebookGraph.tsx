"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  forceSimulation,
  forceManyBody,
  forceLink,
  forceCenter,
  forceCollide,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from "d3-force";
import type { NotebookResponse } from "../lib/api";
import type { AllLinksEdge } from "../lib/api/links";

// ── colour palette (mirrors NotebookCard) ────────────────────────────────────
const PALETTE = [
  ["#7c3aed", "#5b21b6"], // violet
  ["#0284c7", "#0369a1"], // sky
  ["#059669", "#047857"], // emerald
  ["#d97706", "#b45309"], // amber
  ["#e11d48", "#be123c"], // rose
  ["#4338ca", "#3730a3"], // indigo
  ["#0d9488", "#0f766e"], // teal
  ["#ea580c", "#c2410c"], // orange
];

function nodeColor(str: string): [string, string] {
  let hash = 0;
  for (const c of str) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff;
  return PALETTE[hash % PALETTE.length];
}

// ── types ────────────────────────────────────────────────────────────────────
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

export default function NotebookGraph({ notebooks, links }: Props) {
  const router = useRouter();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 300, h: 300 });
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Track dims via ResizeObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setDims({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Run force simulation whenever nodes/links/dims change
  useEffect(() => {
    if (notebooks.length === 0) return;

    const nodes: GraphNode[] = notebooks.map((nb) => ({
      id: nb.id,
      title: nb.title,
      course_code: nb.course_code,
    }));

    const nodeIds = new Set(nodes.map((n) => n.id));
    const edges: GraphLink[] = links
      .filter((l) => nodeIds.has(l.from_notebook_id) && nodeIds.has(l.to_notebook_id))
      .map((l) => ({
        edgeId: l.id,
        source: l.from_notebook_id,
        target: l.to_notebook_id,
        link_type: l.link_type as "prerequisite" | "related-to",
      }));

    const sim = forceSimulation<GraphNode>(nodes)
      .force("charge", forceManyBody<GraphNode>().strength(-220))
      .force(
        "link",
        forceLink<GraphNode, GraphLink>(edges)
          .id((d) => d.id)
          .distance(100)
          .strength(0.6)
      )
      .force("center", forceCenter(dims.w / 2, dims.h / 2))
      .force("collide", forceCollide<GraphNode>(NODE_R + 8))
      .alphaDecay(0.03);

    sim.on("tick", () => {
      const pos: Record<string, { x: number; y: number }> = {};
      for (const n of nodes) {
        pos[n.id] = { x: n.x ?? dims.w / 2, y: n.y ?? dims.h / 2 };
      }
      setPositions({ ...pos });
    });

    // Stop after settling (~3 s)
    const timeout = setTimeout(() => sim.stop(), 3000);
    return () => {
      clearTimeout(timeout);
      sim.stop();
    };
  }, [notebooks, links, dims]);

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
    (id: string) => positions[id] ?? { x: dims.w / 2, y: dims.h / 2 },
    [positions, dims]
  );

  if (notebooks.length === 0) {
    return (
      <div ref={containerRef} className="flex-1 flex items-center justify-center">
        <p className="text-sm text-slate-400 text-center px-4">No notebooks yet</p>
      </div>
    );
  }

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

        {/* Edges */}
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

        {/* Nodes */}
        {notebooks.map((nb) => {
          const { x, y } = getPos(nb.id);
          const isHovered = hoveredId === nb.id;
          const r = isHovered ? NODE_R_HOVER : NODE_R;
          const label = nb.course_code.length > 10
            ? nb.course_code.slice(0, 9) + "…"
            : nb.course_code;

          return (
            <g
              key={nb.id}
              transform={`translate(${x},${y})`}
              style={{ cursor: "pointer" }}
              onMouseEnter={() => setHoveredId(nb.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => router.push(`/backpack/${nb.id}/notes`)}
            >
              <title>{nb.course_code} · {nb.title}</title>
              <circle
                r={r}
                fill={`url(#ng-${nb.id})`}
                stroke="rgba(255,255,255,0.5)"
                strokeWidth={isHovered ? 2 : 1.5}
                style={{ transition: "r 0.15s ease" }}
              />
              {/* Initial letter */}
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
              {/* Label below */}
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
            </g>
          );
        })}
      </svg>
    </div>
  );
}
