import { useEffect, useMemo, useState } from "react";

type Screen =
  | "inicio"
  | "biblioteca"
  | "ensamblaje"
  | "ensamblaje-interior"
  | "pruebas"
  | "estres"
  | "resultados"
  | "ajustes";
type IconName =
  | "home"
  | "book"
  | "tool"
  | "flask"
  | "activity"
  | "chart"
  | "settings"
  | "arrow"
  | "play"
  | "check"
  | "alert"
  | "download"
  | "refresh"
  | "plus"
  | "water"
  | "speed"
  | "temp"
  | "clock"
  | "weight"
  | "depth"
  | "battery"
  | "close"
  | "menu"
  | "info";

const nav: { id: Screen; label: string; icon: IconName }[] = [
  { id: "inicio", label: "Inicio", icon: "home" },
  { id: "biblioteca", label: "Biblioteca", icon: "book" },
  { id: "ensamblaje", label: "Ensamblaje exterior", icon: "tool" },
  { id: "ensamblaje-interior", label: "Ensamblaje interior", icon: "battery" },
  { id: "pruebas", label: "Pruebas", icon: "flask" },
  { id: "estres", label: "Estrés estructural", icon: "activity" },
  { id: "resultados", label: "Resultados", icon: "chart" },
];

const paths: Record<IconName, React.ReactNode> = {
  home: (
    <>
      <path d="m3 11 9-8 9 8" />
      <path d="M5 10v10h14V10M9 20v-6h6v6" />
    </>
  ),
  book: (
    <>
      <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H11v17H6.5A2.5 2.5 0 0 0 4 21.5z" />
      <path d="M20 4.5A2.5 2.5 0 0 0 17.5 2H13v17h4.5a2.5 2.5 0 0 1 2.5 2.5z" />
    </>
  ),
  tool: (
    <>
      <path d="M14.7 6.3a4 4 0 0 0-5-5L7.4 3.6l3 3 2.3-2.3a4 4 0 0 0 2 2Z" />
      <path d="m9.7 6.3-7.9 7.9a2.1 2.1 0 0 0 3 3l7.9-7.9" />
      <path d="m14 11 7 7-3 3-7-7" />
    </>
  ),
  flask: (
    <>
      <path d="M9 3h6M10 3v6l-6 10a1.3 1.3 0 0 0 1.1 2h13.8a1.3 1.3 0 0 0 1.1-2L14 9V3" />
      <path d="M7 15h10" />
    </>
  ),
  activity: <path d="M3 12h4l2.5-7 5 14 2.5-7h4" />,
  chart: (
    <>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
    </>
  ),
  arrow: (
    <>
      <path d="M5 12h14M14 7l5 5-5 5" />
    </>
  ),
  play: <path d="m8 5 11 7-11 7Z" />,
  check: <path d="m5 12 4 4L19 6" />,
  alert: (
    <>
      <path d="M12 3 2.5 20h19Z" />
      <path d="M12 9v4M12 17h.01" />
    </>
  ),
  download: (
    <>
      <path d="M12 3v12m-4-4 4 4 4-4" />
      <path d="M4 20h16" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 7v5h-5" />
      <path d="M19 12a7 7 0 1 0-2 5" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  water: (
    <>
      <path d="M12 3s-6 7-6 11a6 6 0 0 0 12 0c0-4-6-11-6-11Z" />
      <path d="M9 15a3 3 0 0 0 3 2" />
    </>
  ),
  speed: (
    <>
      <path d="M4 17a8 8 0 1 1 16 0" />
      <path d="m12 14 4-4M5 20h14" />
    </>
  ),
  temp: (
    <>
      <path d="M10 14.5V5a2 2 0 0 1 4 0v9.5a4 4 0 1 1-4 0Z" />
      <path d="M12 10v7" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  weight: (
    <>
      <path d="M7 8h10l3 13H4Z" />
      <circle cx="12" cy="6" r="3" />
    </>
  ),
  depth: (
    <>
      <path d="M4 4v16M8 7h-4M8 12H4M8 17H4" />
      <path d="m13 8 3-3 3 3M16 5v14" />
    </>
  ),
  battery: (
    <>
      <rect x="3" y="7" width="17" height="10" rx="2" />
      <path d="M22 10v4M7 10v4M11 10v4M15 10v4" />
    </>
  ),
  close: <path d="m6 6 12 12M18 6 6 18" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6M12 7h.01" />
    </>
  ),
};

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

const Button = ({
  children,
  onClick,
  variant = "primary",
  icon,
  disabled,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  icon?: IconName;
  disabled?: boolean;
  type?: "button" | "submit";
}) => (
  <button type={type} disabled={disabled} onClick={onClick} className={`button ${variant}`}>
    {icon && <Icon name={icon} size={18} />}
    <span>{children}</span>
  </button>
);

function Submarine({ assembled = true }: { assembled?: boolean }) {
  return (
    <svg
      className="submarine"
      viewBox="0 0 740 310"
      role="img"
      aria-label="Vista lateral del submarino"
    >
      <defs>
        <linearGradient id="hull" x1="0" y1="0" x2="0.8" y2="1">
          <stop stopColor={assembled ? "#2d6f8c" : "#3a5b6d"} />
          <stop offset="1" stopColor="#123649" />
        </linearGradient>
        <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#b9efff" />
          <stop offset=".5" stopColor="#45b8dc" />
          <stop offset="1" stopColor="#0d648c" />
        </linearGradient>
        <filter id="shadow">
          <feDropShadow dx="0" dy="14" stdDeviation="13" floodOpacity=".25" />
        </filter>
      </defs>
      <g opacity=".45">
        <path d="M48 250h645" stroke="#82cbe0" strokeDasharray="3 10" />
        <path d="M80 76h580" stroke="#82cbe0" strokeDasharray="3 10" />
      </g>
      <g filter="url(#shadow)">
        <path
          d="M112 168c24-75 117-106 304-93 94 7 162 39 205 91-47 51-116 80-222 82-168 4-261-21-287-80Z"
          fill="url(#hull)"
          stroke="#83cbe0"
          strokeWidth="3"
        />
        <path
          d="M620 165c41-26 73-49 90-73l-7 68 7 67c-26-31-55-51-90-62Z"
          fill="#18485e"
          stroke="#78bcd1"
          strokeWidth="3"
        />
        <path
          d="m163 205-91 42 21-64 72-22M164 124 76 87l21 61 66 17"
          fill="#1c5269"
          stroke="#78bcd1"
          strokeWidth="3"
        />
        <path
          d="M326 78c9-42 26-59 52-59h53c17 0 28 17 34 56Z"
          fill="#1b4d64"
          stroke="#78bcd1"
          strokeWidth="3"
        />
        <path d="M378 19V4h58v16" stroke="#78bcd1" strokeWidth="5" />
        <path d="M413 5v-20h42" stroke="#78bcd1" strokeWidth="5" />
        {[225, 302, 379, 456, 533].map((x) => (
          <g key={x}>
            <circle cx={x} cy="162" r="25" fill="#0b2e42" stroke="#9ad8e9" strokeWidth="5" />
            <circle cx={x} cy="162" r="17" fill="url(#glass)" />
            <path d={`M${x - 11} 153c8-8 17-8 23-1`} stroke="white" opacity=".55" />
          </g>
        ))}
        <path
          d="M170 201c91 26 278 28 402-4"
          fill="none"
          stroke="#0c2d3d"
          strokeWidth="3"
          opacity=".8"
        />
      </g>
    </svg>
  );
}

function PageTitle({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="page-title">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children}
    </header>
  );
}

