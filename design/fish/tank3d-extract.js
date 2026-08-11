
/* ============================================================
   DATA — fish.json (inlined so the artifact renders standalone)
   ============================================================ */
const DOMAINS = {
  infra: { label: "DevOps & Infra", color: "#00f3ff" },
  ai:    { label: "AI & Agents",    color: "#c084fc" },
  web:   { label: "Fullstack",      color: "#f59e0b" },
  data:  { label: "Data",           color: "#34d399" }
};

const FISH = [
  { slug:"oct-mcp", title:"OpenCat MCP Server", species:"grouper", domain:"ai",
    size:1.0, depth:0.10, speed:0.6, glow:1.0, school:1,
    tags:["MCP","LangGraph","PostgreSQL","OAuth","Docker"],
    blurb:"Multi-tenant MCP platform: 180+ tools, GOAP planner, two-layer OAuth, live plugin hot-swap.",
    description:"A production Model Context Protocol server built on FastMCP. Hybrid GOAP planner turns a natural-language goal into an ordered, validated tool plan; plugins hot-swap without a restart; every access path funnels through one scope manager with twelve contract tests behind it.",
    detail_ref:"portfolio_plugin__context:oct-mcp",
    metrics:[{label:"Tools",value:"180+"},{label:"Plugins",value:"12"},{label:"Uptime",value:"99.9%"}],
    link:"https://github.com" },

  { slug:"goap-planner", title:"Hybrid GOAP Planner", species:"manta", domain:"ai",
    size:0.82, depth:0.18, speed:0.45, glow:0.9, school:1,
    tags:["Planning","A*","LLM","LangGraph"],
    blurb:"A* forward search over LLM-extracted goals. Deterministic ordering, LLM only for intent.",
    description:"The LLM extracts a goal and seed facts; a classical A* planner over derived pre/post-conditions orders the actions. Chaining, fan-out and argument binding are all deterministic, so replans dropped 63% versus a pure LLM linear planner.",
    detail_ref:"portfolio_plugin__context:goap-planner",
    metrics:[{label:"Avg steps",value:"4.1"},{label:"Replans",value:"-63%"},{label:"Determinism",value:"100%"}],
    link:"https://github.com" },

  { slug:"cat-tunnel", title:"Cat Tunnel", species:"eel", domain:"infra",
    size:0.74, depth:0.28, speed:0.55, glow:0.75, school:1,
    tags:["WebSocket","VS Code","PTY","TOTP"],
    blurb:"Browser-to-terminal relay with step-up TOTP auth and a gated PTY write path.",
    description:"A relay that survives transient browser disconnects: the host leg stays alive while the console reconnects. Privileged commands trip a step-up auth gate (TOTP or password) before a single byte reaches the PTY.",
    detail_ref:"portfolio_plugin__context:cat-tunnel",
    metrics:[{label:"Latency",value:"18ms"},{label:"Reconnect",value:"seamless"},{label:"Auth",value:"step-up"}],
    link:"https://github.com" },

  { slug:"portfolio-agent", title:"Portfolio Layout Agent", species:"angelfish", domain:"web",
    size:0.62, depth:0.14, speed:0.7, glow:0.85, school:1,
    tags:["GenUI","React","Three.js","TypeScript"],
    blurb:"An agent composes a schema-validated page per job posting. Now it composes this tank.",
    description:"Given a job posting it ranks projects against the brief, builds an evidence pack from a semantic index, and emits a validated layout. This site is its output: the agent no longer writes page markup, it writes fish.json.",
    detail_ref:"portfolio_plugin__context:portfolio-agent",
    metrics:[{label:"Bake time",value:"6s"},{label:"Block types",value:"22"},{label:"Schema",value:"strict"}],
    link:"https://github.com" },

  { slug:"hybrid-search", title:"Hybrid Search Engine", species:"tuna", domain:"data",
    size:0.68, depth:0.36, speed:0.5, glow:0.7, school:1,
    tags:["pgvector","RRF","PostgreSQL","Embeddings"],
    blurb:"One choke point fusing dense cosine with sparse ts_rank via RRF across six collections.",
    description:"Six separate embedding search paths collapsed into a single spec-driven engine. Dense cosine and sparse full-text are fused with reciprocal rank fusion, per-collection togglable, so no two search surfaces can silently diverge.",
    detail_ref:"portfolio_plugin__context:hybrid-search",
    metrics:[{label:"p50",value:"31ms"},{label:"Recall",value:"+22%"},{label:"Paths",value:"6→1"}],
    link:"https://github.com" },

  { slug:"scope-manager", title:"Unified Scope Manager", species:"pufferfish", domain:"infra",
    size:0.56, depth:0.44, speed:0.28, glow:0.62, school:1,
    tags:["AuthZ","Policy","Security","Multi-tenant"],
    blurb:"Ordered rule chain, fail-closed, twelve contract tests. One is_allowed in the whole codebase.",
    description:"Replaced five hand-rolled permission checks with one ordered rule chain and an import-boundary test that fails CI if anyone defines is_allowed elsewhere. Enforce / audit / off modes make rollout survivable.",
    detail_ref:"portfolio_plugin__context:scope-manager",
    metrics:[{label:"Contracts",value:"12"},{label:"Impls",value:"1"},{label:"Modes",value:"3"}],
    link:"https://github.com" },

  { slug:"artifact-offload", title:"MinIO Artifact Offload", species:"crab", domain:"infra",
    size:0.46, depth:0.56, speed:0.2, glow:0.5, school:1,
    tags:["MinIO","S3","Middleware","Streaming"],
    blurb:"Big payloads swapped for short ids at the middleware boundary. No more truncated JSON.",
    description:"A universal middleware backstop uploads oversized string leaves to object storage and substitutes a short id marker, so a 700KB tool result reaches the model as a few hundred bytes instead of being byte-truncated into invalid JSON.",
    detail_ref:"portfolio_plugin__context:artifact-offload",
    metrics:[{label:"Payload",value:"-96%"},{label:"Truncation",value:"0"},{label:"Idempotent",value:"yes"}],
    link:"https://github.com" },

  { slug:"job-pipeline", title:"Job Search Pipeline", species:"sardine", domain:"data",
    size:0.42, depth:0.62, speed:0.85, glow:0.45, school:6,
    tags:["Automation","PDF","Scraping","Fan-out"],
    blurb:"Search, tailor, render, submit, track. Five tool groups, one fan-out plan.",
    description:"Five MCP tool groups behind a single planner goal. The resume PDF is rendered per posting with a portfolio deep link baked into the contact header, so opening the resume renders a job-matched tank.",
    detail_ref:"portfolio_plugin__context:job-pipeline",
    metrics:[{label:"Tool groups",value:"5"},{label:"Fan-out",value:"parallel"},{label:"Storage",value:"MinIO"}],
    link:"https://github.com" },

  { slug:"world-semantic", title:"Unity World Semantics", species:"jellyfish", domain:"ai",
    size:0.52, depth:0.74, speed:0.18, glow:0.42, school:1,
    tags:["Unity","Spatial","pgvector","Hex grid"],
    blurb:"Hex-indexed spatial context so an agent can answer questions about a 3D world.",
    description:"Unity bulk-indexes world state over HTTP; the agent control plane queries it by region or hex through MCP. Lets an LLM reason about what is physically where without streaming the whole scene graph.",
    detail_ref:"portfolio_plugin__context:world-semantic",
    metrics:[{label:"Hexes",value:"14k"},{label:"Diff sync",value:"live"},{label:"Transport",value:"hybrid"}],
    link:"https://github.com" },

  { slug:"clinical-core", title:"Clinical Messaging Core", species:"anglerfish", domain:"data",
    size:0.64, depth:0.92, speed:0.12, glow:0.3, school:1,
    tags:["Healthcare","SMS","Legacy","Scale"],
    blurb:"Archived. Patient messaging at scale — the deep-water ancestor of everything above.",
    description:"Two-way clinical SMS for 120k patients: scheduling, triage classification, clinician alerting. Archived, but every pattern in the newer systems — tenant isolation, audit trails, fail-closed auth — was learned here.",
    detail_ref:"portfolio_plugin__context:clinical-core",
    metrics:[{label:"Patients",value:"120k"},{label:"Status",value:"archived"},{label:"Years",value:"4"}],
    link:"https://github.com" }
];

