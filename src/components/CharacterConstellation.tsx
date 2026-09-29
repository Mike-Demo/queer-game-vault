import { Link } from "@tanstack/react-router";
import { forceCenter, forceCollide, forceManyBody, forceSimulation, forceX, forceY, type SimulationNodeDatum } from "d3-force";
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from "react";

import { Surface } from "@/components/Surface";
import { NesButton, NesCheckbox, NesField, NesInput, NesText } from "@/design-system/nes-229931";
import { buildConstellationEdges, buildConstellationNodes, type ConstellationEdge, type ConstellationNode, type RelationshipKind } from "@/lib/constellation-model";

type PositionedNode = ConstellationNode & SimulationNodeDatum & { x: number; y: number };
interface Viewport { x: number; y: number; scale: number }
interface DragState { pointerX: number; pointerY: number; viewX: number; viewY: number; moved: boolean }

const RELATIONSHIP_LABELS: Record<RelationshipKind, string> = {
  identity: "Identity",
  era: "Release era",
  trope: "Narrative trope",
};

function stableFraction(value: string, salt: number): number {
  let hash = 2166136261 ^ salt;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

function prepareLayout(nodes: readonly ConstellationNode[]): PositionedNode[] {
  const positioned = nodes.map((node) => ({
    ...node,
    x: (stableFraction(node.id, 11) - 0.5) * 1800,
    y: (stableFraction(node.id, 29) - 0.5) * 1200,
  }));
  const simulation = forceSimulation(positioned)
    .alphaDecay(0.05)
    .velocityDecay(0.6)
    .force("charge", forceManyBody<PositionedNode>().strength(-9))
    .force("collision", forceCollide<PositionedNode>().radius(8))
    .force("x", forceX<PositionedNode>(0).strength(0.012))
    .force("y", forceY<PositionedNode>(0).strength(0.012))
    .force("center", forceCenter(0, 0))
    .stop();
  for (let index = 0; index < 120; index += 1) simulation.tick();
  return positioned;
}

function relationshipColor(kind: RelationshipKind, colors: CanvasColors): string {
  if (kind === "identity") return colors.primary;
  if (kind === "era") return colors.success;
  return colors.warning;
}

interface CanvasColors {
  background: string;
  surface: string;
  foreground: string;
  primary: string;
  success: string;
  warning: string;
  disabled: string;
  primaryShadow: string;
  successShadow: string;
  warningShadow: string;
  starSize: number;
  fontSize: number;
  fontFamily: string;
}

function readColors(): CanvasColors {
  const styles = getComputedStyle(document.documentElement);
  const bodyStyles = getComputedStyle(document.body);
  const token = (name: string) => styles.getPropertyValue(name).trim();
  const rootFontSize = Number.parseFloat(styles.fontSize);
  const lengthToken = (name: string) => Number.parseFloat(token(name)) * rootFontSize;
  return {
    background: token("--nes-dark"),
    surface: token("--nes-bg"),
    foreground: token("--nes-bg"),
    primary: token("--nes-primary"),
    success: token("--nes-success"),
    warning: token("--nes-warning"),
    disabled: token("--nes-disabled"),
    primaryShadow: token("--nes-primary-shadow"),
    successShadow: token("--nes-success-shadow"),
    warningShadow: token("--nes-warning-shadow"),
    starSize: lengthToken("--app-space-1"),
    fontSize: lengthToken("--app-font-xs"),
    fontFamily: bodyStyles.fontFamily,
  };
}

export interface CharacterConstellationProps {
  readonly records: Parameters<typeof buildConstellationNodes>[0];
  readonly initialCharacter?: string;
  readonly initialGame?: string;
}

export function CharacterConstellation({ records, initialCharacter, initialGame }: CharacterConstellationProps) {
  const nodes = useMemo(() => buildConstellationNodes(records), [records]);
  const edges = useMemo(() => buildConstellationEdges(nodes), [nodes]);
  const positioned = useMemo(() => prepareLayout(nodes), [nodes]);
  const nodeById = useMemo(() => new Map(positioned.map((node) => [node.id, node])), [positioned]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const [view, setView] = useState<Viewport>({ x: 0, y: 0, scale: 0.65 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [layers, setLayers] = useState<Record<RelationshipKind, boolean>>({ identity: true, era: true, trope: true });
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  const searchResults = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    if (!term) return positioned.slice(0, 40);
    return positioned
      .filter((node) => node.name.toLocaleLowerCase().includes(term) || node.gameTitle.toLocaleLowerCase().includes(term))
      .slice(0, 40);
  }, [positioned, query]);

  const selected = selectedId ? nodeById.get(selectedId) ?? null : null;
  const selectedEdges = useMemo(
    () => selectedId ? edges.filter((edge) => edge.source === selectedId || edge.target === selectedId) : [],
    [edges, selectedId],
  );

  const focusNode = useCallback((node: PositionedNode) => {
    setSelectedId(node.id);
    setView((current) => ({ ...current, x: -node.x * current.scale, y: -node.y * current.scale }));
  }, []);

  useEffect(() => {
    const target = positioned.find((node) =>
      initialCharacter
        ? node.name.toLocaleLowerCase() === initialCharacter.toLocaleLowerCase() && (!initialGame || node.gameSlug === initialGame)
        : initialGame ? node.gameSlug === initialGame : false,
    );
    if (target) focusNode(target);
  }, [focusNode, initialCharacter, initialGame, positioned]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const width = Math.max(1, Math.floor(entry.contentRect.width));
      const height = Math.max(1, Math.floor(entry.contentRect.height));
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      setCanvasSize({ width, height });
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || canvasSize.width === 0) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const ratio = canvas.width / canvasSize.width;
    const colors = readColors();
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.fillStyle = colors.background;
    context.fillRect(0, 0, canvasSize.width, canvasSize.height);
    context.save();
    context.translate(canvasSize.width / 2 + view.x, canvasSize.height / 2 + view.y);
    context.scale(view.scale, view.scale);

    const visibleEdges = selectedId
      ? selectedEdges
      : edges.filter((edge) => layers[edge.kind]).slice(0, 500);
    context.lineWidth = colors.starSize * 0.125 / view.scale;
    for (const edge of visibleEdges) {
      if (!layers[edge.kind]) continue;
      const source = nodeById.get(edge.source);
      const target = nodeById.get(edge.target);
      if (!source || !target) continue;
      context.strokeStyle = selectedId
        ? relationshipColor(edge.kind, colors)
        : edge.kind === "identity"
          ? colors.primaryShadow
          : edge.kind === "era"
            ? colors.successShadow
            : colors.warningShadow;
      context.beginPath();
      context.moveTo(Math.round(source.x), Math.round(source.y));
      const middleX = Math.round((source.x + target.x) / 2);
      context.lineTo(middleX, Math.round(source.y));
      context.lineTo(middleX, Math.round(target.y));
      context.lineTo(Math.round(target.x), Math.round(target.y));
      context.stroke();
    }

    const connected = new Set(selectedEdges.flatMap((edge) => [edge.source, edge.target]));
    for (const node of positioned) {
      const isSelected = node.id === selectedId;
      const isConnected = connected.has(node.id);
      const size = isSelected ? colors.starSize : isConnected ? colors.starSize * 0.75 : colors.starSize * 0.5;
      context.fillStyle = isSelected
        ? colors.warning
        : isConnected
          ? colors.primary
          : selectedId
            ? colors.disabled
            : colors.surface;
      context.fillRect(Math.round(node.x - size / 2), Math.round(node.y - size / 2), size, size);
      if (isSelected || (view.scale > 1.35 && isConnected)) {
        context.fillStyle = colors.foreground;
        context.font = `${colors.fontSize / view.scale}px ${colors.fontFamily}`;
        context.fillText(node.name, node.x + colors.starSize / view.scale, node.y + colors.starSize * 0.5 / view.scale);
      }
    }
    context.restore();
  }, [canvasSize, edges, layers, nodeById, positioned, selectedEdges, selectedId, view]);

  function nodeAt(clientX: number, clientY: number): PositionedNode | null {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const worldX = (clientX - rect.left - rect.width / 2 - view.x) / view.scale;
    const worldY = (clientY - rect.top - rect.height / 2 - view.y) / view.scale;
    let closest: PositionedNode | null = null;
    let distance = 14 / view.scale;
    for (const node of positioned) {
      const candidate = Math.hypot(node.x - worldX, node.y - worldY);
      if (candidate < distance) {
        distance = candidate;
        closest = node;
      }
    }
    return closest;
  }

  function onPointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { pointerX: event.clientX, pointerY: event.clientY, viewX: view.x, viewY: view.y, moved: false };
  }

  function onPointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    const deltaX = event.clientX - drag.pointerX;
    const deltaY = event.clientY - drag.pointerY;
    if (Math.abs(deltaX) + Math.abs(deltaY) > 3) drag.moved = true;
    setView((current) => ({ ...current, x: drag.viewX + deltaX, y: drag.viewY + deltaY }));
  }

  function onPointerUp(event: ReactPointerEvent<HTMLCanvasElement>) {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag?.moved) {
      const node = nodeAt(event.clientX, event.clientY);
      setSelectedId(node?.id ?? null);
    }
  }

  function onWheel(event: ReactWheelEvent<HTMLCanvasElement>) {
    event.preventDefault();
    const factor = event.deltaY > 0 ? 0.88 : 1.14;
    setView((current) => ({ ...current, scale: Math.min(2.5, Math.max(0.28, current.scale * factor)) }));
  }

  const connections = selected
    ? selectedEdges.map((edge) => ({ edge, node: nodeById.get(edge.source === selected.id ? edge.target : edge.source) })).filter((item) => item.node)
    : [];

  return (
    <div className="constellation-layout">
      <div className="constellation-main stack">
        <Surface title="Star controls" dark rounded>
          <div className="constellation-controls">
            <NesField label="Find a character or game" htmlFor="constellation-search">
              <NesInput id="constellation-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Character or game" />
            </NesField>
            <div className="row" aria-label="Connection layers">
              {(Object.keys(RELATIONSHIP_LABELS) as RelationshipKind[]).map((kind) => (
                <NesCheckbox key={kind} label={RELATIONSHIP_LABELS[kind]} checked={layers[kind]} onChange={(event) => setLayers((current) => ({ ...current, [kind]: event.target.checked }))} />
              ))}
            </div>
            <div className="row">
              <NesButton aria-label="Zoom out" title="Zoom out" onClick={() => setView((current) => ({ ...current, scale: Math.max(0.28, current.scale * 0.8) }))}>−</NesButton>
              <NesButton aria-label="Reset view" title="Reset view" onClick={() => setView({ x: 0, y: 0, scale: 0.65 })}>Reset</NesButton>
              <NesButton aria-label="Zoom in" title="Zoom in" onClick={() => setView((current) => ({ ...current, scale: Math.min(2.5, current.scale * 1.2) }))}>+</NesButton>
              <NesText className="text-xs">{`${nodes.length} stars · ${edges.length} paths`}</NesText>
            </div>
          </div>
        </Surface>

        <div className="constellation-sky">
          <canvas ref={canvasRef} aria-label={`Interactive constellation of ${nodes.length} LGBTQ+ characters`} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={() => { dragRef.current = null; }} onWheel={onWheel} />
          <div className="constellation-legend" aria-hidden="true">
            {(Object.keys(RELATIONSHIP_LABELS) as RelationshipKind[]).map((kind) => <span key={kind} data-kind={kind}>{RELATIONSHIP_LABELS[kind]}</span>)}
          </div>
        </div>

        <section className="constellation-directory" aria-label="Browse constellation stars">
          <NesText variant="primary" className="text-xs">Browse stars</NesText>
          <ul className="constellation-results">
            {searchResults.map((node) => (
              <li key={node.id}>
                <NesButton type="button" onClick={() => focusNode(node)}>{node.name} — {node.gameTitle}</NesButton>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <aside className="constellation-panel" aria-live="polite">
        {selected ? (
          <Surface title={selected.name} dark rounded>
            <div className="stack">
              <div className="row-between">
                <NesText variant="primary">{selected.gameTitle}</NesText>
                <NesButton aria-label="Close character details" title="Close" onClick={() => setSelectedId(null)}>×</NesButton>
              </div>
              {selected.portraitUrl || selected.coverUrl ? <img className="constellation-portrait" src={selected.portraitUrl ?? selected.coverUrl ?? undefined} alt={selected.portraitUrl ? `${selected.name} portrait` : `${selected.gameTitle} cover art`} /> : null}
              <NesText className="text-xs">{selected.identity}</NesText>
              {selected.releaseYear ? <NesText className="text-xs">Released {selected.releaseYear}</NesText> : null}
              {selected.normalizedIdentityTags.length > 0 ? <NesText className="text-xs">Identity paths: {selected.normalizedIdentityTags.join(", ")}</NesText> : null}
              {selected.narrativeTropes.length > 0 ? <NesText className="text-xs">Tropes: {selected.narrativeTropes.join(", ")}</NesText> : null}
              <Link to="/games/$slug" params={{ slug: selected.gameSlug }}>View game</Link>
              {selected.sourceUrl ? <a href={selected.sourceUrl} target="_blank" rel="noreferrer noopener">Character source</a> : null}
              {connections.length > 0 ? (
                <div className="stack">
                  <NesText variant="warning" className="text-xs">Connected stars</NesText>
                  <ul className="constellation-connections">
                    {connections.slice(0, 24).map(({ edge, node }) => node ? (
                      <li key={edge.id}>
                        <NesButton type="button" onClick={() => focusNode(node)}>{node.name}<span>{RELATIONSHIP_LABELS[edge.kind]}: {edge.label}</span></NesButton>
                      </li>
                    ) : null)}
                  </ul>
                </div>
              ) : null}
            </div>
          </Surface>
        ) : (
          <Surface title="Choose a star" dark rounded>
            <NesText className="text-xs">Select a star to see its character, game, source, and neighboring paths.</NesText>
          </Surface>
        )}
      </aside>
    </div>
  );
}
