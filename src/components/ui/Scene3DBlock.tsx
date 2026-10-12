import { useEffect, useRef, useState, Suspense, useMemo } from "react";
import type { SceneObject, SceneLight } from "@/types";
import { useScrollLock } from "@/lib/useScrollLock";

// Three.js + R3F are heavy (~600KB gzipped combined). Lazy-load so pages
// without 3D scenes don't pay the cost. Suspense fallback matches the
// loader's height so layout doesn't shift when the scene mounts.
type Scene3DBlock = Extract<import("@/types").ContentBlock, { type: "scene3d" }>;
type SceneMods = {
  THREE: typeof import("three");
  Canvas: typeof import("@react-three/fiber")["Canvas"];
  OrbitControls: typeof import("@react-three/drei")["OrbitControls"];
  Html: typeof import("@react-three/drei")["Html"];
};

const FALLBACK = (
  <div
    className="my-xxl h-96 rounded-lg border border-border-default bg-surface-container-low flex items-center justify-center font-dm-sans text-sm text-on-surface-muted"
    aria-label="Loading 3D scene"
  >
    Loading 3D scene…
  </div>
);

async function loadSceneModules(): Promise<SceneMods> {
  const [three, fiber, drei] = await Promise.all([
    import("three"),
    import("@react-three/fiber"),
    import("@react-three/drei"),
  ]);
  return {
    THREE: three,
    Canvas: fiber.Canvas,
    OrbitControls: drei.OrbitControls,
    Html: drei.Html,
  };
}

function SceneImpl({ block }: { block: Scene3DBlock }) {
  const [mods, setMods] = useState<SceneMods | null>(null);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadSceneModules().then((m) => {
      if (!cancelled) setMods(m);
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

  if (!mods) return FALLBACK;
  return <SceneLoaded block={block} mods={mods} zoomed={zoomed} setZoomed={setZoomed} />;
}

function SceneLoaded({
  block,
  mods,
  zoomed,
  setZoomed,
}: {
  block: Scene3DBlock;
  mods: SceneMods;
  zoomed: boolean;
  setZoomed: (v: boolean) => void;
}) {
  // Track pointerdown so we can distinguish a click from a drag.
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const DRAG_THRESHOLD_PX = 5;

  const cameraConfig = {
    position: block.camera?.position ?? ([6, 4, 8] as [number, number, number]),
    fov: block.camera?.fov ?? 45,
  };
  const canvasProps = { dpr: [1, 2] as [number, number] };

  const scene = (
    <SceneContents block={block} mods={mods} />
  );

  // Render the inline figure only when not zoomed, and the modal only when
  // zoomed. Render both at once would cause the Drei <Html> label portals
  // (axis labels, gradient label) to appear twice, since they're rendered
  // into the document body, not contained by the canvas.
  return (
    <figure className="my-xxl">
      {!zoomed && (
        <div
          className="rounded-lg border border-border-default bg-surface-container-low p-md cursor-zoom-in hover:border-primary/50 transition-colors select-none"
          onPointerDown={(e) => {
            dragStartRef.current = { x: e.clientX, y: e.clientY };
          }}
          onPointerUp={(e) => {
            const start = dragStartRef.current;
            dragStartRef.current = null;
            if (!start) return;
            const dx = e.clientX - start.x;
            const dy = e.clientY - start.y;
            if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) {
              setZoomed(true);
            }
          }}
          onPointerCancel={() => {
            dragStartRef.current = null;
          }}
          title="Click to expand · drag to rotate"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setZoomed(true);
            }
          }}
        >
          {block.caption && (
            <p className="font-sora text-sm text-on-surface-muted text-center mb-sm">{block.caption}</p>
          )}
          <div className="h-96 w-full">
            <mods.Canvas camera={cameraConfig} {...canvasProps}>
              {scene}
            </mods.Canvas>
          </div>
        </div>
      )}

      {zoomed && (
        <div
          className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-xl cursor-zoom-out"
          onClick={() => setZoomed(false)}
          role="dialog"
          aria-modal="true"
          aria-label={block.caption ?? "3D scene"}
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
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <div
            className="w-[90vw] h-[85vh] flex flex-col bg-surface-container-low rounded-lg border border-border-default p-lg select-none"
            onClick={(e) => e.stopPropagation()}
          >
            {block.caption && (
              <p className="font-sora text-base text-on-surface mb-md text-center">{block.caption}</p>
            )}
            <div className="flex-1 min-h-0">
              <mods.Canvas camera={cameraConfig} {...canvasProps}>
                {scene}
              </mods.Canvas>
            </div>
            {block.caption && (
              <p className="mt-md font-dm-sans text-sm text-on-surface-muted italic text-center">
                {block.caption}
              </p>
            )}
          </div>
        </div>
      )}
    </figure>
  );
}