/* Job-bake presets: what the agent pipeline actually writes */
const BAKES = [
  { label: "Senior Platform Engineer @ Acme", highlight: ["oct-mcp","cat-tunnel","scope-manager","artifact-offload"] },
  { label: "AI Infrastructure Lead @ Northwind", highlight: ["oct-mcp","goap-planner","world-semantic","hybrid-search"] },
  { label: "Full-stack Product Engineer @ Fathom", highlight: ["portfolio-agent","job-pipeline","cat-tunnel"] }
];

/* ============================================================
   STATE
   ============================================================ */
const state = {
  view: "3d",
  query: "",
  domain: "all",
  selected: null,
  timeScale: 1,
  highlight: null,      // string[] from a job bake
  bakeIndex: -1,
  matched: new Set(FISH.map(f => f.slug))
};

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const qs = new URLSearchParams(location.search);

/* ============================================================
   THREE.JS SCENE
   ============================================================ */
let scene, camera, renderer, raycaster, clock, tank, water, catGroup, paw, bubbles;
let fishObjs = [];
let ripples = [];
const pointer = new THREE.Vector2(-2, -2);
const WATER_Y = 8;              // waterline height in world units
let webglOK = false;

const geoCache = {};
function cached(key, make) { return (geoCache[key] || (geoCache[key] = make())); }

function initScene() {
  const canvas = document.getElementById("gl");
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x030814);
  scene.fog = new THREE.FogExp2(0x061630, 0.028);

  camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.1, 400);
  camera.position.set(0, WATER_Y + 5, 26);

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));

  raycaster = new THREE.Raycaster();
  clock = new THREE.Clock();

  scene.add(new THREE.AmbientLight(0x14385c, 2.0));
  const top = new THREE.DirectionalLight(0x9fe9ff, 2.2); top.position.set(2, 30, 8); scene.add(top);
  const fill = new THREE.PointLight(0x3b82f6, 2.4, 60); fill.position.set(0, 0, 10); scene.add(fill);

  tank = new THREE.Group(); scene.add(tank);

  buildTankShell();
  buildWaterSurface();
  buildBed();
  buildCat();
  buildBubbles();
  FISH.forEach(buildFish);

  addEventListener("resize", onResize);
  addEventListener("pointermove", onPointerMove, { passive: true });
  addEventListener("pointerup", onPointerUp, { passive: true });
  canvas.addEventListener("pointerdown", onPointerDown, { passive: true });
  canvas.addEventListener("wheel", onWheel, { passive: false });
  canvas.addEventListener("click", onCanvasClick);
  buildLabels();
  webglOK = true;
}

/* One DOM label per lead fish — projected from world space every frame.
   Text stays selectable, translatable and indexable; never TextGeometry. */
function buildLabels() {
  const host = el("labels");
  host.innerHTML = "";
  fishObjs.filter(o => o.lead).forEach(o => {
    const d = DOMAINS[o.data.domain] || DOMAINS.infra;
    const n = document.createElement("button");
    n.className = "flabel";
    n.style.color = d.color;
    n.innerHTML = `<b>${o.data.title}</b><small>${Math.round(o.data.size * 100)}</small>`;
    n.onclick = ev => { ev.stopPropagation(); catchFish(o.mesh); };
    host.appendChild(n);
    o.label = n;
  });
}

