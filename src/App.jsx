import { useState } from "react";

const THEMES = {
  dark: {
    bg:          "#111614",
    bgSidebar:   "#0d1210",
    bgCard:      "#181f1c",
    bgHover:     "#1f2923",
    bgInput:     "#1f2923",
    border:      "#283530",
    borderLight: "#354840",
    green:       "#4e9e43",
    greenLight:  "#72c464",
    teal:        "#3a8c7e",
    tealLight:   "#56b8a8",
    brown:       "#8c6a3a",
    brownLight:  "#b8924e",
    red:         "#c84a4a",
    text:        "#dde8e2",
    textMuted:   "#6a8a7e",
    textDim:     "#344e48",
    cream:       "#f0e8d8",
    shadow:      "rgba(0,0,0,0.45)",
    activeNavBg: "#1f2e28",
    activeNavBorder: "#4e9e43",
    activeNavColor:  "#72c464",
  },
  light: {
    bg:          "#f0f4f2",
    bgSidebar:   "#e4ede8",
    bgCard:      "#ffffff",
    bgHover:     "#eaf2ee",
    bgInput:     "#f0f4f2",
    border:      "#c0d4cc",
    borderLight: "#9abfb4",
    green:       "#357a2c",
    greenLight:  "#2a6222",
    teal:        "#22766a",
    tealLight:   "#185e54",
    brown:       "#7a5228",
    brownLight:  "#6a4420",
    red:         "#a83030",
    text:        "#162420",
    textMuted:   "#4a6e62",
    textDim:     "#8aada4",
    cream:       "#2a1e10",
    shadow:      "rgba(0,0,0,0.10)",
    activeNavBg: "#ddeee8",
    activeNavBorder: "#357a2c",
    activeNavColor:  "#1e5218",
  },
};

const NAV_ITEMS = [
  { id: "campo",         icon: "▣", label: "Campo" },
  { id: "stock",         icon: "◈", label: "Stock" },
  { id: "compras",       icon: "◎", label: "Compras" },
  { id: "arrendamiento", icon: "◇", label: "Arrendamiento" },
  { id: "feedlot",       icon: "▦", label: "Feedlot & Faena" },
  { id: "sanidad",       icon: "✦", label: "Sanidad" },
  { id: "lluvias",       icon: "◌", label: "Lluvias" },
  { id: "finanzas",      icon: "◈", label: "Finanzas" },
  { id: "mantenimiento", icon: "◉", label: "Mantenimiento" },
  { id: "dashboard",     icon: "▤", label: "Dashboard" },
];

const initialParcelas = {
  "P1.1": { animales: 0,  estado: "descanso", diasEstado: 12, tropa: null,        tipo: null },
  "P1.2": { animales: 45, estado: "pastoreo", diasEstado: 5,  tropa: "T-2024-01", tipo: "arrendamiento" },
  "P2.1": { animales: 38, estado: "pastoreo", diasEstado: 3,  tropa: "T-2024-02", tipo: "arrendamiento" },
  "P2.2": { animales: 0,  estado: "descanso", diasEstado: 8,  tropa: null,        tipo: null },
  "P3.1": { animales: 0,  estado: "descanso", diasEstado: 15, tropa: null,        tipo: null },
  "P3.2": { animales: 52, estado: "pastoreo", diasEstado: 7,  tropa: "T-2024-03", tipo: "arrendamiento" },
  "P4.1": { animales: 41, estado: "pastoreo", diasEstado: 4,  tropa: "T-2024-04", tipo: "arrendamiento" },
  "P4.2": { animales: 0,  estado: "descanso", diasEstado: 20, tropa: null,        tipo: null },
  "P5":   { animales: 0,  estado: "descanso", diasEstado: 0,  tropa: null,        tipo: null },
  "P6.1": { animales: 0,  estado: "descanso", diasEstado: 10, tropa: null,        tipo: null },
  "P6.2": { animales: 63, estado: "pastoreo", diasEstado: 6,  tropa: "T-2024-05", tipo: "propio" },
  "P7.1": { animales: 57, estado: "pastoreo", diasEstado: 9,  tropa: "T-2024-06", tipo: "propio" },
  "P7.2": { animales: 0,  estado: "descanso", diasEstado: 14, tropa: null,        tipo: null },
  "P8.1": { animales: 0,  estado: "descanso", diasEstado: 18, tropa: null,        tipo: null },
  "P8.2": { animales: 49, estado: "pastoreo", diasEstado: 11, tropa: "T-2024-07", tipo: "propio" },
};

