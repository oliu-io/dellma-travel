"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { useStore } from "@/lib/dellma/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import * as d3 from "d3";

// Warm earthy palette matching ranking results
const RANK_COLORS = ["#5a8a5e", "#c58940", "#b06340", "#9e5a4f", "#8a7d72"];

interface DecisionNetworkBlockProps {
  locked: boolean;
}

// Utility color scale: green (high) → red (low)
function utilityColor(u: number): string {
  // 0 → red, 50 → yellow, 100 → green
  const t = Math.max(0, Math.min(1, u / 100));
  const r = Math.round(t < 0.5 ? 255 : 255 * (1 - (t - 0.5) * 2));
  const g = Math.round(t < 0.5 ? 255 * t * 2 : 255);
  return `rgb(${r},${g},60)`;
}

interface NetworkNode {
  id: string;
  type: "decision" | "action" | "leaf";
  label: string;
  icon?: string;
  color: string;
  value?: number; // U(s,a) for leaves, EU for actions
  probability?: number; // P(s|a) for leaves
  stateDesc?: string; // human-readable state description
  col: number; // 0=decision, 1=action, 2=leaf
  fx: number; // fixed x
  fy?: number;
  x?: number;
  y?: number;
  actionIdx?: number; // for grouping leaves near their action
}

interface NetworkLink {
  source: string;
  target: string;
  width: number;
  opacity: number;
}