/* --- tank glass: the edge that divides cat world from fish world --- */
function buildTankShell() {
  const box = new THREE.BoxGeometry(46, 26, 26);
  const edges = new THREE.EdgesGeometry(box);
  const glass = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x00f3ff, transparent: true, opacity: 0.28 }));
  glass.position.y = WATER_Y - 13;
  tank.add(glass);

  // thicker rim right at the waterline
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(0.4, 0.14, 6, 4),
    new THREE.MeshBasicMaterial({ color: 0x00f3ff, transparent: true, opacity: 0.5 })
  );
  rim.visible = false; tank.add(rim);
}

/* --- animated water surface + ripple rings --- */
function buildWaterSurface() {
  const geo = new THREE.PlaneGeometry(46, 26, 40, 24);
  geo.rotateX(-Math.PI / 2);
  water = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    color: 0x0b3a55, emissive: 0x0a2c44, emissiveIntensity: 0.6,
    transparent: true, opacity: 0.42, roughness: 0.15, metalness: 0.4,
    side: THREE.DoubleSide, flatShading: true
  }));
  water.position.y = WATER_Y;
  water.userData.base = Float32Array.from(geo.attributes.position.array);
  tank.add(water);
}

/* --- sea bed + glowing coral --- */
function buildBed() {
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(46, 26, 24, 16),
    new THREE.MeshStandardMaterial({ color: 0x06152d, roughness: 0.95, flatShading: true })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = WATER_Y - 26;
  const p = floor.geometry.attributes.position;
  for (let i = 0; i < p.count; i++) p.setZ(i, (Math.random() - 0.5) * 1.6);
  p.needsUpdate = true; floor.geometry.computeVertexNormals();
  tank.add(floor);

  const rockGeo = new THREE.DodecahedronGeometry(1, 0);
  for (let i = 0; i < 16; i++) {
    const c = i % 3 === 0 ? 0x00f3ff : i % 3 === 1 ? 0xc084fc : 0x34d399;
    const rock = new THREE.Mesh(rockGeo, new THREE.MeshStandardMaterial({
      color: c, emissive: c, emissiveIntensity: 0.25, roughness: 0.5, flatShading: true
    }));
    rock.position.set((Math.random() - 0.5) * 40, WATER_Y - 25.4 + Math.random(), (Math.random() - 0.5) * 20);
    const s = 0.5 + Math.random() * 1.4;
    rock.scale.set(s, s * (0.8 + Math.random() * 1.4), s);
    rock.rotation.set(Math.random(), Math.random(), Math.random());
    tank.add(rock);
  }
}

/* --- Andrew the cat: sits above the rim, watches, dips a paw --- */
function buildCat() {
  catGroup = new THREE.Group();
  const fur = new THREE.MeshStandardMaterial({ color: 0x1b2a44, emissive: 0x0a1626, roughness: 0.8, flatShading: true });
  const pink = new THREE.MeshStandardMaterial({ color: 0xf472b6, emissive: 0x7a2350, emissiveIntensity: 0.5, roughness: 0.6 });

  const head = new THREE.Mesh(new THREE.SphereGeometry(3.2, 16, 12), fur);
  catGroup.add(head);
  [-1, 1].forEach(s => {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(1.1, 2.2, 4), fur);
    ear.position.set(s * 1.9, 2.9, 0); ear.rotation.z = s * -0.2; catGroup.add(ear);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.62, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0x9df7ff, emissive: 0x00f3ff, emissiveIntensity: 1.4 }));
    eye.position.set(s * 1.25, 0.35, 2.75); eye.name = "eye"; catGroup.add(eye);
  });
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.5, 4), pink);
  nose.position.set(0, -0.7, 3.1); nose.rotation.x = Math.PI / 2; catGroup.add(nose);

  // paw on an arm — dips through the surface on a catch
  paw = new THREE.Group();
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.75, 6, 8), fur);
  arm.position.y = 3; paw.add(arm);
  const pad = new THREE.Mesh(new THREE.SphereGeometry(1.15, 12, 10), fur);
  paw.add(pad);
  for (let i = 0; i < 4; i++) {
    const bean = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), pink);
    bean.position.set(-0.75 + i * 0.5, -0.55, 0.75); paw.add(bean);
  }
  paw.position.set(-4.5, -3.2, 1.5);
  paw.userData = { rest: -3.2, dip: 0 };
  catGroup.add(paw);

  catGroup.position.set(6, WATER_Y + 8.5, 4);
  catGroup.scale.setScalar(1.0);
  scene.add(catGroup);
}

function buildBubbles() {
  const n = 140, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 42;
    pos[i * 3 + 1] = WATER_Y - Math.random() * 25;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 22;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  bubbles = new THREE.Points(g, new THREE.PointsMaterial({
    color: 0x9fe9ff, size: 0.22, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false
  }));
  tank.add(bubbles);
}