const initialInfra = [
  { id: 1, tipo: "casa",   label: "Casa",      x: 51, y: 35, registros: [{ fecha: "2024-01-15", desc: "Refacción techo" }] },
  { id: 2, tipo: "molino", label: "Molino 1",  x: 18, y: 25, registros: [{ fecha: "2024-03-10", desc: "Cambio de aspa" }] },
  { id: 3, tipo: "molino", label: "Molino 2",  x: 72, y: 70, registros: [] },
  { id: 4, tipo: "tanque", label: "Tanque 1",  x: 20, y: 65, registros: [{ fecha: "2024-02-20", desc: "Limpieza" }] },
  { id: 5, tipo: "tanque", label: "Tanque 2",  x: 75, y: 45, registros: [] },
  { id: 6, tipo: "bebida", label: "Bebida P3", x: 36, y: 72, registros: [] },
  { id: 7, tipo: "manga",  label: "Manga",     x: 86, y: 22, registros: [{ fecha: "2024-04-01", desc: "Reparación cerrojo" }] },
];

const INFRA_ICONS = { casa: "⌂", molino: "⊛", tanque: "◉", bebida: "◎", manga: "⊞", otro: "◆" };

function MapaCampo({ parcelas, setParcelas, infra, setInfra, T }) {
  const [modoEdicion, setModoEdicion]         = useState(false);
  const [parcelaSelected, setParcelaSelected] = useState(null);
  const [hoveredParcela, setHoveredParcela]   = useState(null);
  const [showAddInfra, setShowAddInfra]       = useState(null);
  const [showInfraModal, setShowInfraModal]   = useState(null);
  const [newInfraForm, setNewInfraForm]       = useState({ tipo: "molino", label: "" });
  const [newRegistro, setNewRegistro]         = useState({ fecha: "", desc: "" });

  const getColors = (data) => {
    if (!data || data.animales === 0) return { bg: T.bgHover, border: T.border, text: T.textDim };
    if (data.tipo === "arrendamiento")  return { bg: T.teal + "18", border: T.teal, text: T.tealLight };
    if (data.tipo === "propio")         return { bg: T.green + "18", border: T.green, text: T.greenLight };
    return { bg: T.bgHover, border: T.borderLight, text: T.textMuted };
  };

  const handleMapClick = (e) => {
    if (!modoEdicion) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = parseFloat((((e.clientX - rect.left) / rect.width) * 100).toFixed(1));
    const y = parseFloat((((e.clientY - rect.top) / rect.height) * 100).toFixed(1));
    setShowAddInfra({ x, y });
  };

  const handleAddInfra = () => {
    if (!newInfraForm.label) return;
    setInfra(prev => [...prev, { id: Date.now(), tipo: newInfraForm.tipo, label: newInfraForm.label, x: showAddInfra.x, y: showAddInfra.y, registros: [] }]);
    setShowAddInfra(null);
    setNewInfraForm({ tipo: "molino", label: "" });
  };

  const handleAddRegistro = (infraId) => {
    if (!newRegistro.fecha || !newRegistro.desc) return;
    const reg = { ...newRegistro };
    setInfra(prev => prev.map(i => i.id === infraId ? { ...i, registros: [...i.registros, reg] } : i));
    setShowInfraModal(prev => ({ ...prev, registros: [...prev.registros, reg] }));
    setNewRegistro({ fecha: "", desc: "" });
  };

  const parcelaData = parcelaSelected ? parcelas[parcelaSelected] : null;

  const inp = {
    width: "100%", padding: "8px 10px", borderRadius: 6, fontSize: 13,
    background: T.bgInput, border: "1px solid " + T.border,
    color: T.text, boxSizing: "border-box", outline: "none", fontFamily: "'Outfit', sans-serif",
  };

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          {[
            { c: T.green, label: "Animales propios" },
            { c: T.teal,  label: "Arrendamiento" },
            { c: T.border,label: "Vacío / Descanso" },
          ].map(l => (
            <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: T.textMuted }}>
              <div style={{ width: 11, height: 11, borderRadius: 3, background: l.c + "28", border: "2px solid " + l.c }} />
              {l.label}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {modoEdicion && (
            <button onClick={() => { setModoEdicion(false); setShowAddInfra(null); }}
              style={{ padding: "7px 14px", borderRadius: 6, border: "1px solid " + T.border, background: "transparent", color: T.textMuted, cursor: "pointer", fontSize: 13, fontFamily: "'Outfit', sans-serif" }}>
              Cancelar
            </button>
          )}
          <button onClick={() => { setModoEdicion(v => !v); setShowAddInfra(null); setParcelaSelected(null); }}
            style={{ padding: "7px 18px", borderRadius: 6, border: "none", fontSize: 13, cursor: "pointer", fontFamily: "'Outfit', sans-serif", fontWeight: 600,
              background: modoEdicion ? T.brownLight : T.teal, color: "#fff" }}>
            {modoEdicion ? "Guardar mapa" : "Editar mapa"}
          </button>
        </div>
      </div>

      {/* MAPA */}
      <div style={{ background: T.bgCard, border: "1px solid " + T.border, borderRadius: 10, overflow: "hidden", boxShadow: "0 2px 12px " + T.shadow, cursor: modoEdicion ? "crosshair" : "default", userSelect: "none", position: "relative" }}
        onClick={handleMapClick}>

        {/* Zona header */}
        <div style={{ display: "flex", borderBottom: "1px solid " + T.border }}>
          <div style={{ flex: 4, padding: "5px 12px", fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", color: T.teal, borderRight: "1px solid " + T.border }}>
            ARRENDAMIENTO — P1 a P4
          </div>
          <div style={{ flex: 1, padding: "5px 0", fontSize: 11, textAlign: "center", color: T.textDim, borderRight: "1px solid " + T.border }}>P5</div>
          <div style={{ flex: 3, padding: "5px 12px", fontSize: 11, fontWeight: 700, letterSpacing: "0.07em", color: T.green, textAlign: "right" }}>
            PROPIO — P6 a P8
          </div>
        </div>

        {/* Potreros */}
        <div style={{ display: "flex", height: 200 }}>
          {[1,2,3,4,5,6,7,8].map(p => {
            const esP5 = p === 5;
            const keys = esP5 ? ["P" + p] : ["P" + p + ".1", "P" + p + ".2"];
            return (
              <div key={p} style={{ flex: 1, borderRight: p < 8 ? "2px solid " + T.border : "none", display: "flex" }}>
                {keys.map((key, idx) => {
                  const data = parcelas[key];
                  const col  = getColors(data);
                  const sel  = parcelaSelected === key;
                  const hov  = hoveredParcela === key;
                  return (
                    <div key={key}
                      onClick={e => { e.stopPropagation(); if (!modoEdicion) setParcelaSelected(sel ? null : key); }}
                      onMouseEnter={() => !modoEdicion && setHoveredParcela(key)}
                      onMouseLeave={() => setHoveredParcela(null)}
                      style={{
                        flex: 1,
                        borderRight: !esP5 && idx === 0 ? "1px dashed " + T.borderLight : "none",
                        background: sel ? col.border + "28" : hov ? col.border + "14" : col.bg,
                        outline: sel ? "2px solid " + col.border : "none",
                        outlineOffset: -2,
                        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                        cursor: modoEdicion ? "crosshair" : "pointer",
                        transition: "background 0.12s", position: "relative", padding: 4,
                      }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: col.text, letterSpacing: "0.04em", marginBottom: 3 }}>{key}</div>
                      {!modoEdicion && data && data.animales > 0 ? (
                        <>
                          <div style={{ fontSize: 21, fontWeight: 800, color: col.text, lineHeight: 1 }}>{data.animales}</div>
                          <div style={{ fontSize: 9, color: T.textMuted, marginTop: 1 }}>cabezas</div>
                          <div style={{ fontSize: 9, color: T.brownLight, marginTop: 3, fontWeight: 600 }}>{data.diasEstado}d pastoreo</div>
                        </>
                      ) : !modoEdicion ? (
                        <div style={{ fontSize: 10, color: T.textDim, fontStyle: "italic" }}>
                          {data && data.diasEstado > 0 ? data.diasEstado + "d desc." : "Vacío"}
                        </div>
                      ) : null}

                      {hov && !modoEdicion && data && (
                        <div style={{ position: "absolute", bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)",
                          background: T.bgCard, border: "1px solid " + col.border, borderRadius: 8,
                          padding: "10px 14px", minWidth: 165, zIndex: 100, pointerEvents: "none",
                          boxShadow: "0 4px 20px " + T.shadow }}>
                          <div style={{ fontWeight: 700, color: T.cream, marginBottom: 6, fontSize: 13, fontFamily: "'Playfair Display', serif" }}>{key}</div>
                          <div style={{ fontSize: 12, color: T.textMuted, lineHeight: 1.8 }}>
                            <div>Animales: <b style={{ color: T.text }}>{data.animales || "—"}</b></div>
                            <div>Estado: <b style={{ color: data.estado === "pastoreo" ? T.green : T.brownLight }}>{data.estado}</b></div>
                            <div>Días: <b style={{ color: T.text }}>{data.diasEstado}</b></div>
                            {data.tropa && <div>Tropa: <b style={{ color: T.brownLight }}>{data.tropa}</b></div>}
                            {data.tipo && <div>Uso: <b style={{ color: data.tipo === "arrendamiento" ? T.teal : T.green }}>{data.tipo}</b></div>}
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

        {/* Infra overlay */}
        <div style={{ position: "absolute", top: 28, left: 0, right: 0, bottom: 0, pointerEvents: "none" }}>
          {infra.map(item => (
            <div key={item.id} onClick={e => { e.stopPropagation(); setShowInfraModal(item); }} title={item.label}
              style={{ position: "absolute", left: item.x + "%", top: item.y + "%", transform: "translate(-50%,-50%)",
                fontSize: item.tipo === "casa" ? 20 : 15, cursor: "pointer", pointerEvents: "all", zIndex: 10,
                color: T.brownLight, filter: modoEdicion ? "drop-shadow(0 0 5px " + T.brownLight + ")" : "none" }}>
              {INFRA_ICONS[item.tipo] || "◆"}
            </div>
          ))}
        </div>

        {/* Popup agregar infra */}
        {showAddInfra && modoEdicion && (
          <div onClick={e => e.stopPropagation()} style={{
            position: "absolute", left: Math.min(showAddInfra.x, 72) + "%", top: Math.min(showAddInfra.y + 5, 55) + "%",
            background: T.bgCard, border: "1px solid " + T.brownLight, borderRadius: 10,
            padding: 16, zIndex: 200, minWidth: 210, boxShadow: "0 6px 30px " + T.shadow }}>
            <div style={{ fontWeight: 700, color: T.brownLight, marginBottom: 12, fontSize: 13 }}>Agregar infraestructura</div>
            <select value={newInfraForm.tipo} onChange={e => setNewInfraForm(f => ({ ...f, tipo: e.target.value }))} style={{ ...inp, marginBottom: 8 }}>
              <option value="molino">Molino</option>
              <option value="tanque">Tanque</option>
              <option value="bebida">Bebida</option>
              <option value="manga">Manga</option>
              <option value="otro">Otro</option>
            </select>
            <input placeholder="Nombre (ej: Molino Norte)" value={newInfraForm.label}
              onChange={e => setNewInfraForm(f => ({ ...f, label: e.target.value }))} style={{ ...inp, marginBottom: 12 }} />
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleAddInfra} style={{ flex: 1, padding: "7px 0", borderRadius: 6, border: "none", background: T.teal, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "'Outfit', sans-serif" }}>Agregar</button>
              <button onClick={() => setShowAddInfra(null)} style={{ flex: 1, padding: "7px 0", borderRadius: 6, border: "1px solid " + T.border, background: "transparent", color: T.textMuted, cursor: "pointer", fontSize: 13, fontFamily: "'Outfit', sans-serif" }}>Cancelar</button>
            </div>
          </div>
        )}
      </div>

      {/* Modal infra */}
      {showInfraModal && (
        <div onClick={() => setShowInfraModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: T.bgCard, border: "1px solid " + T.border, borderRadius: 12, padding: 24, minWidth: 340, maxWidth: 460, width: "90%", boxShadow: "0 8px 40px " + T.shadow }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: T.cream, fontWeight: 700 }}>{showInfraModal.label}</div>
              {modoEdicion && (
                <button onClick={() => { setInfra(p => p.filter(i => i.id !== showInfraModal.id)); setShowInfraModal(null); }}
                  style={{ padding: "5px 12px", borderRadius: 6, border: "none", background: T.red + "22", color: T.red, cursor: "pointer", fontSize: 12, fontFamily: "'Outfit', sans-serif" }}>
                  Eliminar
                </button>
              )}
            </div>
            <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 14 }}>Tipo: <span style={{ color: T.brownLight, fontWeight: 600 }}>{showInfraModal.tipo}</span></div>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, letterSpacing: "0.07em", marginBottom: 8 }}>HISTORIAL DE ARREGLOS</div>
            {showInfraModal.registros.length === 0
              ? <div style={{ fontSize: 12, color: T.textDim, fontStyle: "italic", marginBottom: 12 }}>Sin registros aún</div>
              : showInfraModal.registros.map((r, i) => (
                <div key={i} style={{ fontSize: 12, padding: "7px 10px", background: T.bgHover, borderRadius: 6, marginBottom: 4, borderLeft: "3px solid " + T.brownLight, color: T.text }}>
                  <span style={{ color: T.brownLight, fontWeight: 600 }}>{r.fecha}</span> — {r.desc}
                </div>
              ))
            }
            <div style={{ borderTop: "1px solid " + T.border, paddingTop: 14, marginTop: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, letterSpacing: "0.07em", marginBottom: 8 }}>AGREGAR REGISTRO</div>
              <input type="date" value={newRegistro.fecha} onChange={e => setNewRegistro(r => ({ ...r, fecha: e.target.value }))} style={{ ...inp, marginBottom: 8 }} />
              <input placeholder="Descripción..." value={newRegistro.desc} onChange={e => setNewRegistro(r => ({ ...r, desc: e.target.value }))} style={{ ...inp, marginBottom: 12 }} />
              <button onClick={() => handleAddRegistro(showInfraModal.id)}
                style={{ width: "100%", padding: "8px 0", borderRadius: 6, border: "none", background: T.teal, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "'Outfit', sans-serif" }}>
                Agregar registro
              </button>
            </div>
            <button onClick={() => setShowInfraModal(null)} style={{ width: "100%", marginTop: 10, padding: "8px 0", borderRadius: 6, border: "1px solid " + T.border, background: "transparent", color: T.textMuted, cursor: "pointer", fontSize: 13, fontFamily: "'Outfit', sans-serif" }}>
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Historial parcela */}
      {parcelaSelected && parcelaData && (
        <div style={{ background: T.bgCard, border: "1px solid " + T.border, borderRadius: 10, padding: 20, marginTop: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: T.cream, fontWeight: 700 }}>
              Historial — <span style={{ color: T.brownLight }}>{parcelaSelected}</span>
            </div>
            <div style={{ padding: "3px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700, letterSpacing: "0.06em",
              background: parcelaData.animales > 0 ? (parcelaData.tipo === "arrendamiento" ? T.teal + "22" : T.green + "22") : T.bgHover,
              color: parcelaData.animales > 0 ? (parcelaData.tipo === "arrendamiento" ? T.tealLight : T.greenLight) : T.textMuted,
              border: "1px solid " + (parcelaData.animales > 0 ? (parcelaData.tipo === "arrendamiento" ? T.teal : T.green) : T.border) }}>
              {parcelaData.animales > 0 ? parcelaData.estado.toUpperCase() : "DESCANSO"}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
            {[
              { label: "Animales", value: parcelaData.animales || "—" },
              { label: "Estado",   value: parcelaData.estado },
              { label: "Días",     value: parcelaData.diasEstado + "d" },
              { label: "Tropa",    value: parcelaData.tropa || "—" },
            ].map(s => (
              <div key={s.label} style={{ background: T.bgHover, border: "1px solid " + T.border, borderRadius: 8, padding: "10px 16px", minWidth: 90 }}>
                <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: T.text, fontFamily: "'Outfit', sans-serif" }}>{s.value}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, letterSpacing: "0.07em", marginBottom: 8 }}>MOVIMIENTOS</div>
          {[
            { fecha: "2024-10-01", evento: "Ingreso tropa T-2024-06", animales: 57 },
            { fecha: "2024-09-15", evento: "Salida hacia P7.2",        animales: 57 },
            { fecha: "2024-08-20", evento: "Ingreso tropa T-2024-05",  animales: 60 },
            { fecha: "2024-08-01", evento: "Inicio descanso",          animales: 0  },
          ].map((h, i) => (
            <div key={i} style={{ display: "flex", gap: 16, padding: "8px 12px", borderRadius: 6, background: i % 2 === 0 ? T.bgHover : "transparent", fontSize: 13 }}>
              <span style={{ color: T.brownLight, minWidth: 90, fontWeight: 600 }}>{h.fecha}</span>
              <span style={{ color: T.text, flex: 1 }}>{h.evento}</span>
              {h.animales > 0 && <span style={{ color: T.teal, fontWeight: 600 }}>{h.animales} cab.</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Placeholder({ label, T }) {
  return (
    <div style={{ background: T.bgCard, border: "1px solid " + T.border, borderRadius: 10, padding: 60, textAlign: "center" }}>
      <div style={{ fontSize: 28, color: T.borderLight, marginBottom: 14 }}>◌</div>
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: T.cream, marginBottom: 8 }}>{label}</div>
      <div style={{ color: T.textMuted, fontSize: 14 }}>Esta sección está en desarrollo</div>
    </div>
  );
}

export default function App() {
  const [themeKey, setThemeKey]   = useState("dark");
  const [tab, setTab]             = useState("campo");
  const [sidebarOpen, setSidebar] = useState(true);
  const [parcelas, setParcelas]   = useState(initialParcelas);
  const [infra, setInfra]         = useState(initialInfra);
  const T = THEMES[themeKey];

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Outfit:wght@300;400;600;700&display=swap" rel="stylesheet" />
      <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: "'Outfit', sans-serif", display: "flex", transition: "background 0.3s" }}>

        {/* SIDEBAR */}
        <aside style={{ width: sidebarOpen ? 220 : 58, flexShrink: 0, background: T.bgSidebar, borderRight: "1px solid " + T.border, display: "flex", flexDirection: "column", transition: "width 0.22s ease", overflow: "hidden" }}>

          {/* Logo */}
          <div style={{ padding: "18px 14px", borderBottom: "1px solid " + T.border, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: T.brown, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 15 }}>C</div>
            {sidebarOpen && (
              <div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 14, color: T.cream, fontWeight: 700, lineHeight: 1.15 }}>Los Cachorros</div>
                <div style={{ fontSize: 11, color: T.textMuted }}>Campo ganadero</div>
              </div>
            )}
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, padding: "10px 6px", display: "flex", flexDirection: "column", gap: 1 }}>
            {NAV_ITEMS.map(item => {
              const active = tab === item.id;
              return (
                <div key={item.id} onClick={() => setTab(item.id)} title={!sidebarOpen ? item.label : ""}
                  style={{ display: "flex", alignItems: "center", gap: 10,
                    padding: sidebarOpen ? "9px 10px" : "9px 0", justifyContent: sidebarOpen ? "flex-start" : "center",
                    borderRadius: 7, cursor: "pointer", transition: "all 0.12s",
                    background: active ? T.activeNavBg : "transparent",
                    color: active ? T.activeNavColor : T.textMuted,
                    borderLeft: active ? "3px solid " + T.activeNavBorder : "3px solid transparent",
                  }}>
                  <span style={{ fontSize: 13, flexShrink: 0 }}>{item.icon}</span>
                  {sidebarOpen && <span style={{ fontSize: 13, fontWeight: active ? 600 : 400, whiteSpace: "nowrap" }}>{item.label}</span>}
                </div>
              );
            })}
          </nav>

          {/* Bottom */}
          <div style={{ padding: "10px 6px", borderTop: "1px solid " + T.border, display: "flex", flexDirection: "column", gap: 2 }}>
            <div onClick={() => setThemeKey(k => k === "dark" ? "light" : "dark")} title={!sidebarOpen ? "Cambiar tema" : ""}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: sidebarOpen ? "8px 10px" : "8px 0", justifyContent: sidebarOpen ? "flex-start" : "center", borderRadius: 7, cursor: "pointer", color: T.textMuted }}>
              <span style={{ fontSize: 13 }}>{themeKey === "dark" ? "○" : "●"}</span>
              {sidebarOpen && <span style={{ fontSize: 13 }}>{themeKey === "dark" ? "Tema claro" : "Tema oscuro"}</span>}
            </div>
            <div onClick={() => setSidebar(o => !o)}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: sidebarOpen ? "8px 10px" : "8px 0", justifyContent: sidebarOpen ? "flex-start" : "center", borderRadius: 7, cursor: "pointer", color: T.textDim }}>
              <span style={{ fontSize: 13 }}>{sidebarOpen ? "◁" : "▷"}</span>
              {sidebarOpen && <span style={{ fontSize: 13 }}>Contraer</span>}
            </div>
          </div>
        </aside>

        {/* CONTENT */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>

          {/* Header */}
          <header style={{ padding: "14px 28px", borderBottom: "1px solid " + T.border, background: T.bgCard, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: T.cream, fontWeight: 700 }}>
                {NAV_ITEMS.find(n => n.id === tab)?.label}
              </div>
              <div style={{ fontSize: 12, color: T.textMuted, marginTop: 1 }}>
                {new Date().toLocaleDateString("es-AR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ padding: "5px 14px", borderRadius: 20, background: T.teal + "18", border: "1px solid " + T.teal, fontSize: 12, color: T.tealLight, fontWeight: 600 }}>
                345 cab. totales
              </div>
              <div style={{ padding: "5px 14px", borderRadius: 20, background: T.brown + "18", border: "1px solid " + T.brown, fontSize: 12, color: T.brownLight, fontWeight: 600 }}>
                176 arrendadas
              </div>
            </div>
          </header>

          {/* Main */}
          <main style={{ flex: 1, padding: 24, overflowY: "auto" }}>
            {tab === "campo"
              ? <MapaCampo parcelas={parcelas} setParcelas={setParcelas} infra={infra} setInfra={setInfra} T={T} />
              : <Placeholder label={NAV_ITEMS.find(n => n.id === tab)?.label} T={T} />
            }
          </main>
        </div>
      </div>
    </>
  );
}
