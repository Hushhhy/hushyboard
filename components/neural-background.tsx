'use client';

import { useEffect, useRef } from 'react';

// "Calm" settings validated on the login mockup.
const SETTINGS = {
  areaPerNode: 9000, // one node for every 9,000 px² of screen
  speed: 0.4, // max drift per frame, in px
  linkDistance: 130, // nodes closer than this (px) are linked
  opacity: 0.35, // base opacity of nodes and links
  maxPulses: 3, // signals travelling along links at the same time
  pulseSpeed: 0.01, // share of a link travelled per frame
  domainEvery: 9, // one node out of 9 takes a domain color
};

// Colors come from the design tokens in globals.css (a canvas cannot read Tailwind classes).
const DOMAIN_TOKENS = ['--color-career', '--color-habits', '--color-leisure', '--color-finance'];
const NEUTRAL_TOKEN = '--color-fg-3';

type NetworkNode = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  isDomain: boolean;
};

type Pulse = { from: NetworkNode; to: NetworkNode; progress: number; color: string };

export function NeuralBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const styles = getComputedStyle(document.documentElement);
    const domainColors = DOMAIN_TOKENS.map((token) => styles.getPropertyValue(token).trim());
    const neutralColor = styles.getPropertyValue(NEUTRAL_TOKEN).trim();
    const reducedMotion =
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      document.documentElement.dataset.animations === 'off';

    let width = 0;
    let height = 0;
    let frameId = 0;
    let nodes: NetworkNode[] = [];
    let pulses: Pulse[] = [];

    // Size the canvas for the screen (sharp on Retina) and scatter the nodes.
    function setup() {
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas!.clientWidth;
      height = canvas!.clientHeight;
      canvas!.width = width * pixelRatio;
      canvas!.height = height * pixelRatio;
      ctx!.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

      const count = Math.round((width * height) / SETTINGS.areaPerNode);
      nodes = Array.from({ length: count }, (_, index) => {
        const isDomain = index % SETTINGS.domainEvery === 0;
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * SETTINGS.speed,
          vy: (Math.random() - 0.5) * SETTINGS.speed,
          radius: isDomain ? 2.4 : 1.4,
          color: isDomain
            ? domainColors[(index / SETTINGS.domainEvery) % domainColors.length]
            : neutralColor,
          isDomain,
        };
      });
      pulses = [];
    }

    // Two very soft glows (career gold, finance lavender) drifting slowly.
    function drawGlows(time: number) {
      const glows: [number, number, string][] = [
        [0.28 + 0.05 * Math.sin(time * 0.00007), 0.32, domainColors[0]],
        [0.74, 0.7 + 0.05 * Math.cos(time * 0.00006), domainColors[3]],
      ];
      ctx!.globalAlpha = 0.1;
      for (const [fx, fy, color] of glows) {
        const radius = Math.max(width, height) * 0.45;
        const gradient = ctx!.createRadialGradient(
          fx * width,
          fy * height,
          0,
          fx * width,
          fy * height,
          radius
        );
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, 'transparent');
        ctx!.fillStyle = gradient;
        ctx!.fillRect(0, 0, width, height);
      }
      ctx!.globalAlpha = 1;
    }

    function moveNodes() {
      for (const node of nodes) {
        node.x += node.vx;
        node.y += node.vy;
        if (node.x < 0 || node.x > width) node.vx *= -1;
        if (node.y < 0 || node.y > height) node.vy *= -1;
      }
    }

    // Link every pair of close nodes; the further apart, the more transparent.
    function drawLinks() {
      const links: [NetworkNode, NetworkNode][] = [];
      const maxDistanceSquared = SETTINGS.linkDistance ** 2;
      ctx!.strokeStyle = neutralColor;
      ctx!.lineWidth = 1;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const distanceSquared = (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
          if (distanceSquared > maxDistanceSquared) continue;
          const closeness = 1 - Math.sqrt(distanceSquared) / SETTINGS.linkDistance;
          ctx!.globalAlpha = closeness * SETTINGS.opacity * 0.6;
          ctx!.beginPath();
          ctx!.moveTo(a.x, a.y);
          ctx!.lineTo(b.x, b.y);
          ctx!.stroke();
          links.push([a, b]);
        }
      }
      ctx!.globalAlpha = 1;
      return links;
    }

    function drawNodes() {
      for (const node of nodes) {
        ctx!.globalAlpha = node.isDomain ? Math.min(1, SETTINGS.opacity + 0.35) : SETTINGS.opacity;
        ctx!.fillStyle = node.color;
        ctx!.beginPath();
        ctx!.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx!.fill();
      }
      ctx!.globalAlpha = 1;
    }

    // A "signal" travels along a link, like a neuron firing.
    function drawPulses(links: [NetworkNode, NetworkNode][]) {
      while (pulses.length < SETTINGS.maxPulses && links.length > 0) {
        const [a, b] = links[Math.floor(Math.random() * links.length)];
        const source = a.isDomain ? a : b;
        const color = source.isDomain
          ? source.color
          : domainColors[Math.floor(Math.random() * domainColors.length)];
        pulses.push({ from: a, to: b, progress: 0, color });
      }
      for (const pulse of pulses) {
        pulse.progress += SETTINGS.pulseSpeed;
        const x = pulse.from.x + (pulse.to.x - pulse.from.x) * pulse.progress;
        const y = pulse.from.y + (pulse.to.y - pulse.from.y) * pulse.progress;
        ctx!.fillStyle = pulse.color;
        ctx!.shadowColor = pulse.color;
        ctx!.shadowBlur = 10;
        ctx!.beginPath();
        ctx!.arc(x, y, 2.2, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.shadowBlur = 0;
      }
      pulses = pulses.filter((pulse) => pulse.progress < 1);
    }

    // One full frame: clear, then repaint everything.
    function draw(time: number, animate: boolean) {
      ctx!.clearRect(0, 0, width, height);
      drawGlows(time);
      if (animate) moveNodes();
      const links = drawLinks();
      drawNodes();
      if (animate) drawPulses(links);
    }

    function loop(time: number) {
      draw(time, true);
      frameId = requestAnimationFrame(loop);
    }

    function start() {
      cancelAnimationFrame(frameId);
      setup();
      if (reducedMotion)
        draw(0, false); // a single still image
      else frameId = requestAnimationFrame(loop);
    }

    // Pause when the tab is hidden: no CPU or battery spent for nothing.
    function handleVisibilityChange() {
      if (document.hidden) cancelAnimationFrame(frameId);
      else if (!reducedMotion) frameId = requestAnimationFrame(loop);
    }

    window.addEventListener('resize', start);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    start();

    // Cleanup: runs when the login page is left. Stops the loop and removes the listeners.
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', start);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <canvas ref={canvasRef} className="size-full" />
      {/* Dark vignette behind the card so the text keeps its contrast. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_55%_at_50%_50%,color-mix(in_oklch,var(--color-surface-sunken)_85%,transparent),transparent_75%)]" />
    </div>
  );
}
