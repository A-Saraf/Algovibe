"use client";

import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import "../styles/globals.css";

export default function HomePage() {
  const ref = useRef();
  const [graph, setGraph] = useState(null);

  useEffect(() => {
    fetch("/data/graph.json")
      .then((res) => res.json())
      .then(setGraph);
  }, []);

  useEffect(() => {
    if (!graph) return;

    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();

    const width = 700,
      height = 500;
    const data = graph;

    // adjacency + connected components
    const adj = Array.from({ length: data.n + 1 }, () => []);
    data.edges.forEach(([u, v]) => {
      adj[u].push(v);
      adj[v].push(u);
    });

    const visited = Array(data.n + 1).fill(false);
    const components = [];
    function dfs(node, comp) {
      visited[node] = true;
      comp.push(node);
      for (const nei of adj[node]) if (!visited[nei]) dfs(nei, comp);
    }
    for (let i = 1; i <= data.n; i++) {
      if (!visited[i]) {
        const comp = [];
        dfs(i, comp);
        components.push(comp);
      }
    }

    const nodes = Array.from({ length: data.n }, (_, i) => ({ id: i + 1 }));
    const links = data.edges.map(([u, v]) => ({ source: u, target: v }));

    const simulation = d3
      .forceSimulation(nodes)
      .force("link", d3.forceLink(links).id((d) => d.id).distance(120))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide(40));

    const colorPalette = ["#00FFFF", "#FF00FF", "#FFD700", "#FF4500", "#ADFF2F", "#00CED1"];
    const componentColors = {};
    components.forEach((comp, i) => {
      const color = colorPalette[i % colorPalette.length];
      comp.forEach((n) => (componentColors[n] = color));
    });

    // Draw visible wires
    const link = svg
      .selectAll(".wire")
      .data(links)
      .enter()
      .append("line")
      .attr("class", "wire")
      .style("stroke", (d) => componentColors[d.source.id])
      .style("stroke-width", 2)
      .style("opacity", 0.8)
      .style("filter", "drop-shadow(0 0 4px currentColor)");

    // Draw bulbs
    const node = svg
      .selectAll(".bulb")
      .data(nodes)
      .enter()
      .append("circle")
      .attr("class", "bulb")
      .attr("r", 18)
      .attr("fill", (d) => componentColors[d.id])
      .style("filter", "drop-shadow(0 0 15px currentColor)");

    // Labels
    svg
      .selectAll(".label")
      .data(nodes)
      .enter()
      .append("text")
      .attr("class", "label")
      .attr("text-anchor", "middle")
      .attr("dy", 5)
      .attr("fill", "#fff")
      .text((d) => d.id);

    simulation.on("tick", () => {
      link
        .attr("x1", (d) => d.source.x)
        .attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x)
        .attr("y2", (d) => d.target.y);

      node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
      svg.selectAll(".label").attr("x", (d) => d.x).attr("y", (d) => d.y + 35);
    });

    // --- ⚡ ZAP animation that never stops ---
    const zaps = links.map((d) => ({
      link: d,
      progress: Math.random(),
      direction: 1,
      color: componentColors[d.source.id],
    }));

    function animateZaps() {
      const timeStep = 0.005;

      svg.selectAll(".zap").remove();
      const zapCircles = svg
        .selectAll(".zap")
        .data(zaps)
        .enter()
        .append("circle")
        .attr("r", 4)
        .style("fill", (d) => d.color)
        .style("filter", "drop-shadow(0 0 6px currentColor)");

      function frame() {
        zapCircles
          .attr("cx", (d) => {
            d.progress += timeStep * d.direction;
            if (d.progress > 1 || d.progress < 0) d.direction *= -1;
            return d.link.source.x + (d.link.target.x - d.link.source.x) * d.progress;
          })
          .attr("cy", (d) => {
            return d.link.source.y + (d.link.target.y - d.link.source.y) * d.progress;
          });

        requestAnimationFrame(frame);
      }
      frame();
    }

    animateZaps();
  }, [graph]);

  return (
    <main className="page">
      <h1 className="title">⚡ Interconnected Bulb Network</h1>
      <svg ref={ref} width={700} height={500}></svg>
    </main>
  );
}
