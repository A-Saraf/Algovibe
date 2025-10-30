"use client";
import * as d3 from "d3";
import { useEffect, useRef, useState } from "react";

export default function Page() {
  const svgRef = useRef();
  const [input, setInput] = useState("6 4\n1 2\n2 3\n4 5\n5 6");
  const [components, setComponents] = useState(0);

  function parseInput(text) {
    const lines = text.trim().split("\n");
    const [n, m] = lines[0].split(" ").map(Number);
    const edges = lines.slice(1).map((l) => l.split(" ").map(Number));
    const adj = Array.from({ length: n + 1 }, () => []);
    for (let [u, v] of edges) {
      adj[u].push(v);
      adj[v].push(u);
    }
    return { n, adj, edges };
  }

  function findComponents(n, adj) {
    const visited = Array(n + 1).fill(false);
    const groups = [];
    let count = 0;

    function dfs(node, group) {
      visited[node] = true;
      group.push(node);
      for (let nei of adj[node]) if (!visited[nei]) dfs(nei, group);
    }

    for (let i = 1; i <= n; i++) {
      if (!visited[i]) {
        const group = [];
        dfs(i, group);
        groups.push(group);
        count++;
      }
    }

    return { count, groups };
  }

  function visualizeGraph(n, edges, groups) {
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 700, height = 500;
    svg.attr("width", width).attr("height", height);

    const nodes = d3.range(1, n + 1).map((id) => ({ id }));
    const links = edges.map(([u, v]) => ({ source: u, target: v }));
    const color = d3.scaleOrdinal(d3.schemeCategory10);

    const glow = svg.append("defs")
      .append("filter")
      .attr("id", "glow")
      .append("feGaussianBlur")
      .attr("stdDeviation", 4)
      .attr("result", "coloredBlur");

    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id((d) => d.id).distance(120))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2));

    // Draw links with animated zapping effect
    const link = svg.append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", "#38bdf8")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "5,5")
      .attr("opacity", 0.8);

    function animateZap() {
      link.transition()
        .duration(2000)
        .attr("stroke-dashoffset", 10)
        .ease(d3.easeLinear)
        .on("end", animateZap);
    }
    animateZap();

    // Bulbs (nodes)
    const node = svg.append("g")
      .selectAll("circle")
      .data(nodes)
      .join("circle")
      .attr("r", 18)
      .attr("fill", (d) => {
        const gi = groups.findIndex((g) => g.includes(d.id));
        return color(gi);
      })
      .style("filter", "url(#glow)")
      .style("stroke", "#fff")
      .style("stroke-width", 1.5)
      .call(
        d3.drag()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      );

    // Labels
    const label = svg.append("g")
      .selectAll("text")
      .data(nodes)
      .join("text")
      .text((d) => d.id)
      .attr("text-anchor", "middle")
      .attr("dy", 5)
      .attr("font-size", 12)
      .attr("fill", "#fff");

    simulation.on("tick", () => {
      link
        .attr("x1", (d) => d.source.x)
        .attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x)
        .attr("y2", (d) => d.target.y);
      node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
      label.attr("x", (d) => d.x).attr("y", (d) => d.y);
    });
  }

  const handleVisualize = () => {
    const { n, adj, edges } = parseInput(input);
    const { count, groups } = findComponents(n, adj);
    setComponents(count);
    visualizeGraph(n, edges, groups);
  };

  useEffect(() => {
    handleVisualize();
  }, []);

  return (
    <div className="container">
      <h1>💡 Friend Network Visualizer</h1>
      <textarea value={input} onChange={(e) => setInput(e.target.value)} />
      <button onClick={handleVisualize}>Visualize</button>
      <h3>Separate friend groups: {components}</h3>
      <svg ref={svgRef}></svg>
    </div>
  );
}
