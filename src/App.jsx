import { useState } from "react";

// ─── PALETA & ESTILOS GLOBALES ────────────────────────────────────────────────
const G = {
  bg:        "#0f1a0e",
  bgCard:    "#1a2718",
  bgHover:   "#223520",
  border:    "#2e4a2a",
  borderLight:"#3d6438",
  green:     "#4a9e3f",
  greenLight:"#6bbf5f",
  greenDim:  "#2d5c28",
  gold:      "#c8a84a",
  goldLight: "#e6c96a",
  red:       "#c84a4a",
  blue:      "#4a7ec8",
  blueLight: "#6a9ee8",
  text:      "#e8f0e6",
  textMuted: "#8aab86",
  textDim:   "#4a6a46",
  cream:     "#f0ead8",
};

const css = {
  app: {
    minHeight: "100vh",
    background: G.bg,
    color: G.text,
    fontFamily: "'Crimson Pro', 'Georgia', serif",
    display: "flex",
    flexDirection: "column",
  },
  // NAV
  nav: {
    background: G.bgCard,
    borderBottom: `2px solid ${G.border}`,
    padding: "0 24px",
    display: "flex",
    alignItems: "center",
    gap: 0,
    overflowX: "auto",
    flexShrink: 0,
  },
  navBrand: {
    fontFamily: "'Playfair Display', 'Georgia', serif",
    fontWeight: 700,
    fontSize: 18,
    color: G.gold,
    letterSpacing: "0.05em",
    paddingRight: 32,
    paddingTop: 14,
    paddingBottom: 14,
    borderRight: `1px solid ${G.border}`,
    marginRight: 8,
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  navTab: (active) => ({
    padding: "14px 16px",
    cursor: "pointer",
    fontSize: 13,
    fontFamily: "'Crimson Pro', serif",
    fontWeight: active ? 700 : 400,
    color: active ? G.greenLight : G.textMuted,
    borderBottom: active ? `2px solid ${G.greenLight}` : "2px solid transparent",
    marginBottom: -2,
    whiteSpace: "nowrap",
    transition: "all 0.15s",
    letterSpacing: "0.03em",
    flexShrink: 0,
  }),
  // MAIN
  main: {
    flex: 1,
    padding: "24px",
    maxWidth: 1400,
    width: "100%",
    margin: "0 auto",
    boxSizing: "border-box",
  },
  pageTitle: {
    fontFamily: "'Playfair Display', 'Georgia', serif",
    fontSize: 26,
    fontWeight: 700,
    color: G.cream,
    marginBottom: 4,
    letterSpacing: "0.02em",
  },
  pageSubtitle: {
    fontSize: 13,
    color: G.textMuted,
    marginBottom: 24,
    fontStyle: "italic",
  },
  card: {
    background: G.bgCard,
    border: `1px solid ${G.border}`,
    borderRadius: 8,
    padding: 20,
  },
  btn: (variant = "primary") => ({
    padding: "8px 16px",
    borderRadius: 6,
    border: variant === "primary" ? "none" : `1px solid ${G.border}`,
    background: variant === "primary" ? G.green : variant === "danger" ? G.red : variant === "gold" ? G.gold : G.bgHover,
    color: variant === "gold" ? G.bg : G.text,
    cursor: "pointer",
    fontSize: 13,
    fontFamily: "'Crimson Pro', serif",
    fontWeight: 600,
    letterSpacing: "0.03em",
    transition: "all 0.15s",
  }),
  badge: (color) => ({
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.05em",
    background: color === "green" ? G.greenDim : color === "gold" ? "#3a2e10" : color === "blue" ? "#1a2e4a" : "#2a1a1a",
    color: color === "green" ? G.greenLight : color === "gold" ? G.goldLight : color === "blue" ? G.blueLight : G.red,
    border: `1px solid ${color === "green" ? G.greenDim : color === "gold" ? "#5a4a20" : color === "blue" ? "#2a4a7a" : "#5a2a2a"}`,
  }),
};

// ─── DATOS DEMO ───────────────────────────────────────────────────────────────
const initialParcelas = {
  "P1.1": { animales: 0, estado: "descanso", diasEstado: 12, tropa: null, tipo: null },
  "P1.2": { animales: 45, estado: "pastoreo", diasEstado: 5, tropa: "T-2024-01", tipo: "arrendamiento" },
  "P2.1": { animales: 38, estado: "pastoreo", diasEstado: 3, tropa: "T-2024-02", tipo: "arrendamiento" },
  "P2.2": { animales: 0, estado: "descanso", diasEstado: 8, tropa: null, tipo: null },
  "P3.1": { animales: 0, estado: "descanso", diasEstado: 15, tropa: null, tipo: null },
  "P3.2": { animales: 52, estado: "pastoreo", diasEstado: 7, tropa: "T-2024-03", tipo: "arrendamiento" },
  "P4.1": { animales: 41, estado: "pastoreo", diasEstado: 4, tropa: "T-2024-04", tipo: "arrendamiento" },
  "P4.2": { animales: 0, estado: "descanso", diasEstado: 20, tropa: null, tipo: null },
  "P5":   { animales: 0, estado: "descanso", diasEstado: 0, tropa: null, tipo: null },
  "P6.1": { animales: 0, estado: "descanso", diasEstado: 10, tropa: null, tipo: null },
  "P6.2": { animales: 63, estado: "pastoreo", diasEstado: 6, tropa: "T-2024-05", tipo: "propio" },
  "P7.1": { animales: 57, estado: "pastoreo", diasEstado: 9, tropa: "T-2024-06", tipo: "propio" },
  "P7.2": { animales: 0, estado: "descanso", diasEstado: 14, tropa: null, tipo: null },
  "P8.1": { animales: 0, estado: "descanso", diasEstado: 18, tropa: null, tipo: null },
  "P8.2": { animales: 49, estado: "pastoreo", diasEstado: 11, tropa: "T-2024-07", tipo: "propio" },
};

const initialInfraestructura = [
  { id: 1, tipo: "casa",    label: "Casa",       x: 51, y: 30, icono: "🏠", registros: [{ fecha: "2024-01-15", desc: "Refacción techo" }] },
  { id: 2, tipo: "molino",  label: "Molino 1",   x: 18, y: 20, icono: "⚙️", registros: [{ fecha: "2024-03-10", desc: "Cambio de aspa" }] },
  { id: 3, tipo: "molino",  label: "Molino 2",   x: 72, y: 75, icono: "⚙️", registros: [] },
  { id: 4, tipo: "tanque",  label: "Tanque 1",   x: 20, y: 60, icono: "🔵", registros: [{ fecha: "2024-02-20", desc: "Limpieza" }] },
  { id: 5, tipo: "tanque",  label: "Tanque 2",   x: 75, y: 40, icono: "🔵", registros: [] },
  { id: 6, tipo: "bebida",  label: "Bebida P3",  x: 36, y: 70, icono: "💧", registros: [] },
  { id: 7, tipo: "manga",   label: "Manga",      x: 85, y: 20, icono: "🔧", registros: [{ fecha: "2024-04-01", desc: "Reparación cerrojo" }] },
];

const TABS = [
  { id: "campo",         label: "🗺️ Campo" },
  { id: "stock",         label: "🐄 Stock" },
  { id: "compras",       label: "🛒 Compras" },
  { id: "arrendamiento", label: "🤝 Arrendamiento" },
  { id: "feedlot",       label: "🏗️ Feedlot & Faena" },
  { id: "sanidad",       label: "💉 Sanidad" },
  { id: "lluvias",       label: "🌧️ Lluvias" },
  { id: "finanzas",      label: "💰 Finanzas" },
  { id: "mantenimiento", label: "🔧 Mantenimiento" },
  { id: "dashboard",     label: "📊 Dashboard" },
];

// ─── COMPONENTE MAPA ──────────────────────────────────────────────────────────
function MapaCampo({ parcelas, setParcelas, infraestructura, setInfraestructura }) {
  const [modoEdicion, setModoEdicion] = useState(false);
  const [parcelaSeleccionada, setParcelaSeleccionada] = useState(null);
  const [infraSeleccionada, setInfraSeleccionada] = useState(null);
  const [hoveredParcela, setHoveredParcela] = useState(null);
  const [showAddInfra, setShowAddInfra] = useState(null); // {x, y} click en modo edición
  const [showInfraModal, setShowInfraModal] = useState(null);
  const [newInfraForm, setNewInfraForm] = useState({ tipo: "molino", label: "" });
  const [newRegistro, setNewRegistro] = useState({ fecha: "", desc: "" });

  // Potreros: P1..P8, cada uno con 2 parcelas salvo P5
  const potreros = [1, 2, 3, 4, 5, 6, 7, 8];

  const getParcelaColor = (key, data) => {
    if (!data || data.animales === 0) return { bg: G.bgHover, border: G.border, label: "Vacío" };
    if (data.tipo === "arrendamiento") return { bg: "#1a2a3a", border: G.blue, label: "Arrendamiento" };
    if (data.tipo === "propio") return { bg: "#1a2e18", border: G.green, label: "Propio" };
    return { bg: G.bgHover, border: G.borderLight, label: "Sin definir" };
  };

  const handleParcelaClick = (key) => {
    if (modoEdicion) return;
    setParcelaSeleccionada(key === parcelaSeleccionada ? null : key);
    setInfraSeleccionada(null);
  };

  const handleMapClick = (e) => {
    if (!modoEdicion) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setShowAddInfra({ x: parseFloat(x.toFixed(1)), y: parseFloat(y.toFixed(1)) });
  };

  const handleAddInfra = () => {
    if (!newInfraForm.label) return;
    const iconos = { molino: "⚙️", tanque: "🔵", bebida: "💧", manga: "🔧", otro: "📌" };
    const nuevo = {
      id: Date.now(),
      tipo: newInfraForm.tipo,
      label: newInfraForm.label,
      x: showAddInfra.x,
      y: showAddInfra.y,
      icono: iconos[newInfraForm.tipo] || "📌",
      registros: [],
    };
    setInfraestructura(prev => [...prev, nuevo]);
    setShowAddInfra(null);
    setNewInfraForm({ tipo: "molino", label: "" });
  };

  const handleDeleteInfra = (id) => {
    setInfraestructura(prev => prev.filter(i => i.id !== id));
    setShowInfraModal(null);
  };

  const handleAddRegistro = (id) => {
    if (!newRegistro.fecha || !newRegistro.desc) return;
    setInfraestructura(prev => prev.map(i =>
      i.id === id ? { ...i, registros: [...i.registros, { ...newRegistro }] } : i
    ));
    setNewRegistro({ fecha: "", desc: "" });
  };

  const parcelaData = parcelaSeleccionada ? parcelas[parcelaSeleccionada] : null;
  const historial = [
    { fecha: "2024-10-01", evento: "Ingreso tropa T-2024-06", animales: 57 },
    { fecha: "2024-09-15", evento: "Salida a P7.2", animales: 57 },
    { fecha: "2024-08-20", evento: "Ingreso tropa T-2024-05", animales: 60 },
    { fecha: "2024-08-01", evento: "Descanso iniciado", animales: 0 },
  ];

  return (
    <div>
      {/* Header mapa */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 13, color: G.textMuted }}>
            {modoEdicion
              ? "✏️ Modo edición — hacé click en el mapa para agregar infraestructura"
              : "Hacé click en una parcela para ver su historial"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {modoEdicion && (
            <button style={css.btn("danger")} onClick={() => { setModoEdicion(false); setShowAddInfra(null); }}>
              ✕ Cancelar
            </button>
          )}
          <button
            style={css.btn(modoEdicion ? "gold" : "secondary")}
            onClick={() => { setModoEdicion(!modoEdicion); setShowAddInfra(null); setParcelaSeleccionada(null); }}
          >
            {modoEdicion ? "💾 Guardar" : "✏️ Editar mapa"}
          </button>
        </div>
      </div>

      {/* Leyenda */}
      {!modoEdicion && (
        <div style={{ display: "flex", gap: 16, marginBottom: 12, flexWrap: "wrap" }}>
          {[
            { color: G.green, border: G.green, bg: "#1a2e18", label: "Animales propios" },
            { color: G.blue,  border: G.blue,  bg: "#1a2a3a", label: "Arrendamiento" },
            { color: G.textDim, border: G.border, bg: G.bgHover, label: "Vacío / Descanso" },
          ].map(l => (
            <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: G.textMuted }}>
              <div style={{ width: 14, height: 14, borderRadius: 3, background: l.bg, border: `2px solid ${l.border}` }} />
              {l.label}
            </div>
          ))}
        </div>
      )}

      {/* MAPA */}
      <div
        style={{
          ...css.card,
          padding: 0,
          position: "relative",
          overflow: "hidden",
          cursor: modoEdicion ? "crosshair" : "default",
          userSelect: "none",
        }}
        onClick={handleMapClick}
      >
        {/* Zona arrendamiento / propio labels */}
        <div style={{
          display: "flex",
          borderBottom: `1px solid ${G.border}`,
          fontSize: 11,
          color: G.textDim,
          letterSpacing: "0.08em",
          fontWeight: 700,
        }}>
          <div style={{ flex: 4, borderRight: `1px solid ${G.border}`, padding: "4px 8px", color: G.blue, background: "rgba(74,126,200,0.05)" }}>
            ◀ ZONA ARRENDAMIENTO (P1–P4)
          </div>
          <div style={{ flex: 1, borderRight: `1px solid ${G.border}`, padding: "4px 8px", textAlign: "center" }}>
            P5
          </div>
          <div style={{ flex: 3, padding: "4px 8px", color: G.green, background: "rgba(74,158,63,0.05)", textAlign: "right" }}>
            ZONA PROPIA (P6–P8) ▶
          </div>
        </div>

        {/* Potreros */}
        <div style={{ display: "flex", height: 220 }}>
          {potreros.map((p) => {
            const esP5 = p === 5;
            const parcKeys = esP5 ? [`P${p}`] : [`P${p}.1`, `P${p}.2`];

            return (
              <div
                key={p}
                style={{
                  flex: 1,
                  borderRight: p < 8 ? `2px solid ${G.border}` : "none",
                  display: "flex",
                  flexDirection: "row",
                  position: "relative",
                }}
              >
                {parcKeys.map((key, idx) => {
                  const data = parcelas[key];
                  const colors = getParcelaColor(key, data);
                  const isSelected = parcelaSeleccionada === key;
                  const isHovered = hoveredParcela === key;

                  return (
                    <div
                      key={key}
                      onClick={(e) => { e.stopPropagation(); handleParcelaClick(key); }}
                      onMouseEnter={() => !modoEdicion && setHoveredParcela(key)}
                      onMouseLeave={() => setHoveredParcela(null)}
                      style={{
                        flex: 1,
                        borderRight: !esP5 && idx === 0 ? `1px dashed ${G.borderLight}` : "none",
                        background: isSelected ? colors.border + "33" : isHovered ? colors.bg + "cc" : colors.bg,
                        border: isSelected ? `2px solid ${colors.border}` : "none",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: modoEdicion ? "crosshair" : "pointer",
                        transition: "all 0.15s",
                        position: "relative",
                        padding: 4,
                      }}
                    >
                      {/* Título parcela */}
                      <div style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: data?.animales > 0 ? (data.tipo === "arrendamiento" ? G.blueLight : G.greenLight) : G.textDim,
                        letterSpacing: "0.05em",
                        marginBottom: 4,
                      }}>
                        {esP5 ? "P5 🏠" : key}
                      </div>

                      {/* Info principal */}
                      {!modoEdicion && data?.animales > 0 ? (
                        <>
                          <div style={{ fontSize: 20, fontWeight: 700, color: data.tipo === "arrendamiento" ? G.blueLight : G.greenLight, lineHeight: 1 }}>
                            {data.animales}
                          </div>
                          <div style={{ fontSize: 10, color: G.textMuted, marginTop: 2 }}>cabezas</div>
                          <div style={{ fontSize: 10, color: G.gold, marginTop: 3 }}>
                            {data.diasEstado}d pastoreo
                          </div>
                        </>
                      ) : !modoEdicion ? (
                        <div style={{ fontSize: 11, color: G.textDim, fontStyle: "italic" }}>
                          {data?.diasEstado > 0 ? `${data.diasEstado}d descanso` : "Vacío"}
                        </div>
                      ) : null}

                      {/* Hover tooltip */}
                      {isHovered && !modoEdicion && data && (
                        <div style={{
                          position: "absolute",
                          bottom: "calc(100% + 8px)",
                          left: "50%",
                          transform: "translateX(-50%)",
                          background: "#0a1409",
                          border: `1px solid ${colors.border}`,
                          borderRadius: 6,
                          padding: "10px 14px",
                          minWidth: 160,
                          zIndex: 100,
                          pointerEvents: "none",
                          boxShadow: "0 4px 20px rgba(0,0,0,0.6)",
                        }}>
                          <div style={{ fontWeight: 700, color: G.cream, marginBottom: 6, fontSize: 13 }}>{key}</div>
                          <div style={{ fontSize: 12, color: G.textMuted, lineHeight: 1.6 }}>
                            <div>🐄 <b style={{ color: G.text }}>{data.animales}</b> animales</div>
                            <div>📅 Estado: <b style={{ color: data.estado === "pastoreo" ? G.greenLight : G.gold }}>{data.estado}</b></div>
                            <div>⏱️ <b style={{ color: G.text }}>{data.diasEstado}</b> días en estado</div>
                            {data.tropa && <div>🏷️ Tropa: <b style={{ color: G.goldLight }}>{data.tropa}</b></div>}
                            {data.tipo && <div>📋 <b style={{ color: data.tipo === "arrendamiento" ? G.blueLight : G.greenLight }}>{data.tipo}</b></div>}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Infraestructura overlay */}
        <div style={{ position: "absolute", top: 30, left: 0, right: 0, bottom: 0, pointerEvents: "none" }}>
          {infraestructura.map((infra) => (
            <div
              key={infra.id}
              onClick={(e) => {
                e.stopPropagation();
                if (modoEdicion) {
                  setShowInfraModal(infra);
                } else {
                  setShowInfraModal(infra);
                }
              }}
              style={{
                position: "absolute",
                left: `${infra.x}%`,
                top: `${infra.y}%`,
                transform: "translate(-50%, -50%)",
                fontSize: infra.tipo === "casa" ? 22 : 16,
                cursor: "pointer",
                pointerEvents: "all",
                filter: modoEdicion ? "drop-shadow(0 0 6px #c8a84a)" : "drop-shadow(0 2px 4px rgba(0,0,0,0.5))",
                transition: "all 0.2s",
                zIndex: 10,
              }}
              title={infra.label}
            >
              {infra.icono}
            </div>
          ))}
        </div>

        {/* Click en modo edición para agregar infra */}
        {showAddInfra && modoEdicion && (
          <div
            style={{
              position: "absolute",
              left: `${showAddInfra.x}%`,
              top: `${showAddInfra.y + 10}%`,
              background: "#0a1409",
              border: `1px solid ${G.gold}`,
              borderRadius: 8,
              padding: 14,
              zIndex: 200,
              minWidth: 200,
              boxShadow: "0 4px 20px rgba(0,0,0,0.7)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontWeight: 700, color: G.gold, marginBottom: 10, fontSize: 13 }}>
              ➕ Agregar infraestructura
            </div>
            <select
              value={newInfraForm.tipo}
              onChange={e => setNewInfraForm(f => ({ ...f, tipo: e.target.value }))}
              style={{ width: "100%", marginBottom: 8, padding: "6px 8px", background: G.bgHover, border: `1px solid ${G.border}`, color: G.text, borderRadius: 4, fontSize: 13 }}
            >
              <option value="molino">⚙️ Molino</option>
              <option value="tanque">🔵 Tanque</option>
              <option value="bebida">💧 Bebida</option>
              <option value="manga">🔧 Manga</option>
              <option value="otro">📌 Otro</option>
            </select>
            <input
              placeholder="Nombre (ej: Molino Norte)"
              value={newInfraForm.label}
              onChange={e => setNewInfraForm(f => ({ ...f, label: e.target.value }))}
              style={{ width: "100%", marginBottom: 10, padding: "6px 8px", background: G.bgHover, border: `1px solid ${G.border}`, color: G.text, borderRadius: 4, fontSize: 13, boxSizing: "border-box" }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button style={{ ...css.btn("primary"), flex: 1 }} onClick={handleAddInfra}>Agregar</button>
              <button style={{ ...css.btn("secondary"), flex: 1 }} onClick={() => setShowAddInfra(null)}>Cancelar</button>
            </div>
          </div>
        )}
      </div>

      {/* Modal infraestructura */}
      {showInfraModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
        }} onClick={() => setShowInfraModal(null)}>
          <div style={{
            ...css.card,
            minWidth: 340, maxWidth: 480, width: "90%",
            boxShadow: "0 8px 40px rgba(0,0,0,0.8)",
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: G.cream }}>
                {showInfraModal.icono} {showInfraModal.label}
              </div>
              {modoEdicion && (
                <button style={css.btn("danger")} onClick={() => handleDeleteInfra(showInfraModal.id)}>
                  🗑 Eliminar
                </button>
              )}
            </div>

            <div style={{ fontSize: 13, color: G.textMuted, marginBottom: 12 }}>
              Tipo: <span style={{ color: G.goldLight }}>{showInfraModal.tipo}</span> · 
              Pos: {showInfraModal.x}%, {showInfraModal.y}%
            </div>

            {/* Registros existentes */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: G.textMuted, marginBottom: 8, letterSpacing: "0.05em" }}>
                HISTORIAL DE ARREGLOS
              </div>
              {showInfraModal.registros.length === 0 ? (
                <div style={{ fontSize: 12, color: G.textDim, fontStyle: "italic" }}>Sin registros</div>
              ) : (
                showInfraModal.registros.map((r, i) => (
                  <div key={i} style={{ fontSize: 12, color: G.text, padding: "6px 10px", background: G.bgHover, borderRadius: 4, marginBottom: 4, borderLeft: `2px solid ${G.gold}` }}>
                    <span style={{ color: G.gold }}>{r.fecha}</span> — {r.desc}
                  </div>
                ))
              )}
            </div>

            {/* Agregar registro */}
            <div style={{ borderTop: `1px solid ${G.border}`, paddingTop: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: G.textMuted, marginBottom: 8, letterSpacing: "0.05em" }}>
                AGREGAR REGISTRO
              </div>
              <input
                type="date"
                value={newRegistro.fecha}
                onChange={e => setNewRegistro(r => ({ ...r, fecha: e.target.value }))}
                style={{ width: "100%", marginBottom: 8, padding: "6px 8px", background: G.bgHover, border: `1px solid ${G.border}`, color: G.text, borderRadius: 4, fontSize: 13, boxSizing: "border-box" }}
              />
              <input
                placeholder="Descripción del arreglo..."
                value={newRegistro.desc}
                onChange={e => setNewRegistro(r => ({ ...r, desc: e.target.value }))}
                style={{ width: "100%", marginBottom: 10, padding: "6px 8px", background: G.bgHover, border: `1px solid ${G.border}`, color: G.text, borderRadius: 4, fontSize: 13, boxSizing: "border-box" }}
              />
              <button
                style={{ ...css.btn("primary"), width: "100%" }}
                onClick={() => {
                  handleAddRegistro(showInfraModal.id);
                  setShowInfraModal(prev => ({
                    ...prev,
                    registros: [...prev.registros, { ...newRegistro }],
                  }));
                }}
              >
                ➕ Agregar registro
              </button>
            </div>

            <button style={{ ...css.btn("secondary"), width: "100%", marginTop: 10 }} onClick={() => setShowInfraModal(null)}>
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Historial parcela seleccionada */}
      {parcelaSeleccionada && parcelaData && (
        <div style={{ ...css.card, marginTop: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: G.cream }}>
              Historial — <span style={{ color: G.goldLight }}>{parcelaSeleccionada}</span>
            </div>
            <div style={css.badge(parcelaData.animales > 0 ? (parcelaData.tipo === "arrendamiento" ? "blue" : "green") : "gold")}>
              {parcelaData.animales > 0 ? parcelaData.estado.toUpperCase() : "DESCANSO"}
            </div>
          </div>

          {/* Stats rápidas */}
          <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
            {[
              { label: "Animales actuales", value: parcelaData.animales || "—" },
              { label: "Estado actual", value: parcelaData.estado },
              { label: "Días en estado", value: `${parcelaData.diasEstado}d` },
              { label: "Tropa", value: parcelaData.tropa || "—" },
            ].map(s => (
              <div key={s.label} style={{ background: G.bgHover, border: `1px solid ${G.border}`, borderRadius: 6, padding: "10px 14px", minWidth: 100 }}>
                <div style={{ fontSize: 11, color: G.textMuted, marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: G.cream }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Tabla historial */}
          <div style={{ fontSize: 12, color: G.textMuted, fontWeight: 700, letterSpacing: "0.05em", marginBottom: 8 }}>
            MOVIMIENTOS
          </div>
          <div>
            {historial.map((h, i) => (
              <div key={i} style={{
                display: "flex", gap: 16, padding: "8px 12px",
                background: i % 2 === 0 ? G.bgHover : "transparent",
                borderRadius: 4, fontSize: 13,
              }}>
                <span style={{ color: G.gold, minWidth: 90 }}>{h.fecha}</span>
                <span style={{ color: G.text, flex: 1 }}>{h.evento}</span>
                {h.animales > 0 && <span style={{ color: G.greenLight }}>{h.animales} cab.</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PLACEHOLDER TABS ─────────────────────────────────────────────────────────
function PlaceholderTab({ label }) {
  return (
    <div style={{ ...css.card, textAlign: "center", padding: 60 }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>🚧</div>
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: G.cream, marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ color: G.textMuted, fontSize: 14 }}>Esta sección está en desarrollo</div>
    </div>
  );
}

// ─── APP PRINCIPAL ────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("campo");
  const [parcelas, setParcelas] = useState(initialParcelas);
  const [infraestructura, setInfraestructura] = useState(initialInfraestructura);

  const renderTab = () => {
    switch (tab) {
      case "campo":
        return (
          <>
            <div style={css.pageTitle}>Mapa del Campo</div>
            <div style={css.pageSubtitle}>Vista general de potreros, parcelas e infraestructura</div>
            <MapaCampo
              parcelas={parcelas}
              setParcelas={setParcelas}
              infraestructura={infraestructura}
              setInfraestructura={setInfraestructura}
            />
          </>
        );
      default:
        return <PlaceholderTab label={TABS.find(t => t.id === tab)?.label || tab} />;
    }
  };

  return (
    <>
      {/* Google Fonts */}
      <link
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Crimson+Pro:ital,wght@0,400;0,600;0,700;1,400&display=swap"
        rel="stylesheet"
      />
      <div style={css.app}>
        {/* NAV */}
        <nav style={css.nav}>
          <div style={css.navBrand}>🐄 Campo</div>
          {TABS.map(t => (
            <div
              key={t.id}
              style={css.navTab(tab === t.id)}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </div>
          ))}
        </nav>

        {/* MAIN */}
        <main style={css.main}>
          {renderTab()}
        </main>
      </div>
    </>
  );
}