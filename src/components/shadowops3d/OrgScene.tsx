import { ContactShadows, Float, OrbitControls, Sky, SoftShadows } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  buildKnowledgeGraph,
  memoriesForEntity,
  nodeById,
  observedWorkflow,
  officialWorkflow,
  org3d,
  type EntityNode,
} from "@/lib/shadowops-3d";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

export type WorkflowViewMode = "official" | "observed" | "compare";

export interface SceneProps {
  selectedId: string | null;
  highlightId: string | null;
  workflowMode: WorkflowViewMode;
  view: "world" | "graph";
  paused: boolean;
  mode: "day" | "night";
  focusTarget: { id: string; nonce: number } | null;
  resetNonce: number;
  onSelect: (id: string | null) => void;
}

const KIND_COLOR: Record<string, string> = {
  episodic: "#6366F1",
  decision: "#5865F2",
  procedural: "#94A3B8",
  outcome: "#22C55E",
  incident: "#EF4444",
  workflow: "#22D3EE",
};

function buildingHeight(n: EntityNode) {
  return 3.2 + n.activity * 9;
}

/* ---------------- environment presets ---------------- */

const DAY = {
  sunPos: [60, 80, 40] as [number, number, number],
  sunIntensity: 2.2,
  ambient: 0.55,
  sky: { turbidity: 6, rayleigh: 1.2, inclination: 0.52, azimuth: 0.25 },
  grass: "#7FA07E",
  ground: "#9FB4A8",
  road: "#3A3F46",
  fillLight: 0.25,
};

const NIGHT = {
  sunPos: [-30, 24, -50] as [number, number, number],
  sunIntensity: 0.55,
  ambient: 0.5,
  sky: { turbidity: 1.2, rayleigh: 0.35, inclination: -0.02, azimuth: 0.25 },
  grass: "#22302A",
  ground: "#2A3644",
  road: "#39424E",
  fillLight: 1.5,
};

/* ---------------- label sprites (no DOM portals) ---------------- */

function makeLabelTexture(text: string, color: string, bg: string, border: string) {
  const canvas = document.createElement("canvas");
  const fontSize = 64;
  const padX = 36;
  const padY = 24;
  const measure = document.createElement("canvas").getContext("2d")!;
  measure.font = `600 ${fontSize}px "JetBrains Mono", ui-monospace, monospace`;
  const textW = measure.measureText(text).width;
  canvas.width = Math.ceil(textW + padX * 2);
  canvas.height = fontSize + padY * 2;
  const ctx = canvas.getContext("2d")!;
  ctx.font = `600 ${fontSize}px "JetBrains Mono", ui-monospace, monospace`;
  const r = 16;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(canvas.width - r, 0);
  ctx.quadraticCurveTo(canvas.width, 0, canvas.width, r);
  ctx.lineTo(canvas.width, canvas.height - r);
  ctx.quadraticCurveTo(canvas.width, canvas.height, canvas.width - r, canvas.height);
  ctx.lineTo(r, canvas.height);
  ctx.quadraticCurveTo(0, canvas.height, 0, canvas.height - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = border;
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.textBaseline = "middle";
  ctx.fillText(text, padX, canvas.height / 2 + 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return { texture, aspect: canvas.width / canvas.height };
}

function LabelSprite({
  text,
  position,
  height = 0.95,
  color = "#C9D3E8",
  bg = "rgba(8,12,20,0.92)",
  border = "#26314A",
}: {
  text: string;
  position: [number, number, number];
  height?: number;
  color?: string;
  bg?: string;
  border?: string;
}) {
  const { texture, aspect } = useMemo(
    () => makeLabelTexture(text, color, bg, border),
    [text, color, bg, border],
  );
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <sprite position={position} scale={[height * aspect, height, 1]}>
      <spriteMaterial map={texture} transparent depthWrite={false} />
    </sprite>
  );
}

/* ---------------- sun rig ---------------- */

function Sun({ mode }: { mode: "day" | "night" }) {
  const p = mode === "day" ? DAY : NIGHT;
  return (
    <>
      <Sky
        distance={4500}
        sunPosition={p.sunPos}
        turbidity={p.sky.turbidity}
        rayleigh={p.sky.rayleigh}
        inclination={p.sky.inclination}
        azimuth={p.sky.azimuth}
      />
      <directionalLight
        castShadow
        position={p.sunPos}
        intensity={p.sunIntensity}
        color={mode === "day" ? "#FFF3E0" : "#8FA8D8"}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-85}
        shadow-camera-right={85}
        shadow-camera-top={85}
        shadow-camera-bottom={-85}
        shadow-camera-near={1}
        shadow-camera-far={200}
        shadow-bias={-0.0004}
      />
      <ambientLight intensity={p.ambient} />
      <hemisphereLight
        intensity={mode === "day" ? 0.55 : 0.42}
        color={mode === "day" ? "#CFE4FF" : "#4C6A9E"}
        groundColor={mode === "day" ? "#8FA98E" : "#26313E"}
      />
      <directionalLight position={[-40, 20, -30]} intensity={p.fillLight} color="#22D3EE" />
      {mode === "night" && (
        <>
          <pointLight position={[0, 26, 0]} intensity={1.6} distance={130} color="#BFD4FF" />
          <directionalLight position={[40, 18, 30]} intensity={0.7} color="#8FA8D8" />
        </>
      )}
    </>
  );
}