export function DecisionNetworkBlock({ locked }: DecisionNetworkBlockProps) {
  const { btResult, selectedCities, latentFactors } = useStore();
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [topK, setTopK] = useState(4); // top 3 + bottom 1

  // Build factor label lookup
  const factorLabelMap = useCallback(() => {
    const map: Record<string, { name: string; values: Record<string, string> }> = {};
    for (const f of latentFactors) {
      map[f.id] = {
        name: f.name,
        values: Object.fromEntries(f.plausibleValues.map((v) => [v.id, v.label])),
      };
    }
    return map;
  }, [latentFactors]);

  useEffect(() => {
    if (!btResult || !svgRef.current || !tooltipRef.current || !containerRef.current) return;
    if (!btResult.stateProbs || !btResult.stateDescriptions) return;

    const flm = factorLabelMap();
    const nCities = selectedCities.length;

    // --- Build nodes and links ---
    const nodes: NetworkNode[] = [];
    const links: NetworkLink[] = [];

    // 1. Decision node
    nodes.push({
      id: "decision",
      type: "decision",
      label: "Decision",
      color: "#5c4033",
      col: 0,
      fx: 60,
    });

    // 2. Action nodes (cities)
    selectedCities.forEach((city: { id: string; name: string; icon: string }, i: number) => {
      const eu = btResult.expectedUtilities[city.id] ?? 0;
      nodes.push({
        id: `action-${city.id}`,
        type: "action",
        label: city.name,
        icon: city.icon,
        color: RANK_COLORS[i] || "#6b7280",
        value: eu,
        col: 1,
        fx: 250,
        actionIdx: i,
      });
      links.push({
        source: "decision",
        target: `action-${city.id}`,
        width: 2,
        opacity: 0.7,
      });
    });

    // 3. Leaf nodes — top K states per action
    selectedCities.forEach((city: { id: string }, cityIdx: number) => {
      const stateUtils = btResult.perStateUtilities[city.id] || [];
      const stateProbs = btResult.stateProbs?.[city.id] || [];

      if (stateUtils.length === 0) return;

      // Create indexed array and sort by utility
      const indexed = stateUtils.map((u, si) => ({
        stateIdx: si,
        utility: u,
        prob: stateProbs[si] ?? 1 / stateUtils.length,
      }));
      indexed.sort((a, b) => b.utility - a.utility);

      // Select top K: top (K-1) and bottom 1
      const selected: typeof indexed = [];
      const topCount = Math.min(topK - 1, indexed.length);
      for (let i = 0; i < topCount; i++) selected.push(indexed[i]);
      // Add worst state if not already included
      const worst = indexed[indexed.length - 1];
      if (!selected.find((s) => s.stateIdx === worst.stateIdx)) {
        selected.push(worst);
      }

      // Build state description from stateDescriptions
      selected.forEach((s) => {
        const stateDict = btResult.stateDescriptions?.[s.stateIdx];
        let desc = "";
        if (stateDict) {
          desc = Object.entries(stateDict)
            .map(([fid, vid]) => {
              const factor = flm[fid];
              if (!factor) return `${fid}=${vid}`;
              return `${factor.name}: ${factor.values[vid] || vid}`;
            })
            .join("\n");
        }

        const nodeId = `leaf-${city.id}-s${s.stateIdx}`;
        nodes.push({
          id: nodeId,
          type: "leaf",
          label: `S${s.stateIdx}`,
          color: utilityColor(s.utility),
          value: s.utility,
          probability: s.prob,
          stateDesc: desc,
          col: 2,
          fx: 500,
          actionIdx: cityIdx,
        });

        // Edge thickness proportional to probability
        const maxProb = Math.max(...stateProbs, 0.01);
        links.push({
          source: `action-${city.id}`,
          target: nodeId,
          width: 1 + (s.prob / maxProb) * 4,
          opacity: 0.3 + (s.prob / maxProb) * 0.5,
        });
      });
    });

    // --- Layout: assign y positions ---
    const width = 620;
    const actionSpacing = 80;
    const totalActionHeight = nCities * actionSpacing;
    const yOffset = 40;

    // Decision node centered
    const decisionNode = nodes.find((n) => n.id === "decision")!;
    decisionNode.fy = yOffset + totalActionHeight / 2;

    // Action nodes evenly spaced
    const actionNodes = nodes.filter((n) => n.type === "action");
    actionNodes.forEach((n, i) => {
      n.fy = yOffset + i * actionSpacing + actionSpacing / 2;
    });

    // Leaf nodes: distribute around their parent action's y
    const leafsByAction: Record<number, NetworkNode[]> = {};
    for (const n of nodes) {
      if (n.type === "leaf" && n.actionIdx !== undefined) {
        if (!leafsByAction[n.actionIdx]) leafsByAction[n.actionIdx] = [];
        leafsByAction[n.actionIdx].push(n);
      }
    }

    for (const [actionIdxStr, leaves] of Object.entries(leafsByAction)) {
      const actionIdx = Number(actionIdxStr);
      const parentY = yOffset + actionIdx * actionSpacing + actionSpacing / 2;
      const leafSpacing = Math.min(24, (actionSpacing - 10) / leaves.length);
      const startY = parentY - ((leaves.length - 1) * leafSpacing) / 2;
      leaves.forEach((leaf, i) => {
        leaf.fy = startY + i * leafSpacing;
      });
    }

    const height = yOffset * 2 + totalActionHeight + 20;

    // --- D3 render ---
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    svg.attr("viewBox", `0 0 ${width} ${height}`).attr("width", "100%").attr("height", height);

    const g = svg.append("g");

    // Zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.5, 3]).on("zoom", (event) => {
      g.attr("transform", event.transform);
    });
    svg.call(zoom);

    // Links
    g.selectAll("line.link")
      .data(links)
      .join("line")
      .attr("class", "link")
      .attr("x1", () => {
        const s = nodes.find((n) => n.id === links[0]?.source);
        return s?.fx ?? 0;
      })
      .attr("stroke", "#b8a898")
      .attr("stroke-opacity", (d) => d.opacity)
      .attr("stroke-width", (d) => d.width)
      .each(function (d) {
        const sourceNode = nodes.find((n) => n.id === d.source);
        const targetNode = nodes.find((n) => n.id === d.target);
        d3.select(this)
          .attr("x1", sourceNode?.fx ?? 0)
          .attr("y1", sourceNode?.fy ?? 0)
          .attr("x2", targetNode?.fx ?? 0)
          .attr("y2", targetNode?.fy ?? 0);
      });

    // Draw curved links instead of straight lines for better aesthetics
    g.selectAll("line.link").remove();
    g.selectAll("path.link")
      .data(links)
      .join("path")
      .attr("class", "link")
      .attr("fill", "none")
      .attr("stroke", "#b8a898")
      .attr("stroke-opacity", (d) => d.opacity)
      .attr("stroke-width", (d) => d.width)
      .attr("d", (d) => {
        const s = nodes.find((n) => n.id === d.source);
        const t = nodes.find((n) => n.id === d.target);
        if (!s || !t) return "";
        const sx = s.fx!;
        const sy = s.fy!;
        const tx = t.fx!;
        const ty = t.fy!;
        const mx = (sx + tx) / 2;
        return `M${sx},${sy} C${mx},${sy} ${mx},${ty} ${tx},${ty}`;
      });

    const tooltip = d3.select(tooltipRef.current);

    // Nodes
    const nodeG = g
      .selectAll("g.node")
      .data(nodes)
      .join("g")
      .attr("class", "node")
      .attr("transform", (d) => `translate(${d.fx},${d.fy})`);

    // Decision node = square
    nodeG
      .filter((d) => d.type === "decision")
      .append("rect")
      .attr("x", -18)
      .attr("y", -18)
      .attr("width", 36)
      .attr("height", 36)
      .attr("rx", 4)
      .attr("fill", (d) => d.color)
      .attr("stroke", "#7c6656")
      .attr("stroke-width", 2);

    nodeG
      .filter((d) => d.type === "decision")
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", 5)
      .attr("fill", "white")
      .attr("font-size", 11)
      .attr("font-weight", "bold")
      .text("■");

    // Decision label below
    nodeG
      .filter((d) => d.type === "decision")
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", 32)
      .attr("fill", "#8a7d72")
      .attr("font-size", 10)
      .text("Decision");

    // Action nodes = circles with emoji
    nodeG
      .filter((d) => d.type === "action")
      .append("circle")
      .attr("r", 22)
      .attr("fill", (d) => d.color)
      .attr("stroke", "white")
      .attr("stroke-width", 2)
      .attr("opacity", 0.9);

    nodeG
      .filter((d) => d.type === "action")
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", 6)
      .attr("font-size", 13)
      .attr("font-weight", "bold")
      .attr("fill", "white")
      .text((d) => d.label.charAt(0).toUpperCase());

    // Action label below
    nodeG
      .filter((d) => d.type === "action")
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", 38)
      .attr("fill", "#5c4a3d")
      .attr("font-size", 10)
      .attr("font-weight", "600")
      .text((d) => d.label);

    // EU value below action label
    nodeG
      .filter((d) => d.type === "action")
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", 50)
      .attr("fill", "#8a7d72")
      .attr("font-size", 9)
      .text((d) => `EU: ${d.value?.toFixed(1) ?? "?"}`);

    // Leaf nodes = small circles
    nodeG
      .filter((d) => d.type === "leaf")
      .append("circle")
      .attr("r", 8)
      .attr("fill", (d) => d.color)
      .attr("stroke", "#d4c8bc")
      .attr("stroke-width", 1.5);

    // Leaf U value label
    nodeG
      .filter((d) => d.type === "leaf")
      .append("text")
      .attr("x", 14)
      .attr("dy", 4)
      .attr("fill", "#5c4a3d")
      .attr("font-size", 9)
      .text((d) => d.value?.toFixed(0) ?? "");

    // Tooltip interactions
    nodeG
      .on("mouseenter", (event, d) => {
        if (d.type === "decision") return;

        let html = "";
        if (d.type === "action") {
          html = `<strong>${d.label}</strong><br/>EU: ${d.value?.toFixed(1)}`;
        } else if (d.type === "leaf") {
          html = `<strong>U(s,a) = ${d.value?.toFixed(1)}</strong><br/>`;
          html += `P(s|a) = ${((d.probability ?? 0) * 100).toFixed(1)}%<br/>`;
          if (d.stateDesc) {
            html += `<br/><span style="font-size:11px;color:#8a7d72">${d.stateDesc.replace(/\n/g, "<br/>")}</span>`;
          }
        }

        const container = containerRef.current!;
        const rect = container.getBoundingClientRect();
        const mx = event.clientX - rect.left;
        const my = event.clientY - rect.top;

        tooltip
          .html(html)
          .style("left", `${mx + 12}px`)
          .style("top", `${my - 8}px`)
          .style("opacity", 1)
          .style("pointer-events", "none");
      })
      .on("mouseleave", () => {
        tooltip.style("opacity", 0);
      });

    // Cleanup
    return () => {
      svg.selectAll("*").remove();
    };
  }, [btResult, selectedCities, latentFactors, topK, factorLabelMap]);

  if (!btResult) return null;
  if (!btResult.stateProbs || !btResult.stateDescriptions) {
    return null; // No state data available
  }

  return (
    <Card className={locked ? "opacity-60" : ""}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Decision Network</CardTitle>
        <p className="text-xs text-muted-foreground">
          DeLLMa decision tree: ■ Decision → ● Actions (cities) → U(s,a) leaves.
          Edge thickness encodes P(s|a). Leaf color: green = high utility, red = low.
        </p>
      </CardHeader>
      <CardContent>
        {/* Top-K slider */}
        <div className="flex items-center gap-3 mb-3">
          <label className="text-xs text-muted-foreground whitespace-nowrap">
            States shown per city:
          </label>
          <input
            type="range"
            min={3}
            max={Math.min(10, (btResult.perStateUtilities[selectedCities[0]?.id]?.length ?? 10))}
            value={topK}
            onChange={(e) => setTopK(Number(e.target.value))}
            className="flex-1 h-1.5 accent-violet-500"
            disabled={locked}
          />
          <span className="text-xs font-mono text-muted-foreground w-6 text-right">{topK}</span>
        </div>

        {/* SVG container */}
        <div ref={containerRef} className="relative overflow-x-auto border rounded-lg bg-amber-50/30">
          <svg ref={svgRef} className="block" />
          {/* Tooltip overlay */}
          <div
            ref={tooltipRef}
            className="absolute bg-white border border-amber-200 rounded-lg px-3 py-2 text-xs shadow-lg transition-opacity pointer-events-none z-50"
            style={{ opacity: 0 }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