function Home({ go }: { go: (s: Screen) => void }) {
  return (
    <div className="home-page">
      <section className="hero">
        <div className="hero-copy">
          <div className="badge">
            <span className="badge-dot" /> Simulación naval educativa
          </div>
          <h1>
            Diseña. Construye.
            <br />
            <em>Sumérgete.</em>
          </h1>
          <p>
            Experimenta con ingeniería naval en un entorno seguro. Ensambla tu submarino, ponlo a
            prueba y descubre hasta dónde puede llegar.
          </p>
          <div className="hero-actions">
            <Button onClick={() => (window.location.href = "../index.html")} icon="arrow">
              Abrir simulador 3D
            </Button>
            <Button onClick={() => (window.location.href = "../learn.html")} variant="secondary" icon="book">
              Explorar aprendizaje STEAM
            </Button>
          </div>
          <div className="trust-row">
            <span>
              <Icon name="check" size={16} /> Sin conocimientos previos
            </span>
            <span>
              <Icon name="check" size={16} /> Física en tiempo real
            </span>
          </div>
        </div>
        <div className="hero-visual">
          <div className="depth-label depth-one">50 m</div>
          <div className="depth-label depth-two">100 m</div>
          <div className="sonar-ring r1" />
          <div className="sonar-ring r2" />
          <div className="hero-glow" />
          <Submarine />
          <div className="floating-card">
            <span>Estado del sistema</span>
            <strong>
              <i /> Todos los sistemas operativos
            </strong>
          </div>
        </div>
      </section>
      <section className="how">
        <div className="section-heading">
          <span className="eyebrow">Cómo funciona</span>
          <h2>De la idea a las profundidades</h2>
          <p>Tres pasos para comprobar si tu diseño está preparado para el océano.</p>
        </div>
        <div className="steps">
          {[
            [
              "01",
              "tool" as IconName,
              "Ensambla",
              "Selecciona el casco, la propulsión y los sistemas. Cada decisión cambia el rendimiento.",
            ],
            [
              "02",
              "flask" as IconName,
              "Ponlo a prueba",
              "Configura profundidad, temperatura y corriente en un laboratorio virtual.",
            ],
            [
              "03",
              "chart" as IconName,
              "Analiza",
              "Revisa los resultados y mejora tu diseño con datos fáciles de interpretar.",
            ],
          ].map(([n, ic, title, text]) => (
            <article className="step-card" key={String(n)}>
              <span className="step-number">{n}</span>
              <div className="step-icon">
                <Icon name={ic as IconName} />
              </div>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

const bookParts = [
  {
    title: "Casco de presión",
    category: "Estructura",
    text: "Protege la tripulación y los sistemas frente a la presión exterior.",
    specs: ["Acero HY-80", "Diseño: 400 m"],
  },
  {
    title: "Sistema de propulsión",
    category: "Movimiento",
    text: "Convierte energía eléctrica en empuje para desplazar el submarino.",
    specs: ["45 kW", "Empuje: 8.200 N"],
  },
  {
    title: "Tanques de lastre",
    category: "Flotabilidad",
    text: "Controlan la inmersión variando el peso total del vehículo.",
    specs: ["4,8 m³", "Control variable"],
  },
  {
    title: "Batería principal",
    category: "Energía",
    text: "Alimenta la propulsión, navegación y sistemas auxiliares.",
    specs: ["84 kWh", "Litio marino"],
  },
  {
    title: "Sonar activo",
    category: "Navegación",
    text: "Detecta objetos y mide distancias mediante pulsos acústicos.",
    specs: ["2.400 m", "360°"],
  },
  {
    title: "Planos de control",
    category: "Maniobra",
    text: "Permiten controlar el cabeceo, el giro y la profundidad.",
    specs: ["Aluminio naval", "4 superficies"],
  },
];

function Library() {
  const [tab, setTab] = useState<"piezas" | "materiales">("piezas");
  return (
    <div className="page">
      <PageTitle
        eyebrow="Centro de aprendizaje"
        title="Biblioteca técnica"
        description="Consulta conceptos y especificaciones antes de construir tu submarino."
      />
      <div className="segmented">
        <button className={tab === "piezas" ? "active" : ""} onClick={() => setTab("piezas")}>
          <Icon name="tool" size={17} /> Piezas y ensamblaje
        </button>
        <button
          className={tab === "materiales" ? "active" : ""}
          onClick={() => setTab("materiales")}
        >
          <Icon name="book" size={17} /> Materiales
        </button>
      </div>
      {tab === "piezas" ? (
        <>
          <div className="chapter-banner">
            <div>
              <span>LIBRO 01</span>
              <h2>Componentes de un submarino</h2>
              <p>Conoce la función de cada sistema y cómo afecta al comportamiento del conjunto.</p>
            </div>
            <div className="chapter-mark">01</div>
          </div>
          <div className="library-grid">
            {bookParts.map((p, i) => (
              <article className="part-card" key={p.title}>
                <div className="part-art">
                  <PartIcon index={i} />
                  <span>{p.category}</span>
                </div>
                <div className="part-body">
                  <h3>{p.title}</h3>
                  <p>{p.text}</p>
                  <div className="specs">
                    {p.specs.map((s) => (
                      <span key={s}>{s}</span>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="chapter-banner material">
            <div>
              <span>LIBRO 02</span>
              <h2>Materiales bajo presión</h2>
              <p>Compara resistencia, densidad y coste para elegir el material adecuado.</p>
            </div>
            <div className="chapter-mark">02</div>
          </div>
          <div className="material-table card">
            <div className="table-row table-head">
              <span>Material</span>
              <span>Densidad</span>
              <span>Resistencia</span>
              <span>Uso recomendado</span>
            </div>
            {[
              ["Acero HY-80", "7.850 kg/m³", "550 MPa", "Cascos de profundidad media"],
              ["Titanio grado 5", "4.430 kg/m³", "880 MPa", "Inmersión profunda"],
              ["Aluminio 5083", "2.660 kg/m³", "215 MPa", "Estructuras auxiliares"],
              ["Acrílico técnico", "1.180 kg/m³", "72 MPa", "Domos de observación"],
            ].map((r) => (
              <div className="table-row" key={r[0]}>
                {r.map((x, i) => (
                  <span key={x}>
                    {i === 0 && <i className={`mat-dot m${i}`} />} {x}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function PartIcon({ index }: { index: number }) {
  const shapes = [
    <>
      <rect x="16" y="33" width="68" height="34" rx="17" />
      <path d="M28 37v26M72 37v26" />
    </>,
    <>
      <rect x="20" y="38" width="48" height="24" rx="8" />
      <circle cx="70" cy="50" r="10" />
      <path d="m78 43 10-13M80 50h14M78 57l10 13" />
    </>,
    <>
      <rect x="25" y="24" width="50" height="52" rx="8" />
      <path d="M30 38h40M30 62h40M43 20h14" />
    </>,
    <>
      <rect x="18" y="30" width="64" height="40" rx="6" />
      <path d="M82 42h7v16h-7M32 40v20M24 50h16M60 40v20M52 50h16" />
    </>,
    <>
      <circle cx="50" cy="50" r="28" />
      <circle cx="50" cy="50" r="16" />
      <path d="M50 13v14M50 73v14M13 50h14M73 50h14" />
    </>,
    <>
      <path d="M50 50 8 23l17 38 25 7 25-7 17-38Z" />
      <path d="M50 50v36" />
    </>,
  ];
  return <svg viewBox="0 0 100 100">{shapes[index]}</svg>;
}

const exteriorSlots = [
  ["casco", "Casco de presión", true],
  ["propulsion", "Propulsión", true],
  ["lastre", "Tanques de lastre", true],
  ["aletas", "Planos de control", false],
  ["sonar", "Sonar", false],
];
const interiorSlots = [
  ["bateria", "Batería principal", true],
  ["control", "Puesto de mando", true],
  ["soporte", "Soporte vital", true],
  ["navegacion", "Navegación", false],
  ["comunicacion", "Comunicaciones", false],
  ["habitaculo", "Módulo de tripulación", false],
];
const variants: Record<string, { name: string; detail: string; best?: boolean }[]> = {
  casco: [
    { name: "Casco HY-80", detail: "400 m · 4.850 kg", best: true },
    { name: "Casco de titanio", detail: "800 m · 3.220 kg" },
    { name: "Casco compacto", detail: "250 m · 3.610 kg" },
  ],
  propulsion: [
    { name: "Motor eléctrico M45", detail: "45 kW · 8.200 N", best: true },
    { name: "Doble propulsor", detail: "68 kW · 11.400 N" },
    { name: "Propulsión silenciosa", detail: "32 kW · 6.500 N" },
  ],
  lastre: [
    { name: "Lastre variable V4", detail: "4,8 m³ · 460 kg", best: true },
    { name: "Lastre compacto", detail: "3,2 m³ · 330 kg" },
  ],
  bateria: [
    { name: "Litio marino 84", detail: "84 kWh · 610 kg", best: true },
    { name: "Plomo sellado", detail: "52 kWh · 890 kg" },
  ],
  aletas: [
    { name: "Planos estándar", detail: "3,6 m² · 180 kg", best: true },
    { name: "Planos ágiles", detail: "4,4 m² · 240 kg" },
  ],
  sonar: [
    { name: "Sonar SX-2400", detail: "2.400 m · 1,8 kW", best: true },
    { name: "Sonar compacto", detail: "1.200 m · 0,8 kW" },
  ],
  control: [
    { name: "Consola integrada C4", detail: "4 estaciones · 210 kg", best: true },
    { name: "Mando compacto C2", detail: "2 estaciones · 145 kg" },
  ],
  soporte: [
    { name: "Soporte vital LV-12", detail: "12 h · 4 tripulantes", best: true },
    { name: "Soporte vital LV-24", detail: "24 h · 4 tripulantes" },
  ],
  navegacion: [
    { name: "Navegación inercial N7", detail: "Precisión ±0,4% · 68 kg", best: true },
    { name: "Navegación híbrida N9", detail: "Inercial + Doppler · 94 kg" },
  ],
  comunicacion: [
    { name: "Radio acústica A12", detail: "12 km · 1,2 kW", best: true },
    { name: "Boya de enlace B20", detail: "20 km · 42 kg" },
  ],
  habitaculo: [
    { name: "Cabina científica", detail: "4 plazas · 360 kg", best: true },
    { name: "Cabina de larga estancia", detail: "3 plazas · 510 kg" },
  ],
};

function AssemblyModeSwitch({
  active,
  go,
}: {
  active: "exterior" | "interior";
  go: (s: Screen) => void;
}) {
  return (
    <div className="assembly-mode" aria-label="Tipo de ensamblaje">
      <button className={active === "exterior" ? "active" : ""} onClick={() => go("ensamblaje")}>
        <span>01</span>
        <div>
          <strong>Exterior</strong>
          <small>Casco y sistemas externos</small>
        </div>
      </button>
      <i />
      <button
        className={active === "interior" ? "active" : ""}
        onClick={() => go("ensamblaje-interior")}
      >
        <span>02</span>
        <div>
          <strong>Interior</strong>
          <small>Equipamiento y habitabilidad</small>
        </div>
      </button>
    </div>
  );
}

function Assembly({ go }: { go: (s: Screen) => void }) {
  const [selected, setSelected] = useState("casco");
  const [installed, setInstalled] = useState<Record<string, number>>({
    casco: 0,
    propulsion: 0,
    lastre: 0,
  });
  const done = Object.keys(installed).length;
  const selectPart = (i: number) => setInstalled((p) => ({ ...p, [selected]: i }));
  return (
    <div className="page assembly-page">
      <PageTitle
        eyebrow="Taller de diseño"
        title="Ensamblaje exterior"
        description="Configura el casco y los sistemas que interactúan directamente con el entorno."
      >
        <div className="progress-chip">
          <span>
            {done} de {exteriorSlots.length} sistemas
          </span>
          <div>
            <i style={{ width: `${(done / exteriorSlots.length) * 100}%` }} />
          </div>
        </div>
      </PageTitle>
      <AssemblyModeSwitch active="exterior" go={go} />
      <div className="assembly-layout">
        <aside className="systems card">
          <div className="card-title">
            <div>
              <span>PASO 1</span>
              <h3>Selecciona un sistema</h3>
            </div>
          </div>
          <div className="system-list">
            {exteriorSlots.map(([id, label, required], i) => (
              <button
                key={String(id)}
                className={selected === id ? "active" : ""}
                onClick={() => setSelected(String(id))}
              >
                <span className="system-num">{String(i + 1).padStart(2, "0")}</span>
                <span className="system-name">
                  {label}
                  <small>{required ? "Obligatorio" : "Opcional"}</small>
                </span>
                {installed[String(id)] !== undefined ? (
                  <span className="status installed">
                    <Icon name="check" size={14} />
                  </span>
                ) : (
                  <span className="status" />
                )}
              </button>
            ))}
          </div>
        </aside>
        <section className="workbench">
          <div className="sub-view">
            <div className="view-label">
              <span>
                <i /> VISTA LATERAL
              </span>
              <small>Haz clic en un sistema para editarlo</small>
            </div>
            <Submarine assembled={done >= 4} />
            <div className="view-tools">
              <button title="Alejar">−</button>
              <button title="Acercar">+</button>
              <button title="Restablecer">
                <Icon name="refresh" size={16} />
              </button>
            </div>
          </div>
          <div className="part-selector card">
            <div className="part-select-head">
              <div>
                <span>PASO 2</span>
                <h3>Elige una pieza</h3>
                <p>{exteriorSlots.find((s) => s[0] === selected)?.[1]}</p>
              </div>
              <span className="option-count">{variants[selected].length} opciones</span>
            </div>
            <div className="variant-list">
              {variants[selected].map((v, i) => (
                <button
                  key={v.name}
                  onClick={() => selectPart(i)}
                  className={installed[selected] === i ? "selected" : ""}
                >
                  <div className="variant-art">
                    <PartIcon
                      index={Math.max(
                        0,
                        exteriorSlots.findIndex((s) => s[0] === selected),
                      )}
                    />
                  </div>
                  <div>
                    <div className="variant-name">
                      {v.name}
                      {v.best && <span>Recomendado</span>}
                    </div>
                    <small>{v.detail}</small>
                  </div>
                  <span className="radio">{installed[selected] === i && <i />}</span>
                </button>
              ))}
            </div>
          </div>
        </section>
        <aside className="summary card">
          <div className="card-title">
            <div>
              <span>RESUMEN</span>
              <h3>Tu diseño</h3>
            </div>
          </div>
          <div className="design-state success">
            <Icon name="check" size={18} />
            <div>
              <strong>Diseño estable</strong>
              <span>Los sistemas básicos son compatibles.</span>
            </div>
          </div>
          <div className="metric-list">
            <div>
              <span>
                <Icon name="weight" size={17} /> Masa total
              </span>
              <strong>{done >= 4 ? "6.240" : "4.850"} kg</strong>
            </div>
            <div>
              <span>
                <Icon name="water" size={17} /> Flotabilidad neta
              </span>
              <strong className="good">+ 320 kg</strong>
            </div>
            <div>
              <span>
                <Icon name="depth" size={17} /> Profundidad diseño
              </span>
              <strong>400 m</strong>
            </div>
            <div>
              <span>
                <Icon name="clock" size={17} /> Autonomía estimada
              </span>
              <strong>{done >= 4 ? "14,2 h" : "—"}</strong>
            </div>
          </div>
          <div className="required-note">
            <Icon name="info" size={17} />
            <p>Completa el casco exterior antes de equipar los compartimentos internos.</p>
          </div>
          <Button onClick={() => go("ensamblaje-interior")} disabled={done < 3} icon="arrow">
            Continuar al interior
          </Button>
          <button className="text-button" onClick={() => setInstalled({})}>
            Empezar de nuevo
          </button>
        </aside>
      </div>
    </div>
  );
}

function InteriorCutaway({
  selected,
  installed,
  onSelect,
}: {
  selected: string;
  installed: Record<string, number>;
  onSelect: (id: string) => void;
}) {
  const rooms = [
    ["bateria", "Energía", "battery"],
    ["habitaculo", "Tripulación", "home"],
    ["control", "Mando", "settings"],
    ["navegacion", "Navegación", "depth"],
    ["soporte", "Soporte vital", "water"],
    ["comunicacion", "Comunicaciones", "activity"],
  ] as [string, string, IconName][];
  return (
    <div className="cutaway" aria-label="Corte interior del submarino">
      <div className="cutaway-shell">
        {rooms.map(([id, label, icon]) => (
          <button
            key={id}
            className={`${selected === id ? "active" : ""} ${installed[id] !== undefined ? "installed" : ""}`}
            onClick={() => onSelect(id)}
          >
            <Icon name={icon} size={18} />
            <span>{label}</span>
            {installed[id] !== undefined && <Icon name="check" size={12} />}
          </button>
        ))}
      </div>
      <div className="cutaway-propeller">
        <i />
        <i />
        <i />
      </div>
    </div>
  );
}

function InteriorAssembly({ go }: { go: (s: Screen) => void }) {
  const [selected, setSelected] = useState("bateria");
  const [installed, setInstalled] = useState<Record<string, number>>({
    bateria: 0,
    control: 0,
    soporte: 0,
  });
  const done = Object.keys(installed).length;
  const requiredDone = ["bateria", "control", "soporte"].every((id) => installed[id] !== undefined);
  const selectPart = (i: number) => setInstalled((current) => ({ ...current, [selected]: i }));
  return (
    <div className="page assembly-page interior-assembly-page">
      <PageTitle
        eyebrow="Taller de diseño · Etapa 2 de 2"
        title="Ensamblaje interior"
        description="Distribuye los sistemas de energía, control y habitabilidad dentro del casco."
      >
        <div className="progress-chip">
          <span>
            {done} de {interiorSlots.length} sistemas
          </span>
          <div>
            <i style={{ width: `${(done / interiorSlots.length) * 100}%` }} />
          </div>
        </div>
      </PageTitle>
      <AssemblyModeSwitch active="interior" go={go} />
      <div className="assembly-layout">
        <aside className="systems card">
          <div className="card-title">
            <div>
              <span>PASO 1</span>
              <h3>Selecciona un compartimento</h3>
            </div>
          </div>
          <div className="system-list">
            {interiorSlots.map(([id, label, required], i) => (
              <button
                key={String(id)}
                className={selected === id ? "active" : ""}
                onClick={() => setSelected(String(id))}
              >
                <span className="system-num">{String(i + 1).padStart(2, "0")}</span>
                <span className="system-name">
                  {label}
                  <small>{required ? "Obligatorio" : "Opcional"}</small>
                </span>
                {installed[String(id)] !== undefined ? (
                  <span className="status installed">
                    <Icon name="check" size={14} />
                  </span>
                ) : (
                  <span className="status" />
                )}
              </button>
            ))}
          </div>
        </aside>
        <section className="workbench">
          <div className="sub-view interior-view">
            <div className="view-label">
              <span>
                <i /> CORTE LONGITUDINAL
              </span>
              <small>Selecciona un compartimento para editarlo</small>
            </div>
            <InteriorCutaway selected={selected} installed={installed} onSelect={setSelected} />
            <div className="cutaway-legend">
              <span>
                <i className="required" /> Sistema obligatorio
              </span>
              <span>
                <i className="optional" /> Sistema opcional
              </span>
            </div>
          </div>
          <div className="part-selector card">
            <div className="part-select-head">
              <div>
                <span>PASO 2</span>
                <h3>Elige el equipamiento</h3>
                <p>{interiorSlots.find((slot) => slot[0] === selected)?.[1]}</p>
              </div>
              <span className="option-count">{variants[selected].length} opciones</span>
            </div>
            <div className="variant-list">
              {variants[selected].map((variant, i) => (
                <button
                  key={variant.name}
                  onClick={() => selectPart(i)}
                  className={installed[selected] === i ? "selected" : ""}
                >
                  <div className="variant-art interior-part-art">
                    <Icon
                      name={
                        (["battery", "settings", "water", "depth", "activity", "home"][
                          Math.max(
                            0,
                            interiorSlots.findIndex((slot) => slot[0] === selected),
                          )
                        ] ?? "settings") as IconName
                      }
                      size={24}
                    />
                  </div>
                  <div>
                    <div className="variant-name">
                      {variant.name}
                      {variant.best && <span>Recomendado</span>}
                    </div>
                    <small>{variant.detail}</small>
                  </div>
                  <span className="radio">{installed[selected] === i && <i />}</span>
                </button>
              ))}
            </div>
          </div>
        </section>
        <aside className="summary card">
          <div className="card-title">
            <div>
              <span>RESUMEN INTERIOR</span>
              <h3>Disponibilidad operativa</h3>
            </div>
          </div>
          <div className={`design-state ${requiredDone ? "success" : ""}`}>
            <Icon name={requiredDone ? "check" : "alert"} size={18} />
            <div>
              <strong>{requiredDone ? "Interior operativo" : "Configuración incompleta"}</strong>
              <span>
                {requiredDone
                  ? "Los sistemas esenciales están conectados."
                  : "Faltan sistemas obligatorios."}
              </span>
            </div>
          </div>
          <div className="metric-list">
            <div>
              <span>
                <Icon name="battery" size={17} /> Energía disponible
              </span>
              <strong>84 kWh</strong>
            </div>
            <div>
              <span>
                <Icon name="home" size={17} /> Capacidad
              </span>
              <strong>4 personas</strong>
            </div>
            <div>
              <span>
                <Icon name="clock" size={17} /> Soporte vital
              </span>
              <strong>12 h</strong>
            </div>
            <div>
              <span>
                <Icon name="weight" size={17} /> Carga interior
              </span>
              <strong>1.180 kg</strong>
            </div>
          </div>
          <div className="required-note">
            <Icon name="info" size={17} />
            <p>Los sistemas opcionales mejoran la misión, pero no bloquean las pruebas.</p>
          </div>
          <Button onClick={() => go("pruebas")} disabled={!requiredDone} icon="arrow">
            Continuar a pruebas
          </Button>
          <button className="text-button" onClick={() => go("ensamblaje")}>
            Volver al exterior
          </button>
        </aside>
      </div>
    </div>
  );
}

const trialTypes = [
  [
    "inmersion",
    "Inmersión controlada",
    "Desciende a la profundidad objetivo y evalúa estabilidad.",
  ],
  ["maniobra", "Prueba de maniobra", "Mide velocidad, giro y respuesta de los controles."],
  ["autonomia", "Autonomía", "Estima consumo y alcance durante una navegación constante."],
  [
    "emergencia",
    "Ascenso de emergencia",
    "Simula una pérdida de energía y evalúa la recuperación.",
  ],
];

function Trials({ go }: { go: (s: Screen) => void }) {
  const [type, setType] = useState("inmersion");
  const [depth, setDepth] = useState(250);
  const [speed, setSpeed] = useState(4);
  const [temp, setTemp] = useState(12);
  const [current, setCurrent] = useState(0.3);
  const [duration, setDuration] = useState(300);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(
      () =>
        setProgress((p) => {
          if (p >= 100) {
            window.clearInterval(id);
            setRunning(false);
            window.setTimeout(() => go("estres"), 300);
            return 100;
          }
          return p + 4;
        }),
      80,
    );
    return () => window.clearInterval(id);
  }, [running, go]);
  const fields = [
    ["depth" as const, "Profundidad objetivo", depth, setDepth, "m", "depth" as IconName, 0, 600],
    ["speed" as const, "Velocidad objetivo", speed, setSpeed, "nudos", "speed" as IconName, 0, 8],
    ["temp" as const, "Temperatura del agua", temp, setTemp, "°C", "temp" as IconName, -2, 35],
    [
      "current" as const,
      "Velocidad de corriente",
      current,
      setCurrent,
      "m/s",
      "water" as IconName,
      0,
      2,
    ],
    [
      "duration" as const,
      "Duración",
      duration,
      setDuration,
      "segundos",
      "clock" as IconName,
      30,
      1200,
    ],
  ];
  return (
    <div className="page">
      <PageTitle
        eyebrow="Laboratorio virtual"
        title="Configura la prueba"
        description="Define el ensayo y las condiciones del entorno antes de iniciar la simulación."
      >
        <span className="ready-pill">
          <i /> Diseño listo para probar
        </span>
      </PageTitle>
      <div className="trial-layout">
        <section className="trial-main">
          <div className="card config-card">
            <div className="number-title">
              <span>01</span>
              <div>
                <h3>Tipo de ensayo</h3>
                <p>¿Qué comportamiento quieres evaluar?</p>
              </div>
            </div>
            <div className="trial-types">
              {trialTypes.map((t) => (
                <button
                  key={t[0]}
                  onClick={() => setType(t[0])}
                  className={type === t[0] ? "active" : ""}
                >
                  <span className="trial-radio">
                    <i />
                  </span>
                  <div>
                    <strong>{t[1]}</strong>
                    <small>{t[2]}</small>
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div className="card config-card">
            <div className="number-title">
              <span>02</span>
              <div>
                <h3>Condiciones de simulación</h3>
                <p>Ajusta los parámetros del entorno.</p>
              </div>
            </div>
            <div className="fields">
              {fields.map(([, label, value, setter, unit, icon, min, max]) => (
                <label key={label}>
                  <span>
                    <Icon name={icon as IconName} size={18} />
                    {label}
                  </span>
                  <div>
                    <input
                      type="number"
                      value={value}
                      min={min as number}
                      max={max as number}
                      step={label.includes("corriente") ? 0.1 : 1}
                      onChange={(e) => (setter as (n: number) => void)(Number(e.target.value))}
                    />
                    <small>{unit}</small>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </section>
        <aside className="run-panel card">
          <div className="run-visual">
            <div className="sea-lines" />
            <Submarine />
            <span className="depth-marker">{depth} m</span>
          </div>
          <h3>Resumen de la prueba</h3>
          <div className="run-summary">
            <div>
              <span>Ensayo</span>
              <strong>{trialTypes.find((t) => t[0] === type)?.[1]}</strong>
            </div>
            <div>
              <span>Profundidad</span>
              <strong>{depth} m</strong>
            </div>
            <div>
              <span>Duración simulada</span>
              <strong>
                {Math.floor(duration / 60)} min {duration % 60 || ""}
              </strong>
            </div>
          </div>
          <div className="criteria">
            <span>
              <Icon name="check" size={15} /> Casco dentro del límite
            </span>
            <span>
              <Icon name="check" size={15} /> Energía suficiente
            </span>
            <span>
              <Icon name="check" size={15} /> Flotabilidad estable
            </span>
          </div>
          {running ? (
            <div className="running">
              <div>
                <span>Ejecutando simulación…</span>
                <strong>{progress}%</strong>
              </div>
              <div className="progress">
                <i style={{ width: `${progress}%` }} />
              </div>
            </div>
          ) : (
            <Button
              onClick={() => {
                setProgress(0);
                setRunning(true);
              }}
              icon="play"
            >
              Ejecutar simulación
            </Button>
          )}
          <p className="privacy-note">
            <Icon name="info" size={15} /> El proceso tardará solo unos segundos.
          </p>
        </aside>
      </div>
      <Button variant="ghost" onClick={() => go("ensamblaje-interior")}>
        ← Volver al ensamblaje interior
      </Button>
    </div>
  );
}

function Stress({ go }: { go: (s: Screen) => void }) {
  const [depth, setDepth] = useState(250);
  const ratio = Math.min(100, Math.round(depth / 4.8));
  const safe = depth < 380;
  return (
    <div className="page">
      <PageTitle
        eyebrow="Análisis de integridad"
        title="Estrés estructural"
        description="Observa cómo responde el casco a la presión en diferentes profundidades."
      />
      <div className="stress-layout">
        <section className="stress-view card">
          <div className="stress-toolbar">
            <span>MAPA DE ESFUERZO</span>
            <div className="legend">
              <small>Bajo</small>
              <i />
              <small>Alto</small>
            </div>
          </div>
          <div className="stress-sub">
            <Submarine />
            <div className="pressure-wave p1" />
            <div className="pressure-wave p2" />
            <div className="stress-callout">
              Zona de mayor carga<span>{ratio}% del límite</span>
            </div>
          </div>
          <div className="depth-control">
            <div>
              <label htmlFor="depth-range">Profundidad analizada</label>
              <strong>{depth} m</strong>
            </div>
            <input
              id="depth-range"
              type="range"
              min="0"
              max="520"
              step="5"
              value={depth}
              onChange={(e) => setDepth(Number(e.target.value))}
            />
            <div className="range-labels">
              <span>Superficie</span>
              <span>Límite: 480 m</span>
            </div>
          </div>
        </section>
        <aside className="stress-data">
          <div className={`verdict-card ${safe ? "safe" : "warning"}`}>
            <div className="verdict-icon">
              <Icon name={safe ? "check" : "alert"} size={23} />
            </div>
            <div>
              <span>ESTADO DEL CASCO</span>
              <h3>{safe ? "Estructura segura" : "Margen reducido"}</h3>
              <p>
                {safe
                  ? "El casco soporta las cargas con un margen adecuado."
                  : "La profundidad está cerca del límite de diseño."}
              </p>
            </div>
          </div>
          <div className="card readings">
            <h3>Lecturas del análisis</h3>
            <div>
              <span>
                Presión exterior<small>Presión manométrica</small>
              </span>
              <strong>
                {(depth / 10.3).toFixed(1)} <small>atm</small>
              </strong>
            </div>
            <div>
              <span>
                Esfuerzo de membrana<small>Tensión equivalente</small>
              </span>
              <strong>
                {Math.round(depth * 0.53)} <small>MPa</small>
              </strong>
            </div>
            <div>
              <span>
                Uso estructural<small>Respecto al colapso</small>
              </span>
              <strong className={safe ? "good" : "warn"}>
                {ratio} <small>%</small>
              </strong>
            </div>
            <div>
              <span>
                Factor de seguridad<small>Objetivo mínimo: 1,5</small>
              </span>
              <strong>{Math.max(0.9, 3.25 - depth / 210).toFixed(2)}</strong>
            </div>
          </div>
          <div className="info-card">
            <Icon name="info" size={18} />
            <p>
              <strong>Sobre este análisis</strong>Modelo simplificado por secciones. Los resultados
              son educativos y no sustituyen un análisis de ingeniería certificado.
            </p>
          </div>
          <Button onClick={() => go("resultados")} icon="arrow">
            Ver resultados completos
          </Button>
        </aside>
      </div>
      <Button variant="ghost" onClick={() => go("pruebas")}>
        ← Volver a las pruebas
      </Button>
    </div>
  );
}

function MiniChart({ type }: { type: "depth" | "battery" }) {
  const line =
    type === "depth"
      ? "M8 25 C45 25 42 62 76 67 S134 72 157 98 S210 119 280 120"
      : "M8 20 C55 27 84 34 118 52 S185 74 280 112";
  return (
    <svg className="mini-chart" viewBox="0 0 290 140" preserveAspectRatio="none">
      <g className="grid-lines">
        <path d="M0 20h290M0 55h290M0 90h290M0 125h290" />
      </g>
      <path className={type} d={line} />
      <circle cx="280" cy={type === "depth" ? 120 : 112} r="4" />
    </svg>
  );
}

function Results({ go }: { go: (s: Screen) => void }) {
  return (
    <div className="page results-page">
      <PageTitle
        eyebrow="Informe de simulación"
        title="Resultados de la prueba"
        description="Inmersión controlada · 5 minutos de simulación"
      >
        <Button variant="secondary" icon="download">
          Exportar informe
        </Button>
      </PageTitle>
      <div className="result-verdict">
        <div className="result-check">
          <Icon name="check" size={30} />
        </div>
        <div>
          <span>RESULTADO GENERAL</span>
          <h2>Prueba superada</h2>
          <p>Tu submarino completó la inmersión y cumplió todos los criterios de seguridad.</p>
        </div>
        <div className="score">
          <strong>92</strong>
          <span>/ 100</span>
          <small>PUNTUACIÓN</small>
        </div>
      </div>
      <div className="kpis">
        {[
          ["depth", "Profundidad máxima", "252,4", "m", "Objetivo: 250 m"],
          ["speed", "Velocidad máxima", "4,2", "nudos", "Objetivo: 4 nudos"],
          ["battery", "Energía utilizada", "18,7", "kWh", "22% de la capacidad"],
          ["activity", "Estabilidad media", "96", "%", "Excelente"],
        ].map(([ic, l, v, u, note]) => (
          <div className="kpi card" key={l}>
            <div className="kpi-icon">
              <Icon name={ic as IconName} />
            </div>
            <span>{l}</span>
            <div>
              <strong>{v}</strong>
              <small>{u}</small>
            </div>
            <em>
              <Icon name="check" size={13} />
              {note}
            </em>
          </div>
        ))}
      </div>
      <div className="result-grid">
        <div className="card criteria-card">
          <div className="section-card-head">
            <div>
              <h3>Criterios de evaluación</h3>
              <p>4 de 4 criterios superados</p>
            </div>
            <span className="percent">100%</span>
          </div>
          {[
            ["Alcanzar la profundidad objetivo", "252,4 m de 250 m"],
            ["Mantener estabilidad vertical", "Variación máxima de ±1,8 m"],
            ["Conservar margen estructural", "Factor de seguridad mínimo: 1,84"],
            ["Finalizar con energía suficiente", "78% de batería restante"],
          ].map((x, i) => (
            <div className="criterion" key={x[0]}>
              <span className="criterion-check">
                <Icon name="check" size={15} />
              </span>
              <div>
                <strong>{x[0]}</strong>
                <small>{x[1]}</small>
              </div>
              <span className="pass">SUPERADO</span>
            </div>
          ))}
        </div>
        <div className="card chart-card">
          <div className="section-card-head">
            <div>
              <h3>Profundidad</h3>
              <p>Evolución durante la prueba</p>
            </div>
            <span className="chart-legend">
              <i /> Profundidad
            </span>
          </div>
          <MiniChart type="depth" />
          <div className="axis">
            <span>0 min</span>
            <span>2,5 min</span>
            <span>5 min</span>
          </div>
        </div>
        <div className="card chart-card">
          <div className="section-card-head">
            <div>
              <h3>Consumo de energía</h3>
              <p>Batería restante</p>
            </div>
            <span className="chart-legend green">
              <i /> Batería
            </span>
          </div>
          <MiniChart type="battery" />
          <div className="axis">
            <span>100%</span>
            <span>89%</span>
            <span>78%</span>
          </div>
        </div>
      </div>
      <div className="next-actions">
        <div>
          <h3>¿Qué quieres hacer ahora?</h3>
          <p>Repite la prueba o mejora el diseño para alcanzar una puntuación aún mayor.</p>
        </div>
        <div>
          <Button variant="secondary" onClick={() => go("pruebas")} icon="refresh">
            Nueva prueba
          </Button>
          <Button onClick={() => go("ensamblaje")} icon="tool">
            Modificar diseño
          </Button>
        </div>
      </div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      aria-label={checked ? "Desactivar" : "Activar"}
      className={`toggle ${checked ? "on" : ""}`}
      onClick={onChange}
    >
      <i />
    </button>
  );
}

function Settings() {
  const [grid, setGrid] = useState(true),
    [hud, setHud] = useState(true),
    [simple, setSimple] = useState(false);
  const [saved, setSaved] = useState(false);
  const save = () => {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  };
  return (
    <div className="page settings-page">
      <PageTitle
        eyebrow="Preferencias"
        title="Configuración"
        description="Personaliza el entorno y el comportamiento de la simulación."
      />
      {saved && (
        <div className="toast">
          <Icon name="check" size={17} /> Cambios guardados correctamente
        </div>
      )}
      <div className="settings-grid">
        <section className="card settings-section">
          <div className="settings-icon">
            <Icon name="water" />
          </div>
          <div className="settings-content">
            <h3>Entorno</h3>
            <p>Define las condiciones base del océano.</p>
            <label>
              Tipo de agua
              <select>
                <option>Agua salada</option>
                <option>Agua dulce</option>
              </select>
              <small>Densidad en superficie: 1.025 kg/m³</small>
            </label>
            <label>
              Estado del mar
              <select>
                <option>Tranquilo</option>
                <option>Corriente suave</option>
                <option>Corriente fuerte</option>
              </select>
            </label>
          </div>
        </section>
        <section className="card settings-section">
          <div className="settings-icon purple">
            <Icon name="activity" />
          </div>
          <div className="settings-content">
            <h3>Parámetros físicos</h3>
            <p>Ajusta las constantes utilizadas en el cálculo.</p>
            <label>
              Gravedad
              <select>
                <option>9,81 m/s² (estándar)</option>
                <option>9,78 m/s² (ecuador)</option>
                <option>9,83 m/s² (polos)</option>
              </select>
            </label>
            <div className="fixed-value">
              <span>Densidad calculada</span>
              <strong>1.025 kg/m³</strong>
            </div>
          </div>
        </section>
        <section className="card settings-section wide">
          <div className="settings-icon orange">
            <Icon name="settings" />
          </div>
          <div className="settings-content">
            <h3>Visualización y simulación</h3>
            <p>Controla la información mostrada durante las pruebas.</p>
            <div className="toggle-row">
              <div>
                <strong>Mostrar cuadrícula de referencia</strong>
                <span>Facilita la percepción de escala y movimiento.</span>
              </div>
              <Toggle checked={grid} onChange={() => setGrid(!grid)} />
            </div>
            <div className="toggle-row">
              <div>
                <strong>Mostrar datos en pantalla (HUD)</strong>
                <span>Incluye profundidad, velocidad y estado de batería.</span>
              </div>
              <Toggle checked={hud} onChange={() => setHud(!hud)} />
            </div>
            <div className="toggle-row">
              <div>
                <strong>Modo de física simplificada</strong>
                <span>Usa densidad constante y reduce la complejidad del modelo.</span>
              </div>
              <Toggle checked={simple} onChange={() => setSimple(!simple)} />
            </div>
          </div>
        </section>
      </div>
      <div className="settings-actions">
        <button className="text-button">Restablecer valores predeterminados</button>
        <div>
          <Button variant="secondary" icon="download">
            Exportar datos
          </Button>
          <Button onClick={save} icon="check">
            Guardar cambios
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("inicio");
  const [menu, setMenu] = useState(false);
  const go = (s: Screen) => {
    setScreen(s);
    setMenu(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const title = useMemo(() => nav.find((n) => n.id === screen)?.label ?? "Configuración", [screen]);
  return (
    <div className="app-shell">
      <aside className={`sidebar ${menu ? "open" : ""}`}>
        <div className="brand" onClick={() => go("inicio")}>
          <div className="brand-mark">
            <svg viewBox="0 0 34 34">
              <path d="M4 18c2-7 9-10 19-8 4 1 6 3 8 6-3 4-8 6-14 6-7 0-11-1-13-4Z" />
              <path d="m29 16 4-4v9Z" />
              <circle cx="14" cy="16" r="2" />
              <path d="M15 10c1-3 3-4 6-3v3" />
            </svg>
          </div>
          <div>
            <strong>NAUTILUS</strong>
            <span>SIMULADOR NAVAL</span>
          </div>
        </div>
        <button className="sidebar-close" onClick={() => setMenu(false)}>
          <Icon name="close" />
        </button>
        <nav>
          <span className="nav-label">NAVEGACIÓN</span>
          {nav.map((n) => (
            <button key={n.id} className={screen === n.id ? "active" : ""} onClick={() => go(n.id)}>
              <Icon name={n.icon} />
              <span>{n.label}</span>
              {n.id === "resultados" && <i className="nav-dot" />}
            </button>
          ))}
          <a className="design-route-link" href="../ruta-steam.html"><span>✦</span><span>Ruta STEAM</span></a>
          <a className="design-route-link" href="../learn.html"><span>▤</span><span>Aprendizaje</span></a>
          <a className="design-route-link" href="../index.html"><span>◉</span><span>Simulador 3D</span></a>
        </nav>
        <div className="sidebar-foot">
          <button className={screen === "ajustes" ? "active" : ""} onClick={() => go("ajustes")}>
            <Icon name="settings" />
            <span>Configuración</span>
          </button>
          <div className="version">
            <span>v1.0.0</span>
            <i /> Sistema operativo
          </div>
        </div>
      </aside>
      {menu && <div className="scrim" onClick={() => setMenu(false)} />}
      <main>
        <div className="mobile-header">
          <button onClick={() => setMenu(true)}>
            <Icon name="menu" />
          </button>
          <strong>{title}</strong>
          <span />
        </div>
        {screen === "inicio" && <Home go={go} />}
        {screen === "biblioteca" && <Library />}
        {screen === "ensamblaje" && <Assembly go={go} />}
        {screen === "ensamblaje-interior" && <InteriorAssembly go={go} />}
        {screen === "pruebas" && <Trials go={go} />}
        {screen === "estres" && <Stress go={go} />}
        {screen === "resultados" && <Results go={go} />}
        {screen === "ajustes" && <Settings />}
      </main>
    </div>
  );
}