/* ---------------- ground ---------------- */

function RealGround({ mode }: { mode: "day" | "night" }) {
  const p = mode === "day" ? DAY : NIGHT;
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <planeGeometry args={[420, 420]} />
        <meshStandardMaterial color={p.grass} roughness={1} metalness={0} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[160, 124]} />
        <meshStandardMaterial color={p.ground} roughness={0.95} metalness={0} />
      </mesh>
    </>
  );
}

/* ---------------- roads & props ---------------- */

function RoadNetwork({ mode }: { mode: "day" | "night" }) {
  const p = mode === "day" ? DAY : NIGHT;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <planeGeometry args={[136, 100]} />
        <meshStandardMaterial color={p.road} roughness={0.9} metalness={0} />
      </mesh>
      {[-28, -14, 0, 14, 28].map((x) => (
        <mesh key={`h${x}`} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.02, 0]}>
          <planeGeometry args={[0.35, 100]} />
          <meshStandardMaterial
            color="#E8ECF2"
            roughness={0.7}
            opacity={mode === "night" ? 0.35 : 0.85}
            transparent
          />
        </mesh>
      ))}
      {[-32, -22, -11, 0, 11, 22, 32].map((z) => (
        <mesh key={`v${z}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, z]}>
          <planeGeometry args={[136, 0.28]} />
          <meshStandardMaterial
            color="#E8ECF2"
            roughness={0.7}
            opacity={mode === "night" ? 0.3 : 0.8}
            transparent
          />
        </mesh>
      ))}
      {Array.from({ length: 48 }).map((_, i) => (
        <mesh key={`dh${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[-66 + i * 2.8, 0.02, 0]}>
          <planeGeometry args={[1.4, 0.16]} />
          <meshStandardMaterial color="#F2C94C" roughness={0.6} />
        </mesh>
      ))}
      {Array.from({ length: 34 }).map((_, i) => (
        <mesh key={`dv${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -45 + i * 2.7]}>
          <planeGeometry args={[0.16, 1.3]} />
          <meshStandardMaterial color="#F2C94C" roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

function Tree({ position, mode }: { position: [number, number, number]; mode: "day" | "night" }) {
  const dark = mode === "night";
  return (
    <group position={position}>
      <mesh position={[0, 0.7, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.18, 1.4, 7]} />
        <meshStandardMaterial color={dark ? "#1A130C" : "#6B4F2E"} roughness={1} />
      </mesh>
      <mesh position={[0, 2.0, 0]} castShadow>
        <sphereGeometry args={[0.95, 12, 12]} />
        <meshStandardMaterial color={dark ? "#0E1A12" : "#4E7A4A"} roughness={1} flatShading />
      </mesh>
      <mesh position={[0.35, 1.55, 0.2]} castShadow>
        <sphereGeometry args={[0.6, 10, 10]} />
        <meshStandardMaterial color={dark ? "#122417" : "#5C8A55"} roughness={1} flatShading />
      </mesh>
      <mesh position={[-0.3, 1.5, -0.15]} castShadow>
        <sphereGeometry args={[0.5, 10, 10]} />
        <meshStandardMaterial color={dark ? "#0C1D13" : "#446E41"} roughness={1} flatShading />
      </mesh>
    </group>
  );
}

function StreetLamp({ position, mode }: { position: [number, number, number]; mode: "day" | "night" }) {
  const night = mode === "night";
  return (
    <group position={position}>
      <mesh position={[0, 1.6, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.07, 3.2, 8]} />
        <meshStandardMaterial color={night ? "#14161A" : "#3A3F46"} roughness={0.6} metalness={0.6} />
      </mesh>
      <mesh position={[0.55, 3.25, 0]} rotation={[0, 0, -0.35]}>
        <cylinderGeometry args={[0.04, 0.05, 1.2, 8]} />
        <meshStandardMaterial color={night ? "#14161A" : "#3A3F46"} roughness={0.6} metalness={0.6} />
      </mesh>
      <mesh position={[1.05, 3.3, 0]}>
        <sphereGeometry args={[0.14, 12, 12]} />
        <meshStandardMaterial color="#FFF7DE" emissive="#FFD9A0" emissiveIntensity={night ? 3 : 0.15} />
      </mesh>
      {night && <pointLight position={[1.05, 3.2, 0]} intensity={12} distance={11} color="#FFD9A0" />}
    </group>
  );
}

function Bench({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.35, 0]} castShadow>
        <boxGeometry args={[1.1, 0.08, 0.4]} />
        <meshStandardMaterial color="#5C4630" roughness={1} />
      </mesh>
      <mesh position={[0, 0.6, -0.16]} rotation={[-0.25, 0, 0]}>
        <boxGeometry args={[1.1, 0.35, 0.06]} />
        <meshStandardMaterial color="#5C4630" roughness={1} />
      </mesh>
      {[-0.45, 0.45].map((x) => (
        <mesh key={x} position={[x, 0.17, 0]}>
          <boxGeometry args={[0.08, 0.34, 0.36]} />
          <meshStandardMaterial color="#2C2A26" roughness={0.8} metalness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

function ParkedCar({ position, color }: { position: [number, number, number]; color: string }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.42, 0]} castShadow>
        <boxGeometry args={[1.7, 0.5, 3.6]} />
        <meshStandardMaterial color={color} roughness={0.35} metalness={0.65} />
      </mesh>
      <mesh position={[0, 0.85, -0.3]} castShadow>
        <boxGeometry args={[1.5, 0.42, 1.7]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.65} />
      </mesh>
      {[
        [-0.75, 1.1],
        [0.75, 1.1],
        [-0.75, -1.1],
        [0.75, -1.1],
      ].map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x, 0.3, z]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.3, 0.3, 0.2, 14]} />
          <meshStandardMaterial color="#101216" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

/* ---------------- buildings ---------------- */

function OfficeBuilding({
  node,
  selected,
  onPath,
  mode,
  onSelect,
}: {
  node: EntityNode;
  selected: boolean;
  onPath: boolean;
  mode: "day" | "night";
  onSelect: (id: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const h = buildingHeight(node);
  const isVendor = node.type === "vendor";
  const w = isVendor ? 3.6 : 5.2;
  const d = isVendor ? 3.6 : 5.2;
  const night = mode === "night";
  // Deterministic per-building architecture variant (0..3): different roof
  // shapes and massing so the skyline doesn't look stamped from one mold.
  const variant = useMemo(() => {
    let s = 0;
    for (const ch of node.id) s = (s * 31 + ch.charCodeAt(0)) % 997;
    return s % 4;
  }, [node.id]);

  // Window-lit pattern per face (deterministic per building).
  const litWindows = useMemo(() => {
    const set = new Set<string>();
    let seed = node.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0) + node.decisionCount;
    const cols = 6;
    const rows = Math.max(3, Math.floor(h / 1.15));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        seed = (seed * 9301 + 49297) % 233280;
        if (seed / 233280 < (night ? 0.55 : 0.18)) set.add(`${r}-${c}`);
      }
    }
    return { set, cols, rows };
  }, [node.id, node.decisionCount, h, night]);

  const glowColor = onPath ? "#22D3EE" : "#5865F2";
  // Material palette — brighter, high-contrast architectural look.
  const facade = isVendor ? (night ? "#46536B" : "#CDD6E0") : night ? "#3E4A61" : "#DDE4EC";
  const facadeEmissive = night ? (onPath ? "#22D3EE" : "#2E4A78") : "#000000";
  const facadeEmissiveIntensity = night ? (onPath ? 0.5 : 0.22) : 0;
  const glass = night ? "#16283F" : "#8FB6DC";
  const trim = night ? "#5A6C8A" : "#9AA6B4";

  const handleSelect = (e: any) => {
    e.stopPropagation();
    onSelect(node.id);
  };

  return (
    <group position={node.position}>
      {/* ——— main tower ——— */}
      <mesh
        position={[0, h / 2, 0]}
        castShadow
        receiveShadow
        onClick={handleSelect}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = "auto";
        }}
      >
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial
          color={facade}
          roughness={0.32}
          metalness={0.5}
          emissive={selected ? glowColor : facadeEmissive}
          emissiveIntensity={selected ? 0.14 : facadeEmissiveIntensity}
        />
      </mesh>

      {/* ——— glass curtain-wall bands between floors (front/back/left/right) ——— */}
      {[0, 1].map((axis) =>
        [-1, 1].map((side) => {
          const rotY = axis === 0 ? 0 : Math.PI / 2;
          const offset = axis === 0 ? d / 2 + 0.02 : w / 2 + 0.02;
          const bandW = axis === 0 ? w * 0.88 : d * 0.88;
          return (
            <mesh key={`glass-${axis}-${side}`} position={[axis === 0 ? 0 : side * offset, h * 0.52, axis === 0 ? side * offset : 0]} rotation={[0, rotY, 0]}>
              <planeGeometry args={[bandW, h * 0.8]} />
              <meshStandardMaterial
                color={glass}
                roughness={0.08}
                metalness={0.92}
                emissive={night ? (onPath ? glowColor : "#1B3A66") : "#000000"}
                emissiveIntensity={night ? (onPath ? 0.55 : 0.3) : 0}
                transparent
                opacity={0.94}
              />
            </mesh>
          );
        }),
      )}

      {/* ——— lit windows on all four faces ——— */}
      {[0, 1].map((axis) =>
        [-1, 1].map((side) => {
          const rotY = axis === 0 ? 0 : Math.PI / 2;
          const base = (axis === 0 ? w : d) / 2 + 0.04;
          const spanW = (axis === 0 ? w : d) - 1.1;
          return (
            <group key={`win-${axis}-${side}`} rotation={[0, rotY, 0]} position={[axis === 0 ? 0 : side * base, 0, axis === 0 ? side * base : 0]}>
              {Array.from({ length: litWindows.rows }).map((_, r) =>
                Array.from({ length: litWindows.cols }).map((_, c) =>
                  litWindows.set.has(`${r}-${c}`) ? (
                    <mesh
                      key={`${r}-${c}`}
                      position={[-spanW / 2 + 0.55 + (c * spanW) / Math.max(litWindows.cols - 1, 1), 0.9 + r * ((h - 1.4) / Math.max(litWindows.rows - 1, 1)), 0]}
                    >
                      <planeGeometry args={[0.34, 0.5]} />
                      <meshStandardMaterial color="#FFF4D6" emissive="#FFDF9E" emissiveIntensity={night ? 2.8 : 0.5} />
                    </mesh>
                  ) : null,
                ),
              )}
            </group>
          );
        }),
      )}

      {/* ——— floor separation ledges ——— */}
      {Array.from({ length: Math.min(Math.floor(h / 2.2), 7) }).map((_, i) => (
        <mesh key={`ledge-${i}`} position={[0, (i + 1) * (h / Math.min(Math.floor(h / 2.2) + 1, 8)), 0]} castShadow>
          <boxGeometry args={[w + 0.16, 0.1, d + 0.16]} />
          <meshStandardMaterial color={trim} roughness={0.6} metalness={0.4} />
        </mesh>
      ))}

      {/* ——— rooftop slab + parapet ——— */}
      <mesh position={[0, h + 0.1, 0]} castShadow>
        <boxGeometry args={[w + 0.3, 0.2, d + 0.3]} />
        <meshStandardMaterial color={night ? "#2A3448" : "#8B97A4"} roughness={0.8} />
      </mesh>
      {/* parapet posts on the corners */}
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => (
        <mesh key={`parapet-${i}`} position={[(sx * (w - 0.2)) / 2, h + 0.32, (sz * (d - 0.2)) / 2]} castShadow>
          <boxGeometry args={[0.16, 0.28, 0.16]} />
          <meshStandardMaterial color={trim} roughness={0.6} metalness={0.35} />
        </mesh>
      ))}

      {/* ——— rooftop architecture varies per building ——— */}
      {variant === 0 && (
        <>
          {/* mechanical penthouse + HVAC */}
          <mesh position={[w / 4, h + 0.55, -d / 4]} castShadow>
            <boxGeometry args={[0.9, 0.7, 0.9]} />
            <meshStandardMaterial color={night ? "#33405A" : "#A8B2BC"} roughness={0.7} metalness={0.3} />
          </mesh>
          <mesh position={[-w / 5, h + 0.35, d / 5]} castShadow>
            <cylinderGeometry args={[0.32, 0.32, 0.5, 12]} />
            <meshStandardMaterial color={night ? "#3A4660" : "#B4BEC8"} roughness={0.55} metalness={0.5} />
          </mesh>
        </>
      )}
      {variant === 1 && (
        <>
          {/* setback crown tier */}
          <mesh position={[0, h + 0.75, 0]} castShadow>
            <boxGeometry args={[w * 0.62, 0.9, d * 0.62]} />
            <meshStandardMaterial color={facade} roughness={0.32} metalness={0.5} emissive={night ? "#2E4A78" : "#000000"} emissiveIntensity={night ? 0.25 : 0} />
          </mesh>
          <mesh position={[0, h + 1.25, 0]}>
            <boxGeometry args={[w * 0.64, 0.08, d * 0.64]} />
            <meshStandardMaterial color={trim} roughness={0.6} metalness={0.4} />
          </mesh>
        </>
      )}
      {variant === 2 && (
        <>
          {/* water tank + pipes */}
          <group position={[w / 5, h + 0.75, -d / 5]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.45, 0.45, 0.9, 14]} />
              <meshStandardMaterial color={night ? "#3A4660" : "#9FB0BE"} roughness={0.6} metalness={0.35} />
            </mesh>
            <mesh position={[0, 0.62, 0]} castShadow>
              <coneGeometry args={[0.5, 0.35, 14]} />
              <meshStandardMaterial color={night ? "#33405A" : "#8B99A8"} roughness={0.7} />
            </mesh>
            {[-0.3, 0.3].map((dx) => (
              <mesh key={dx} position={[dx, -0.65, 0]}>
                <cylinderGeometry args={[0.045, 0.045, 0.55, 8]} />
                <meshStandardMaterial color={night ? "#2A3448" : "#7C8894"} metalness={0.6} roughness={0.5} />
              </mesh>
            ))}
          </group>
        </>
      )}
      {variant === 3 && (
        <>
          {/* helipad circle */}
          <mesh position={[0, h + 0.22, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.65, 0.78, 32]} />
            <meshStandardMaterial color={night ? "#4A5878" : "#D8DFE8"} roughness={0.7} emissive={night ? "#3B5C8A" : "#000000"} emissiveIntensity={night ? 0.4 : 0} />
          </mesh>
          <mesh position={[w / 5, h + 0.45, d / 5]} castShadow>
            <boxGeometry args={[0.8, 0.4, 0.7]} />
            <meshStandardMaterial color={night ? "#33405A" : "#A8B2BC"} roughness={0.7} metalness={0.3} />
          </mesh>
        </>
      )}
      {/* antenna with blinking beacon on tall buildings */}
      {h > 5 && (
        <group position={[0, h + 0.2, 0]}>
          <mesh position={[0, 1.1, 0]}>
            <cylinderGeometry args={[0.03, 0.05, 2.0, 6]} />
            <meshStandardMaterial color={night ? "#55637F" : "#7C8894"} metalness={0.7} roughness={0.4} />
          </mesh>
          <mesh position={[0, 2.15, 0]}>
            <sphereGeometry args={[0.09, 10, 10]} />
            <meshStandardMaterial color="#FF5A5A" emissive="#FF3333" emissiveIntensity={night ? 3 : 1.2} />
          </mesh>
          {night && <pointLight position={[0, 2.2, 0]} intensity={0.5} distance={9} color="#FF6B6B" />}
        </group>
      )}

      {/* ——— street level: storefront glass, pillars, canopy, steps ——— */}
      <mesh position={[0, 0.85, d / 2 + 0.03]}>
        <planeGeometry args={[w * 0.8, 1.7]} />
        <meshStandardMaterial color={night ? "#FFDf9E" : "#B9D2E8"} emissive={night ? "#FFC866" : "#000000"} emissiveIntensity={night ? 1.4 : 0} roughness={0.1} metalness={0.8} transparent opacity={0.96} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={`pillar-${s}`} position={[s * w * 0.42, 0.85, d / 2 + 0.08]} castShadow>
          <boxGeometry args={[0.22, 1.7, 0.22]} />
          <meshStandardMaterial color={night ? "#2A3448" : "#6E7A88"} roughness={0.5} metalness={0.4} />
        </mesh>
      ))}
      {/* awning over the ground floor */}
      <mesh position={[0, 1.85, d / 2 + 0.42]} rotation={[0.32, 0, 0]} castShadow>
        <boxGeometry args={[w * 0.84, 0.07, 0.85]} />
        <meshStandardMaterial color={onPath ? "#155E6E" : night ? "#24354E" : "#43536B"} roughness={0.6} emissive={onPath ? "#22D3EE" : "#000000"} emissiveIntensity={onPath ? 0.35 : 0} />
      </mesh>
      {/* entrance steps */}
      {[0, 1, 2].map((i) => (
        <mesh key={`step-${i}`} position={[0, 0.06 + i * 0.1, d / 2 + 1.75 - i * 0.3]} receiveShadow>
          <boxGeometry args={[w * (0.5 - i * 0.08), 0.1, 0.6]} />
          <meshStandardMaterial color={night ? "#2E3850" : "#B8C2CC"} roughness={0.85} />
        </mesh>
      ))}
      {/* doorway glow */}
      <mesh position={[0, 0.5, d / 2 + 0.05]}>
        <planeGeometry args={[w * 0.16, 1.0]} />
        <meshStandardMaterial color="#FFE9B8" emissive="#FFC866" emissiveIntensity={night ? 2.6 : 0.4} />
      </mesh>
      {/* wall-mounted lamps beside the door */}
      {[-1, 1].map((s) => (
        <group key={`lamp-${s}`} position={[s * w * 0.34, 1.6, d / 2 + 0.14]}>
          <mesh>
            <sphereGeometry args={[0.09, 10, 10]} />
            <meshStandardMaterial color="#FFF6DC" emissive="#FFE9B0" emissiveIntensity={night ? 2.4 : 0.6} />
          </mesh>
          {night && <pointLight position={[0, 0, 0.3]} intensity={0.55} distance={8} color="#FFE9B0" />}
        </group>
      ))}

      {onPath && (
        <mesh position={[0, h + 1.1, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.25, 0.045, 10, 48]} />
          <meshStandardMaterial
            color="#22D3EE"
            emissive="#22D3EE"
            emissiveIntensity={1.8}
            transparent
            opacity={0.8}
          />
        </mesh>
      )}

      <LabelSprite
        text={node.name.toUpperCase()}
        position={[0, h + 2.6, 0]}
        height={1.15}
        color={onPath ? "#7DEBFC" : selected ? "#A5AEFF" : "#F1F5FB"}
        bg={night ? "rgba(10,16,26,0.94)" : "rgba(13,18,28,0.88)"}
        border={onPath ? "#22D3EE" : selected ? "#5865F2" : night ? "#3B4A66" : "#4A5568"}
      />
    </group>
  );
}

/* ---------------- memory orbs ---------------- */

function MemoryOrb({
  entityId,
  offsetIndex,
  paused,
  onSelect,
}: {
  entityId: string;
  offsetIndex: number;
  paused: boolean;
  onSelect: (memoryId: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const node = nodeById(entityId);
  const list = memoriesForEntity(entityId);
  const m = list[offsetIndex % Math.max(list.length, 1)];
  if (!node || !m) return null;
  const color = KIND_COLOR[m.kind] ?? "#6366F1";

  const angle = (offsetIndex / Math.max(list.length, 4)) * Math.PI * 2;
  const r = node.type === "vendor" ? 3.4 : 4.6;
  const x = node.position[0] + Math.cos(angle) * r;
  const z = node.position[2] + Math.sin(angle) * r;
  const y = 2.2 + ((offsetIndex * 0.9) % 2.2);

  return (
    <Float speed={paused ? 0 : 1.3} floatIntensity={0.6} rotationIntensity={0.12}>
      <mesh
        position={[x, y, z]}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(m.id);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = "auto";
        }}
      >
        <sphereGeometry args={[hovered ? 0.4 : 0.28, 18, 18]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={hovered ? 2.4 : 1.3} />
      </mesh>
      {(hovered || offsetIndex === 0) && (
        <LabelSprite
          text={`${m.id} · ${m.kind.toUpperCase()}`}
          position={[x, y + 0.85, z]}
          height={0.55}
          color="#C9D3E8"
          border={color}
        />
      )}
    </Float>
  );
}

/* ---------------- workflow paths ---------------- */

function WorkflowPath({
  entityIds,
  color,
  opacity,
  dashed,
  paused,
  mode,
  label,
}: {
  entityIds: string[];
  color: string;
  opacity: number;
  dashed?: boolean;
  paused: boolean;
  mode: "day" | "night";
  label?: string;
}) {
  const particles = useRef<THREE.Group>(null);
  const curve = useMemo(() => {
    const pts = entityIds
      .map((id) => nodeById(id))
      .filter((n): n is EntityNode => Boolean(n))
      .map((n) => {
        const dirX = Math.sign(n.position[0]) || 1;
        const dirZ = Math.sign(n.position[2]) || 1;
        return new THREE.Vector3(n.position[0] - dirX * 2.6, 0.7, n.position[2] - dirZ * 2.6);
      });
    if (pts.length < 2) return null;
    return new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.4);
  }, [entityIds]);

  const tube = useMemo(
    () => (curve ? new THREE.TubeGeometry(curve, 90, dashed ? 0.06 : 0.13, 8, false) : null),
    [curve, dashed],
  );

  useFrame((state) => {
    if (paused || !particles.current || !curve) return;
    particles.current.children.forEach((child, i) => {
      const p = (state.clock.elapsedTime * (0.055 + i * 0.013) + i * 0.28) % 1;
      const pos = curve.getPointAt(p);
      if (pos) {
        child.position.copy(pos);
        child.position.y = 0.7 + Math.sin(state.clock.elapsedTime * 2 + i) * 0.08;
      }
    });
  });

  if (!curve || !tube) return null;

  const mid = curve.getPointAt(0.5);

  return (
    <group>
      <mesh geometry={tube}>
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={mode === "night" ? 1.6 : 0.9}
          transparent
          opacity={opacity}
        />
      </mesh>
      {!dashed && (
        <group ref={particles}>
          {[0, 1, 2].map((i) => (
            <mesh key={i}>
              <sphereGeometry args={[0.2, 12, 12]} />
              <meshStandardMaterial color="#F5F8FF" emissive={color} emissiveIntensity={2.6} />
            </mesh>
          ))}
        </group>
      )}
      {label && (
        <LabelSprite
          text={label}
          position={[mid.x, mid.y + 1.4, mid.z]}
          height={0.8}
          color={color}
          border={color}
        />
      )}
    </group>
  );
}

/* ---------------- world scene ---------------- */

function WorldScene(props: SceneProps & { mode: "day" | "night" }) {
  const { selectedId, workflowMode, paused, onSelect, mode } = props;
  const depts = useMemo(() => org3d.nodes.filter((n) => n.type === "department"), []);
  const vendors = useMemo(() => org3d.nodes.filter((n) => n.type === "vendor"), []);
  const orbHosts = ["procurement", "security", "finance", "manager-lane", "it", "executive", "vendor-northwind"];

  const trees = useMemo<[number, number, number][]>(() => {
    const list: [number, number, number][] = [];
    let s = 7;
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 40; i++) {
      const x = -80 + rnd() * 160;
      const z = -58 + rnd() * 116;
      const nearRoad = Math.abs(x) < 2.2 || Math.abs(z) < 2.2;
      const onPlot = Math.abs(x) < 55 && Math.abs(z) < 42;
      if (!nearRoad && !onPlot) list.push([x, 0, z]);
    }
    return list.slice(0, 26);
  }, []);

  const lamps = useMemo<[number, number, number][]>(
    () => [
      [-16, 0, 5.8], [16, 0, 5.8], [-16, 0, -5.8], [16, 0, -5.8],
      [-5.8, 0, -18], [5.8, 0, -18], [-5.8, 0, 18], [5.8, 0, 18],
      [-36, 0, 5.8], [36, 0, 5.8], [-36, 0, -5.8], [36, 0, -5.8],
      [-5.8, 0, -36], [5.8, 0, -36], [-5.8, 0, 36], [5.8, 0, 36],
      [-52, 0, 5.8], [52, 0, 5.8], [-52, 0, -5.8], [52, 0, -5.8],
    ],
    [],
  );

  return (
    <>
      <RealGround mode={mode} />
      <RoadNetwork mode={mode} />
      <ContactShadows
        position={[0, 0.015, 0]}
        scale={190}
        far={9}
        opacity={mode === "night" ? 0.5 : 0.42}
        blur={2.4}
        frames={paused ? 1 : Infinity}
      />

      {depts.map((n) => (
        <OfficeBuilding
          key={n.id}
          node={n}
          selected={selectedId === n.id}
          onPath={
            (workflowMode === "observed" || workflowMode === "compare") && observedWorkflow.steps.includes(n.id)
          }
          mode={mode}
          onSelect={onSelect}
        />
      ))}
      {vendors.map((n) => (
        <OfficeBuilding
          key={n.id}
          node={n}
          selected={selectedId === n.id}
          onPath={false}
          mode={mode}
          onSelect={onSelect}
        />
      ))}

      {orbHosts.flatMap((id) =>
        [0, 1, 2].map((k) => (
          <MemoryOrb key={`${id}-${k}`} entityId={id} offsetIndex={k} paused={paused} onSelect={onSelect} />
        )),
      )}

      {workflowMode !== "official" && (
        <WorkflowPath
          entityIds={observedWorkflow.steps}
          color="#22D3EE"
          opacity={0.85}
          paused={paused}
          mode={mode}
          label="OBSERVED · DERIVED FROM MEMORY"
        />
      )}
      {(workflowMode === "official" || workflowMode === "compare") && (
        <WorkflowPath
          entityIds={officialWorkflow.steps}
          color="#94A3B8"
          opacity={workflowMode === "compare" ? 0.5 : 0.8}
          dashed
          paused={paused}
          mode={mode}
          label={workflowMode === "compare" ? "OFFICIAL · DOCUMENTED" : undefined}
        />
      )}

      {trees.map((pos, i) => (
        <Tree key={i} position={pos} mode={mode} />
      ))}
      {lamps.map((pos, i) => (
        <StreetLamp key={i} position={pos} mode={mode} />
      ))}

      <Bench position={[4.8, 0, 6.4]} />
      <Bench position={[-4.8, 0, 6.4]} />
      <Bench position={[4.8, 0, -6.4]} />
      <Bench position={[-4.8, 0, -6.4]} />

      <ParkedCar position={[12.5, 0, 8.5]} color="#5B6B7E" />
      <ParkedCar position={[12.5, 0, 12.2]} color="#7E5B5B" />
      <ParkedCar position={[-12.5, 0, -8.5]} color="#4E5E52" />
      <ParkedCar position={[-12.5, 0, -12.2]} color="#5E584E" />
      <ParkedCar position={[8.5, 0, 18.5]} color="#51606E" />
      <ParkedCar position={[-8.5, 0, -18.5]} color="#6E5160" />
    </>
  );
}

/* ---------------- knowledge graph ---------------- */

function GraphScene({ selectedId, paused, onSelect }: SceneProps) {
  const group = useRef<THREE.Group>(null);
  const { nodes, edges } = useMemo(() => buildKnowledgeGraph(), []);

  const positions = useMemo(() => {
    const map = new Map<string, THREE.Vector3>();
    const depts = nodes.filter((n) => n.type === "department");
    const vendors = nodes.filter((n) => n.type === "vendor");
    const mems = nodes.filter((n) => n.id.startsWith("mem-"));
    depts.forEach((n, i) => {
      const a = (i / depts.length) * Math.PI * 2;
      map.set(n.id, new THREE.Vector3(Math.cos(a) * 11, 0, Math.sin(a) * 11));
    });
    vendors.forEach((n, i) => {
      const a = (i / vendors.length) * Math.PI * 2 + 0.6;
      map.set(n.id, new THREE.Vector3(Math.cos(a) * 16.5, 0, Math.sin(a) * 16.5));
    });
    mems.forEach((n, i) => {
      const a = (i / mems.length) * Math.PI * 2;
      const r = 5.2 + ((i * 0.41) % 1) * 3.2;
      map.set(n.id, new THREE.Vector3(Math.cos(a) * r, 1.2 + ((i * 0.29) % 1) * 2.6, Math.sin(a) * r));
    });
    return map;
  }, [nodes]);

  const edgeGeom = useMemo(() => {
    const pts: number[] = [];
    for (const e of edges) {
      const a = positions.get(e.source);
      const b = positions.get(e.target);
      if (a && b) pts.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, [edges, positions]);

  useFrame((_, delta) => {
    if (!paused && group.current) group.current.rotation.y += delta * 0.045;
  });

  return (
    <>
      <group ref={group}>
        <lineSegments geometry={edgeGeom}>
          <lineBasicMaterial color="#26314A" transparent opacity={0.5} />
        </lineSegments>
        {nodes.map((n) => {
          const p = positions.get(n.id);
          if (!p) return null;
          const isDept = n.type === "department";
          const isVendor = n.type === "vendor";
          const color = isDept
            ? "#5865F2"
            : isVendor
              ? "#22D3EE"
              : n.type === "incident"
                ? "#EF4444"
                : n.type === "decision"
                  ? "#6366F1"
                  : n.type === "outcome"
                    ? "#22C55E"
                    : "#8A94A8";
          const size = isDept ? 0.7 : isVendor ? 0.55 : 0.15;
          const isSel = selectedId === (n.memoryId ?? n.id);
          return (
            <mesh
              key={n.id}
              position={p}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(n.memoryId ?? n.id);
              }}
              onPointerOver={(e) => {
                e.stopPropagation();
                document.body.style.cursor = "pointer";
              }}
              onPointerOut={() => {
                document.body.style.cursor = "auto";
              }}
            >
              <sphereGeometry args={[size, 14, 14]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={isSel ? 2.4 : 0.8} />
            </mesh>
          );
        })}
        {nodes
          .filter((n) => n.type === "department")
          .map((n, i) => {
            const p = positions.get(n.id);
            if (!p) return null;
            return (
              <LabelSprite
                key={`lbl-${n.id}`}
                text={n.label.toUpperCase()}
                position={[p.x, 1.5 + (i % 2) * 0.3, p.z]}
                height={0.7}
              />
            );
          })}
      </group>
      <ContactShadows position={[0, -0.02, 0]} scale={60} far={12} opacity={0.4} blur={2.2} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
        <planeGeometry args={[160, 160]} />
        <meshStandardMaterial color="#0A0E16" roughness={1} />
      </mesh>
    </>
  );
}

/* ---------------- camera rig ---------------- */

function CameraRig({
  focusTarget,
  resetNonce,
}: {
  focusTarget: SceneProps["focusTarget"];
  resetNonce: number;
}) {
  const controls = useRef<any>(null);
  const { camera } = useThree();
  const desiredCam = useRef<THREE.Vector3 | null>(null);
  const desiredTarget = useRef<THREE.Vector3 | null>(null);

  useMemo(() => {
    if (!focusTarget) return;
    const n = nodeById(focusTarget.id);
    if (!n) return;
    const h = buildingHeight(n);
    desiredTarget.current = new THREE.Vector3(n.position[0], h * 0.45, n.position[2]);
    desiredCam.current = new THREE.Vector3(n.position[0] + 10, h + 6.5, n.position[2] + 12);
  }, [focusTarget]);

  useMemo(() => {
    if (resetNonce === 0) return;
    desiredTarget.current = new THREE.Vector3(0, 2, 0);
    desiredCam.current = new THREE.Vector3(46, 52, 68);
  }, [resetNonce]);

  useFrame(() => {
    const c = controls.current;
    if (!c) return;
    if (desiredCam.current && desiredTarget.current) {
      camera.position.lerp(desiredCam.current, 0.07);
      c.target.lerp(desiredTarget.current, 0.07);
      if (camera.position.distanceTo(desiredCam.current) < 0.1) {
        desiredCam.current = null;
        desiredTarget.current = null;
      }
      c.update();
    }
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minDistance={7}
      maxDistance={190}
      maxPolarAngle={Math.PI / 2.04}
      target={[0, 2, 0]}
    />
  );
}

/* ---------------- exported canvas ---------------- */

export function OrgScene(props: SceneProps) {
  return (
    <Canvas
      shadows
      camera={{ position: [46, 52, 68], fov: 42 }}
      dpr={[1, 2.2]}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      onPointerMissed={() => props.onSelect(null)}
    >
      <SoftShadows size={26} samples={12} focus={0.7} />
      <Sun mode={props.mode} />
      {props.view === "world" ? <WorldScene {...props} mode={props.mode} /> : <GraphScene {...props} />}
      <CameraRig focusTarget={props.focusTarget} resetNonce={props.resetNonce} />
    </Canvas>
  );
}