/* --- species → procedural mesh. size/depth/glow/speed all come from fish.json --- */
function buildFish(data) {
  const n = Math.max(1, data.school || 1);
  for (let k = 0; k < n; k++) {
    const lead = k === 0;
    const g = new THREE.Group();
    const color = new THREE.Color((DOMAINS[data.domain] || DOMAINS.infra).color);

    const body = new THREE.MeshStandardMaterial({
      color, emissive: color, emissiveIntensity: data.glow * 0.55,
      roughness: 0.35, metalness: 0.25, transparent: true, opacity: 1, flatShading: true
    });
    const fin = new THREE.MeshStandardMaterial({
      color, emissive: color, emissiveIntensity: data.glow * 0.85,
      transparent: true, opacity: 0.8, roughness: 0.25, side: THREE.DoubleSide
    });

    switch (data.species) {
      case "grouper": case "tuna": case "shark": {
        const b = new THREE.Mesh(cached("cone", () => { const c = new THREE.ConeGeometry(0.8, 2.6, 8); c.rotateX(Math.PI / 2); return c; }), body);
        g.add(b);
        const tail = new THREE.Mesh(cached("tailfin", () => new THREE.ConeGeometry(0.85, 1.3, 3)), fin);
        tail.rotation.x = -Math.PI / 2; tail.position.z = -1.9; tail.name = "tail"; g.add(tail);
        const dors = new THREE.Mesh(cached("dorsal", () => new THREE.ConeGeometry(0.45, 1.2, 3)), fin);
        dors.position.set(0, 0.7, -0.2); g.add(dors);
        break;
      }
      case "manta": {
        const s = new THREE.Shape();
        s.moveTo(0, 1.3); s.lineTo(2.4, -0.4); s.lineTo(0, -1.4); s.lineTo(-2.4, -0.4); s.closePath();
        const wing = cached("manta", () => { const e = new THREE.ExtrudeGeometry(s, { depth: 0.22, bevelEnabled: true, bevelSize: .1, bevelThickness: .1, bevelSegments: 1, steps: 1 }); e.rotateX(Math.PI / 2); return e; });
        const m = new THREE.Mesh(wing, body); m.name = "wing"; g.add(m);
        break;
      }
      case "eel": {
        for (let s = 0; s < 6; s++) {
          const seg = new THREE.Mesh(cached("eelseg", () => new THREE.SphereGeometry(0.42, 8, 6)), body);
          seg.position.z = -s * 0.62; seg.scale.set(1, 1 - s * 0.07, 1);
          seg.name = "seg" + s; g.add(seg);
        }
        break;
      }
      case "pufferfish": {
        const b = new THREE.Mesh(cached("puff", () => new THREE.IcosahedronGeometry(1.05, 1)), body);
        b.name = "puff"; g.add(b);
        for (let s = 0; s < 12; s++) {
          const spike = new THREE.Mesh(cached("spike", () => new THREE.ConeGeometry(0.13, 0.6, 4)), fin);
          const a = (s / 12) * Math.PI * 2, t = s % 2 ? 0.5 : -0.4;
          spike.position.set(Math.cos(a) * 1.0, t, Math.sin(a) * 1.0);
          spike.lookAt(spike.position.clone().multiplyScalar(2)); g.add(spike);
        }
        break;
      }
      case "crab": {
        const b = new THREE.Mesh(cached("crabbody", () => { const s = new THREE.SphereGeometry(1, 10, 8); s.scale(1.2, 0.55, 1); return s; }), body);
        g.add(b);
        for (let s = 0; s < 6; s++) {
          const leg = new THREE.Mesh(cached("leg", () => new THREE.CylinderGeometry(0.08, 0.05, 1.4, 5)), fin);
          const side = s < 3 ? -1 : 1;
          leg.position.set(side * 1.1, -0.25, -0.7 + (s % 3) * 0.7);
          leg.rotation.z = side * 0.9; g.add(leg);
        }
        break;
      }
      case "jellyfish": {
        const dome = new THREE.Mesh(cached("dome", () => new THREE.SphereGeometry(1.0, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.58)), fin);
        dome.name = "dome"; g.add(dome);
        for (let t = 0; t < 7; t++) {
          const ten = new THREE.Mesh(cached("tentacle", () => new THREE.CylinderGeometry(0.05, 0.012, 2.2, 5)), fin);
          const a = (t / 7) * Math.PI * 2;
          ten.position.set(Math.cos(a) * 0.55, -1.1, Math.sin(a) * 0.55);
          ten.name = "ten" + t; g.add(ten);
        }
        break;
      }
      case "anglerfish": {
        const b = new THREE.Mesh(cached("anglerbody", () => { const s = new THREE.SphereGeometry(1.1, 10, 8); s.scale(1, 0.85, 1.35); return s; }), body);
        g.add(b);
        const rod = new THREE.Mesh(cached("rod", () => new THREE.CylinderGeometry(0.05, 0.05, 2.2, 4)), fin);
        rod.position.set(0, 1.3, 0.6); rod.rotation.x = 0.7; g.add(rod);
        const lure = new THREE.Mesh(cached("lure", () => new THREE.SphereGeometry(0.26, 8, 6)),
          new THREE.MeshBasicMaterial({ color: 0xfff3b0 }));
        lure.position.set(0, 2.2, 1.5); lure.name = "lure"; g.add(lure);
        break;
      }
      default: { // angelfish / clownfish / tetra / sardine
        const b = new THREE.Mesh(cached("disc", () => { const s = new THREE.SphereGeometry(0.9, 12, 10); s.scale(0.32, 1, 1.15); return s; }), body);
        g.add(b);
        const top = new THREE.Mesh(cached("topfin", () => new THREE.ConeGeometry(0.5, 1.4, 3)), fin);
        top.position.set(0, 0.95, -0.15); top.rotation.x = -0.7; g.add(top);
        const tail = new THREE.Mesh(cached("tailfin2", () => new THREE.ConeGeometry(0.55, 1.0, 3)), fin);
        tail.rotation.x = Math.PI / 2; tail.position.z = -1.15; tail.name = "tail"; g.add(tail);
      }
    }

    // generous invisible hit target — clicking a swimming fish must be forgiving
    const hit = new THREE.Mesh(cached("hit", () => new THREE.SphereGeometry(2.1, 8, 6)),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
    hit.name = "hit"; g.add(hit);

    const glowLight = new THREE.PointLight(color, data.glow * 1.4, 7);
    g.add(glowLight);

    // size → scale, depth → Y (surface = new work, bed = archived)
    const scale = (0.55 + data.size * 0.85) * (lead ? 1 : 0.42);
    g.scale.setScalar(scale);
    const y = WATER_Y - 2 - data.depth * 21 + (lead ? 0 : (Math.random() - 0.5) * 2.5);
    const cx = (Math.random() - 0.5) * 26;
    const cz = (Math.random() - 0.5) * 14;
    g.position.set(cx, y, cz);

    g.userData = {
      data, lead, baseScale: scale, baseY: y,
      center: new THREE.Vector3(cx, y, cz),
      phase: Math.random() * Math.PI * 2,
      rx: 5 + Math.random() * 6, rz: 3 + Math.random() * 4,
      lit: 1, targetLit: 1, targetScale: scale
    };

    tank.add(g);
    fishObjs.push({ mesh: g, data, lead, body, fin, glowLight });
  }
}

/* ============================================================
   INTERACTION
   ============================================================ */
function onResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}

