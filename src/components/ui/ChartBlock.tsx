import { useEffect, useState, Suspense, useMemo } from "react";
import { X } from "lucide-react";
import { useScrollLock } from "@/lib/useScrollLock";
import type { ContentBlock } from "@/types";
import type { ChartNode } from "@/types";
import Tooltip from "@/components/ui/Tooltip";

type ChartBlock = Extract<ContentBlock, { type: "chart" }>;

const PALETTE = ["#b8c3ff", "#47e175", "#4969ed", "#fde68a", "#f87171", "#a78bfa", "#fb923c"];
const GRID_STROKE = "#2a3340";
const AXIS_STROKE = "#8a96a8";
const TICK_STYLE = { fill: AXIS_STROKE, fontSize: 12, fontFamily: "DM Sans, sans-serif" };
const TOOLTIP_STYLE = { backgroundColor: "#181c22", border: "1px solid #2a3340", borderRadius: "8px", color: "#e5e7eb" };
const LEGEND_STYLE = { fontSize: 12, fontFamily: "DM Sans, sans-serif", color: AXIS_STROKE };

const CHART_FAMILY_KINDS = ["lineChart", "areaChart", "barChart", "scatterChart", "pieChart", "radialBarChart"] as const;
type ChartFamilyKind = (typeof CHART_FAMILY_KINDS)[number];

function findChartFamily(nodes: ChartBlock["nodes"]): ChartFamilyKind | null {
  for (const n of nodes) if ((CHART_FAMILY_KINDS as readonly string[]).includes(n.kind)) return n.kind as ChartFamilyKind;
  return null;
}

const X_COL = "__x";

function mergeSeriesData(seriesNodes: Extract<ChartNode, { kind: "series" }>[]): Record<string, number | null>[] {
  const xMap = new Map<number, Record<string, number | null>>();
  for (const s of seriesNodes) {
    for (const pt of s.data) {
      if (!xMap.has(pt.x)) xMap.set(pt.x, { [X_COL]: pt.x });
      xMap.get(pt.x)![s.name] = pt.y;
    }
  }
  return Array.from(xMap.values()).sort((a, b) => (a[X_COL] as number) - (b[X_COL] as number));
}

