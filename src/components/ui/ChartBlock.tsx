import { useEffect, useState, Suspense, useMemo } from "react";
import { X } from "lucide-react";
import type { ContentBlock } from "@/types";
import { useScrollLock } from "@/lib/useScrollLock";

// Recharts is heavy (~300KB). Lazy-load it so a page that doesn't use charts
// doesn't pay the cost. The fallback shows a placeholder the same size as the
// chart so the layout doesn't shift when the real chart mounts.
type ChartBlock = Extract<ContentBlock, { type: "chart" }>;

const PALETTE = ["#b8c3ff", "#47e175", "#4969ed", "#fde68a", "#f87171", "#a78bfa", "#fb923c"];
const GRID_STROKE = "#2a3340";
const AXIS_STROKE = "#8a96a8";
const TICK_STYLE = { fill: AXIS_STROKE, fontSize: 12, fontFamily: "DM Sans, sans-serif" };
const TOOLTIP_STYLE = {
  backgroundColor: "#151b23",
  border: "1px solid #2a3340",
  borderRadius: 8,
  fontFamily: "DM Sans, sans-serif",
  fontSize: 12,
};
const LEGEND_STYLE = { fontSize: 12, fontFamily: "DM Sans, sans-serif", color: AXIS_STROKE };

const FALLBACK = (
  <div
    className="my-xxl h-80 rounded-lg border border-border-default bg-surface-container-low flex items-center justify-center font-dm-sans text-sm text-on-surface-muted"
    aria-label="Loading chart"
  >
    Loading chart…
  </div>
);

// Chart-family root kinds. Exactly one of these must appear in block.nodes.
const CHART_FAMILY_KINDS = [
  "lineChart",
  "areaChart",
  "barChart",
  "scatterChart",
  "pieChart",
  "radialBarChart",
] as const;

type ChartFamilyKind = (typeof CHART_FAMILY_KINDS)[number];

function findChartFamily(nodes: ChartBlock["nodes"]): ChartFamilyKind | null {
  for (const n of nodes) {
    if ((CHART_FAMILY_KINDS as readonly string[]).includes(n.kind)) {
      return n.kind as ChartFamilyKind;
    }
  }
  return null;
}

// Merge multiple series' {x, y} data into a single row-per-x dataset. Used as
// the `data` prop for cartesian chart roots (lineChart, areaChart, barChart).
// The x column is keyed as "__x" to avoid collision with series names that
// happen to be "x" or "y" : Recharts needs both the x coordinate and the
// per-series y value as distinct keys on each row.
const X_COL = "__x";