/* Hand-rolled orbit — ~30 lines, avoids a second CDN import for OrbitControls.
   yaw/pitch/radius orbit a target that scroll drives down through the waterline. */
const orbit = {
  yaw: 0, pitch: 0.12, radius: 26,
  yawT: 0, pitchT: 0.12, radiusT: 26,
  target: new THREE.Vector3(0, WATER_Y - 4, 0),
  targetT: new THREE.Vector3(0, WATER_Y - 4, 0),
  dragging: false, moved: 0, lx: 0, ly: 0
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const view = { shift: 0, applied: false };   // projection offset for the locked-specimen framing
const MAX_RADIUS = 44;                       // pulled all the way back = one more wheel-up surfaces you

function onPointerDown(e) {
  if (state.view !== "3d") return;
  orbit.dragging = true; orbit.moved = 0;
  orbit.lx = e.clientX; orbit.ly = e.clientY;
}
function onPointerUp() { orbit.dragging = false; }

/* On the surface the wheel dives. Inside the tank the wheel is pure zoom, on the
   standard 3D convention: up = closer, down = further. Surfacing deliberately does
   NOT ride the wheel — it has its own control — so zoom can never teleport you. */
let wheelLock = 0;
function onWheel(e) {
  if (state.view !== "3d") return;
  e.preventDefault();
  if (state.selected) return;

  const now = performance.now();

  if (scene1Active()) {
    if (e.deltaY > 0 && now > wheelLock) { setScene(1); wheelLock = now + 700; }
    return;
  }
  // wheel up (deltaY < 0) pulls the camera in; wheel down pushes it out
  orbit.radiusT = clamp(orbit.radiusT + e.deltaY * 0.02, 8, MAX_RADIUS);
}

/* --- two-scene stage: 0 = cat on the rim, 1 = inside the tank --- */
const stage = { t: 0, tT: 0 };          // t eases toward tT
const scene1Active = () => stage.tT < 0.5;

function setScene(i) {
  stage.tT = i ? 1 : 0;
  if (i) { orbit.radiusT = 26; orbit.pitchT = 0.12; orbit.yawT = 0; }
  else { orbit.radiusT = 30; orbit.pitchT = 0.22; orbit.yawT = 0; }
  document.documentElement.style.setProperty("--t", String(stage.tT));
  el("scene1").dataset.off = String(!!i);
  el("scene2").dataset.off = String(!i);
  if (!i) release();
}

function onPointerMove(e) {
  pointer.x = (e.clientX / innerWidth) * 2 - 1;
  pointer.y = -(e.clientY / innerHeight) * 2 + 1;

  if (orbit.dragging && !state.selected) {
    const dx = e.clientX - orbit.lx, dy = e.clientY - orbit.ly;
    orbit.lx = e.clientX; orbit.ly = e.clientY;
    orbit.moved += Math.abs(dx) + Math.abs(dy);
    orbit.yawT -= dx * 0.005;
    // clamped so you can never flip under the tank floor
    orbit.pitchT = clamp(orbit.pitchT + dy * 0.004, -0.55, 0.85);
    document.getElementById("gl").style.cursor = "grabbing";
    return;
  }
  if (state.view !== "3d" || state.selected) return;
  document.getElementById("gl").style.cursor = pick() ? "pointer" : "grab";
}

function pick() {
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(tank.children, true);
  for (const h of hits) {
    let root = h.object;
    while (root.parent && root.parent !== tank) root = root.parent;
    if (root.userData && root.userData.data && root.userData.lead && root.userData.lit > 0.5) return root;
  }
  return null;
}

function onCanvasClick(e) {
  if (state.view !== "3d") return;
  if (orbit.moved > 2) { orbit.moved = 0; return; }   // that was a drag, not a click
  const root = pick();
  if (root) catchFish(root);
  else if (state.selected) release();
}

/* The catch: paw dips, ripple spreads, tank goes slow-mo, camera closes in. */
function catchFish(root) {
  if (scene1Active()) setScene(1);     // a catch always happens inside the tank
  state.selected = root;
  state.timeScale = 0.15;
  paw.userData.dip = 1;
  spawnRipple(root.position.x, root.position.z);
  openModal(root.userData.data);
  location.hash = "/fish/" + root.userData.data.slug;
}

function release() {
  state.selected = null;
  state.timeScale = 1;
  closeModal();
  if (location.hash) history.replaceState(null, "", location.pathname + location.search);
}

function spawnRipple(x, z) {
  const m = new THREE.Mesh(
    new THREE.RingGeometry(0.6, 0.9, 32),
    new THREE.MeshBasicMaterial({ color: 0x00f3ff, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false })
  );
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, WATER_Y + 0.05, z);
  tank.add(m);
  ripples.push({ m, t: 0 });
}

/* ============================================================
   FILTER / BAKE  → drives glow, scale and depth in the tank
   ============================================================ */