function ChartBlockImpl({ block }: { block: ChartBlock }) {
  const [Recharts, setRecharts] = useState<typeof import("recharts") | null>(null);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    import("recharts").then((mod) => {
      if (!cancelled) setRecharts(mod);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useScrollLock(zoomed);

  useEffect(() => {
    if (!zoomed) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoomed(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [zoomed]);

  const mergedData = useMemo(() => {
    const family = findChartFamily(block.nodes);
    if (family !== "lineChart" && family !== "areaChart" && family !== "barChart") return null;
    const root = block.nodes.find((n) => (CHART_FAMILY_KINDS as readonly string[]).includes(n.kind) && n.kind !== "scatterChart");
    if (root && "data" in root && (root as { data?: unknown }).data) return (root as { data: unknown }).data as ChartBlock["nodes"];
    const seriesNodes = block.nodes.filter((n): n is Extract<ChartNode, { kind: "series" }> => n.kind === "series");
    return mergeSeriesData(seriesNodes);
  }, [block.nodes]);

  if (!Recharts) {
    return <div className="h-72 w-full animate-pulse bg-surface-container-low rounded-lg border border-border-default" />;
  }

  return <ChartLoaded block={block} Recharts={Recharts} zoomed={zoomed} setZoomed={setZoomed} mergedData={mergedData} />;
}

function ChartLoaded({ block, Recharts, zoomed, setZoomed, mergedData }: { block: ChartBlock; Recharts: typeof import("recharts"); zoomed: boolean; setZoomed: (v: boolean) => void; mergedData: Record<string, number | null>[] | { x: number; y: number | null }[] | null }) {
  const family = findChartFamily(block.nodes);

  function buildCartesianBody(fam: ChartFamilyKind) {
    const { LineChart, AreaChart, BarChart, ScatterChart, Line, Area, Bar, XAxis, YAxis, CartesianGrid, ReferenceDot, ReferenceLine, ReferenceArea } = Recharts;

    const xAxes = block.nodes.filter((n): n is Extract<ChartNode, { kind: "xAxis" }> => n.kind === "xAxis");
    const yAxes = block.nodes.filter((n): n is Extract<ChartNode, { kind: "yAxis" }> => n.kind === "yAxis");
    const seriesNodes = block.nodes.filter((n): n is Extract<ChartNode, { kind: "series" }> => n.kind === "series");
    const annotations = block.nodes.filter((n): n is Extract<ChartNode, { kind: "annotation" }> => n.kind === "annotation");
    const refLines = block.nodes.filter((n): n is Extract<ChartNode, { kind: "referenceLine" }> => n.kind === "referenceLine");
    const bands = block.nodes.filter((n): n is Extract<ChartNode, { kind: "band" }> => n.kind === "band");
    const trendLines = block.nodes.filter((n): n is Extract<ChartNode, { kind: "trendLine" }> => n.kind === "trendLine");
    const grids = block.nodes.filter((n): n is Extract<ChartNode, { kind: "grid" }> => n.kind === "grid");

    const rootNode = block.nodes.find((n) => (CHART_FAMILY_KINDS as readonly string[]).includes(n.kind));
    const smooth = rootNode && "smooth" in rootNode ? (rootNode as { smooth?: boolean }).smooth === true : false;
    const margin = { top: 16, right: 24, bottom: 16, left: 8 };

    // On a numeric x axis, bars sit centered on their x value, so the first and
    // last bars hang half a bar past the plot. Pad the domain by half the
    // smallest x gap (half a category band) so the end bars stay fully visible.
    const xNumbers = (mergedData ?? [])
      .map((row) => (row && typeof row === "object" && X_COL in row ? row[X_COL] : undefined))
      .filter((v): v is number => typeof v === "number")
      .sort((a, b) => a - b);
    let xPad: number | undefined;
    for (let i = 1; i < xNumbers.length; i++) {
      const gap = xNumbers[i] - xNumbers[i - 1];
      if (gap > 0 && (xPad === undefined || gap < xPad)) xPad = gap;
    }
    if (xPad !== undefined) xPad /= 2;

    const axesAndChrome = (
      <>
        {grids.length > 0 ? <CartesianGrid stroke={(grids[0] as { stroke?: string }).stroke ?? GRID_STROKE} strokeDasharray={(grids[0] as { strokeDasharray?: string }).strokeDasharray ?? "3 3"} /> : null}
        {xAxes.map((a, i) => (
          <XAxis key={`x-${i}`} dataKey={i === 0 ? X_COL : undefined} type="number" stroke={AXIS_STROKE} tick={TICK_STYLE} tickLine={{ stroke: AXIS_STROKE }} axisLine={{ stroke: AXIS_STROKE }} scale={a.scale ?? "linear"} domain={a.min !== undefined && a.max !== undefined ? [a.min, a.max] : fam === "barChart" && xPad !== undefined ? [(min: number) => min - xPad, (max: number) => max + xPad] : ["auto", "auto"]} tickCount={a.tickCount} allowDuplicatedCategory={false} orientation={a.side === "top" ? "top" : "bottom"} label={a.label ? { value: a.label, position: a.side === "top" ? "insideTop" : "insideBottom", offset: -5, fill: AXIS_STROKE, fontSize: 12 } : undefined} />
        ))}
        {yAxes.map((a, i) => (
          <YAxis key={`y-${i}`} dataKey={i === 0 && seriesNodes[0]?.name ? seriesNodes[0].name : undefined} stroke={AXIS_STROKE} tick={TICK_STYLE} tickLine={{ stroke: AXIS_STROKE }} axisLine={{ stroke: AXIS_STROKE }} scale={a.scale ?? "linear"} domain={a.min !== undefined && a.max !== undefined ? [a.min, a.max] : ["auto", "auto"]} tickCount={a.tickCount} orientation={a.side === "left" || a.side === "right" ? (a.side as "left" | "right") : undefined} label={a.label ? { value: a.label, angle: -90, position: "insideLeft", fill: AXIS_STROKE, fontSize: 12 } : undefined} />
        ))}
      </>
    );

    const annotationsRendered = annotations.map((a, i) => <ReferenceDot key={`ann-${i}`} x={a.x} y={a.y} r={4} fill={a.color ?? "#b8c3ff"} label={{ value: a.label ?? "", fill: a.color ?? "#b8c3ff", fontSize: 11, position: "top" }} />);
    const refLinesRendered = [
      ...refLines.map((rl, i) => <ReferenceLine key={`rl-${i}`} {...((rl.orientation === "horizontal" ? { y: (rl as { value: number }).value } : { x: (rl as { value: number }).value }) as object)} stroke={(rl as { color?: string }).color ?? "#8a96a8"} strokeDasharray={(rl as { strokeDasharray?: string }).strokeDasharray ?? "4 4"} label={(rl as { label?: string }).label ? { value: (rl as { label?: string }).label, fill: (rl as { color?: string }).color ?? "#8a96a8", fontSize: 11, position: "insideTopRight" } : undefined} />),
      ...trendLines.map((tl, i) => <ReferenceLine key={`trend-${i}`} segment={[{ x: (tl as { from: { x: number; y: number } }).from.x, y: (tl as { from: { x: number; y: number } }).from.y }, { x: (tl as { to: { x: number; y: number } }).to.x, y: (tl as { to: { x: number; y: number } }).to.y }]} stroke={(tl as { color?: string }).color ?? "#8a96a8"} strokeDasharray={(tl as { strokeDasharray?: string }).strokeDasharray ?? "6 3"} label={(tl as { label?: string }).label ? { value: (tl as { label?: string }).label, fill: (tl as { color?: string }).color ?? "#8a96a8", fontSize: 11, position: "insideTopRight" } : undefined} />),
    ];
    const bandsRendered = bands.map((b, i) => <ReferenceArea key={`band-${i}`} {...(((b as { orientation: string }).orientation === "horizontal" ? { y1: (b as { from: number }).from, y2: (b as { to: number }).to } : { x1: (b as { from: number }).from, x2: (b as { to: number }).to }) as object)} fill={(b as { color?: string }).color ?? "#47e175"} fillOpacity={(b as { opacity?: number }).opacity ?? 0.1} stroke="none" label={(b as { label?: string }).label ? { value: (b as { label?: string }).label, fill: (b as { color?: string }).color ?? "#47e175", fontSize: 11, position: "insideTopLeft" } : undefined} />);

    const chartShell = (children: React.ReactNode) => (
      <>
        {axesAndChrome}
        {children}
        {bandsRendered}
        {annotationsRendered}
        {refLinesRendered}
      </>
    );

    const seriesChildren = seriesNodes.map((s) => {
      const color = s.color ?? PALETTE[seriesNodes.indexOf(s) % PALETTE.length];
      const isBar = s.type === "bar" || fam === "barChart";
      const isArea = s.type === "area" || fam === "areaChart";
      if (isBar) return <Bar key={s.name} dataKey={s.name} fill={color} stroke={color} isAnimationActive={false} />;
      if (isArea) return <Area key={s.name} dataKey={s.name} type={smooth ? "monotone" : "linear"} fill={color} stroke={color} fillOpacity={s.fillOpacity ?? 0.15} isAnimationActive={false} dot={s.pointMarkers ?? false} strokeWidth={s.strokeWidth ?? 2} />;
      return <Line key={s.name} dataKey={s.name} type={smooth ? "monotone" : "linear"} stroke={color} strokeWidth={s.strokeWidth ?? 2} dot={s.pointMarkers ?? false} isAnimationActive={false} />;
    });

    if (fam === "lineChart") return <LineChart data={mergedData as Record<string, number | null>[]} margin={margin}>{chartShell(seriesChildren)}</LineChart>;
    if (fam === "areaChart") return <AreaChart data={mergedData as Record<string, number | null>[]} margin={margin}>{chartShell(seriesChildren)}</AreaChart>;
    if (fam === "barChart") return <BarChart data={mergedData as Record<string, number | null>[]} margin={margin}>{chartShell(seriesChildren)}</BarChart>;
    return <ScatterChart margin={margin}>{axesAndChrome}{seriesChildren}{bandsRendered}{annotationsRendered}{refLinesRendered}</ScatterChart>;
  }

  function buildPieBody(fam: "pieChart" | "radialBarChart") {
    const { PieChart, RadialBarChart, Pie, RadialBar, Cell, Tooltip, Legend } = Recharts;
    const cats = block.nodes
      .filter((n): n is Extract<ChartNode, { kind: "category" }> => n.kind === "category")
      .map((c, i) => ({ name: c.name, value: c.value, color: c.color ?? PALETTE[i % PALETTE.length] }));
    const tooltips = block.nodes.filter((n): n is Extract<ChartNode, { kind: "tooltip" }> => n.kind === "tooltip");
    const legends = block.nodes.filter((n): n is Extract<ChartNode, { kind: "legend" }> => n.kind === "legend");
    const tooltipEnabled = tooltips.length === 0 ? true : ((tooltips[0] as { enabled?: boolean }).enabled ?? true);
    const legendEnabled = legends.length === 0 ? true : ((legends[0] as { enabled?: boolean }).enabled ?? true);

    if (fam === "pieChart") {
      return (
        <PieChart margin={{ top: 16, right: 16, bottom: 16, left: 16 }}>
          {tooltipEnabled && <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: "#b8c3ff" }} itemStyle={{ color: "#e5e7eb" }} />}
          {legendEnabled && <Legend wrapperStyle={LEGEND_STYLE} />}
          <Pie data={cats} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius="50%" outerRadius="80%" paddingAngle={2} stroke="#0a0e14" strokeWidth={2} isAnimationActive={false} label={(slice: { name?: string; percent?: number }) => `${slice.name ?? ""} ${((slice.percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
            {cats.map((c) => (
              <Cell key={c.name} fill={c.color} />
            ))}
          </Pie>
        </PieChart>
      );
    }
    return (
      <RadialBarChart cx="50%" cy="50%" innerRadius="20%" outerRadius="90%" barSize={14} data={cats} margin={{ top: 16, right: 16, bottom: 16, left: 16 }}>
        {tooltipEnabled && <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: "#b8c3ff" }} itemStyle={{ color: "#e5e7eb" }} />}
        {legendEnabled && <Legend wrapperStyle={LEGEND_STYLE} iconSize={10} />}
        <RadialBar dataKey="value" background={{ fill: "#1a2230" }} cornerRadius={6} isAnimationActive={false}>
          {cats.map((c) => (
            <Cell key={c.name} fill={c.color} />
          ))}
        </RadialBar>
      </RadialBarChart>
    );
  }

  if (!family) {
    return (
      <figure className="my-xxl">
        <div className="rounded-lg border border-red-500/30 bg-red-950/20 p-md font-dm-sans text-sm text-red-300">Chart block has no chart-family root node. Add one of: lineChart, areaChart, barChart, scatterChart, pieChart, radialBarChart.</div>
      </figure>
    );
  }

  const chartBody = family === "pieChart" || family === "radialBarChart" ? buildPieBody(family) : buildCartesianBody(family);

  const chartSurface = (
    <div className="h-72 w-full">
      <Recharts.ResponsiveContainer width="100%" height="100%">{chartBody}</Recharts.ResponsiveContainer>
    </div>
  );

  const figcaption = block.caption && <figcaption className="mt-md font-dm-sans text-sm text-on-surface-muted italic text-center">{block.caption}</figcaption>;

  return (
    <figure className="my-xxl">
      <Tooltip label="Click to expand">
        <div className="rounded-lg border border-border-default bg-surface-container-low p-md cursor-zoom-in hover:border-primary/50 transition-colors" onClick={() => setZoomed(true)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setZoomed(true); }}}>
          {block.title && <p className="font-sora text-sm text-on-surface-muted text-center mb-sm">{block.title}</p>}
          {chartSurface}
        </div>
      </Tooltip>
      {figcaption}

      {zoomed && (
        <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex items-center justify-center cursor-zoom-out" onClick={() => setZoomed(false)} role="dialog" aria-modal="true" aria-label={block.title ?? "Chart"}>
          <button type="button" aria-label="Close" className="absolute top-4 right-4 inline-flex items-center justify-center w-10 h-10 rounded-full bg-surface text-on-surface-muted hover:text-on-surface border border-border-default hover:border-primary/50 transition-colors z-[110]" onClick={(e) => { e.stopPropagation(); setZoomed(false); }}>
            <X size={18} strokeWidth={2} />
          </button>
          <div className="w-screen h-screen flex items-center justify-center p-0" onClick={(e) => e.stopPropagation()}>
            <div className="w-full h-full flex flex-col p-4 md:p-8">
              {block.title && <p className="font-sora text-base text-on-surface mb-md text-center shrink-0">{block.title}</p>}
              <div className="flex-1 min-h-0 w-full">
                <Recharts.ResponsiveContainer width="100%" height="100%">{chartBody}</Recharts.ResponsiveContainer>
              </div>
              {figcaption && <div className="shrink-0 mt-sm text-center">{figcaption}</div>}
            </div>
          </div>
        </div>
      )}
    </figure>
  );
}

export default function ChartBlock(props: { block: ChartBlock }) {
  return (
    <Suspense fallback={<div className="h-72 w-full animate-pulse bg-surface-container-low rounded-lg border border-border-default" />}>
      <ChartBlockImpl {...props} />
    </Suspense>
  );
}