// ── Scene rendering ─────────────────────────────────────────────────────
// SceneContents walks the block.objects tree and instantiates Three.js
// primitives for each node. Each SceneObject kind maps to a renderer
// function below. The renderer also handles lights and the floor disc.

function SceneContents({ block, mods }: { block: Scene3DBlock; mods: SceneMods }) {
  const { OrbitControls, Html, THREE } = mods;

  // Default lights if not provided: ambient + directional + hemisphere.
  const lights = block.lights ?? [
    { type: "ambient" as const, intensity: 0.7 },
    { type: "directional" as const, position: [5, 8, 5] as [number, number, number], intensity: 1.0 },
    { type: "hemisphere" as const, skyColor: "#4969ed", groundColor: "#0a0e14", intensity: 0.5 },
  ];

  return (
    <>
      {/* Lights */}
      {lights.map((light, i) => (
        <LightNode key={i} light={light} THREE={THREE} />
      ))}

      {/* Floor disc : always present for visual grounding */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <circleGeometry args={[5, 64]} />
        <meshStandardMaterial color="#0a0e14" />
      </mesh>

      {/* Objects */}
      {block.objects.map((obj, i) => (
        <ObjectNode key={i} obj={obj} mods={mods} />
      ))}

      <OrbitControls
        enablePan={false}
        minDistance={3}
        maxDistance={25}
        target={block.camera?.target ? [block.camera.target[0], block.camera.target[1], block.camera.target[2]] as [number, number, number] : [0, 0, 0]}
      />
    </>
  );
}

function LightNode({ light, THREE }: { light: SceneLight; THREE: SceneMods["THREE"] }) {
  if (light.type === "ambient") {
    return <ambientLight color={light.color} intensity={light.intensity ?? 1} />;
  }
  if (light.type === "directional") {
    return <directionalLight color={light.color} position={light.position} intensity={light.intensity ?? 1} />;
  }
  if (light.type === "point") {
    return <pointLight color={light.color} position={light.position} intensity={light.intensity ?? 1} distance={light.distance} />;
  }
  if (light.type === "hemisphere") {
    return <hemisphereLight color={light.skyColor} groundColor={light.groundColor} intensity={light.intensity ?? 1} />;
  }
  // spot
  return <spotLight color={light.color} position={light.position} target-position={light.target} intensity={light.intensity ?? 1} angle={light.angle} />;
}

function ObjectNode({ obj, mods }: { obj: SceneObject; mods: SceneMods }) {
  const { THREE } = mods;

  // Parametric surface: build a heightmap from the expression
  if (obj.kind === "surface") {
    return <SurfaceNode obj={obj} THREE={THREE} mods={mods} />;
  }
  if (obj.kind === "mesh") {
    return <MeshNode obj={obj} mods={mods} />;
  }
  if (obj.kind === "arrow") {
    return <ArrowNode obj={obj} mods={mods} />;
  }
  if (obj.kind === "point") {
    return <PointNode obj={obj} mods={mods} />;
  }
  if (obj.kind === "label") {
    return <LabelNode obj={obj} mods={mods} />;
  }
  // group
  return (
    <group position={obj.position} rotation={obj.rotation}>
      {obj.objects.map((child, i) => (
        <ObjectNode key={i} obj={child} mods={mods} />
      ))}
    </group>
  );
}

// Compile the surface expression: a JS function of (x, y) → height.
// Author-supplied code, but the only inputs are numeric x and y and the
// only output is a number : same trust level as markdown.
function compileSurfaceExpression(expr: string): (x: number, y: number) => number {
  // eslint-disable-next-line no-new-func
  return new Function("x", "y", `return (${expr});`) as (x: number, y: number) => number;
}

function SurfaceNode({ obj, THREE, mods }: { obj: Extract<SceneObject, { kind: "surface" }>; THREE: SceneMods["THREE"]; mods: SceneMods }) {
  const geometry = useMemo(() => {
    const segments = obj.segments ?? 48;
    const yScale = obj.yScale ?? 1;
    const yClip = obj.yClip ?? null;
    const grid = obj.grid ?? "square";
    const fn = compileSurfaceExpression(obj.expression);
    const positions: number[] = [];
    const indices: number[] = [];
    const [xMin, xMax] = obj.xRange;
    const [yMin, yMax] = obj.yRange;

    if (grid === "polar") {
      // Polar grid: sample at (r·cos θ, r·sin θ) for r ∈ [0, maxR], θ ∈ [0, 2π).
      // Produces a clean circular rim with no corner spikes : ideal for
      // radially-symmetric functions like f(x, y) = x² + y².
      // maxR is the larger of |xMin|, |xMax|, |yMin|, |yMax|.
      const maxR = Math.max(Math.abs(xMin), Math.abs(xMax), Math.abs(yMin), Math.abs(yMax));
      const radialSegments = segments;
      const angularSegments = Math.max(24, segments);
      for (let i = 0; i <= radialSegments; i++) {
        const r = (i / radialSegments) * maxR;
        for (let j = 0; j <= angularSegments; j++) {
          const theta = (j / angularSegments) * Math.PI * 2;
          const x = r * Math.cos(theta);
          const y = r * Math.sin(theta);
          let z = fn(x, y) * yScale;
          if (yClip !== null) z = Math.max(-yClip, Math.min(yClip, z));
          positions.push(x, z, y); // <x, up, y> in three.js coords
        }
      }
      for (let i = 0; i < radialSegments; i++) {
        for (let j = 0; j < angularSegments; j++) {
          const a = i * (angularSegments + 1) + j;
          const b = a + 1;
          const c = a + (angularSegments + 1);
          const d = c + 1;
          // Wind triangles so normals point UP (+y).
          indices.push(a, b, d, a, d, c);
        }
      }
    } else {
      // Square grid: cartesian lattice over [xMin, xMax] × [yMin, yMax].
      for (let i = 0; i <= segments; i++) {
        const y = yMin + (i / segments) * (yMax - yMin);
        for (let j = 0; j <= segments; j++) {
          const x = xMin + (j / segments) * (xMax - xMin);
          let z = fn(x, y) * yScale;
          if (yClip !== null) z = Math.max(-yClip, Math.min(yClip, z));
          positions.push(x, z, y);
        }
      }
      for (let i = 0; i < segments; i++) {
        for (let j = 0; j < segments; j++) {
          const a = i * (segments + 1) + j;
          const b = a + 1;
          const c = a + (segments + 1);
          const d = c + 1;
          // Wind triangles so normals point UP (+y).
          indices.push(a, b, d, a, d, c);
        }
      }
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geom.setIndex(indices);
    geom.computeVertexNormals();
    return geom;
  }, [obj.xRange, obj.yRange, obj.expression, obj.yScale, obj.yClip, obj.segments, obj.grid, THREE]);

  const baseColor = obj.color ?? "#3a4566";
  const wireframeColor = obj.wireframeColor ?? "#47e175";

  return (
    <group position={obj.position}>
      <mesh geometry={geometry} receiveShadow>
        <meshStandardMaterial
          color={baseColor}
          emissive="#1a2440"
          emissiveIntensity={0.5}
          metalness={0.1}
          roughness={0.8}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh geometry={geometry}>
        <meshBasicMaterial color={wireframeColor} wireframe transparent opacity={0.5} />
      </mesh>
    </group>
  );
}

function MeshNode({ obj, mods }: { obj: Extract<SceneObject, { kind: "mesh" }>; mods: SceneMods }) {
  const { THREE } = mods;
  const size = obj.size ?? 1;
  const sizeArr = Array.isArray(size) ? size : [size];

  // Pick the right geometry component
  const geom = (() => {
    switch (obj.geometry) {
      case "box": return <boxGeometry args={sizeArr as [number, number, number] ?? [1, 1, 1]} />;
      case "sphere": return <sphereGeometry args={[sizeArr[0] ?? 1, 32, 32]} />;
      case "torus": return <torusGeometry args={[sizeArr[0] ?? 1, sizeArr[1] ?? 0.3, 16, 64]} />;
      case "cylinder": return <cylinderGeometry args={[sizeArr[0] ?? 1, sizeArr[0] ?? 1, sizeArr[1] ?? 2, 32]} />;
      case "cone": return <coneGeometry args={[sizeArr[0] ?? 1, sizeArr[1] ?? 2, 32]} />;
      case "plane": return <planeGeometry args={[sizeArr[0] ?? 1, sizeArr[1] ?? 1]} />;
      case "circle": return <circleGeometry args={[sizeArr[0] ?? 1, 32]} />;
      case "ring": return <ringGeometry args={[sizeArr[0] ?? 0.5, sizeArr[1] ?? 1, 32]} />;
    }
  })();

  return (
    <mesh position={obj.position} rotation={obj.rotation}>
      {geom}
      <meshStandardMaterial
        color={obj.color ?? "#47e175"}
        wireframe={obj.wireframe}
        metalness={0.1}
        roughness={0.7}
      />
    </mesh>
  );
}

function ArrowNode({ obj, mods }: { obj: Extract<SceneObject, { kind: "arrow" }>; mods: SceneMods }) {
  const { THREE } = mods;
  const arrow = useMemo(() => {
    const from = new THREE.Vector3(...obj.from);
    const to = new THREE.Vector3(...obj.to);
    const dir = to.clone().sub(from);
    const length = dir.length();
    dir.normalize();
    const helper = new THREE.ArrowHelper(
      dir,
      from,
      length,
      new THREE.Color(obj.color ?? "#f87171"),
      obj.headLength ?? length * 0.2,
      obj.headWidth ?? length * 0.1,
    );
    return helper;
  }, [obj.from, obj.to, obj.color, obj.headLength, obj.headWidth, THREE]);

  return <primitive object={arrow} />;
}

function PointNode({ obj, mods }: { obj: Extract<SceneObject, { kind: "point" }>; mods: SceneMods }) {
  return (
    <mesh position={obj.position}>
      <sphereGeometry args={[obj.radius ?? 0.1, 16, 16]} />
      <meshBasicMaterial color={obj.color ?? "#f87171"} />
    </mesh>
  );
}

function LabelNode({ obj, mods }: { obj: Extract<SceneObject, { kind: "label" }>; mods: SceneMods }) {
  const { Html } = mods;
  return (
    <Html position={obj.position} center>
      <span
        className="font-sora text-[10px] font-semibold px-1.5 py-0.5 rounded whitespace-nowrap select-none"
        style={{
          width: "max-content",
          color: obj.color ?? "#b8c3ff",
          backgroundColor: obj.bg ?? "rgba(20, 25, 35, 0.8)",
          userSelect: "none",
          pointerEvents: "none",
        }}
      >
        {obj.text}
      </span>
    </Html>
  );
}

export default function Scene3DBlock(props: { block: Scene3DBlock }) {
  return (
    <Suspense fallback={FALLBACK}>
      <SceneImpl {...props} />
    </Suspense>
  );
}