function matches(f) {
  const q = state.query.trim().toLowerCase();
  const dOK = state.domain === "all" || f.domain === state.domain;
  const qOK = !q || f.title.toLowerCase().includes(q) || f.blurb.toLowerCase().includes(q)
    || f.description.toLowerCase().includes(q) || f.tags.some(t => t.toLowerCase().includes(q));
  const hOK = !state.highlight || state.highlight.includes(f.slug);
  return dOK && qOK && hOK;
}

function applyFilter() {
  state.matched = new Set(FISH.filter(matches).map(f => f.slug));
  fishObjs.forEach(o => {
    const on = state.matched.has(o.data.slug);
    const u = o.mesh.userData;
    u.targetLit = on ? 1 : 0.16;
    u.targetScale = u.baseScale * (on ? 1.12 : 0.72);
    // a bake pulls matched work toward the surface
    const lift = (state.highlight && on) ? 5.5 : 0;
    u.center.y = u.baseY + lift;
  });
  const cnt = state.matched.size;
  document.getElementById("cnt").textContent = cnt + "/" + FISH.length;
  const lit = document.getElementById("litRead");
  if (lit) lit.textContent = cnt === FISH.length ? cnt + " species" : cnt + " of " + FISH.length + " lit";
  renderGrid();
}

/* ============================================================
   DOM: chips, grid, modal, drawer
   ============================================================ */
const el = id => document.getElementById(id);

function renderChips(host, isFlat) {
  const list = [["all", "All species"], ...Object.entries(DOMAINS).map(([k, v]) => [k, v.label])];
  host.innerHTML = "";
  list.forEach(([id, label]) => {
    const b = document.createElement("button");
    b.className = "btn" + (state.domain === id ? " on" : "");
    b.textContent = label;
    b.onclick = () => { state.domain = id; renderChips(el("domains")); renderChips(el("domainsFlat"), true); applyFilter(); };
    if (id !== "all") b.style.color = state.domain === id ? "" : DOMAINS[id].color;
    host.appendChild(b);
  });
}

function renderGrid() {
  const grid = el("grid");
  const list = FISH.filter(matches);
  if (!list.length) {
    grid.innerHTML = '<p style="color:#64748b;font-family:var(--mono);grid-column:1/-1;padding:40px 0;text-align:center">No fish match that query. Try another tag.</p>';
    return;
  }
  grid.innerHTML = list.map(f => {
    const d = DOMAINS[f.domain] || DOMAINS.infra;
    return `<article class="card glass" data-slug="${f.slug}" tabindex="0">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
        <span class="badge" style="color:${d.color}">${f.domain}</span>
        <span class="tag">impact ${Math.round(f.glow * 100)}%</span>
      </div>
      <h3>${f.title}</h3>
      <p>${f.blurb}</p>
      <div class="kv">${f.metrics.map(m => `<div><span>${m.label}</span><b>${m.value}</b></div>`).join("")}</div>
      <div class="tagrow">${f.tags.map(t => `<span class="tag">${t}</span>`).join("")}</div>
    </article>`;
  }).join("");
  [...grid.children].forEach(c => {
    const f = FISH.find(x => x.slug === c.dataset.slug);
    if (!f) return;
    c.onclick = () => openModal(f);
    c.onkeydown = e => { if (e.key === "Enter") openModal(f); };
  });
}

function openModal(f) {
  const d = DOMAINS[f.domain] || DOMAINS.infra;
  el("mDomain").textContent = d.label; el("mDomain").style.color = d.color;
  el("mSpecies").textContent = "species: " + f.species + " · size " + f.size + " · depth " + f.depth;
  el("mTitle").textContent = f.title;
  el("mBlurb").textContent = f.blurb;
  el("mDesc").textContent = f.description;
  el("mMetrics").innerHTML = f.metrics.map(m => `<div><span>${m.label}</span><b>${m.value}</b></div>`).join("");
  el("mTags").innerHTML = f.tags.map(t => `<span class="tag">${t}</span>`).join("");
  el("mLink").href = f.link || "#";
  el("mRef").textContent = f.detail_ref;
  const idx = FISH.indexOf(f) + 1;
  el("mIndex").textContent = String(idx).padStart(2, "0") + " / " + String(FISH.length).padStart(2, "0");
  el("modal").dataset.open = "true";
  el("mClose").focus();
}
function closeModal() { el("modal").dataset.open = "false"; }

function setView(v) {
  state.view = v;
  document.body.dataset.view = v;
  el("m3d").classList.toggle("on", v === "3d");
  el("mflat").classList.toggle("on", v === "flat");
  if (v === "flat") renderGrid();
}

function applyBake(i) {
  if (i < 0) { state.highlight = null; state.bakeIndex = -1; el("curation").classList.remove("show"); }
  else {
    const b = BAKES[i]; state.highlight = b.highlight; state.bakeIndex = i;
    el("curationLabel").textContent = "Baked for: " + b.label;
    el("curation").classList.add("show");
  }
  applyFilter();
  el("jsonOut").textContent = jsonPayload();
}

function jsonPayload() {
  return JSON.stringify({
    version: 1,
    scene: {
      tank_theme: "deep-reef",
      curation_label: state.bakeIndex >= 0 ? BAKES[state.bakeIndex].label : "All work",
      highlight_slugs: state.highlight || [],
      generated_by: "portfolio_plugin.bake_portfolio_for_job"
    },
    fish: FISH.map(f => ({
      slug: f.slug, title: f.title, species: f.species, domain: f.domain,
      size: f.size, depth: f.depth, speed: f.speed, glow: f.glow, school: f.school,
      tags: f.tags, blurb: f.blurb, detail_ref: f.detail_ref, metrics: f.metrics
    }))
  }, null, 2);
}

/* ============================================================
   RENDER LOOP
   ============================================================ */
let paused = false;
document.addEventListener("visibilitychange", () => { paused = document.hidden; });