function mergeSeriesData(
  seriesNodes: Extract<import("@/types").ChartNode, { kind: "series" }>[],
): Record<string, number | null>[] {
  const xs = Array.from(new Set(seriesNodes.flatMap((s) => s.data.map((d) => d.x)))).sort(
    (a, b) => a - b,
  );
  return xs.map((x) => {
    const row: Record<string, number | null> = { [X_COL]: x };
    for (const s of seriesNodes) {
      const point = s.data.find((d) => d.x === x);
      row[s.name] = point ? point.y : null;
    }
    return row;
  });
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

  // Freeze page scroll behind the zoom overlay
  useScrollLock(zoomed);

  // Esc to close the zoom overlay
  useEffect(() => {
    if (!zoomed) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoomed(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [zoomed]);

  // Pre-compute the cartesian data once for the family roots that need it.
  // MUST run before the early return : hook order must stay stable across renders.
  const mergedData = useMemo(() => {
    const family = findChartFamily(block.nodes);
    if (
      family !== "lineChart" &&
      family !== "areaChart" &&
      family !== "barChart"
    ) {
      return null;
    }
    // If the root supplies its own data, use it; otherwise merge from series
    const root = block.nodes.find(
      (n) => (CHART_FAMILY_KINDS as readonly string[]).includes(n.kind) && n.kind !== "scatterChart",
    );
    if (root && "data" in root && root.data) return root.data;
    const seriesNodes = block.nodes.filter(
      (n): n is Extract<import("@/types").ChartNode, { kind: "series" }> => n.kind === "series",
    );
    return mergeSeriesData(seriesNodes);
  }, [block.nodes]);

  if (!Recharts) return FALLBACK;

  return (
    <ChartLoaded
      block={block}
      Recharts={Recharts}
      zoomed={zoomed}
      setZoomed={setZoomed}
      mergedData={mergedData}
    />
  );
}

function ChartLoaded({
  block,
  Recharts,
  zoomed,
  setZoomed,
  mergedData,
}: {
  block: ChartBlock;
  Recharts: typeof import("recharts");
  zoomed: boolean;
  setZoomed: (v: boolean) => void;
  mergedData: Record<string, number | null>[] | { x: number; y: number | null }[] | null;
}) {
  const family = findChartFamily(block.nodes);

  // Render the cartesian chart body (lineChart, areaChart, barChart, scatterChart)
  function buildCartesianBody(fam: ChartFamilyKind) {
    const {
      LineChart,
      AreaChart,
      BarChart,
      ScatterChart,
      Line,
      Area,
      Bar,
      Scatter,
      XAxis,
      YAxis,
      CartesianGrid,
      Tooltip,
      Legend,
      ReferenceDot,
      ReferenceLine,
      ReferenceArea,
    } = Recharts;

    // Find all node groups once
    const xAxes = block.nodes.filter(
      (n): n is Extract<import("@/types").ChartNode, { kind: "xAxis" }> => n.kind === "xAxis",
    );
    const yAxes = block.nodes.filter(
      (n): n is Extract<import("@/types").ChartNode, { kind: "yAxis" }> => n.kind === "yAxis",
    );
    const seriesNodes = block.nodes.filter(
      (n): n is Extract<import("@/types").ChartNode, { kind: "series" }> => n.kind === "series",
    );
    const annotations = block.nodes.filter(
      (n): n is Extract<import("@/types").ChartNode, { kind: "annotation" }> =>
        n.kind === "annotation",
    );
    const refLines = block.nodes.filter(
      (n): n is Extract<import("@/types").ChartNode, { kind: "referenceLine" }> =>
        n.kind === "referenceLine",
    );
    const bands = block.nodes.filter(
      (n): n is Extract<import("@/types").ChartNode, { kind: "band" }> => n.kind === "band",
    );
    const trendLines = block.nodes.filter(
      (n): n is Extract<import("@/types").ChartNode, { kind: "trendLine" }> =>
        n.kind === "trendLine",
    );
    const grids = block.nodes.filter(
      (n): n is Extract<import("@/types").ChartNode, { kind: "grid" }> => n.kind === "grid",
    );
    const tooltips = block.nodes.filter(
      (n): n is Extract<import("@/types").ChartNode, { kind: "tooltip" }> => n.kind === "tooltip",
    );
    const legends = block.nodes.filter(
      (n): n is Extract<import("@/types").ChartNode, { kind: "legend" }> => n.kind === "legend",
    );

    const rootNode = block.nodes.find((n) => (CHART_FAMILY_KINDS as readonly string[]).includes(n.kind));
    const smooth = rootNode && "smooth" in rootNode ? rootNode.smooth === true : false;

    const tooltipEnabled = tooltips.length === 0 ? true : (tooltips[0].enabled ?? true);
    const legendEnabled = legends.length === 0 ? seriesNodes.length > 1 : (legends[0].enabled ?? true);

    const margin = { top: 16, right: 24, bottom: 16, left: 8 };

    const axesAndChrome = (
      <>
        {grids.length > 0 ? (
          <CartesianGrid
            stroke={grids[0].stroke ?? GRID_STROKE}
            strokeDasharray={grids[0].strokeDasharray ?? "3 3"}
          />
        ) : null}
        {xAxes.map((a, i) => (
          <XAxis
            key={`x-${i}`}
            dataKey={i === 0 ? X_COL : undefined}
            type="number"
            stroke={AXIS_STROKE}
            tick={TICK_STYLE}
            tickLine={{ stroke: AXIS_STROKE }}
            axisLine={{ stroke: AXIS_STROKE }}
            scale={a.scale ?? "linear"}
            domain={a.min !== undefined && a.max !== undefined ? [a.min, a.max] : ["auto", "auto"]}
            tickCount={a.tickCount}
            allowDuplicatedCategory={false}
            orientation={a.side === "top" ? "top" : "bottom"}
            label={
              a.label
                ? {
                    value: a.label,
                    position: a.side === "top" ? "insideTop" : "insideBottom",
                    offset: -5,
                    fill: AXIS_STROKE,
                    fontSize: 12,
                  }
                : undefined
            }
          />
        ))}
        {yAxes.length > 0 ? (
          yAxes.map((a, i) => (
            <YAxis
              key={`y-${i}`}
              dataKey={i === 0 ? undefined : undefined}
              type="number"
              stroke={AXIS_STROKE}
              tick={TICK_STYLE}
              tickLine={{ stroke: AXIS_STROKE }}
              axisLine={{ stroke: AXIS_STROKE }}
              scale={a.scale ?? "linear"}
              domain={a.min !== undefined && a.max !== undefined ? [a.min, a.max] : ["auto", "auto"]}
              tickCount={a.tickCount}
              yAxisId={a.yAxisId}
              orientation={a.side === "right" ? "right" : "left"}
              label={
                a.label
                  ? {
                      value: a.label,
                      position: a.side === "right" ? "insideRight" : "insideLeft",
                      offset: 10,
                      fill: AXIS_STROKE,
                      fontSize: 12,
                      angle: -90,
                    }
                  : undefined
              }
            />
          ))
        ) : (
          <YAxis
            type="number"
            stroke={AXIS_STROKE}
            tick={TICK_STYLE}
            tickLine={{ stroke: AXIS_STROKE }}
            axisLine={{ stroke: AXIS_STROKE }}
          />
        )}
        {tooltipEnabled && (
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            labelStyle={{ color: "#b8c3ff" }}
            itemStyle={{ color: "#e5e7eb" }}
            cursor={{ stroke: "#47e175", strokeWidth: 1, strokeDasharray: "3 3" }}
          />
        )}
        {legendEnabled && seriesNodes.length > 1 && <Legend wrapperStyle={LEGEND_STYLE} />}
      </>
    );

    const seriesChildren = (() => {
      if (fam === "lineChart") {
        return seriesNodes.map((s, i) => (
          <Line
            key={s.name}
            type={smooth ? "monotone" : "linear"}
            dataKey={s.name}
            name={s.name}
            stroke={s.color ?? PALETTE[i % PALETTE.length]}
            strokeWidth={s.strokeWidth ?? 2.5}
            dot={s.pointMarkers ?? false}
            activeDot={{ r: 5, strokeWidth: 0, fill: s.color ?? PALETTE[i % PALETTE.length] }}
            connectNulls
            isAnimationActive={false}
            yAxisId={s.yAxisId}
          />
        ));
      }
      if (fam === "areaChart") {
        return seriesNodes.map((s, i) => {
          const color = s.color ?? PALETTE[i % PALETTE.length];
          return (
            <Area
              key={s.name}
              type={smooth ? "monotone" : "linear"}
              dataKey={s.name}
              name={s.name}
              stroke={color}
              strokeWidth={s.strokeWidth ?? 2}
              fill={color}
              fillOpacity={s.fillOpacity ?? 0.25}
              connectNulls
              isAnimationActive={false}
              yAxisId={s.yAxisId}
            />
          );
        });
      }
      if (fam === "barChart") {
        return seriesNodes.map((s, i) => (
          <Bar
            key={s.name}
            dataKey={s.name}
            name={s.name}
            fill={s.color ?? PALETTE[i % PALETTE.length]}
            isAnimationActive={false}
            yAxisId={s.yAxisId}
          />
        ));
      }
      // scatterChart : each series carries its own {x, y} data directly
      return seriesNodes.map((s, i) => (
        <Scatter
          key={s.name}
          data={s.data}
          name={s.name}
          fill={s.color ?? PALETTE[i % PALETTE.length]}
          isAnimationActive={false}
        />
      ));
    })();

    const annotationsRendered = annotations.map((a, i) => (
      <ReferenceDot
        key={`ann-${i}`}
        x={a.x}
        y={a.y}
        r={5}
        fill={a.color ?? "#fde68a"}
        stroke="#0a0e14"
        strokeWidth={2}
        isFront
        label={(props: { viewBox?: { x: number; y: number } }) => {
          const vb = props.viewBox;
          if (!vb) return <g />;
          return (
            <text
              x={vb.x + 8}
              y={vb.y - 8}
              fill={a.color ?? "#fde68a"}
              fontSize={11}
              fontFamily="DM Sans, sans-serif"
              fontWeight={600}
            >
              {a.label}
            </text>
          );
        }}
      />
    ));

    const refLinesRendered = [
      ...refLines.map((rl, i) => (
        <ReferenceLine
          key={`ref-${i}`}
          {...(rl.orientation === "horizontal" ? { y: rl.value } : { x: rl.value })}
          stroke={rl.color ?? "#8a96a8"}
          strokeDasharray={rl.strokeDasharray ?? "4 4"}
          label={
            rl.label
              ? { value: rl.label, fill: rl.color ?? "#8a96a8", fontSize: 11, position: "insideTopRight" }
              : undefined
          }
        />
      )),
      ...trendLines.map((tl, i) => (
        <ReferenceLine
          key={`trend-${i}`}
          segment={[
            { x: tl.from.x, y: tl.from.y },
            { x: tl.to.x, y: tl.to.y },
          ]}
          stroke={tl.color ?? "#8a96a8"}
          strokeDasharray={tl.strokeDasharray ?? "6 3"}
          label={
            tl.label
              ? { value: tl.label, fill: tl.color ?? "#8a96a8", fontSize: 11, position: "insideTopRight" }
              : undefined
          }
        />
      )),
    ];

    const bandsRendered = bands.map((b, i) => (
      <ReferenceArea
        key={`band-${i}`}
        {...(b.orientation === "horizontal"
          ? { y1: b.from, y2: b.to }
          : { x1: b.from, x2: b.to })}
        fill={b.color ?? "#47e175"}
        fillOpacity={b.opacity ?? 0.1}
        stroke="none"
        label={
          b.label
            ? { value: b.label, fill: b.color ?? "#47e175", fontSize: 11, position: "insideTopLeft" }
            : undefined
        }
      />
    ));

    const chartShell = (children: React.ReactNode) => (
      <>
        {axesAndChrome}
        {children}
        {bandsRendered}
        {annotationsRendered}
        {refLinesRendered}
      </>
    );

    if (fam === "lineChart") {
      return (
        <LineChart data={mergedData as Record<string, number | null>[]} margin={margin}>
          {chartShell(seriesChildren)}
        </LineChart>
      );
    }
    if (fam === "areaChart") {
      return (
        <AreaChart data={mergedData as Record<string, number | null>[]} margin={margin}>
          {chartShell(seriesChildren)}
        </AreaChart>
      );
    }
    if (fam === "barChart") {
      return (
        <BarChart data={mergedData as Record<string, number | null>[]} margin={margin}>
          {chartShell(seriesChildren)}
        </BarChart>
      );
    }
    // scatterChart
    return (
      <ScatterChart margin={margin}>
        {axesAndChrome}
        {seriesChildren}
        {bandsRendered}
        {annotationsRendered}
        {refLinesRendered}
      </ScatterChart>
    );
  }

  function buildPieBody(fam: "pieChart" | "radialBarChart") {
    const { PieChart, RadialBarChart, Pie, RadialBar, Cell, Tooltip, Legend } = Recharts;

    const cats = block.nodes
      .filter(
        (n): n is Extract<import("@/types").ChartNode, { kind: "category" }> => n.kind === "category",
      )
      .map((c, i) => ({
        name: c.name,
        value: c.value,
        color: c.color ?? PALETTE[i % PALETTE.length],
      }));

    const tooltips = block.nodes.filter(
      (n): n is Extract<import("@/types").ChartNode, { kind: "tooltip" }> => n.kind === "tooltip",
    );
    const legends = block.nodes.filter(
      (n): n is Extract<import("@/types").ChartNode, { kind: "legend" }> => n.kind === "legend",
    );
    const tooltipEnabled = tooltips.length === 0 ? true : (tooltips[0].enabled ?? true);
    const legendEnabled = legends.length === 0 ? true : (legends[0].enabled ?? true);

    if (fam === "pieChart") {
      return (
        <PieChart margin={{ top: 16, right: 16, bottom: 16, left: 16 }}>
          {tooltipEnabled && (
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              labelStyle={{ color: "#b8c3ff" }}
              itemStyle={{ color: "#e5e7eb" }}
            />
          )}
          {legendEnabled && <Legend wrapperStyle={LEGEND_STYLE} />}
          <Pie
            data={cats}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius="50%"
            outerRadius="80%"
            paddingAngle={2}
            stroke="#0a0e14"
            strokeWidth={2}
            isAnimationActive={false}
            label={(slice: { name?: string; percent?: number }) =>
              `${slice.name ?? ""} ${((slice.percent ?? 0) * 100).toFixed(0)}%`
            }
            labelLine={false}
          >
            {cats.map((c) => (
              <Cell key={c.name} fill={c.color} />
            ))}
          </Pie>
        </PieChart>
      );
    }

    return (
      <RadialBarChart
        cx="50%"
        cy="50%"
        innerRadius="20%"
        outerRadius="90%"
        barSize={14}
        data={cats}
        margin={{ top: 16, right: 16, bottom: 16, left: 16 }}
      >
        {tooltipEnabled && (
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            labelStyle={{ color: "#b8c3ff" }}
            itemStyle={{ color: "#e5e7eb" }}
          />
        )}
        {legendEnabled && <Legend wrapperStyle={LEGEND_STYLE} iconSize={10} />}
        <RadialBar
          dataKey="value"
          background={{ fill: "#1a2230" }}
          cornerRadius={6}
          isAnimationActive={false}
        >
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
        <div className="rounded-lg border border-red-500/30 bg-red-950/20 p-md font-dm-sans text-sm text-red-300">
          Chart block has no chart-family root node. Add one of: lineChart,
          areaChart, barChart, scatterChart, pieChart, radialBarChart.
        </div>
      </figure>
    );
  }

  const chartBody =
    family === "pieChart" || family === "radialBarChart"
      ? buildPieBody(family)
      : buildCartesianBody(family);

  const chartSurface = (
    <div className="h-72 w-full">
      <Recharts.ResponsiveContainer width="100%" height="100%">
        {chartBody}
      </Recharts.ResponsiveContainer>
    </div>
  );

  const figcaption = block.caption && (
    <figcaption className="mt-md font-dm-sans text-sm text-on-surface-muted italic text-center">
      {block.caption}
    </figcaption>
  );

  return (
    <figure className="my-xxl">
      <div
        className="rounded-lg border border-border-default bg-surface-container-low p-md cursor-zoom-in hover:border-primary/50 transition-colors"
        onClick={() => setZoomed(true)}
        title="Click to expand"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setZoomed(true);
          }
        }}
      >
        {block.title && (
          <p className="font-sora text-sm text-on-surface-muted text-center mb-sm">{block.title}</p>
        )}
        {chartSurface}
      </div>
      {figcaption}

      {zoomed && (
        <div
          className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-xl cursor-zoom-out"
          onClick={() => setZoomed(false)}
          role="dialog"
          aria-modal="true"
          aria-label={block.title ?? "Chart"}
        >
          <button
            type="button"
            aria-label="Close"
            className="absolute top-md right-md inline-flex items-center justify-center w-9 h-9 rounded-full bg-surface text-on-surface-muted hover:text-on-surface border border-border-default hover:border-primary/50 transition-colors z-10"
            onClick={(e) => {
              e.stopPropagation();
              setZoomed(false);
            }}
          >
            <X size={18} strokeWidth={2} />
          </button>
          <div
            className="w-[90vw] h-[85vh] flex flex-col bg-surface-container-low rounded-lg border border-border-default p-lg"
            onClick={(e) => e.stopPropagation()}
          >
            {block.title && (
              <p className="font-sora text-base text-on-surface mb-md text-center">{block.title}</p>
            )}
            <div className="flex-1 min-h-0">
              <Recharts.ResponsiveContainer width="100%" height="100%">
                {chartBody}
              </Recharts.ResponsiveContainer>
            </div>
            {figcaption}
          </div>
        </div>
      )}
    </figure>
  );
}

export default function ChartBlock(props: { block: ChartBlock }) {
  return <Suspense fallback={FALLBACK}><ChartBlockImpl {...props} /></Suspense>;
}