function animate() {
  requestAnimationFrame(animate);
  if (paused || state.view !== "3d" || !webglOK) return;

  const dt = Math.min(0.05, clock.getDelta());
  const t = clock.elapsedTime;
  const st = state.timeScale;

  // The stage transition drives the descent; drag/wheel orbit within the tank.
  stage.t += (stage.tT - stage.t) * 0.055;
  const prog = stage.t;

  if (state.selected) {
    orbit.targetT.copy(state.selected.position);
    orbit.radiusT = 9;
  } else {
    // scene 0 frames the rim from above with the cat off to the right;
    // scene 1 settles into the middle of the water column
    orbit.targetT.set((1 - prog) * -3.5, (WATER_Y + 4) - prog * 20, 0);
    orbit.radiusT = clamp(orbit.radiusT, 8, MAX_RADIUS);
  }
  orbit.target.lerp(orbit.targetT, state.selected ? 0.06 : 0.05);
  orbit.yaw += (orbit.yawT - orbit.yaw) * 0.09;
  orbit.pitch += (orbit.pitchT - orbit.pitch) * 0.09;
  orbit.radius += (orbit.radiusT - orbit.radius) * 0.07;

  // idle drift so the tank breathes when nobody is dragging
  const drift = orbit.dragging || state.selected ? 0 : Math.sin(t * 0.12) * 0.06;
  const yaw = orbit.yaw + drift + pointer.x * 0.05;
  const pitch = orbit.pitch + pointer.y * 0.03;
  camera.position.set(
    orbit.target.x + Math.sin(yaw) * Math.cos(pitch) * orbit.radius,
    orbit.target.y + Math.sin(pitch) * orbit.radius,
    orbit.target.z + Math.cos(yaw) * Math.cos(pitch) * orbit.radius
  );
  camera.lookAt(orbit.target);

  // Sci-fi framing: when a specimen is locked, shift the projection window right so
  // the fish sits in the left third and the dossier owns the right.
  const wantShift = state.selected && innerWidth > 820 ? 1 : 0;
  view.shift += (wantShift - view.shift) * 0.08;
  if (view.shift > 0.002) {
    camera.setViewOffset(innerWidth, innerHeight, innerWidth * 0.19 * view.shift, 0, innerWidth, innerHeight);
  } else if (view.applied) {
    camera.clearViewOffset();
  }
  view.applied = view.shift > 0.002;

  // murkier water when zoomed on a catch — cheap depth of field
  scene.fog.density += ((state.selected ? 0.055 : 0.028) - scene.fog.density) * 0.05;

  // water surface waves
  const wp = water.geometry.attributes.position, base = water.userData.base;
  for (let i = 0; i < wp.count; i++) {
    const x = base[i * 3], z = base[i * 3 + 2];
    wp.setY(i, Math.sin(x * 0.35 + t * 1.4) * 0.22 + Math.cos(z * 0.4 + t * 1.1) * 0.18);
  }
  wp.needsUpdate = true;

  // ripples spread and fade on the surface
  for (let i = ripples.length - 1; i >= 0; i--) {
    const r = ripples[i]; r.t += dt;
    r.m.scale.setScalar(1 + r.t * 9);
    r.m.material.opacity = Math.max(0, 0.85 - r.t * 0.9);
    if (r.t > 1) { tank.remove(r.m); r.m.geometry.dispose(); r.m.material.dispose(); ripples.splice(i, 1); }
  }

  // bubbles rise
  const bp = bubbles.geometry.attributes.position.array;
  for (let i = 1; i < bp.length; i += 3) {
    bp[i] += dt * 1.6 * st;
    if (bp[i] > WATER_Y - 0.2) bp[i] = WATER_Y - 25;
  }
  bubbles.geometry.attributes.position.needsUpdate = true;

  // cat watches the pointer, paw dips on a catch
  if (catGroup) {
    // sits on the tank rim (box top is exactly WATER_Y), breathing slightly
    catGroup.position.y = WATER_Y + 3.6 + Math.sin(t * 0.8) * 0.28;
    catGroup.rotation.y += ((pointer.x * 0.35) - catGroup.rotation.y) * 0.04;
    catGroup.rotation.x += ((-0.25 - pointer.y * 0.15) - catGroup.rotation.x) * 0.04;
    const target = paw.userData.dip > 0 ? -12.5 : paw.userData.rest;
    paw.position.y += (target - paw.position.y) * 0.12;
    paw.rotation.z = Math.sin(t * 2) * 0.05;
    if (paw.userData.dip > 0) { paw.userData.dip -= dt; }
  }

  // fish swim; filter state eases into glow + scale
  fishObjs.forEach(o => {
    const m = o.mesh, u = m.userData, f = o.data;

    u.lit += (u.targetLit - u.lit) * 0.07;
    o.body.opacity = 0.25 + u.lit * 0.75;
    o.fin.opacity = 0.2 + u.lit * 0.6;
    o.body.emissiveIntensity = f.glow * 0.55 * u.lit;
    o.fin.emissiveIntensity = f.glow * 0.85 * u.lit;
    o.glowLight.intensity = f.glow * 1.4 * u.lit * (state.selected === m ? 2.4 : 1);
    // eased scale is tracked separately so per-species deformation (jellyfish pulse)
    // can never feed back into the easing and drift the fish's real size
    const sTarget = u.targetScale * (state.selected === m ? 1.35 : 1);
    u.eased = (u.eased || m.scale.x) + (sTarget - (u.eased || m.scale.x)) * 0.08;
    m.scale.setScalar(u.eased);

    if (state.selected === m) { m.rotation.y += dt * 0.45; return; }

    const ph = t * f.speed * 0.75 * st + u.phase;
    const nx = u.center.x + Math.sin(ph) * u.rx;
    const nz = u.center.z + Math.cos(ph * 0.7) * u.rz;
    const ny = u.center.y + Math.sin(ph * 1.6) * 0.7;
    const ang = Math.atan2(nx - m.position.x, nz - m.position.z);
    m.position.set(nx, ny, nz);
    m.rotation.y += (ang - m.rotation.y) * 0.09;

    const tail = m.getObjectByName("tail");
    if (tail) tail.rotation.y = Math.sin(t * 11 * f.speed * st) * 0.4;
    if (f.species === "jellyfish") {
      // bell pulse: widen as it squashes, so the eased scale above still drives size
      const p = 1 + Math.sin(t * 3.4 * st) * 0.16;
      m.scale.set(u.eased * p, u.eased * (2 - p), u.eased * p);
    }
    if (f.species === "eel") {
      for (let s = 0; s < 6; s++) {
        const seg = m.getObjectByName("seg" + s);
        if (seg) seg.position.x = Math.sin(t * 4 * st + s * 0.7) * 0.35;
      }
    }
    const lure = m.getObjectByName("lure");
    if (lure) lure.material.color.setScalar(0.6 + Math.sin(t * 3) * 0.4);
  });

  projectLabels();

  // live depth readout on the rim panel
  const dr = el("depthRead");
  if (dr) dr.textContent = (Math.min(0, orbit.target.y - WATER_Y)).toFixed(1) + "m";

  renderer.render(scene, camera);
}

const _v = new THREE.Vector3();
function projectLabels() {
  fishObjs.forEach(o => {
    if (!o.label) return;
    const u = o.mesh.userData;
    _v.copy(o.mesh.position);
    _v.y -= 1.6 * u.eased;                 // sit the label just under the fish
    _v.project(camera);
    const behind = _v.z > 1;
    // fade with the filter state, hide when off-screen, behind the camera, or tiny
    // labels belong to scene 2 only, and the locked specimen speaks through the dossier
    const inTank = stage.t > 0.75;
    const hiddenByLock = state.selected && state.selected !== o.mesh;
    const vis = inTank && !hiddenByLock && !behind
      && Math.abs(_v.x) < 1.1 && Math.abs(_v.y) < 1.1 && u.lit > 0.35;
    o.label.style.display = vis ? "block" : "none";
    if (!vis) return;
    o.label.style.left = ((_v.x * 0.5 + 0.5) * innerWidth) + "px";
    o.label.style.top = ((-_v.y * 0.5 + 0.5) * innerHeight) + "px";
    o.label.style.opacity = String(Math.min(1, u.lit));
  });
}

/* ============================================================
   WIRING
   ============================================================ */
function boot() {
  renderChips(el("domains"));
  renderChips(el("domainsFlat"), true);
  renderGrid();
  el("jsonOut").textContent = jsonPayload();

  el("m3d").onclick = () => setView("3d");
  el("mflat").onclick = () => setView("flat");
  el("mClose").onclick = release;
  el("modal").onclick = e => { if (e.target.id === "modal") release(); };
  el("jsonBtn").onclick = () => { el("jsonOut").textContent = jsonPayload(); el("drawer").dataset.open = "true"; };
  el("dClose").onclick = () => el("drawer").dataset.open = "false";
  el("copyJson").onclick = () => {
    navigator.clipboard?.writeText(jsonPayload());
    el("copyJson").textContent = "Copied ✓";
    setTimeout(() => el("copyJson").textContent = "Copy JSON", 1600);
  };
  el("bakeBtn").onclick = () => applyBake((state.bakeIndex + 1) % BAKES.length);
  el("curationClear").onclick = () => applyBake(-1);
  el("diveBtn").onclick = () => setScene(1);
  el("surfaceBtn").onclick = () => setScene(0);
  el("pawBtn").onclick = () => { if (webglOK) { paw.userData.dip = 1; spawnRipple((Math.random() - .5) * 10, (Math.random() - .5) * 6); } };

  const onQuery = e => { state.query = e.target.value; el("q").value = el("qf").value = e.target.value; applyFilter(); };
  el("q").oninput = onQuery;
  el("qf").oninput = onQuery;

  // keyboard + touch parity for the wheel-driven stage
  addEventListener("keydown", e => {
    if (state.view === "3d" && !state.selected) {
      if (e.key === "PageDown" || e.key === "ArrowDown") { e.preventDefault(); setScene(1); }
      if (e.key === "PageUp" || e.key === "ArrowUp") { e.preventDefault(); setScene(0); }
    }
    if (e.key === "Escape") {
      // Esc peels back one layer at a time: dossier → drawer → surface
      const hadSelection = !!state.selected;
      const drawerOpen = el("drawer").dataset.open === "true";
      release();
      el("drawer").dataset.open = "false";
      if (!hadSelection && !drawerOpen && state.view === "3d" && !scene1Active()) setScene(0);
    }
    if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); (state.view === "3d" ? el("q") : el("qf")).focus(); }
  });

  // WebGL is an enhancement. If it is unavailable or the visitor asked for
  // reduced motion, the flat grid is the site — same data, no downgrade in content.
  const wantFlat = qs.get("flat") === "1" || reduceMotion;
  let ok = false;
  if (!wantFlat && typeof THREE !== "undefined") {
    try { initScene(); ok = true; animate(); } catch (err) { console.warn("WebGL init failed, falling back to flat view", err); }
  }
  setView(ok ? "3d" : "flat");
  if (!ok) el("m3d").disabled = true;

  setScene(0);          // open on the cat, above the rim
  applyFilter();

  // deep link: /#/fish/<slug>
  const m = location.hash.match(/^#\/fish\/([a-z0-9-]+)$/);
  if (m) { const f = FISH.find(x => x.slug === m[1]); if (f) openModal(f); }
}

if (document.readyState === "loading") addEventListener("DOMContentLoaded", boot);
else boot();
