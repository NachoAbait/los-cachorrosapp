import { useState, useEffect, useRef } from "react";
import { db } from "./firebase";
import {
  collection, doc, onSnapshot,
  setDoc, deleteDoc, updateDoc, addDoc
} from "firebase/firestore";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, Legend
} from "recharts";

const THEMES = {
  dark: {
    bg:           "#13151a",
    bgSidebar:    "#0e1014",
    bgCard:       "#1a1d22",
    bgHover:      "#22262e",
    bgInput:      "#22262e",
    border:       "#2e333d",
    borderLight:  "#3a4050",
    green:        "#4e9e43",
    greenLight:   "#72c464",
    teal:         "#3a8c7e",
    tealLight:    "#56b8a8",
    brown:        "#8c6a3a",
    brownLight:   "#b8924e",
    red:          "#c84a4a",
    text:         "#d8dde8",
    textMuted:    "#6a7a8e",
    textDim:      "#38404e",
    cream:        "#f0e8d8",
    shadow:       "rgba(0,0,0,0.45)",
    activeNavBg:  "#1e2d26",
    activeNavBorder: "#4e9e43",
    activeNavColor:  "#72c464",
  },
  light: {
    bg:           "#f0f4f2",
    bgSidebar:    "#e4ede8",
    bgCard:       "#ffffff",
    bgHover:      "#eaf2ee",
    bgInput:      "#f0f4f2",
    border:       "#c0d4cc",
    borderLight:  "#9abfb4",
    green:        "#357a2c",
    greenLight:   "#2a6222",
    teal:         "#22766a",
    tealLight:    "#185e54",
    brown:        "#7a5228",
    brownLight:   "#6a4420",
    red:          "#a83030",
    text:         "#162420",
    textMuted:    "#4a6e62",
    textDim:      "#8aada4",
    cream:        "#2a1e10",
    shadow:       "rgba(0,0,0,0.10)",
    activeNavBg:  "#ddeee8",
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

const PARCELAS_DEFAULT = {
  "P1.1": { animales: 0, estado: "descanso", diasEstado: 0, tropa: null, tipo: null },
  "P1.2": { animales: 0, estado: "descanso", diasEstado: 0, tropa: null, tipo: null },
  "P2.1": { animales: 0, estado: "descanso", diasEstado: 0, tropa: null, tipo: null },
  "P2.2": { animales: 0, estado: "descanso", diasEstado: 0, tropa: null, tipo: null },
  "P3.1": { animales: 0, estado: "descanso", diasEstado: 0, tropa: null, tipo: null },
  "P3.2": { animales: 0, estado: "descanso", diasEstado: 0, tropa: null, tipo: null },
  "P4.1": { animales: 0, estado: "descanso", diasEstado: 0, tropa: null, tipo: null },
  "P4.2": { animales: 0, estado: "descanso", diasEstado: 0, tropa: null, tipo: null },
  "P5":   { animales: 0, estado: "descanso", diasEstado: 0, tropa: null, tipo: null },
  "P6.1": { animales: 0, estado: "descanso", diasEstado: 0, tropa: null, tipo: null },
  "P6.2": { animales: 0, estado: "descanso", diasEstado: 0, tropa: null, tipo: null },
  "P7.1": { animales: 0, estado: "descanso", diasEstado: 0, tropa: null, tipo: null },
  "P7.2": { animales: 0, estado: "descanso", diasEstado: 0, tropa: null, tipo: null },
  "P8.1": { animales: 0, estado: "descanso", diasEstado: 0, tropa: null, tipo: null },
  "P8.2": { animales: 0, estado: "descanso", diasEstado: 0, tropa: null, tipo: null },
};

const INFRA_ICONS = { casa: "⌂", molino: "⊛", tanque: "◉", bebida: "◎", manga: "⊞", otro: "◆" };

const calcDias = (parcela) => {
  if (!parcela) return 0;
  // Con animales → días pastoreando desde fechaIngreso
  if (parcela.animales > 0) {
    if (!parcela.fechaIngreso) return parcela.diasEstado || 0;
    const ingreso = new Date(parcela.fechaIngreso);
    const hoy = new Date();
    return Math.floor((hoy - ingreso) / (1000 * 60 * 60 * 24));
  }
  // Sin animales → días de descanso desde fechaDescanso
  if (parcela.fechaDescanso) {
    const descanso = new Date(parcela.fechaDescanso);
    const hoy = new Date();
    return Math.floor((hoy - descanso) / (1000 * 60 * 60 * 24));
  }
  return 0;
};

function MapaCampo({ parcelas, infra, T }) {
  const [modo, setModo]                       = useState("pastoreo"); // "pastoreo" | "estructuras" | "edicion"
  const [parcelaSelected, setParcelaSelected] = useState(null);
  const [hoveredParcela, setHoveredParcela]   = useState(null);
  const [showAddInfra, setShowAddInfra]       = useState(null);
  const [showInfraModal, setShowInfraModal]   = useState(null);
  const [editandoRegistro, setEditandoRegistro] = useState(null); // registro a editar
  const [newInfraForm, setNewInfraForm]       = useState({ tipo: "molino", label: "" });
  const [newRegistro, setNewRegistro]         = useState({ fecha: "", desc: "", costo: "" });
  const [loading, setLoading]                 = useState(false);
  const [draggingId, setDraggingId]           = useState(null);
  const mapaRef                               = useRef(null);
  const mouseDownRef                          = useRef({ x: 0, y: 0 });

  const modoEdicion    = modo === "edicion";
  const modoEstructuras = modo === "estructuras";

  const getColors = (data) => {
    if (!data || data.animales === 0) return { bg: T.bgHover, border: T.border, text: T.textDim };
    if (data.tipo === "arrendamiento") return { bg: T.teal + "38", border: T.teal, text: T.tealLight };
    if (data.tipo === "propio")        return { bg: T.green + "38", border: T.green, text: T.greenLight };
    return { bg: T.bgHover, border: T.borderLight, text: T.textMuted };
  };

  const handleMouseDown = (e) => {
    mouseDownRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMapClick = (e) => {
    if (!modoEdicion) return;
    // Si se movió más de 5px es drag, no click
    const dx = Math.abs(e.clientX - mouseDownRef.current.x);
    const dy = Math.abs(e.clientY - mouseDownRef.current.y);
    if (dx > 5 || dy > 5) return;
    const rect = mapaRef.current.getBoundingClientRect();
    const x = parseFloat((((e.clientX - rect.left) / rect.width) * 100).toFixed(1));
    const y = parseFloat((((e.clientY - rect.top) / rect.height) * 100).toFixed(1));
    setShowAddInfra({ x, y });
  };

  const handleAddInfra = async () => {
    if (!newInfraForm.label) return;
    setLoading(true);
    try {
      await addDoc(collection(db, "infraestructura"), {
        tipo: newInfraForm.tipo,
        label: newInfraForm.label,
        x: showAddInfra.x,
        y: showAddInfra.y,
        registros: [],
      });
      setShowAddInfra(null);
      setNewInfraForm({ tipo: "molino", label: "" });
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleDeleteInfra = async (id) => {
    setLoading(true);
    try {
      await deleteDoc(doc(db, "infraestructura", id));
      setShowInfraModal(null);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleAddRegistro = async (item) => {
    if (!newRegistro.fecha || !newRegistro.desc) return;
    let updated;
    if (editandoRegistro !== null) {
      updated = (item.registros || []).map((r, i) => i === editandoRegistro ? { ...newRegistro } : r);
    } else {
      updated = [...(item.registros || []), { ...newRegistro }];
    }
    try {
      await updateDoc(doc(db, "infraestructura", item.id), { registros: updated });
      setShowInfraModal(prev => ({ ...prev, registros: updated }));
      // Si tiene costo, registrar en finanzas automáticamente
      if (newRegistro.costo && parseFloat(newRegistro.costo) > 0 && editandoRegistro === null) {
        await addDoc(collection(db, "gastos"), {
          fecha: newRegistro.fecha,
          tipo: "mantenimiento",
          descripcion: item.label + " — " + newRegistro.desc,
          monto: parseFloat(newRegistro.costo),
          moneda: "ARS",
          anio: new Date(newRegistro.fecha).getFullYear(),
          mes:  new Date(newRegistro.fecha).getMonth(),
          infraId: item.id,
          creadoEn: new Date().toISOString().split("T")[0],
        });
      }
      setNewRegistro({ fecha: "", desc: "", costo: "" });
      setEditandoRegistro(null);
    } catch (e) { console.error(e); }
  };

  const handleEliminarRegistro = async (item, idx) => {
    const updated = (item.registros || []).filter((_, i) => i !== idx);
    try {
      await updateDoc(doc(db, "infraestructura", item.id), { registros: updated });
      setShowInfraModal(prev => ({ ...prev, registros: updated }));
    } catch(e) { console.error(e); }
  };

  const parcelaData = parcelaSelected ? parcelas[parcelaSelected] : null;

  const inp = {
    width: "100%", padding: "10px 12px", borderRadius: 6, fontSize: 14,
    background: T.bgInput, border: "1px solid " + T.border,
    color: T.text, boxSizing: "border-box", outline: "none", fontFamily: "'Outfit', sans-serif",
  };

  const cabPropias      = Object.entries(parcelas).filter(([k,v]) => v.tipo === "propio").reduce((s,[,v]) => s + (v.animales||0), 0);
  const cabArrendadas   = Object.entries(parcelas).filter(([k,v]) => v.tipo === "arrendamiento").reduce((s,[,v]) => s + (v.animales||0), 0);

  return (
    <div>
      {/* Boxes resumen + toggles de modo */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "stretch", marginBottom: 16, gap: 12 }}>
        {/* Box arrendamiento */}
        <div style={{ flex: 1, background: T.bgCard, border: "2px solid " + T.teal, borderRadius: 10, padding: "14px 20px", display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: T.teal, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 12, color: T.tealLight, fontWeight: 700, letterSpacing: "0.06em", marginBottom: 2 }}>ARRENDAMIENTO (P1–P4)</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: T.tealLight, lineHeight: 1, fontFamily: "'Outfit', sans-serif" }}>{cabArrendadas}</div>
            <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>cabezas pastoreando</div>
          </div>
        </div>

        {/* Box propios */}
        <div style={{ flex: 1, background: T.bgCard, border: "2px solid " + T.green, borderRadius: 10, padding: "14px 20px", display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: T.green, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 12, color: T.greenLight, fontWeight: 700, letterSpacing: "0.06em", marginBottom: 2 }}>ANIMALES PROPIOS (P5–P8)</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: T.greenLight, lineHeight: 1, fontFamily: "'Outfit', sans-serif" }}>{cabPropias}</div>
            <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>cabezas pastoreando</div>
          </div>
        </div>

        {/* Toggles de modo */}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", alignItems: "flex-end", gap: 8 }}>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "flex-end" }}>
            {[
              { c: T.green,  label: "Propios" },
              { c: T.teal,   label: "Arrendamiento" },
              { c: T.border, label: "Descanso" },
            ].map(l => (
              <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: T.textMuted }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: l.c + "38", border: "2px solid " + l.c }} />
                {l.label}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {[
              { id: "pastoreo",    label: "Pastoreo",    color: T.green },
              { id: "estructuras", label: "Estructuras", color: T.brownLight },
              { id: "edicion",     label: "Editar mapa", color: T.teal },
            ].map(m => (
              <button key={m.id}
                onClick={() => { setModo(modo === m.id ? "pastoreo" : m.id); setShowAddInfra(null); setParcelaSelected(null); }}
                style={{ padding: "8px 16px", borderRadius: 6, border: modo === m.id ? "none" : "1px solid " + T.border,
                  background: modo === m.id ? m.color : "transparent",
                  color: modo === m.id ? "#fff" : T.textMuted,
                  cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "'Outfit', sans-serif", transition: "all 0.15s" }}>
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Aviso modo activo */}
      {modoEstructuras && (
        <div style={{ padding: "8px 14px", background: T.brown + "18", border: "1px solid " + T.brownLight, borderRadius: 8, marginBottom: 14, fontSize: 13, color: T.brownLight }}>
          Vista estructuras — hacé click en cualquier ícono para registrar un mantenimiento
        </div>
      )}
      {modoEdicion && (
        <div style={{ padding: "8px 14px", background: T.teal + "18", border: "1px solid " + T.teal, borderRadius: 8, marginBottom: 14, fontSize: 13, color: T.tealLight }}>
          Modo edición — hacé click en el mapa para agregar infraestructura. Arrastrá los íconos para reposicionarlos.
        </div>
      )}

      {/* MAPA */}
      <div
        ref={mapaRef}
        onMouseDown={handleMouseDown}
        onDragOver={e => e.preventDefault()}
        // onClick removido
        style={{
          background: T.bgCard, border: "1px solid " + T.border, borderRadius: 10,
          overflow: "hidden", boxShadow: "0 2px 12px " + T.shadow,
          cursor: modoEdicion ? "crosshair" : "default",
          userSelect: "none", position: "relative",
        }}>

        {/* Potreros */}
        <div style={{ display: "flex", height: 260 }}>
          {[1,2,3,4,5,6,7,8].map(p => {
            const esP5 = p === 5;
            const keys = esP5 ? ["P" + p] : ["P" + p + ".1", "P" + p + ".2"];
            return (
              <div key={p} style={{ flex: 1, borderRight: p < 8 ? "4px solid " + T.brown : "none", display: "flex", position: "relative" }}>
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
                        background: sel ? col.border + "50" : hov ? col.border + "28" : col.bg,
                        outline: sel ? "2px solid " + col.border : "1px solid " + col.border,
                        outlineOffset: -1,
                        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                        cursor: modoEdicion ? "crosshair" : "pointer",
                        transition: "background 0.12s", position: "relative", padding: 4,
                      }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: col.text, letterSpacing: "0.04em", marginBottom: 4 }}>{key}</div>
                      {!modoEdicion && !modoEstructuras && data && data.animales > 0 ? (
                        <>
                          <div style={{ fontSize: 26, fontWeight: 800, color: col.text, lineHeight: 1 }}>{data.animales}</div>
                          <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>cabezas</div>
                          <div style={{ fontSize: 11, color: T.brownLight, marginTop: 3, fontWeight: 600 }}>{calcDias(data)}d pastoreo</div>
                        </>
                      ) : !modoEdicion && !modoEstructuras ? (
                        <div style={{ fontSize: 10, color: T.textDim, fontStyle: "italic" }}>
                          {data && calcDias(data) > 0 ? calcDias(data) + "d desc." : "Vacío"}
                        </div>
                      ) : null}

                      {hov && !modoEdicion && data && (
                        <div style={{ position: "absolute", top: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)",
                          background: T.bgCard, border: "1px solid " + col.border, borderRadius: 8,
                          padding: "10px 14px", minWidth: 165, zIndex: 100, pointerEvents: "none",
                          boxShadow: "0 4px 20px " + T.shadow }}>
                          <div style={{ fontWeight: 700, color: T.cream, marginBottom: 6, fontSize: 13, fontFamily: "'Barlow Condensed', sans-serif" }}>{key}</div>
                          <div style={{ fontSize: 12, color: T.textMuted, lineHeight: 1.8 }}>
                            <div>Animales: <b style={{ color: T.text }}>{data.animales || "—"}</b></div>
                            <div>Estado: <b style={{ color: data.estado === "pastoreo" ? T.green : T.brownLight }}>{data.estado}</b></div>
                            <div>Días: <b style={{ color: T.text }}>{calcDias(data)}</b></div>
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

        {/* Capa de clicks en modo edicion */}
        {modoEdicion && (
          <div
            onMouseDown={handleMouseDown}
            onClick={handleMapClick}
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 5, cursor: "crosshair" }}
          />
        )}

        {/* Infra overlay */}
        <div style={{ position: "absolute", top: 28, left: 0, right: 0, bottom: 0, pointerEvents: "none" }}>
          {infra.map(item => (
            <div key={item.id}
              title={item.label}
              onClick={e => { e.stopPropagation(); if (!draggingId) setShowInfraModal({ ...item }); }}
              draggable={modoEdicion}
              onDragStart={e => {
                e.stopPropagation();
                setDraggingId(item.id);
                e.dataTransfer.effectAllowed = "move";
              }}
              onDragEnd={async e => {
                e.stopPropagation();
                if (!mapaRef.current) return;
                const rect = mapaRef.current.getBoundingClientRect();
                const x = parseFloat((((e.clientX - rect.left) / rect.width) * 100).toFixed(1));
                const y = parseFloat((((e.clientY - rect.top) / rect.height) * 100).toFixed(1));
                const clampedX = Math.min(Math.max(x, 1), 99);
                const clampedY = Math.min(Math.max(y, 1), 99);
                try {
                  await updateDoc(doc(db, "infraestructura", item.id), { x: clampedX, y: clampedY });
                } catch(err) { console.error(err); }
                setDraggingId(null);
              }}
              style={{
                position: "absolute", left: item.x + "%", top: item.y + "%",
                transform: "translate(-50%,-50%)",
                fontSize: modoEstructuras ? (item.tipo === "casa" ? 32 : 26) : (item.tipo === "casa" ? 20 : 16),
                cursor: modoEdicion ? "grab" : "pointer",
                pointerEvents: "all", zIndex: 20,
                color: modoEstructuras ? T.brownLight : draggingId === item.id ? T.tealLight : T.brownLight + "88",
                filter: modoEdicion ? "drop-shadow(0 0 6px " + T.brownLight + ")" :
                        modoEstructuras ? "drop-shadow(0 2px 8px " + T.shadow + ")" :
                        "drop-shadow(0 1px 3px " + T.shadow + ")",
                opacity: draggingId === item.id ? 0.4 : 1,
                transition: draggingId === item.id ? "none" : "all 0.2s",
              }}>
              {INFRA_ICONS[item.tipo] || "◆"}
              {/* Label visible en modo estructuras */}
              {modoEstructuras && (
                <div style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", fontSize: 10, color: T.brownLight, whiteSpace: "nowrap", marginTop: 2, fontWeight: 700, letterSpacing: "0.04em" }}>
                  {item.label}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Popup agregar infra */}
        {showAddInfra && modoEdicion && (
          <div onClick={e => e.stopPropagation()} style={{
            position: "fixed",
            left: "50%", top: "50%", transform: "translate(-50%, -50%)",
            background: T.bgCard, border: "1px solid " + T.brownLight, borderRadius: 10,
            padding: 20, zIndex: 1000, minWidth: 240, boxShadow: "0 6px 30px " + T.shadow,
          }}>
            <div style={{ fontWeight: 700, color: T.brownLight, marginBottom: 12, fontSize: 13 }}>Agregar infraestructura</div>
            <select value={newInfraForm.tipo} onChange={e => setNewInfraForm(f => ({ ...f, tipo: e.target.value }))} style={{ ...inp, marginBottom: 8 }}>
              <option value="molino">Molino</option>
              <option value="tanque">Tanque</option>
              <option value="bebida">Bebida</option>
              <option value="manga">Manga</option>
              <option value="casa">Casa</option>
              <option value="otro">Otro</option>
            </select>
            <input
              placeholder="Nombre (ej: Molino Norte)"
              value={newInfraForm.label}
              onChange={e => setNewInfraForm(f => ({ ...f, label: e.target.value }))}
              style={{ ...inp, marginBottom: 12 }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleAddInfra} disabled={loading}
                style={{ flex: 1, padding: "7px 0", borderRadius: 6, border: "none", background: T.teal, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "'Outfit', sans-serif", opacity: loading ? 0.7 : 1 }}>
                {loading ? "Guardando..." : "Agregar"}
              </button>
              <button onClick={() => setShowAddInfra(null)}
                style={{ flex: 1, padding: "7px 0", borderRadius: 6, border: "1px solid " + T.border, background: "transparent", color: T.textMuted, cursor: "pointer", fontSize: 13, fontFamily: "'Outfit', sans-serif" }}>
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal mantenimiento infraestructura */}
      {showInfraModal && (
        <div onClick={() => { setShowInfraModal(null); setEditandoRegistro(null); setNewRegistro({ fecha: "", desc: "", costo: "" }); }}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: T.bgCard, border: "1px solid " + T.border, borderRadius: 12,
            padding: 24, minWidth: 400, maxWidth: 540, width: "92%",
            boxShadow: "0 8px 40px " + T.shadow, maxHeight: "88vh", overflowY: "auto",
          }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 22, color: T.cream, fontWeight: 700 }}>
                {INFRA_ICONS[showInfraModal.tipo]} {showInfraModal.label}
              </div>
              {modoEdicion && (
                <button onClick={() => handleDeleteInfra(showInfraModal.id)} disabled={loading}
                  style={{ padding: "5px 12px", borderRadius: 6, border: "none", background: T.red + "22", color: T.red, cursor: "pointer", fontSize: 12, fontFamily: "'Outfit', sans-serif" }}>
                  Eliminar estructura
                </button>
              )}
            </div>
            <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 18 }}>
              Tipo: <span style={{ color: T.brownLight, fontWeight: 600 }}>{showInfraModal.tipo}</span>
            </div>

            {/* Historial de mantenimientos */}
            <div style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, letterSpacing: "0.07em", marginBottom: 10 }}>HISTORIAL DE MANTENIMIENTOS</div>
            {(!showInfraModal.registros || showInfraModal.registros.length === 0)
              ? <div style={{ fontSize: 13, color: T.textDim, fontStyle: "italic", marginBottom: 14 }}>Sin registros aún</div>
              : showInfraModal.registros.map((r, i) => (
                <div key={i} style={{ padding: "10px 12px", background: T.bgHover, borderRadius: 8, marginBottom: 6, borderLeft: "3px solid " + T.brownLight }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <span style={{ color: T.brownLight, fontWeight: 700, fontSize: 12 }}>{r.fecha}</span>
                      {r.costo && parseFloat(r.costo) > 0 && (
                        <span style={{ fontSize: 11, padding: "1px 8px", borderRadius: 12, background: T.green + "22", color: T.greenLight, border: "1px solid " + T.green, fontWeight: 700 }}>
                          $ {new Intl.NumberFormat("es-AR").format(r.costo)}
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => {
                        setEditandoRegistro(i);
                        setNewRegistro({ fecha: r.fecha, desc: r.desc, costo: r.costo || "" });
                      }} style={{ padding: "2px 8px", borderRadius: 4, border: "1px solid " + T.border, background: "transparent", color: T.textMuted, cursor: "pointer", fontSize: 11 }}>
                        Editar
                      </button>
                      <button onClick={() => handleEliminarRegistro(showInfraModal, i)}
                        style={{ padding: "2px 8px", borderRadius: 4, border: "none", background: T.red + "22", color: T.red, cursor: "pointer", fontSize: 11 }}>
                        ✕
                      </button>
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: T.text }}>{r.desc}</div>
                </div>
              ))
            }

            {/* Formulario agregar/editar */}
            <div style={{ borderTop: "1px solid " + T.border, paddingTop: 16, marginTop: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, letterSpacing: "0.07em", marginBottom: 10 }}>
                {editandoRegistro !== null ? "EDITAR REGISTRO" : "NUEVO MANTENIMIENTO"}
              </div>
              <input type="date" value={newRegistro.fecha}
                onChange={e => setNewRegistro(r => ({ ...r, fecha: e.target.value }))}
                style={{ ...inp, marginBottom: 8 }} />
              <input placeholder="Descripción del trabajo realizado..."
                value={newRegistro.desc}
                onChange={e => setNewRegistro(r => ({ ...r, desc: e.target.value }))}
                style={{ ...inp, marginBottom: 8 }} />
              <input type="number" placeholder="Costo $ (opcional — se registra en Finanzas)"
                value={newRegistro.costo}
                onChange={e => setNewRegistro(r => ({ ...r, costo: e.target.value }))}
                style={{ ...inp, marginBottom: 8 }} />

              {/* Fotos — placeholder hasta Cloudinary */}
              <div style={{ padding: "12px 14px", background: T.bgHover, borderRadius: 8, marginBottom: 12, border: "1px dashed " + T.border, textAlign: "center", cursor: "not-allowed", opacity: 0.6 }}>
                <div style={{ fontSize: 13, color: T.textMuted }}>📷 Agregar fotos — disponible próximamente</div>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => handleAddRegistro(showInfraModal)} disabled={loading || !newRegistro.fecha || !newRegistro.desc}
                  style={{ flex: 1, padding: "9px 0", borderRadius: 7, border: "none", background: T.brownLight, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "'Outfit', sans-serif", opacity: loading ? 0.7 : 1 }}>
                  {editandoRegistro !== null ? "Guardar cambios" : "Agregar registro"}
                </button>
                {editandoRegistro !== null && (
                  <button onClick={() => { setEditandoRegistro(null); setNewRegistro({ fecha: "", desc: "", costo: "" }); }}
                    style={{ padding: "9px 16px", borderRadius: 7, border: "1px solid " + T.border, background: "transparent", color: T.textMuted, cursor: "pointer", fontSize: 13, fontFamily: "'Outfit', sans-serif" }}>
                    Cancelar
                  </button>
                )}
              </div>
            </div>

            <button onClick={() => { setShowInfraModal(null); setEditandoRegistro(null); setNewRegistro({ fecha: "", desc: "", costo: "" }); }}
              style={{ width: "100%", marginTop: 12, padding: "9px 0", borderRadius: 7, border: "1px solid " + T.border, background: "transparent", color: T.textMuted, cursor: "pointer", fontSize: 13, fontFamily: "'Outfit', sans-serif" }}>
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Panel parcela seleccionada */}
      {parcelaSelected && parcelaData && (
        <ParcelaPanel
          key={parcelaSelected}
          parcelaId={parcelaSelected}
          parcelaData={parcelaData}
          parcelas={parcelas}
          T={T}
          onClose={() => setParcelaSelected(null)}
        />
      )}
    </div>
  );
}

// ─── PANEL PARCELA ────────────────────────────────────────────────────────────
function ParcelaPanel({ parcelaId, parcelaData, parcelas, T, onClose }) {
  const [showRotacion, setShowRotacion] = useState(false);
  const [movimientos, setMovimientos]   = useState([]);
  const [rotForm, setRotForm]           = useState({
    cantidad: parcelaData.animales || 0,
    destino: "",
    fecha: new Date().toISOString().split("T")[0],
    kgPromedio: "",
    observaciones: "",
  });
  const [loadingRot, setLoadingRot] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "movimientos"),
      snap => {
        const todos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const filtrados = todos.filter(m => m.origen === parcelaId || m.destino === parcelaId);
        filtrados.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        setMovimientos(filtrados);
      }
    );
    return () => unsub();
  }, [parcelaId]);

  const handleRotacion = async () => {
    const cant = parseInt(rotForm.cantidad);
    if (!cant || cant <= 0 || cant > parcelaData.animales) return;
    if (!rotForm.destino) return;
    setLoadingRot(true);
    try {
      const hoy = new Date().toISOString().split("T")[0];
      const destData = parcelas[rotForm.destino] || {};

      // Guardar movimiento
      await addDoc(collection(db, "movimientos"), {
        fecha:          rotForm.fecha,
        origen:         parcelaId,
        destino:        rotForm.destino,
        cantidad:       cant,
        kgPromedio:     rotForm.kgPromedio ? parseFloat(rotForm.kgPromedio) : null,
        observaciones:  rotForm.observaciones,
        diasEnOrigen: calcDias(parcelaData),
        tropa:          parcelaData.tropa || null,
        creadoEn:       hoy,
      });

      // Actualizar parcela origen
      const restantes = parcelaData.animales - cant;
      const diasActuales = calcDias(parcelaData);
      await setDoc(doc(db, "parcelas", parcelaId), {
        ...parcelaData,
        animales:      restantes,
        estado:        restantes > 0 ? "pastoreo" : "descanso",
        fechaIngreso:  restantes > 0 ? parcelaData.fechaIngreso : null,
        fechaDescanso: restantes === 0 ? hoy : null,
        diasFinal:     restantes === 0 ? diasActuales : null,
      });

      // Actualizar parcela destino
      await setDoc(doc(db, "parcelas", rotForm.destino), {
        animales:    (destData.animales || 0) + cant,
        estado:      "pastoreo",
        fechaIngreso: hoy,
        tropa:       parcelaData.tropa || destData.tropa || null,
        tipo:        parcelaData.tipo || destData.tipo || null,
      });

      setShowRotacion(false);
      setRotForm({ cantidad: 0, destino: "", fecha: hoy, kgPromedio: "", observaciones: "" });
    } catch (e) { console.error(e); }
    setLoadingRot(false);
  };

  const inp = {
    width: "100%", padding: "10px 12px", borderRadius: 6, fontSize: 14,
    background: T.bgInput, border: "1px solid " + T.border,
    color: T.text, boxSizing: "border-box", outline: "none", fontFamily: "'Outfit', sans-serif",
  };

  const todasLasParcelas = Object.keys({ ...PARCELAS_DEFAULT, ...parcelas }).filter(k => k !== parcelaId).sort();

  return (
    <div style={{ background: T.bgCard, border: "1px solid " + T.border, borderRadius: 10, padding: 20, marginTop: 20 }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 18, color: T.cream, fontWeight: 700 }}>
          <span style={{ color: T.brownLight }}>{parcelaId}</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ padding: "3px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700, letterSpacing: "0.06em",
            background: parcelaData.animales > 0 ? (parcelaData.tipo === "arrendamiento" ? T.teal + "22" : T.green + "22") : T.bgHover,
            color: parcelaData.animales > 0 ? (parcelaData.tipo === "arrendamiento" ? T.tealLight : T.greenLight) : T.textMuted,
            border: "1px solid " + (parcelaData.animales > 0 ? (parcelaData.tipo === "arrendamiento" ? T.teal : T.green) : T.border) }}>
            {parcelaData.animales > 0 ? parcelaData.estado.toUpperCase() : "DESCANSO"}
          </div>
          {parcelaData.animales > 0 && !showRotacion && (
            <button onClick={() => setShowRotacion(true)}
              style={{ padding: "6px 14px", borderRadius: 6, border: "none", background: T.green, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "'Outfit', sans-serif" }}>
              Nueva rotación
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        {[
          { label: "Animales",  value: parcelaData.animales || "—" },
          { label: "Estado",    value: parcelaData.estado },
          { label: parcelaData.animales > 0 ? "Días pastoreo" : "Días descanso", value: calcDias(parcelaData) + "d" },
          { label: "Tropa",     value: parcelaData.tropa || "—" },
          { label: "Uso",       value: parcelaData.tipo || "—" },
        ].map(s => (
          <div key={s.label} style={{ background: T.bgHover, border: "1px solid " + T.border, borderRadius: 8, padding: "10px 16px", minWidth: 90 }}>
            <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.text, fontFamily: "'Outfit', sans-serif" }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Formulario rotación */}
      {showRotacion && (
        <div style={{ background: T.bgHover, border: "1px solid " + T.green, borderRadius: 10, padding: 18, marginBottom: 16 }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 16, color: T.greenLight, marginBottom: 14, fontWeight: 700 }}>
            Nueva rotación desde {parcelaId}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>Fecha</div>
              <input type="date" value={rotForm.fecha} onChange={e => setRotForm(f => ({ ...f, fecha: e.target.value }))} style={inp} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>Cantidad de animales</div>
              <input type="number" min={1} max={parcelaData.animales} value={rotForm.cantidad}
                onChange={e => setRotForm(f => ({ ...f, cantidad: e.target.value }))} style={inp} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>Parcela destino</div>
              <select value={rotForm.destino} onChange={e => setRotForm(f => ({ ...f, destino: e.target.value }))} style={inp}>
                <option value="">— Seleccionar —</option>
                {todasLasParcelas.map(k => {
                  const d = parcelas[k];
                  return (
                    <option key={k} value={k}>
                      {k} {d?.animales > 0 ? "⚠ pastoreando (" + d.animales + " cab.)" : "(vacía)"}
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>Kg promedio (opcional)</div>
              <input type="number" placeholder="ej: 280" value={rotForm.kgPromedio}
                onChange={e => setRotForm(f => ({ ...f, kgPromedio: e.target.value }))} style={inp} />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>Observaciones</div>
            <input placeholder="Ej: Buen estado general, pasto abundante..." value={rotForm.observaciones}
              onChange={e => setRotForm(f => ({ ...f, observaciones: e.target.value }))} style={inp} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleRotacion} disabled={loadingRot || !rotForm.destino || !rotForm.cantidad}
              style={{ flex: 1, padding: "9px 0", borderRadius: 6, border: "none", background: T.green, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "'Outfit', sans-serif", opacity: loadingRot ? 0.7 : 1 }}>
              {loadingRot ? "Guardando..." : "Confirmar rotación"}
            </button>
            <button onClick={() => setShowRotacion(false)}
              style={{ padding: "9px 18px", borderRadius: 6, border: "1px solid " + T.border, background: "transparent", color: T.textMuted, cursor: "pointer", fontSize: 13, fontFamily: "'Outfit', sans-serif" }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Historial movimientos */}
      <div style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, letterSpacing: "0.07em", marginBottom: 10 }}>HISTORIAL DE MOVIMIENTOS</div>
      {movimientos.length === 0 ? (
        <div style={{ fontSize: 13, color: T.textDim, fontStyle: "italic" }}>Sin movimientos registrados aún</div>
      ) : (
        movimientos.map((m, i) => (
          <div key={m.id} style={{ display: "flex", gap: 12, padding: "10px 12px", borderRadius: 6,
            background: i % 2 === 0 ? T.bgHover : "transparent", fontSize: 13, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ color: T.brownLight, fontWeight: 600, minWidth: 90 }}>{m.fecha}</span>
            <span style={{ color: m.origen === parcelaId ? T.red : T.greenLight, fontWeight: 700, minWidth: 60 }}>
              {m.origen === parcelaId ? "▶ Salida" : "◀ Entrada"}
            </span>
            <span style={{ color: T.text, flex: 1 }}>
              {m.origen === parcelaId ? m.origen + " → " + m.destino : m.origen + " → " + m.destino}
            </span>
            <span style={{ color: T.tealLight, fontWeight: 600 }}>{m.cantidad} cab.</span>
            {m.kgPromedio && <span style={{ color: T.textMuted }}>{m.kgPromedio} kg/cab</span>}
            {m.observaciones && <span style={{ color: T.textDim, fontSize: 12, width: "100%", paddingLeft: 90 }}>{m.observaciones}</span>}
          </div>
        ))
      )}
    </div>
  );
}

// ─── FEEDLOT & FAENA ─────────────────────────────────────────────────────────
function Feedlot({ T, parcelas, setParcelas }) {
  const hoy = new Date().toISOString().split("T")[0];
  const [tropas, setTropas]       = useState([]);
  const [alimentos, setAlimentos] = useState([]);
  const [muertes, setMuertes]     = useState([]);
  const [salidas, setSalidas]     = useState([]);
  const [modal, setModal]         = useState(null); // "tropa"|"salida"|"alimento"|"muerte"|"hoteleria"
  const [loading, setLoading]     = useState(false);

  const [formTropa, setFormTropa] = useState({
    fecha: hoy, machos: "", hembras: "", pesoPromedio: "", observaciones: "",
    parcelaOrigen: "",
  });
  const [formSalida, setFormSalida] = useState({
    fecha: hoy, cantidad: "", pesoPromedio: "", precioKg: "", observaciones: "",
  });
  const [formAlimento, setFormAlimento] = useState({
    fecha: hoy, kg: "", precioKg: "", observaciones: "",
  });
  const [formMuerte, setFormMuerte] = useState({
    fecha: hoy, sexo: "macho", tropaId: "", observaciones: "",
  });
  const [formHoteleria, setFormHoteleria] = useState({
    fecha: hoy, descripcion: "", monto: "",
  });

  useEffect(() => {
    const u1 = onSnapshot(collection(db, "feedlot_tropas"), snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => a.numero - b.numero);
      setTropas(data);
    });
    const u2 = onSnapshot(collection(db, "feedlot_alimento"), snap => {
      setAlimentos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const u3 = onSnapshot(collection(db, "feedlot_muertes"), snap => {
      setMuertes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const u4 = onSnapshot(collection(db, "feedlot_salidas"), snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
      setSalidas(data);
    });
    return () => { u1(); u2(); u3(); u4(); };
  }, []);

  const calcDiasFeedlot = (fechaIngreso) => {
    if (!fechaIngreso) return 0;
    return Math.floor((new Date() - new Date(fechaIngreso)) / (1000 * 60 * 60 * 24));
  };

  // Stats generales
  const animalesActivos  = tropas.reduce((s, t) => s + (t.stockActual || 0), 0);
  const kgAlimentoTotal  = alimentos.reduce((s, a) => s + (a.kg || 0), 0);
  const kgGanadosTotal   = salidas.reduce((s, s2) => s + (s2.kgGanados || 0), 0);
  const conversionIndice = kgGanadosTotal > 0 ? (kgAlimentoTotal / kgGanadosTotal).toFixed(2) : "—";
  const muertesTotal     = muertes.length;

  // FIFO: dada una cantidad a sacar, distribuye entre tropas por orden de ingreso
  const calcFIFO = (cantidadASacar) => {
    const tropasActivas = tropas.filter(t => (t.stockActual || 0) > 0).sort((a, b) => a.numero - b.numero);
    const distribucion = [];
    let restante = cantidadASacar;
    for (const t of tropasActivas) {
      if (restante <= 0) break;
      const sacar = Math.min(restante, t.stockActual);
      distribucion.push({ tropa: t, cantidad: sacar });
      restante -= sacar;
    }
    return distribucion;
  };

  const handleCargarTropa = async () => {
    const machos  = parseInt(formTropa.machos)  || 0;
    const hembras = parseInt(formTropa.hembras) || 0;
    const total   = machos + hembras;
    if (!total || !formTropa.pesoPromedio) return;
    setLoading(true);
    try {
      const numero = tropas.length + 1;
      await addDoc(collection(db, "feedlot_tropas"), {
        numero,
        nombre: numero + "ra tropa",
        fecha:  formTropa.fecha,
        machos, hembras,
        total,
        stockActual: total,
        pesoPromedio: parseFloat(formTropa.pesoPromedio),
        parcelaOrigen: formTropa.parcelaOrigen,
        observaciones: formTropa.observaciones,
        creadoEn: hoy,
      });
      // Descontar del campo si hay parcela origen
      if (formTropa.parcelaOrigen && parcelas[formTropa.parcelaOrigen]) {
        const p = parcelas[formTropa.parcelaOrigen];
        const restantes = (p.animales || 0) - total;
        await setDoc(doc(db, "parcelas", formTropa.parcelaOrigen), {
          ...p,
          animales: Math.max(0, restantes),
          estado: restantes <= 0 ? "descanso" : "pastoreo",
          fechaDescanso: restantes <= 0 ? hoy : null,
          fechaIngreso: restantes <= 0 ? null : p.fechaIngreso,
        });
      }
      setModal(null);
      setFormTropa({ fecha: hoy, machos: "", hembras: "", pesoPromedio: "", observaciones: "", parcelaOrigen: "" });
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  const handleSalida = async () => {
    const cant = parseInt(formSalida.cantidad);
    if (!cant || !formSalida.pesoPromedio || !formSalida.precioKg) return;
    setLoading(true);
    try {
      const distribucion = calcFIFO(cant);
      const pesoSalida   = parseFloat(formSalida.pesoPromedio);
      const precioKg     = parseFloat(formSalida.precioKg);

      for (const { tropa, cantidad } of distribucion) {
        const kgGanados = (pesoSalida - tropa.pesoPromedio) * cantidad;
        const diasFeedlot = calcDiasFeedlot(tropa.fecha);
        const totalVenta  = cantidad * pesoSalida * precioKg;

        await addDoc(collection(db, "feedlot_salidas"), {
          fecha:        formSalida.fecha,
          tropaId:      tropa.id,
          tropaNombre:  tropa.nombre,
          tropaNumero:  tropa.numero,
          cantidad,
          pesoIngreso:  tropa.pesoPromedio,
          pesoSalida,
          kgGanados:    Math.max(0, kgGanados),
          diasFeedlot,
          precioKg,
          totalVenta,
          observaciones: formSalida.observaciones,
          creadoEn: hoy,
        });

        // Actualizar stock de la tropa
        await updateDoc(doc(db, "feedlot_tropas", tropa.id), {
          stockActual: tropa.stockActual - cantidad,
        });

        // Registrar venta en Finanzas
        await addDoc(collection(db, "ventas"), {
          fecha:        formSalida.fecha,
          tropa:        tropa.nombre + " (feedlot)",
          cabezas:      cantidad,
          pesoPromedio: pesoSalida,
          precioKg,
          kgTotal:      cantidad * pesoSalida,
          total:        totalVenta,
          moneda:       "ARS",
          anio:         new Date(formSalida.fecha).getFullYear(),
          mes:          new Date(formSalida.fecha).getMonth(),
          creadoEn:     hoy,
        });
      }
      setModal(null);
      setFormSalida({ fecha: hoy, cantidad: "", pesoPromedio: "", precioKg: "", observaciones: "" });
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  const handleAlimento = async () => {
    if (!formAlimento.kg || !formAlimento.precioKg) return;
    setLoading(true);
    try {
      const kg    = parseFloat(formAlimento.kg);
      const pKg   = parseFloat(formAlimento.precioKg);
      const total = kg * pKg;
      await addDoc(collection(db, "feedlot_alimento"), {
        fecha: formAlimento.fecha, kg, precioKg: pKg, total,
        observaciones: formAlimento.observaciones, creadoEn: hoy,
      });
      // Registrar en Finanzas
      await addDoc(collection(db, "gastos"), {
        fecha: formAlimento.fecha, tipo: "feedlot_alimento",
        descripcion: "Alimento feedlot — " + kg + " kg",
        monto: total, moneda: "ARS",
        anio: new Date(formAlimento.fecha).getFullYear(),
        mes:  new Date(formAlimento.fecha).getMonth(),
        creadoEn: hoy,
      });
      setModal(null);
      setFormAlimento({ fecha: hoy, kg: "", precioKg: "", observaciones: "" });
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  const handleMuerte = async () => {
    if (!formMuerte.tropaId) return;
    setLoading(true);
    try {
      const tropa = tropas.find(t => t.id === formMuerte.tropaId);
      await addDoc(collection(db, "feedlot_muertes"), {
        fecha: formMuerte.fecha, sexo: formMuerte.sexo,
        tropaId: formMuerte.tropaId,
        tropaNombre: tropa?.nombre || "",
        observaciones: formMuerte.observaciones, creadoEn: hoy,
      });
      if (tropa) {
        await updateDoc(doc(db, "feedlot_tropas", tropa.id), {
          stockActual: Math.max(0, (tropa.stockActual || 0) - 1),
          [formMuerte.sexo === "macho" ? "machos" : "hembras"]: Math.max(0, (tropa[formMuerte.sexo === "macho" ? "machos" : "hembras"] || 0) - 1),
        });
      }
      setModal(null);
      setFormMuerte({ fecha: hoy, sexo: "macho", tropaId: "", observaciones: "" });
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  const handleHoteleria = async () => {
    if (!formHoteleria.monto) return;
    setLoading(true);
    try {
      await addDoc(collection(db, "gastos"), {
        fecha: formHoteleria.fecha, tipo: "feedlot_hoteleria",
        descripcion: formHoteleria.descripcion || "Hotelería feedlot",
        monto: parseFloat(formHoteleria.monto), moneda: "ARS",
        anio: new Date(formHoteleria.fecha).getFullYear(),
        mes:  new Date(formHoteleria.fecha).getMonth(),
        creadoEn: hoy,
      });
      setModal(null);
      setFormHoteleria({ fecha: hoy, descripcion: "", monto: "" });
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  const fmt = (n) => n ? new Intl.NumberFormat("es-AR").format(Math.round(n)) : "0";
  const CARD = { background: T.bgCard, border: "1px solid " + T.border, borderRadius: 10, padding: "18px 22px" };
  const inp = {
    width: "100%", padding: "10px 12px", borderRadius: 6, fontSize: 14,
    background: T.bgInput, border: "1px solid " + T.border,
    color: T.text, boxSizing: "border-box", outline: "none", fontFamily: "'Outfit', sans-serif",
  };

  // Preview FIFO para el formulario de salida
  const previewFIFO = formSalida.cantidad ? calcFIFO(parseInt(formSalida.cantidad)) : [];

  return (
    <div>
      {/* Header + botones */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 26, color: T.cream, fontWeight: 700 }}>Feedlot & Faena</div>
          <div style={{ fontSize: 14, color: T.textMuted, marginTop: 2 }}>Engorde a corral — sistema FIFO</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[
            { id: "tropa",     label: "+ Cargar tropa",      color: T.green },
            { id: "salida",    label: "+ Registrar salida",  color: T.teal },
            { id: "alimento",  label: "+ Compra alimento",   color: T.brownLight },
            { id: "muerte",    label: "+ Registrar muerte",  color: T.red },
            { id: "hoteleria", label: "+ Hotelería",         color: T.textMuted },
          ].map(b => (
            <button key={b.id} onClick={() => setModal(b.id)}
              style={{ padding: "9px 16px", borderRadius: 7, border: modal === b.id ? "none" : "1px solid " + T.border,
                background: modal === b.id ? b.color : "transparent",
                color: modal === b.id ? "#fff" : T.textMuted,
                cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "'Outfit', sans-serif", transition: "all 0.15s" }}>
              {b.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "En feedlot",       value: animalesActivos,    unit: "cab.",    color: T.tealLight },
          { label: "Tropas activas",   value: tropas.filter(t => (t.stockActual||0) > 0).length, unit: "tropas", color: T.text },
          { label: "Alimento total",   value: fmt(kgAlimentoTotal), unit: "kg",   color: T.brownLight },
          { label: "Kg carne ganados", value: fmt(kgGanadosTotal),  unit: "kg",   color: T.greenLight },
          { label: "Conversión",       value: conversionIndice,    unit: "kg ali/kg carne", color: conversionIndice !== "—" && parseFloat(conversionIndice) < 7 ? T.greenLight : T.brownLight },
        ].map(s => (
          <div key={s.label} style={{ ...CARD }}>
            <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: s.color, lineHeight: 1, fontFamily: "'Outfit', sans-serif" }}>{s.value}</div>
            <div style={{ fontSize: 11, color: T.textMuted, marginTop: 3 }}>{s.unit}</div>
          </div>
        ))}
      </div>

      {/* Formularios */}
      {modal === "tropa" && (
        <div style={{ ...CARD, border: "1px solid " + T.green, marginBottom: 20 }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 19, color: T.greenLight, marginBottom: 16, fontWeight: 700 }}>
            Cargar tropa — #{tropas.length + 1}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div><div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>Fecha ingreso</div><input type="date" value={formTropa.fecha} onChange={e => setFormTropa(f=>({...f,fecha:e.target.value}))} style={inp}/></div>
            <div><div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>Machos</div><input type="number" placeholder="0" value={formTropa.machos} onChange={e => setFormTropa(f=>({...f,machos:e.target.value}))} style={inp}/></div>
            <div><div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>Hembras</div><input type="number" placeholder="0" value={formTropa.hembras} onChange={e => setFormTropa(f=>({...f,hembras:e.target.value}))} style={inp}/></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div><div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>Peso promedio ingreso (kg)</div><input type="number" placeholder="Ej: 320" value={formTropa.pesoPromedio} onChange={e => setFormTropa(f=>({...f,pesoPromedio:e.target.value}))} style={inp}/></div>
            <div>
              <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>Parcela origen (opcional)</div>
              <select value={formTropa.parcelaOrigen} onChange={e => setFormTropa(f=>({...f,parcelaOrigen:e.target.value}))} style={inp}>
                <option value="">— Sin descontar del campo —</option>
                {Object.keys({ ...PARCELAS_DEFAULT, ...parcelas }).sort().map(k => {
                  const d = parcelas[k];
                  return <option key={k} value={k}>{k} {d?.animales > 0 ? "(" + d.animales + " cab.)" : "(vacía)"}</option>;
                })}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 12 }}><div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>Observaciones</div><input value={formTropa.observaciones} onChange={e => setFormTropa(f=>({...f,observaciones:e.target.value}))} style={inp}/></div>
          {(formTropa.machos || formTropa.hembras) && (
            <div style={{ padding: "8px 14px", background: T.bgHover, borderRadius: 8, marginBottom: 12, fontSize: 13, color: T.textMuted }}>
              Total: <b style={{ color: T.greenLight }}>{(parseInt(formTropa.machos)||0) + (parseInt(formTropa.hembras)||0)} cabezas</b>
            </div>
          )}
          <div style={{ display: "flex", gap: 8 }}>
          <button onClick={handleCargarTropa} disabled={loading}
            style={{ padding: "10px 28px", borderRadius: 7, border: "none", background: T.green, color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: "'Outfit', sans-serif" }}>
            {loading ? "Guardando..." : "Cargar tropa"}
          </button>
          <button onClick={() => setModal(null)} style={{ padding: "10px 16px", borderRadius: 7, border: "1px solid " + T.border, background: "transparent", color: T.textMuted, cursor: "pointer", fontSize: 14, fontFamily: "'Outfit', sans-serif" }}>Cancelar</button>
          </div>
        </div>
      )}

      {modal === "salida" && (
        <div style={{ ...CARD, border: "1px solid " + T.teal, marginBottom: 20 }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 19, color: T.tealLight, marginBottom: 16, fontWeight: 700 }}>
            Registrar salida — FIFO automático
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div><div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>Fecha salida</div><input type="date" value={formSalida.fecha} onChange={e => setFormSalida(f=>({...f,fecha:e.target.value}))} style={inp}/></div>
            <div><div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>Cantidad cabezas</div><input type="number" value={formSalida.cantidad} onChange={e => setFormSalida(f=>({...f,cantidad:e.target.value}))} style={inp}/></div>
            <div><div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>Peso promedio salida (kg)</div><input type="number" value={formSalida.pesoPromedio} onChange={e => setFormSalida(f=>({...f,pesoPromedio:e.target.value}))} style={inp}/></div>
            <div><div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>Precio por kg ($)</div><input type="number" value={formSalida.precioKg} onChange={e => setFormSalida(f=>({...f,precioKg:e.target.value}))} style={inp}/></div>
          </div>
          <div style={{ marginBottom: 12 }}><div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>Observaciones</div><input value={formSalida.observaciones} onChange={e => setFormSalida(f=>({...f,observaciones:e.target.value}))} style={inp}/></div>

          {/* Preview FIFO */}
          {previewFIFO.length > 0 && (
            <div style={{ padding: "12px 16px", background: T.bgHover, borderRadius: 8, marginBottom: 12, border: "1px solid " + T.teal }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.tealLight, marginBottom: 8, letterSpacing: "0.05em" }}>DISTRIBUCIÓN FIFO</div>
              {previewFIFO.map(({ tropa, cantidad }) => (
                <div key={tropa.id} style={{ fontSize: 13, color: T.text, marginBottom: 4 }}>
                  <span style={{ color: T.tealLight, fontWeight: 700 }}>{tropa.nombre}</span>
                  {" — "}{cantidad} cab.
                  {formSalida.pesoPromedio && (
                    <span style={{ color: T.greenLight, marginLeft: 8 }}>
                      +{((parseFloat(formSalida.pesoPromedio) - tropa.pesoPromedio) * cantidad).toFixed(0)} kg ganados
                    </span>
                  )}
                  {formSalida.pesoPromedio && formSalida.precioKg && (
                    <span style={{ color: T.brownLight, marginLeft: 8 }}>
                      $ {fmt(cantidad * parseFloat(formSalida.pesoPromedio) * parseFloat(formSalida.precioKg))}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
          <button onClick={handleSalida} disabled={loading || !formSalida.cantidad || !formSalida.pesoPromedio || !formSalida.precioKg}
            style={{ padding: "10px 28px", borderRadius: 7, border: "none", background: T.teal, color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: "'Outfit', sans-serif" }}>
            {loading ? "Guardando..." : "Confirmar salida"}
          </button>
          <button onClick={() => setModal(null)} style={{ padding: "10px 16px", borderRadius: 7, border: "1px solid " + T.border, background: "transparent", color: T.textMuted, cursor: "pointer", fontSize: 14, fontFamily: "'Outfit', sans-serif" }}>Cancelar</button>
          </div>
      )}
      )}

      {modal === "alimento" && (
        <div style={{ ...CARD, border: "1px solid " + T.brownLight, marginBottom: 20 }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 19, color: T.brownLight, marginBottom: 16, fontWeight: 700 }}>Compra de alimento</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div><div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>Fecha</div><input type="date" value={formAlimento.fecha} onChange={e => setFormAlimento(f=>({...f,fecha:e.target.value}))} style={inp}/></div>
            <div><div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>Cantidad (kg)</div><input type="number" value={formAlimento.kg} onChange={e => setFormAlimento(f=>({...f,kg:e.target.value}))} style={inp}/></div>
            <div><div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>Precio por kg ($)</div><input type="number" value={formAlimento.precioKg} onChange={e => setFormAlimento(f=>({...f,precioKg:e.target.value}))} style={inp}/></div>
          </div>
          {formAlimento.kg && formAlimento.precioKg && (
            <div style={{ padding: "8px 14px", background: T.bgHover, borderRadius: 8, marginBottom: 12, fontSize: 13, color: T.textMuted }}>
              Total: <b style={{ color: T.brownLight }}>$ {fmt(parseFloat(formAlimento.kg) * parseFloat(formAlimento.precioKg))}</b>
              {" — se registra en Finanzas automáticamente"}
            </div>
          )}
          <button onClick={handleAlimento} disabled={loading}
            style={{ padding: "10px 28px", borderRadius: 7, border: "none", background: T.brownLight, color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: "'Outfit', sans-serif" }}>
            {loading ? "Guardando..." : "Guardar compra"}
          </button>
          <button onClick={() => setModal(null)} style={{ padding: "10px 16px", borderRadius: 7, border: "1px solid " + T.border, background: "transparent", color: T.textMuted, cursor: "pointer", fontSize: 14, fontFamily: "'Outfit', sans-serif" }}>Cancelar</button>
          </div>
      )}

      {modal === "muerte" && (
        <div style={{ ...CARD, border: "1px solid " + T.red, marginBottom: 20 }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 19, color: T.red, marginBottom: 16, fontWeight: 700 }}>Registrar muerte</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div><div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>Fecha</div><input type="date" value={formMuerte.fecha} onChange={e => setFormMuerte(f=>({...f,fecha:e.target.value}))} style={inp}/></div>
            <div>
              <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>Sexo</div>
              <select value={formMuerte.sexo} onChange={e => setFormMuerte(f=>({...f,sexo:e.target.value}))} style={inp}>
                <option value="macho">Macho</option>
                <option value="hembra">Hembra</option>
              </select>
            </div>
            <div>
              <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>Tropa</div>
              <select value={formMuerte.tropaId} onChange={e => setFormMuerte(f=>({...f,tropaId:e.target.value}))} style={inp}>
                <option value="">— Seleccionar —</option>
                {tropas.filter(t => (t.stockActual||0) > 0).map(t => (
                  <option key={t.id} value={t.id}>{t.nombre} ({t.stockActual} cab.)</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 12 }}><div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>Observaciones</div><input value={formMuerte.observaciones} onChange={e => setFormMuerte(f=>({...f,observaciones:e.target.value}))} style={inp}/></div>
          <button onClick={handleMuerte} disabled={loading || !formMuerte.tropaId}
            style={{ padding: "10px 28px", borderRadius: 7, border: "none", background: T.red, color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: "'Outfit', sans-serif" }}>
            {loading ? "Guardando..." : "Registrar"}
          </button>
          <button onClick={() => setModal(null)} style={{ padding: "10px 16px", borderRadius: 7, border: "1px solid " + T.border, background: "transparent", color: T.textMuted, cursor: "pointer", fontSize: 14, fontFamily: "'Outfit', sans-serif" }}>Cancelar</button>
          </div>
      )}

      {modal === "hoteleria" && (
        <div style={{ ...CARD, border: "1px solid " + T.textMuted, marginBottom: 20 }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 19, color: T.text, marginBottom: 16, fontWeight: 700 }}>Costo hotelería</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div><div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>Fecha</div><input type="date" value={formHoteleria.fecha} onChange={e => setFormHoteleria(f=>({...f,fecha:e.target.value}))} style={inp}/></div>
            <div><div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>Descripción</div><input placeholder="Ej: Hotelería abril" value={formHoteleria.descripcion} onChange={e => setFormHoteleria(f=>({...f,descripcion:e.target.value}))} style={inp}/></div>
            <div><div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>Monto ($)</div><input type="number" value={formHoteleria.monto} onChange={e => setFormHoteleria(f=>({...f,monto:e.target.value}))} style={inp}/></div>
          </div>
          <button onClick={handleHoteleria} disabled={loading}
            style={{ padding: "10px 28px", borderRadius: 7, border: "none", background: T.brown, color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: "'Outfit', sans-serif" }}>
            {loading ? "Guardando..." : "Guardar"}
          </button>
          <button onClick={() => setModal(null)} style={{ padding: "10px 16px", borderRadius: 7, border: "1px solid " + T.border, background: "transparent", color: T.textMuted, cursor: "pointer", fontSize: 14, fontFamily: "'Outfit', sans-serif" }}>Cancelar</button>
          </div>
      )}

      {/* Tropas activas */}
      <div style={{ ...CARD, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.textMuted, letterSpacing: "0.06em", marginBottom: 14 }}>TROPAS EN FEEDLOT</div>
        {tropas.length === 0 ? (
          <div style={{ fontSize: 13, color: T.textDim, fontStyle: "italic" }}>Sin tropas cargadas aún</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
            {tropas.map(t => {
              const dias = calcDiasFeedlot(t.fecha);
              const activo = (t.stockActual || 0) > 0;
              const salidosCount = salidas.filter(s => s.tropaId === t.id).reduce((sum, s) => sum + s.cantidad, 0);
              const muertesCount = muertes.filter(m => m.tropaId === t.id).length;
              return (
                <div key={t.id} style={{ background: T.bgHover, border: "1px solid " + (activo ? T.teal : T.border), borderRadius: 10, padding: "14px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 18, color: T.cream, fontWeight: 700 }}>{t.nombre}</div>
                    <div style={{ padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                      background: activo ? T.teal + "22" : T.bgCard,
                      color: activo ? T.tealLight : T.textDim,
                      border: "1px solid " + (activo ? T.teal : T.border) }}>
                      {activo ? "activa" : "finalizada"}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: T.textMuted, lineHeight: 1.9 }}>
                    <div>Ingreso: <b style={{ color: T.text }}>{t.fecha}</b> · <b style={{ color: T.tealLight }}>{dias}d</b></div>
                    <div>Stock actual: <b style={{ color: activo ? T.greenLight : T.textDim }}>{t.stockActual || 0} cab.</b></div>
                    <div>Machos: <b style={{ color: T.text }}>{t.machos}</b> · Hembras: <b style={{ color: T.text }}>{t.hembras}</b></div>
                    <div>Peso ingreso: <b style={{ color: T.text }}>{t.pesoPromedio} kg/cab</b></div>
                    {salidosCount > 0 && <div>Salidos: <b style={{ color: T.tealLight }}>{salidosCount} cab.</b></div>}
                    {muertesCount > 0 && <div>Muertes: <b style={{ color: T.red }}>{muertesCount}</b></div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Historial salidas */}
      {salidas.length > 0 && (
        <div style={{ ...CARD, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.textMuted, letterSpacing: "0.06em", marginBottom: 14 }}>HISTORIAL DE SALIDAS</div>
          {salidas.slice().reverse().map(s => (
            <div key={s.id} style={{ padding: "10px 14px", background: T.bgHover, borderRadius: 8, marginBottom: 6, borderLeft: "3px solid " + T.teal }}>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                <div>
                  <span style={{ color: T.brownLight, fontWeight: 700, fontSize: 13, marginRight: 10 }}>{s.fecha}</span>
                  <span style={{ color: T.tealLight, fontWeight: 700 }}>{s.tropaNombre}</span>
                  <span style={{ color: T.textMuted, fontSize: 13 }}> — {s.cantidad} cab.</span>
                </div>
                <div style={{ display: "flex", gap: 16, fontSize: 13 }}>
                  <span style={{ color: T.textMuted }}>{s.pesoIngreso}→{s.pesoSalida} kg</span>
                  <span style={{ color: T.greenLight, fontWeight: 700 }}>+{fmt(s.kgGanados)} kg</span>
                  <span style={{ color: T.brownLight, fontWeight: 700 }}>$ {fmt(s.totalVenta)}</span>
                  <span style={{ color: T.textDim }}>{s.diasFeedlot}d</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Muertes */}
      {muertes.length > 0 && (
        <div style={{ ...CARD }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.textMuted, letterSpacing: "0.06em", marginBottom: 14 }}>
            BAJAS — Total: <span style={{ color: T.red }}>{muertesTotal}</span>
          </div>
          {muertes.slice().reverse().map(m => (
            <div key={m.id} style={{ padding: "8px 12px", background: T.bgHover, borderRadius: 6, marginBottom: 4, fontSize: 13, display: "flex", gap: 12 }}>
              <span style={{ color: T.red, fontWeight: 700 }}>{m.fecha}</span>
              <span style={{ color: T.textMuted }}>{m.tropaNombre}</span>
              <span style={{ color: T.text }}>{m.sexo}</span>
              {m.observaciones && <span style={{ color: T.textDim, fontStyle: "italic" }}>{m.observaciones}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── MANTENIMIENTO ───────────────────────────────────────────────────────────
function Mantenimiento({ T, infra }) {
  const [gastos, setGastos]         = useState([]);
  const [filtroAnio, setFiltroAnio] = useState(new Date().getFullYear());
  const [filtroMes, setFiltroMes]   = useState(-1); // -1 = todos

  const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "gastos"), snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .filter(g => g.tipo === "mantenimiento");
      data.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
      setGastos(data);
    });
    return () => unsub();
  }, []);

  const fmt = (n) => n ? new Intl.NumberFormat("es-AR").format(Math.round(n)) : "0";

  const gastosFiltrados = gastos.filter(g => {
    const anioOk = new Date(g.fecha).getFullYear() === filtroAnio;
    const mesOk  = filtroMes === -1 || new Date(g.fecha).getMonth() === filtroMes;
    return anioOk && mesOk;
  });

  const totalAnio = gastos.filter(g => new Date(g.fecha).getFullYear() === filtroAnio)
    .reduce((s, g) => s + (g.monto || 0), 0);

  const totalFiltrado = gastosFiltrados.reduce((s, g) => s + (g.monto || 0), 0);

  // Desglose por mes
  const porMes = Array.from({ length: 12 }, (_, i) => ({
    mes: MESES[i],
    total: gastos.filter(g => new Date(g.fecha).getFullYear() === filtroAnio && new Date(g.fecha).getMonth() === i)
      .reduce((s, g) => s + (g.monto || 0), 0),
    cantidad: gastos.filter(g => new Date(g.fecha).getFullYear() === filtroAnio && new Date(g.fecha).getMonth() === i).length,
  }));

  const aniosDisp = [...new Set([new Date().getFullYear(), ...gastos.map(g => new Date(g.fecha).getFullYear())])].sort((a,b) => b-a);

  const CARD = { background: T.bgCard, border: "1px solid " + T.border, borderRadius: 10, padding: "18px 22px" };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 26, color: T.cream, fontWeight: 700 }}>Mantenimiento</div>
          <div style={{ fontSize: 14, color: T.textMuted, marginTop: 2 }}>
            Para registrar mantenimientos andá al mapa → Vista Estructuras → click en la estructura
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select value={filtroAnio} onChange={e => setFiltroAnio(parseInt(e.target.value))}
            style={{ padding: "8px 12px", borderRadius: 6, background: T.bgCard, border: "1px solid " + T.border, color: T.text, fontSize: 14, fontFamily: "'Outfit', sans-serif" }}>
            {aniosDisp.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <select value={filtroMes} onChange={e => setFiltroMes(parseInt(e.target.value))}
            style={{ padding: "8px 12px", borderRadius: 6, background: T.bgCard, border: "1px solid " + T.border, color: T.text, fontSize: 14, fontFamily: "'Outfit', sans-serif" }}>
            <option value={-1}>Todos los meses</option>
            {MESES.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
        <div style={{ ...CARD, border: "2px solid " + T.brownLight }}>
          <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 6 }}>Total mantenimiento {filtroAnio}</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: T.brownLight, lineHeight: 1, fontFamily: "'Outfit', sans-serif" }}>$ {fmt(totalAnio)}</div>
        </div>
        <div style={{ ...CARD }}>
          <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 6 }}>
            {filtroMes === -1 ? "Período seleccionado" : MESES[filtroMes] + " " + filtroAnio}
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: T.text, lineHeight: 1, fontFamily: "'Outfit', sans-serif" }}>$ {fmt(totalFiltrado)}</div>
        </div>
        <div style={{ ...CARD }}>
          <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 6 }}>Registros en período</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: T.text, lineHeight: 1, fontFamily: "'Outfit', sans-serif" }}>{gastosFiltrados.length}</div>
        </div>
      </div>

      {/* Desglose mensual */}
      <div style={{ ...CARD, marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.textMuted, letterSpacing: "0.06em", marginBottom: 14 }}>DESGLOSE MENSUAL — {filtroAnio}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
          {porMes.map((m, i) => (
            <div key={i}
              onClick={() => setFiltroMes(filtroMes === i ? -1 : i)}
              style={{ background: filtroMes === i ? T.brown + "33" : T.bgHover, border: "1px solid " + (filtroMes === i ? T.brownLight : T.border),
                borderRadius: 8, padding: "10px 14px", cursor: "pointer", transition: "all 0.15s" }}>
              <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 4 }}>{m.mes}</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: m.total > 0 ? T.brownLight : T.textDim }}>
                {m.total > 0 ? "$ " + fmt(m.total) : "—"}
              </div>
              {m.cantidad > 0 && <div style={{ fontSize: 11, color: T.textDim, marginTop: 2 }}>{m.cantidad} registro{m.cantidad > 1 ? "s" : ""}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Listado de registros */}
      <div style={{ ...CARD }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.textMuted, letterSpacing: "0.06em", marginBottom: 14 }}>
          REGISTROS {filtroMes !== -1 ? MESES[filtroMes].toUpperCase() + " " : ""}{filtroAnio}
        </div>
        {gastosFiltrados.length === 0 ? (
          <div style={{ fontSize: 13, color: T.textDim, fontStyle: "italic" }}>Sin registros en el período seleccionado</div>
        ) : (
          gastosFiltrados.map(g => (
            <div key={g.id} style={{ padding: "12px 14px", background: T.bgHover, borderRadius: 8, marginBottom: 8, borderLeft: "3px solid " + T.brownLight }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                <div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 4 }}>
                    <span style={{ color: T.brownLight, fontWeight: 700, fontSize: 13 }}>{g.fecha}</span>
                    {g.descripcion.includes(" — ") && (
                      <span style={{ fontSize: 12, padding: "1px 8px", borderRadius: 12, background: T.brown + "22", color: T.brownLight, border: "1px solid " + T.brown, fontWeight: 700 }}>
                        {g.descripcion.split(" — ")[0]}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 14, color: T.text }}>
                    {g.descripcion.includes(" — ") ? g.descripcion.split(" — ")[1] : g.descripcion}
                  </div>
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: T.brownLight }}>$ {fmt(g.monto)}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── FINANZAS ─────────────────────────────────────────────────────────────────
function Finanzas({ T }) {
  const hoy = new Date();
  const anioActual = hoy.getFullYear();
  const [anio, setAnio]             = useState(anioActual);
  const [gastos, setGastos]         = useState([]);
  const [compras, setCompras]       = useState([]);
  const [ventas, setVentas]         = useState([]);
  const [showFormGasto, setShowFormGasto] = useState(false);
  const [showFormVenta, setShowFormVenta] = useState(false);
  const [editandoSueldo, setEditandoSueldo] = useState(null); // mes key
  const [loading, setLoading]       = useState(false);

  const [formGasto, setFormGasto] = useState({
    fecha: hoy.toISOString().split("T")[0],
    tipo: "otro", descripcion: "", monto: "", moneda: "ARS",
  });
  const [formVenta, setFormVenta] = useState({
    fecha: hoy.toISOString().split("T")[0],
    tropa: "", cabezas: "", pesoPromedio: "", precioKg: "",
    moneda: "ARS", observaciones: "",
  });

  const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

  useEffect(() => {
    const u1 = onSnapshot(collection(db, "gastos"), snap => {
      setGastos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const u2 = onSnapshot(collection(db, "compras"), snap => {
      setCompras(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const u3 = onSnapshot(collection(db, "ventas"), snap => {
      setVentas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => { u1(); u2(); u3(); };
  }, []);

  const gastosFiltrados = gastos.filter(g => new Date(g.fecha).getFullYear() === anio);
  const comprasFiltradas = compras.filter(c => new Date(c.fecha).getFullYear() === anio);
  const ventasFiltradas  = ventas.filter(v => new Date(v.fecha).getFullYear() === anio);

  const totalGastos  = gastosFiltrados.reduce((s, g) => s + (g.monto || 0), 0);
  const totalCompras = comprasFiltradas.reduce((s, c) => s + (c.total || 0), 0);
  const totalVentas  = ventasFiltradas.reduce((s, v) => s + (v.total || 0), 0);
  const rentabilidad = totalVentas - totalCompras - totalGastos;

  // Desglose por mes
  const desgloseMes = Array.from({ length: 12 }, (_, i) => {
    const gastosM   = gastosFiltrados.filter(g => new Date(g.fecha).getMonth() === i);
    const sueldoM   = gastosM.filter(g => g.tipo === "sueldo").reduce((s,g) => s+(g.monto||0), 0);
    const mantM     = gastosM.filter(g => g.tipo === "mantenimiento").reduce((s,g) => s+(g.monto||0), 0);
    const otroM     = gastosM.filter(g => g.tipo === "otro").reduce((s,g) => s+(g.monto||0), 0);
    const ventasM   = ventasFiltradas.filter(v => new Date(v.fecha).getMonth() === i).reduce((s,v) => s+(v.total||0), 0);
    return { mes: MESES[i], sueldo: sueldoM, mantenimiento: mantM, otro: otroM, total: sueldoM+mantM+otroM, ventas: ventasM };
  });

  const handleGuardarGasto = async () => {
    if (!formGasto.monto || !formGasto.descripcion) return;
    setLoading(true);
    try {
      await addDoc(collection(db, "gastos"), {
        ...formGasto,
        monto: parseFloat(formGasto.monto),
        anio: new Date(formGasto.fecha).getFullYear(),
        mes:  new Date(formGasto.fecha).getMonth(),
        creadoEn: hoy.toISOString().split("T")[0],
      });
      setShowFormGasto(false);
      setFormGasto({ fecha: hoy.toISOString().split("T")[0], tipo: "otro", descripcion: "", monto: "", moneda: "ARS" });
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  const handleGuardarSueldo = async (mes, monto) => {
    if (!monto) return;
    setLoading(true);
    try {
      const fecha = `${anio}-${String(mes+1).padStart(2,"0")}-01`;
      await addDoc(collection(db, "gastos"), {
        fecha, tipo: "sueldo", descripcion: "Sueldo puestero " + MESES[mes] + " " + anio,
        monto: parseFloat(monto), moneda: "ARS",
        anio, mes, creadoEn: hoy.toISOString().split("T")[0],
      });
      setEditandoSueldo(null);
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  const handleGuardarVenta = async () => {
    if (!formVenta.cabezas || !formVenta.precioKg || !formVenta.pesoPromedio) return;
    setLoading(true);
    try {
      const cab  = parseInt(formVenta.cabezas);
      const peso = parseFloat(formVenta.pesoPromedio);
      const pKg  = parseFloat(formVenta.precioKg);
      const total = cab * peso * pKg;
      await addDoc(collection(db, "ventas"), {
        ...formVenta,
        cabezas: cab, pesoPromedio: peso, precioKg: pKg,
        kgTotal: cab * peso, total,
        anio: new Date(formVenta.fecha).getFullYear(),
        mes:  new Date(formVenta.fecha).getMonth(),
        creadoEn: hoy.toISOString().split("T")[0],
      });
      setShowFormVenta(false);
      setFormVenta({ fecha: hoy.toISOString().split("T")[0], tropa: "", cabezas: "", pesoPromedio: "", precioKg: "", moneda: "ARS", observaciones: "" });
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  const handleEliminarGasto = async (id) => {
    try { await deleteDoc(doc(db, "gastos", id)); } catch(e) { console.error(e); }
  };

  const fmt = (n) => n ? new Intl.NumberFormat("es-AR").format(Math.round(n)) : "0";

  const inp = {
    width: "100%", padding: "10px 12px", borderRadius: 6, fontSize: 14,
    background: T.bgInput, border: "1px solid " + T.border,
    color: T.text, boxSizing: "border-box", outline: "none", fontFamily: "'Outfit', sans-serif",
  };
  const CARD = { background: T.bgCard, border: "1px solid " + T.border, borderRadius: 10, padding: "18px 22px" };

  const aniosDisp = [...new Set([anioActual, anioActual-1, ...gastos.map(g=>g.anio), ...ventas.map(v=>v.anio)])].filter(Boolean).sort((a,b)=>b-a);

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 26, color: T.cream, fontWeight: 700 }}>Finanzas</div>
          <div style={{ fontSize: 14, color: T.textMuted, marginTop: 2 }}>Control económico del campo</div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <select value={anio} onChange={e => setAnio(parseInt(e.target.value))}
            style={{ padding: "8px 14px", borderRadius: 6, background: T.bgCard, border: "1px solid " + T.border, color: T.text, fontSize: 14, fontFamily: "'Outfit', sans-serif" }}>
            {aniosDisp.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <button onClick={() => setShowFormVenta(v => !v)}
            style={{ padding: "9px 18px", borderRadius: 7, border: "none", background: T.greenLight, color: T.bg, cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: "'Outfit', sans-serif" }}>
            + Registrar venta
          </button>
          <button onClick={() => setShowFormGasto(v => !v)}
            style={{ padding: "9px 18px", borderRadius: 7, border: "none", background: T.brown, color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: "'Outfit', sans-serif" }}>
            + Agregar gasto
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Total ventas",    value: "$ " + fmt(totalVentas),  color: T.greenLight },
          { label: "Total compras",   value: "$ " + fmt(totalCompras), color: T.red },
          { label: "Total gastos",    value: "$ " + fmt(totalGastos),  color: T.brownLight },
          { label: "Rentabilidad",    value: "$ " + fmt(rentabilidad), color: rentabilidad >= 0 ? T.greenLight : T.red, big: true },
        ].map(s => (
          <div key={s.label} style={{ ...CARD, border: s.big ? "2px solid " + (rentabilidad >= 0 ? T.green : T.red) : "1px solid " + T.border }}>
            <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 6 }}>{s.label} {anio}</div>
            <div style={{ fontSize: s.big ? 24 : 22, fontWeight: 800, color: s.color, lineHeight: 1, fontFamily: "'Outfit', sans-serif" }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Formulario venta */}
      {showFormVenta && (
        <div style={{ ...CARD, border: "1px solid " + T.green, marginBottom: 20 }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 19, color: T.greenLight, marginBottom: 16, fontWeight: 700 }}>Registrar venta de hacienda</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div><div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>Fecha</div><input type="date" value={formVenta.fecha} onChange={e => setFormVenta(f=>({...f,fecha:e.target.value}))} style={inp}/></div>
            <div><div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>Tropa</div><input placeholder="Ej: T-2025-01" value={formVenta.tropa} onChange={e => setFormVenta(f=>({...f,tropa:e.target.value}))} style={inp}/></div>
            <div><div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>Cabezas</div><input type="number" value={formVenta.cabezas} onChange={e => setFormVenta(f=>({...f,cabezas:e.target.value}))} style={inp}/></div>
            <div><div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>Peso promedio (kg)</div><input type="number" value={formVenta.pesoPromedio} onChange={e => setFormVenta(f=>({...f,pesoPromedio:e.target.value}))} style={inp}/></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div><div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>Precio por kg</div><input type="number" value={formVenta.precioKg} onChange={e => setFormVenta(f=>({...f,precioKg:e.target.value}))} style={inp}/></div>
            <div><div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>Moneda</div>
              <select value={formVenta.moneda} onChange={e => setFormVenta(f=>({...f,moneda:e.target.value}))} style={inp}>
                <option value="ARS">Pesos (ARS)</option><option value="USD">Dólares (USD)</option>
              </select>
            </div>
            <div><div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>Observaciones</div><input value={formVenta.observaciones} onChange={e => setFormVenta(f=>({...f,observaciones:e.target.value}))} style={inp}/></div>
          </div>
          {formVenta.cabezas && formVenta.pesoPromedio && formVenta.precioKg && (
            <div style={{ padding: "10px 16px", background: T.bgHover, borderRadius: 8, marginBottom: 12, fontSize: 14, color: T.greenLight, fontWeight: 700 }}>
              Total venta: {formVenta.moneda} $ {fmt(parseInt(formVenta.cabezas) * parseFloat(formVenta.pesoPromedio) * parseFloat(formVenta.precioKg))}
            </div>
          )}
          <button onClick={handleGuardarVenta} disabled={loading}
            style={{ padding: "10px 28px", borderRadius: 7, border: "none", background: T.green, color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: "'Outfit', sans-serif" }}>
            {loading ? "Guardando..." : "Guardar venta"}
          </button>
        </div>
      )}

      {/* Formulario gasto */}
      {showFormGasto && (
        <div style={{ ...CARD, border: "1px solid " + T.brown, marginBottom: 20 }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 19, color: T.brownLight, marginBottom: 16, fontWeight: 700 }}>Agregar gasto</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div><div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>Fecha</div><input type="date" value={formGasto.fecha} onChange={e => setFormGasto(f=>({...f,fecha:e.target.value}))} style={inp}/></div>
            <div>
              <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>Tipo</div>
              <select value={formGasto.tipo} onChange={e => setFormGasto(f=>({...f,tipo:e.target.value}))} style={inp}>
                <option value="sueldo">Sueldo puestero</option>
                <option value="mantenimiento">Mantenimiento</option>
                <option value="otro">Otro</option>
              </select>
            </div>
            <div><div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>Descripción</div><input placeholder="Ej: Arreglo molino norte" value={formGasto.descripcion} onChange={e => setFormGasto(f=>({...f,descripcion:e.target.value}))} style={inp}/></div>
            <div><div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>Monto ($)</div><input type="number" placeholder="Ej: 1000000" value={formGasto.monto} onChange={e => setFormGasto(f=>({...f,monto:e.target.value}))} style={inp}/></div>
          </div>
          <button onClick={handleGuardarGasto} disabled={loading}
            style={{ padding: "10px 28px", borderRadius: 7, border: "none", background: T.brown, color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: "'Outfit', sans-serif" }}>
            {loading ? "Guardando..." : "Guardar gasto"}
          </button>
        </div>
      )}

      {/* Desglose mensual */}
      <div style={{ ...CARD, marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.textMuted, letterSpacing: "0.06em", marginBottom: 16 }}>DESGLOSE MENSUAL — {anio}</div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid " + T.border }}>
                {["Mes","Sueldo puestero","Mantenimiento","Otros gastos","Total gastos","Ventas","Resultado"].map(h => (
                  <th key={h} style={{ padding: "8px 12px", textAlign: h === "Mes" ? "left" : "right", color: T.textMuted, fontWeight: 700, fontSize: 11, letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
                ))}
                <th style={{ width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {desgloseMes.map((m, i) => {
                const resultado = m.ventas - m.total;
                const editando  = editandoSueldo === i;
                const [sueldoInput, setSueldoInput] = useState("");
                return (
                  <tr key={m.mes} style={{ borderBottom: "1px solid " + T.border, background: i%2===0 ? T.bgHover+"66" : "transparent" }}>
                    <td style={{ padding: "10px 12px", color: T.cream, fontWeight: 600 }}>{m.mes}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right" }}>
                      {editando ? (
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                          <input type="number" value={sueldoInput} onChange={e => setSueldoInput(e.target.value)}
                            style={{ width: 120, padding: "4px 8px", borderRadius: 4, background: T.bgInput, border: "1px solid " + T.teal, color: T.text, fontSize: 13, fontFamily: "'Outfit', sans-serif" }} autoFocus />
                          <button onClick={() => handleGuardarSueldo(i, sueldoInput)}
                            style={{ padding: "4px 10px", borderRadius: 4, border: "none", background: T.teal, color: "#fff", cursor: "pointer", fontSize: 12 }}>✓</button>
                          <button onClick={() => setEditandoSueldo(null)}
                            style={{ padding: "4px 8px", borderRadius: 4, border: "1px solid " + T.border, background: "transparent", color: T.textMuted, cursor: "pointer", fontSize: 12 }}>✕</button>
                        </div>
                      ) : (
                        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", alignItems: "center" }}>
                          <span style={{ color: m.sueldo > 0 ? T.text : T.textDim }}>{m.sueldo > 0 ? "$ " + fmt(m.sueldo) : "—"}</span>
                          <button onClick={() => { setEditandoSueldo(i); setSueldoInput(String(m.sueldo || 1000000)); }}
                            style={{ padding: "2px 8px", borderRadius: 4, border: "1px solid " + T.border, background: "transparent", color: T.textMuted, cursor: "pointer", fontSize: 11 }}>
                            {m.sueldo > 0 ? "editar" : "+ cargar"}
                          </button>
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "right", color: m.mantenimiento > 0 ? T.text : T.textDim }}>{m.mantenimiento > 0 ? "$ " + fmt(m.mantenimiento) : "—"}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", color: m.otro > 0 ? T.text : T.textDim }}>{m.otro > 0 ? "$ " + fmt(m.otro) : "—"}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", color: T.brownLight, fontWeight: 700 }}>{m.total > 0 ? "$ " + fmt(m.total) : "—"}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", color: T.greenLight, fontWeight: 700 }}>{m.ventas > 0 ? "$ " + fmt(m.ventas) : "—"}</td>
                    <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, color: resultado > 0 ? T.greenLight : resultado < 0 ? T.red : T.textDim }}>
                      {m.total > 0 || m.ventas > 0 ? (resultado >= 0 ? "+ " : "") + "$ " + fmt(resultado) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: "2px solid " + T.border }}>
                <td style={{ padding: "12px 12px", color: T.cream, fontWeight: 700 }}>TOTAL {anio}</td>
                <td style={{ padding: "12px 12px", textAlign: "right", color: T.brownLight, fontWeight: 700 }}>$ {fmt(gastosFiltrados.filter(g=>g.tipo==="sueldo").reduce((s,g)=>s+g.monto,0))}</td>
                <td style={{ padding: "12px 12px", textAlign: "right", color: T.brownLight, fontWeight: 700 }}>$ {fmt(gastosFiltrados.filter(g=>g.tipo==="mantenimiento").reduce((s,g)=>s+g.monto,0))}</td>
                <td style={{ padding: "12px 12px", textAlign: "right", color: T.brownLight, fontWeight: 700 }}>$ {fmt(gastosFiltrados.filter(g=>g.tipo==="otro").reduce((s,g)=>s+g.monto,0))}</td>
                <td style={{ padding: "12px 12px", textAlign: "right", color: T.red, fontWeight: 800 }}>$ {fmt(totalGastos)}</td>
                <td style={{ padding: "12px 12px", textAlign: "right", color: T.greenLight, fontWeight: 800 }}>$ {fmt(totalVentas)}</td>
                <td style={{ padding: "12px 12px", textAlign: "right", fontWeight: 800, color: rentabilidad >= 0 ? T.greenLight : T.red }}>
                  {(rentabilidad >= 0 ? "+ " : "") + "$ " + fmt(rentabilidad)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Listado de gastos del año */}
      <div style={{ ...CARD }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.textMuted, letterSpacing: "0.06em", marginBottom: 14 }}>GASTOS REGISTRADOS — {anio}</div>
        {gastosFiltrados.length === 0
          ? <div style={{ fontSize: 13, color: T.textDim, fontStyle: "italic" }}>Sin gastos registrados</div>
          : gastosFiltrados.sort((a,b) => new Date(b.fecha)-new Date(a.fecha)).map(g => (
            <div key={g.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderRadius: 6, marginBottom: 4, background: T.bgHover, flexWrap: "wrap", gap: 8 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <span style={{ fontSize: 12, color: T.brownLight, fontWeight: 600, minWidth: 80 }}>{g.fecha}</span>
                <span style={{ padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 700,
                  background: g.tipo === "sueldo" ? T.teal+"22" : g.tipo === "mantenimiento" ? T.brown+"22" : T.bgCard,
                  color: g.tipo === "sueldo" ? T.tealLight : g.tipo === "mantenimiento" ? T.brownLight : T.textMuted,
                  border: "1px solid " + (g.tipo === "sueldo" ? T.teal : g.tipo === "mantenimiento" ? T.brown : T.border) }}>
                  {g.tipo}
                </span>
                <span style={{ fontSize: 13, color: T.text }}>{g.descripcion}</span>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: T.brownLight }}>$ {fmt(g.monto)}</span>
                <button onClick={() => handleEliminarGasto(g.id)}
                  style={{ padding: "3px 10px", borderRadius: 4, border: "none", background: T.red+"22", color: T.red, cursor: "pointer", fontSize: 12 }}>✕</button>
              </div>
            </div>
          ))
        }
      </div>
    </div>
  );
}

// ─── LLUVIAS ─────────────────────────────────────────────────────────────────
function Lluvias({ T }) {
  const hoyDate = new Date();
  const [mesVista, setMesVista]     = useState(hoyDate.getMonth());
  const [anioVista, setAnioVista]   = useState(hoyDate.getFullYear());
  const [anioGrafico, setAnioGrafico] = useState(hoyDate.getFullYear());
  const [registros, setRegistros]   = useState({});
  const [editando, setEditando]     = useState(null); // { fecha, mm }
  const [mmInput, setMmInput]       = useState("");
  const [loading, setLoading]       = useState(false);

  const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  const DIAS_SEMANA = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
  const ESTACIONES = {
    "Verano":   [11, 0, 1],
    "Otoño":    [2, 3, 4],
    "Invierno": [5, 6, 7],
    "Primavera":[8, 9, 10],
  };
  const ESTACION_COLORS = {
    "Verano": "#e85454", "Otoño": "#c8a84a", "Invierno": "#4a7ec8", "Primavera": "#4e9e43"
  };

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "lluvias"), snap => {
      const data = {};
      snap.docs.forEach(d => { data[d.id] = { id: d.id, ...d.data() }; });
      setRegistros(data);
    });
    return () => unsub();
  }, []);

  const getFecha = (anio, mes, dia) =>
    `${anio}-${String(mes + 1).padStart(2,"0")}-${String(dia).padStart(2,"0")}`;

  const handleGuardar = async (fecha) => {
    const mm = parseFloat(mmInput);
    if (isNaN(mm) || mm < 0) return;
    setLoading(true);
    try {
      const [anio, mes] = fecha.split("-").map(Number);
      await setDoc(doc(db, "lluvias", fecha), {
        fecha, mm, anio, mes: mes - 1,
        creadoEn: new Date().toISOString().split("T")[0],
      });
      setEditando(null);
      setMmInput("");
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  const handleEliminar = async (fecha) => {
    setLoading(true);
    try {
      await deleteDoc(doc(db, "lluvias", fecha));
      setEditando(null);
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  // Días del mes
  const diasEnMes = new Date(anioVista, mesVista + 1, 0).getDate();
  const primerDia = new Date(anioVista, mesVista, 1).getDay();

  // Stats año seleccionado para gráficos
  const registrosAnio = Object.values(registros).filter(r => r.anio === anioGrafico);
  const mmTotalAnio   = registrosAnio.reduce((s, r) => s + (r.mm || 0), 0);
  const mmAnioActual  = Object.values(registros).filter(r => r.anio === hoyDate.getFullYear()).reduce((s, r) => s + (r.mm || 0), 0);

  // Por mes para el año del gráfico
  const mmPorMes = Array.from({ length: 12 }, (_, i) => ({
    name: MESES[i].slice(0, 3),
    mm: registrosAnio.filter(r => r.mes === i).reduce((s, r) => s + (r.mm || 0), 0),
  }));

  // Por estación
  const mmPorEstacion = Object.entries(ESTACIONES).map(([nombre, meses]) => ({
    name: nombre,
    mm: registrosAnio.filter(r => meses.includes(r.mes)).reduce((s, r) => s + (r.mm || 0), 0),
    color: ESTACION_COLORS[nombre],
  }));

  // Años disponibles
  const aniosDisponibles = [...new Set(Object.values(registros).map(r => r.anio))].sort((a,b) => b-a);
  if (!aniosDisponibles.includes(anioGrafico)) aniosDisponibles.unshift(anioGrafico);

  const tooltipStyle = { background: T.bgCard, border: "1px solid " + T.border, borderRadius: 8, fontSize: 13, color: T.text };
  const CARD = { background: T.bgCard, border: "1px solid " + T.border, borderRadius: 10, padding: "18px 22px" };
  const hoy = getFecha(hoyDate.getFullYear(), hoyDate.getMonth(), hoyDate.getDate());

  return (
    <div>
      {/* Header con total año actual */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 26, color: T.cream, fontWeight: 700 }}>Lluvias</div>
          <div style={{ fontSize: 14, color: T.textMuted, marginTop: 2 }}>Registro pluviométrico del campo</div>
        </div>
        <div style={{ background: T.bgCard, border: "2px solid " + T.teal, borderRadius: 12, padding: "14px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 12, color: T.tealLight, fontWeight: 700, letterSpacing: "0.06em", marginBottom: 2 }}>LLUVIA ACUMULADA {hoyDate.getFullYear()}</div>
          <div style={{ fontSize: 36, fontWeight: 800, color: T.tealLight, lineHeight: 1, fontFamily: "'Outfit', sans-serif" }}>{mmAnioActual.toFixed(1)}</div>
          <div style={{ fontSize: 13, color: T.textMuted, marginTop: 2 }}>mm totales</div>
        </div>
      </div>

      {/* CALENDARIO */}
      <div style={{ ...CARD, marginBottom: 24 }}>
        {/* Nav mes */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <button onClick={() => {
            if (mesVista === 0) { setMesVista(11); setAnioVista(a => a - 1); }
            else setMesVista(m => m - 1);
          }} style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid " + T.border, background: "transparent", color: T.textMuted, cursor: "pointer", fontSize: 16 }}>‹</button>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 22, fontWeight: 700, color: T.cream }}>
            {MESES[mesVista]} {anioVista}
          </div>
          <button onClick={() => {
            if (mesVista === 11) { setMesVista(0); setAnioVista(a => a + 1); }
            else setMesVista(m => m + 1);
          }} style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid " + T.border, background: "transparent", color: T.textMuted, cursor: "pointer", fontSize: 16 }}>›</button>
        </div>

        {/* Días semana header */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 4 }}>
          {DIAS_SEMANA.map(d => (
            <div key={d} style={{ textAlign: "center", fontSize: 12, fontWeight: 700, color: T.textDim, padding: "4px 0", letterSpacing: "0.04em" }}>{d}</div>
          ))}
        </div>

        {/* Celdas del calendario */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
          {/* Espacios vacíos antes del primer día */}
          {Array.from({ length: primerDia }, (_, i) => (
            <div key={"v" + i} />
          ))}
          {/* Días del mes */}
          {Array.from({ length: diasEnMes }, (_, i) => {
            const dia = i + 1;
            const fecha = getFecha(anioVista, mesVista, dia);
            const reg = registros[fecha];
            const esHoy = fecha === hoy;
            const editandoEste = editando === fecha;

            return (
              <div key={dia}
                onClick={() => {
                  if (editandoEste) { setEditando(null); setMmInput(""); }
                  else { setEditando(fecha); setMmInput(reg ? String(reg.mm) : ""); }
                }}
                style={{
                  borderRadius: 8, padding: "8px 6px", textAlign: "center", cursor: "pointer",
                  background: editandoEste ? T.teal + "33" : reg ? T.teal + "20" : T.bgHover,
                  border: esHoy ? "2px solid " + T.teal : editandoEste ? "2px solid " + T.teal : "1px solid " + T.border,
                  transition: "all 0.12s", minHeight: 56,
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
                }}>
                <div style={{ fontSize: 13, fontWeight: esHoy ? 700 : 400, color: esHoy ? T.tealLight : T.text }}>{dia}</div>
                {reg && (
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.tealLight }}>{reg.mm}mm</div>
                )}
              </div>
            );
          })}
        </div>

        {/* Panel edición */}
        {editando && (
          <div style={{ marginTop: 16, padding: "14px 18px", background: T.bgHover, borderRadius: 8, border: "1px solid " + T.teal, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div style={{ fontSize: 14, color: T.cream, fontWeight: 600 }}>
              {editando.split("-").reverse().join("/")}
            </div>
            <input
              type="number" min="0" step="0.1" placeholder="mm de lluvia"
              value={mmInput} onChange={e => setMmInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleGuardar(editando)}
              style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid " + T.teal, background: T.bgInput, color: T.text, fontSize: 14, width: 140, fontFamily: "'Outfit', sans-serif", outline: "none" }}
              autoFocus
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => handleGuardar(editando)} disabled={loading}
                style={{ padding: "8px 18px", borderRadius: 6, border: "none", background: T.teal, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "'Outfit', sans-serif" }}>
                {registros[editando] ? "Actualizar" : "Guardar"}
              </button>
              {registros[editando] && (
                <button onClick={() => handleEliminar(editando)} disabled={loading}
                  style={{ padding: "8px 14px", borderRadius: 6, border: "none", background: T.red + "22", color: T.red, cursor: "pointer", fontSize: 13, fontFamily: "'Outfit', sans-serif" }}>
                  Eliminar
                </button>
              )}
              <button onClick={() => { setEditando(null); setMmInput(""); }}
                style={{ padding: "8px 14px", borderRadius: 6, border: "1px solid " + T.border, background: "transparent", color: T.textMuted, cursor: "pointer", fontSize: 13, fontFamily: "'Outfit', sans-serif" }}>
                Cancelar
              </button>
            </div>
            <div style={{ fontSize: 12, color: T.textMuted, marginLeft: "auto" }}>
              Total del mes: <b style={{ color: T.tealLight }}>
                {Object.values(registros).filter(r => r.anio === anioVista && r.mes === mesVista).reduce((s,r) => s + r.mm, 0).toFixed(1)} mm
              </b>
            </div>
          </div>
        )}
      </div>

      {/* GRÁFICOS */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 20, color: T.cream, fontWeight: 700 }}>Estadísticas</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 13, color: T.textMuted }}>Año:</div>
          <select value={anioGrafico} onChange={e => setAnioGrafico(parseInt(e.target.value))}
            style={{ padding: "6px 12px", borderRadius: 6, background: T.bgCard, border: "1px solid " + T.border, color: T.text, fontSize: 13, fontFamily: "'Outfit', sans-serif" }}>
            {[...new Set([hoyDate.getFullYear(), hoyDate.getFullYear()-1, ...aniosDisponibles])].sort((a,b)=>b-a).map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <div style={{ fontSize: 14, color: T.textMuted }}>Total: <b style={{ color: T.tealLight }}>{mmTotalAnio.toFixed(1)} mm</b></div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 16 }}>
        {/* MM por mes */}
        <div style={{ ...CARD }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.textMuted, letterSpacing: "0.06em", marginBottom: 16 }}>MM POR MES — {anioGrafico}</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={mmPorMes} margin={{ left: -10 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: T.textMuted }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: T.textMuted }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} formatter={v => [v.toFixed(1) + " mm", "Lluvia"]} />
              <Bar dataKey="mm" fill={T.teal} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* MM por estación */}
        <div style={{ ...CARD }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.textMuted, letterSpacing: "0.06em", marginBottom: 16 }}>MM POR ESTACIÓN — {anioGrafico}</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={mmPorEstacion} layout="vertical" margin={{ left: 10, right: 20 }}>
              <XAxis type="number" tick={{ fontSize: 11, fill: T.textMuted }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: T.textMuted }} axisLine={false} tickLine={false} width={80} />
              <Tooltip contentStyle={tooltipStyle} formatter={v => [v.toFixed(1) + " mm", "Lluvia"]} />
              <Bar dataKey="mm" radius={[0, 4, 4, 0]}>
                {mmPorEstacion.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
            {mmPorEstacion.map(e => (
              <div key={e.name} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: e.color }}>{e.mm.toFixed(1)}</div>
                <div style={{ fontSize: 11, color: T.textMuted }}>{e.name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Comparativo multi-año si hay datos */}
      {aniosDisponibles.length > 1 && (
        <div style={{ ...CARD }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.textMuted, letterSpacing: "0.06em", marginBottom: 16 }}>COMPARATIVO ANUAL</div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {aniosDisponibles.map(anio => {
              const total = Object.values(registros).filter(r => r.anio === anio).reduce((s,r) => s + r.mm, 0);
              return (
                <div key={anio} style={{ background: T.bgHover, border: "1px solid " + T.border, borderRadius: 8, padding: "12px 18px", minWidth: 100, textAlign: "center" }}>
                  <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 4 }}>{anio}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: T.tealLight }}>{total.toFixed(0)}</div>
                  <div style={{ fontSize: 11, color: T.textMuted }}>mm</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ARRENDAMIENTO ───────────────────────────────────────────────────────────
function Arrendamiento({ T, parcelas }) {
  const [lotes, setLotes]           = useState([]);
  const [showForm, setShowForm]     = useState(false);
  const [showAsignar, setShowAsignar] = useState(null);
  const [showDetalle, setShowDetalle] = useState(null);
  const [loading, setLoading]       = useState(false);
  const [asignarForm, setAsignarForm] = useState({ parcela: "", cantidad: 0 });
  const [form, setForm] = useState({
    lote: "", fecha: new Date().toISOString().split("T")[0],
    productor: "", cabezas: "", sexo: "macho",
    pesoPromedio: "", observaciones: "",
  });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "arrendamiento"), snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
      setLotes(data);
    });
    return () => unsub();
  }, []);

  // Calcula meses calendario completos desde fecha de ingreso
  const calcMeses = (fechaIngreso) => {
    if (!fechaIngreso) return 0;
    const ingreso = new Date(fechaIngreso);
    const hoy = new Date();
    // Primer mes completo = mes siguiente al ingreso
    const inicioComputo = new Date(ingreso.getFullYear(), ingreso.getMonth() + 1, 1);
    if (hoy < inicioComputo) return 0;
    const meses = (hoy.getFullYear() - inicioComputo.getFullYear()) * 12 +
      (hoy.getMonth() - inicioComputo.getMonth()) + 1;
    return Math.max(0, meses);
  };

  const calcKgAcumulados = (lote) => {
    const meses = calcMeses(lote.fecha);
    return meses * 8 * (lote.cabezas || 0);
  };

  // Desglose mes a mes
  const desgloseMeses = (lote) => {
    if (!lote.fecha) return [];
    const ingreso = new Date(lote.fecha);
    const hoy = new Date();
    const meses = [];
    let cursor = new Date(ingreso.getFullYear(), ingreso.getMonth() + 1, 1);
    while (cursor <= hoy) {
      meses.push({
        label: cursor.toLocaleDateString("es-AR", { month: "long", year: "numeric" }),
        kg: 8 * (lote.cabezas || 0),
        acumulado: (meses.length + 1) * 8 * (lote.cabezas || 0),
      });
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }
    return meses;
  };

  const totalKgAcumulados = lotes.reduce((s, l) => s + calcKgAcumulados(l), 0);
  const totalCabezas = lotes.reduce((s, l) => s + (parseInt(l.cabezas) || 0), 0);
  const totalMesesPromedio = lotes.length > 0
    ? Math.round(lotes.reduce((s, l) => s + calcMeses(l.fecha), 0) / lotes.length)
    : 0;

  const handleGuardar = async () => {
    if (!form.lote || !form.cabezas || !form.productor) return;
    setLoading(true);
    try {
      await addDoc(collection(db, "arrendamiento"), {
        ...form,
        cabezas: parseInt(form.cabezas),
        pesoPromedio: parseFloat(form.pesoPromedio) || 0,
        stockRestante: parseInt(form.cabezas),
        creadoEn: new Date().toISOString().split("T")[0],
      });
      setShowForm(false);
      setForm({ lote: "", fecha: new Date().toISOString().split("T")[0], productor: "", cabezas: "", sexo: "macho", pesoPromedio: "", observaciones: "" });
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  const handleAsignar = async () => {
    const cant = parseInt(asignarForm.cantidad);
    if (!asignarForm.parcela || !cant || cant <= 0) return;
    setLoading(true);
    try {
      const parcelaData = parcelas[asignarForm.parcela] || {};
      await setDoc(doc(db, "parcelas", asignarForm.parcela), {
        animales:     (parcelaData.animales || 0) + cant,
        estado:       "pastoreo",
        fechaIngreso: new Date().toISOString().split("T")[0],
        fechaDescanso: null,
        tropa:        showAsignar.lote,
        tipo:         "arrendamiento",
      });
      await updateDoc(doc(db, "arrendamiento", showAsignar.id), {
        stockRestante: (showAsignar.stockRestante || showAsignar.cabezas) - cant,
      });
      await addDoc(collection(db, "movimientos"), {
        fecha:        new Date().toISOString().split("T")[0],
        origen:       "arr-" + showAsignar.lote,
        destino:      asignarForm.parcela,
        cantidad:     cant,
        kgPromedio:   showAsignar.pesoPromedio,
        observaciones: "Ingreso arrendamiento lote " + showAsignar.lote,
        tropa:        showAsignar.lote,
        tipo:         "arrendamiento",
        creadoEn:     new Date().toISOString().split("T")[0],
      });
      setShowAsignar(null);
      setAsignarForm({ parcela: "", cantidad: 0 });
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  const fmt = (n) => n ? new Intl.NumberFormat("es-AR").format(Math.round(n)) : "0";

  const inp = {
    width: "100%", padding: "10px 12px", borderRadius: 6, fontSize: 14,
    background: T.bgInput, border: "1px solid " + T.border,
    color: T.text, boxSizing: "border-box", outline: "none", fontFamily: "'Outfit', sans-serif",
  };

  const CARD = { background: T.bgCard, border: "1px solid " + T.border, borderRadius: 10, padding: "18px 22px" };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 26, color: T.cream, fontWeight: 700 }}>Arrendamiento</div>
          <div style={{ fontSize: 14, color: T.textMuted, marginTop: 2 }}>Hacienda de terceros — cobro de 8 kg/animal/mes</div>
        </div>
        <button onClick={() => setShowForm(v => !v)}
          style={{ padding: "10px 24px", borderRadius: 7, border: "none", background: T.teal, color: "#fff", cursor: "pointer", fontSize: 15, fontWeight: 600, fontFamily: "'Outfit', sans-serif" }}>
          {showForm ? "Cancelar" : "+ Nuevo lote"}
        </button>
      </div>

      {/* Dashboard KG acumulados */}
      {lotes.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
          {[
            { label: "Cabezas arrendadas",  value: totalCabezas,       unit: "cab.",     color: T.tealLight },
            { label: "Meses promedio",       value: totalMesesPromedio, unit: "meses",    color: T.text },
            { label: "Kg totales acumulados",value: fmt(totalKgAcumulados), unit: "kg",  color: T.greenLight },
          ].map(s => (
            <div key={s.label} style={{ ...CARD }}>
              <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: s.color, lineHeight: 1, fontFamily: "'Outfit', sans-serif" }}>{s.value}</div>
              <div style={{ fontSize: 12, color: T.textMuted, marginTop: 3 }}>{s.unit}</div>
            </div>
          ))}
        </div>
      )}

      {/* Formulario */}
      {showForm && (
        <div style={{ ...CARD, border: "1px solid " + T.teal, marginBottom: 24 }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 19, color: T.tealLight, marginBottom: 18, fontWeight: 700 }}>
            Nuevo lote de arrendamiento
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>Productor</div>
              <input placeholder="Nombre del productor" value={form.productor} onChange={e => setForm(f => ({ ...f, productor: e.target.value }))} style={inp} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>Fecha de ingreso</div>
              <input type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} style={inp} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>Número de lote (opcional)</div>
              <input placeholder="Ej: A-2025-01" value={form.lote} onChange={e => setForm(f => ({ ...f, lote: e.target.value }))} style={inp} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>Cantidad de cabezas</div>
              <input type="number" placeholder="Ej: 80" value={form.cabezas} onChange={e => setForm(f => ({ ...f, cabezas: e.target.value }))} style={inp} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>Sexo</div>
              <select value={form.sexo} onChange={e => setForm(f => ({ ...f, sexo: e.target.value }))} style={inp}>
                <option value="macho">Macho</option>
                <option value="hembra">Hembra</option>
                <option value="mixto">Mixto</option>
              </select>
            </div>
            <div>
              <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>Peso promedio ingreso (kg)</div>
              <input type="number" placeholder="Ej: 200" value={form.pesoPromedio} onChange={e => setForm(f => ({ ...f, pesoPromedio: e.target.value }))} style={inp} />
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>Observaciones</div>
            <input placeholder="Notas adicionales..." value={form.observaciones} onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))} style={inp} />
          </div>
          <button onClick={handleGuardar} disabled={loading || !form.cabezas || !form.productor}
            style={{ padding: "10px 28px", borderRadius: 7, border: "none", background: T.teal, color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: "'Outfit', sans-serif", opacity: loading ? 0.7 : 1 }}>
            {loading ? "Guardando..." : "Guardar lote"}
          </button>
        </div>
      )}

      {/* Lista de lotes */}
      {lotes.length === 0 ? (
        <div style={{ ...CARD, textAlign: "center", padding: 60 }}>
          <div style={{ fontSize: 28, color: T.borderLight, marginBottom: 14 }}>◇</div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 20, color: T.cream, marginBottom: 8, fontWeight: 700 }}>Sin lotes registrados</div>
          <div style={{ color: T.textMuted, fontSize: 14 }}>Agregá el primer lote de arrendamiento</div>
        </div>
      ) : (
        lotes.map(lote => {
          const meses = calcMeses(lote.fecha);
          const kgAcum = calcKgAcumulados(lote);
          const desglose = desgloseMeses(lote);
          const expanded = showDetalle === lote.id;
          return (
            <div key={lote.id} style={{ ...CARD, marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                    <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 22, color: T.cream, fontWeight: 700 }}>
                      {lote.productor}
                    </div>
                    <div style={{ padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                      background: T.teal + "22", color: T.tealLight, border: "1px solid " + T.teal }}>
                      {lote.sexo}
                    </div>
                    {(lote.stockRestante || 0) === 0 && (
                      <div style={{ padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                        background: T.bgHover, color: T.textDim, border: "1px solid " + T.border }}>
                        Retirado
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: T.textMuted, display: "flex", flexDirection: "column", gap: 4, marginTop: 6 }}>
                    {lote.lote && <span style={{ color: T.textMuted }}>Lote: <b style={{ color: T.text }}>{lote.lote}</b></span>}
                    <span>Fecha ingreso: <b style={{ color: T.text }}>{lote.fecha}</b></span>
                    <span>Cabezas: <b style={{ color: T.text }}>{lote.cabezas}</b></span>
                  </div>
                </div>

                {/* KG acumulados */}
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 11, color: T.textMuted }}>Kg acumulados ({meses} meses)</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: T.greenLight }}>{fmt(kgAcum)} kg</div>
                    <div style={{ fontSize: 11, color: T.textMuted }}>{fmt(meses * 8)} kg/cab × {lote.cabezas} cab.</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {(lote.stockRestante || lote.cabezas) > 0 && (
                      <button onClick={() => { setShowAsignar(lote); setAsignarForm({ parcela: "", cantidad: lote.stockRestante || lote.cabezas }); }}
                        style={{ padding: "7px 14px", borderRadius: 6, border: "none", background: T.teal, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "'Outfit', sans-serif" }}>
                        Asignar parcela
                      </button>
                    )}
                    <button onClick={() => setShowDetalle(expanded ? null : lote.id)}
                      style={{ padding: "7px 14px", borderRadius: 6, border: "1px solid " + T.border, background: "transparent", color: T.textMuted, cursor: "pointer", fontSize: 13, fontFamily: "'Outfit', sans-serif" }}>
                      {expanded ? "Ocultar" : "Ver desglose"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Desglose mensual */}
              {expanded && (
                <div style={{ marginTop: 16, borderTop: "1px solid " + T.border, paddingTop: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.textMuted, letterSpacing: "0.06em", marginBottom: 10 }}>DESGLOSE MENSUAL — 8 kg × {lote.cabezas} cab.</div>
                  {desglose.length === 0 ? (
                    <div style={{ fontSize: 13, color: T.textDim, fontStyle: "italic" }}>Aún no hay meses completos desde el ingreso</div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8 }}>
                      {desglose.map((m, i) => (
                        <div key={i} style={{ background: T.bgHover, border: "1px solid " + T.border, borderRadius: 8, padding: "10px 14px" }}>
                          <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 4, textTransform: "capitalize" }}>{m.label}</div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: T.greenLight }}>{fmt(m.kg)} kg</div>
                          <div style={{ fontSize: 11, color: T.textDim, marginTop: 2 }}>Acum: {fmt(m.acumulado)} kg</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}

      {/* Modal asignar parcela */}
      {showAsignar && (
        <div onClick={() => setShowAsignar(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: T.bgCard, border: "1px solid " + T.teal, borderRadius: 12, padding: 24, minWidth: 340, maxWidth: 440, width: "90%", boxShadow: "0 8px 40px rgba(0,0,0,0.5)" }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 20, color: T.cream, fontWeight: 700, marginBottom: 6 }}>
              Asignar — {showAsignar.productor}
            </div>
            <div style={{ fontSize: 13, color: T.textMuted, marginBottom: 18 }}>
              {showAsignar.lote && <span>Lote {showAsignar.lote} · </span>}<b style={{ color: T.tealLight }}>{showAsignar.stockRestante || showAsignar.cabezas} cabezas disponibles</b>
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>Parcela destino</div>
              <select value={asignarForm.parcela} onChange={e => setAsignarForm(f => ({ ...f, parcela: e.target.value }))}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 6, fontSize: 14, background: T.bgInput, border: "1px solid " + T.border, color: T.text, fontFamily: "'Outfit', sans-serif" }}>
                <option value="">— Seleccionar parcela —</option>
                {Object.keys({ ...PARCELAS_DEFAULT, ...parcelas }).sort().map(k => {
                  const d = parcelas[k];
                  return (
                    <option key={k} value={k}>
                      {k} {d?.animales > 0 ? "⚠ pastoreando (" + d.animales + " cab.)" : "(vacía)"}
                    </option>
                  );
                })}
              </select>
            </div>
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>Cantidad a asignar</div>
              <input type="number" min={1} max={showAsignar.stockRestante || showAsignar.cabezas} value={asignarForm.cantidad}
                onChange={e => setAsignarForm(f => ({ ...f, cantidad: e.target.value }))}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 6, fontSize: 14, background: T.bgInput, border: "1px solid " + T.border, color: T.text, boxSizing: "border-box", fontFamily: "'Outfit', sans-serif" }} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleAsignar} disabled={loading || !asignarForm.parcela || !asignarForm.cantidad}
                style={{ flex: 1, padding: "10px 0", borderRadius: 7, border: "none", background: T.teal, color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: "'Outfit', sans-serif" }}>
                {loading ? "Asignando..." : "Confirmar"}
              </button>
              <button onClick={() => setShowAsignar(null)}
                style={{ padding: "10px 16px", borderRadius: 7, border: "1px solid " + T.border, background: "transparent", color: T.textMuted, cursor: "pointer", fontSize: 14, fontFamily: "'Outfit', sans-serif" }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── STOCK ────────────────────────────────────────────────────────────────────
function Stock({ T }) {
  const [compras, setCompras] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "compras"), snap => {
      setCompras(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  if (compras.length === 0) {
    return (
      <div style={{ background: T.bgCard, border: "1px solid " + T.border, borderRadius: 10, padding: 60, textAlign: "center" }}>
        <div style={{ fontSize: 28, color: T.borderLight, marginBottom: 14 }}>◈</div>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 22, color: T.cream, marginBottom: 8, fontWeight: 700 }}>Sin datos de stock</div>
        <div style={{ color: T.textMuted, fontSize: 14 }}>Registrá compras para ver las estadísticas acá</div>
      </div>
    );
  }

  // Calculos
  const totalCabezas    = compras.reduce((s, c) => s + (c.cabezas || 0), 0);
  const totalAsignadas  = compras.reduce((s, c) => s + ((c.cabezas || 0) - (c.stockRestante || 0)), 0);
  const totalSinAsignar = compras.reduce((s, c) => s + (c.stockRestante || 0), 0);
  const totalKg         = compras.reduce((s, c) => s + (c.kgTotal || 0), 0);
  const totalInvertido  = compras.reduce((s, c) => s + (c.total || 0), 0);

  // Por sexo
  const machos  = compras.reduce((s, c) => {
    if (c.sexo === "macho")  return s + (c.cabezas || 0);
    if (c.sexo === "mixto")  return s + (parseInt(c.machosCount) || 0);
    return s;
  }, 0);
  const hembras = compras.reduce((s, c) => {
    if (c.sexo === "hembra") return s + (c.cabezas || 0);
    if (c.sexo === "mixto")  return s + (parseInt(c.hembrasCount) || 0);
    return s;
  }, 0);
  const dataSexo = [
    machos  > 0 && { name: "Machos",  value: machos,  color: T.teal },
    hembras > 0 && { name: "Hembras", value: hembras, color: T.brownLight },
  ].filter(Boolean);

  // Por tipo de compra
  const personal = compras.filter(c => c.tipoCompra === "personal" || !c.tipoCompra).reduce((s, c) => s + (c.cabezas || 0), 0);
  const remate   = compras.filter(c => c.tipoCompra === "remate").reduce((s, c) => s + (c.cabezas || 0), 0);
  const dataTipo = [
    personal > 0 && { name: "Personal", value: personal, color: T.green },
    remate   > 0 && { name: "Remate",   value: remate,   color: T.gold || "#c8a84a" },
  ].filter(Boolean);

  // Por productor
  const porProductor = {};
  compras.forEach(c => {
    const p = c.productor || "Sin especificar";
    porProductor[p] = (porProductor[p] || 0) + (c.cabezas || 0);
  });
  const dataProductor = Object.entries(porProductor).map(([name, value]) => ({ name, value }));

  const fmt = (n) => n ? new Intl.NumberFormat("es-AR").format(Math.round(n)) : "0";

  const tooltipStyle = {
    background: T.bgCard, border: "1px solid " + T.border,
    borderRadius: 8, fontSize: 13, color: T.text,
  };

  const CARD_STYLE = {
    background: T.bgCard, border: "1px solid " + T.border,
    borderRadius: 10, padding: "18px 22px",
  };

  return (
    <div>
      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 26, color: T.cream, fontWeight: 700, marginBottom: 4 }}>Stock</div>
      <div style={{ fontSize: 14, color: T.textMuted, marginBottom: 24 }}>Resumen general de hacienda comprada</div>

      {/* Cards principales */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 28 }}>
        {[
          { label: "Total comprado",   value: totalCabezas,    unit: "cab.",    color: T.cream },
          { label: "En campo",         value: totalAsignadas,  unit: "cab.",    color: T.greenLight },
          { label: "Sin asignar",      value: totalSinAsignar, unit: "cab.",    color: totalSinAsignar > 0 ? T.brownLight : T.textDim },
          { label: "Peso total",       value: fmt(totalKg),    unit: "kg",      color: T.tealLight },
          { label: "Total invertido",  value: "$ " + fmt(totalInvertido), unit: "", color: T.brownLight },
        ].map(s => (
          <div key={s.label} style={{ ...CARD_STYLE }}>
            <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 6, letterSpacing: "0.04em" }}>{s.label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: s.color, lineHeight: 1, fontFamily: "'Outfit', sans-serif" }}>{s.value}</div>
            {s.unit && <div style={{ fontSize: 12, color: T.textMuted, marginTop: 3 }}>{s.unit}</div>}
          </div>
        ))}
      </div>

      {/* Gráficos */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>

        {/* Machos vs Hembras */}
        <div style={{ ...CARD_STYLE }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.textMuted, letterSpacing: "0.06em", marginBottom: 16 }}>MACHOS VS HEMBRAS</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={dataSexo} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                {dataSexo.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => [v + " cab.", n]} />
              <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 13, color: T.textMuted }} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 4 }}>
            {dataSexo.map(d => (
              <div key={d.name} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: d.color }}>{d.value}</div>
                <div style={{ fontSize: 11, color: T.textMuted }}>{d.name}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Personal vs Remate */}
        <div style={{ ...CARD_STYLE }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.textMuted, letterSpacing: "0.06em", marginBottom: 16 }}>PERSONAL VS REMATE</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={dataTipo} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                {dataTipo.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => [v + " cab.", n]} />
              <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 13, color: T.textMuted }} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 4 }}>
            {dataTipo.map(d => (
              <div key={d.name} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: d.color }}>{d.value}</div>
                <div style={{ fontSize: 11, color: T.textMuted }}>{d.name}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Por productor */}
        <div style={{ ...CARD_STYLE }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.textMuted, letterSpacing: "0.06em", marginBottom: 16 }}>CABEZAS POR PRODUCTOR</div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={dataProductor} layout="vertical" margin={{ left: 0, right: 20 }}>
              <XAxis type="number" tick={{ fontSize: 11, fill: T.textMuted }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: T.textMuted }} axisLine={false} tickLine={false} width={90} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => [v + " cab.", "Cabezas"]} />
              <Bar dataKey="value" fill={T.teal} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Listado de tropas */}
      <div style={{ ...CARD_STYLE, marginTop: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.textMuted, letterSpacing: "0.06em", marginBottom: 14 }}>TROPAS REGISTRADAS</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
          {compras.map(c => (
            <div key={c.id} style={{ background: T.bgHover, border: "1px solid " + T.border, borderRadius: 8, padding: "12px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <div style={{ fontWeight: 700, color: T.cream, fontSize: 15 }}>Tropa {c.tropa}</div>
                <div style={{ fontSize: 11, padding: "2px 8px", borderRadius: 12,
                  background: c.tipoCompra === "remate" ? "#c8a84a22" : T.green + "22",
                  color: c.tipoCompra === "remate" ? "#c8a84a" : T.greenLight,
                  border: "1px solid " + (c.tipoCompra === "remate" ? "#c8a84a" : T.green),
                  fontWeight: 700 }}>
                  {c.tipoCompra || "personal"}
                </div>
              </div>
              <div style={{ fontSize: 12, color: T.textMuted, lineHeight: 1.8 }}>
                <div>{c.productor} · {c.fecha}</div>
                <div>{c.cabezas} cab. · {c.pesoPromedio} kg/cab · {c.sexo === "mixto" ? (c.machosCount + "M / " + c.hembrasCount + "H") : c.sexo}</div>
                <div style={{ color: c.stockRestante > 0 ? T.brownLight : T.textDim }}>
                  {c.stockRestante > 0 ? c.stockRestante + " sin asignar" : "Asignada completa"}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── COMPRAS ──────────────────────────────────────────────────────────────────
function Compras({ T, parcelas }) {
  const [compras, setCompras]         = useState([]);
  const [showForm, setShowForm]       = useState(false);
  const [showAsignar, setShowAsignar] = useState(null);
  const [showDetalle, setShowDetalle] = useState(null); // compra a asignar
  const [loading, setLoading]         = useState(false);
  const [asignarForm, setAsignarForm] = useState({ parcela: "", cantidad: 0 });
  const [form, setForm] = useState({
    tropa: "", fecha: new Date().toISOString().split("T")[0],
    tipoCompra: "personal",
    productor: "", cabezas: "", sexo: "macho",
    machosCount: "", hembrasCount: "",
    pesoPromedio: "", precioKg: "", moneda: "ARS",
    flete: "", iva: "10.5", otrosGastos: "", observaciones: "",
  });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "compras"), snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
      setCompras(data);
    });
    return () => unsub();
  }, []);

  const calcular = (f) => {
    const cab      = parseFloat(f.cabezas)      || 0;
    const peso     = parseFloat(f.pesoPromedio) || 0;
    const pKg      = parseFloat(f.precioKg)     || 0;
    const flete    = parseFloat(f.flete)        || 0;
    const iva      = parseFloat(f.iva)          || 0;
    const otros    = parseFloat(f.otrosGastos)  || 0;
    const kgTotal  = cab * peso;
    const subTotal = kgTotal * pKg;
    const ivaVal   = subTotal * (iva / 100);
    const total    = subTotal + ivaVal + flete + otros;
    const pKgPuesto = kgTotal > 0 ? total / kgTotal : 0;
    return { kgTotal, subTotal, ivaVal, total, pKgPuesto };
  };

  const calc = calcular(form);

  const handleGuardar = async () => {
    if (!form.tropa || !form.cabezas || !form.pesoPromedio || !form.precioKg) return;
    setLoading(true);
    try {
      const c = calcular(form);
      await addDoc(collection(db, "compras"), {
        ...form,
        cabezas:      parseInt(form.cabezas),
        pesoPromedio: parseFloat(form.pesoPromedio),
        precioKg:     parseFloat(form.precioKg),
        flete:        parseFloat(form.flete) || 0,
        iva:          parseFloat(form.iva) || 0,
        otrosGastos:  parseFloat(form.otrosGastos) || 0,
        kgTotal:      c.kgTotal,
        subTotal:     c.subTotal,
        ivaVal:       c.ivaVal,
        total:        c.total,
        pKgPuesto:    c.pKgPuesto,
        stockRestante: parseInt(form.cabezas),
        creadoEn:     new Date().toISOString().split("T")[0],
      });
      setShowForm(false);
      setForm({ tropa: "", fecha: new Date().toISOString().split("T")[0], tipoCompra: "personal", productor: "", cabezas: "", sexo: "macho", machosCount: "", hembrasCount: "", pesoPromedio: "", precioKg: "", moneda: "ARS", flete: "", iva: "10.5", otrosGastos: "", observaciones: "" });
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  const handleAsignar = async () => {
    if (!asignarForm.parcela || !asignarForm.cantidad) return;
    const cant = parseInt(asignarForm.cantidad);
    if (cant <= 0 || cant > showAsignar.stockRestante) return;
    setLoading(true);
    try {
      const parcelaData = parcelas[asignarForm.parcela] || {};
      // Actualizar parcela
      await setDoc(doc(db, "parcelas", asignarForm.parcela), {
        animales:    (parcelaData.animales || 0) + cant,
        estado:      "pastoreo",
        fechaIngreso: new Date().toISOString().split("T")[0],
        tropa:       showAsignar.tropa,
        tipo:        parcelaData.tipo || "propio",
      });
      // Actualizar stock de la compra
      await updateDoc(doc(db, "compras", showAsignar.id), {
        stockRestante: showAsignar.stockRestante - cant,
      });
      // Registrar movimiento
      await addDoc(collection(db, "movimientos"), {
        fecha:        new Date().toISOString().split("T")[0],
        origen:       "compra-" + showAsignar.tropa,
        destino:      asignarForm.parcela,
        cantidad:     cant,
        kgPromedio:   showAsignar.pesoPromedio,
        observaciones: "Ingreso desde compra tropa " + showAsignar.tropa,
        tropa:        showAsignar.tropa,
        creadoEn:     new Date().toISOString().split("T")[0],
      });
      setShowAsignar(null);
      setAsignarForm({ parcela: "", cantidad: 0 });
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  const fmt = (n) => n ? new Intl.NumberFormat("es-AR").format(Math.round(n)) : "—";

  const inp = {
    width: "100%", padding: "10px 12px", borderRadius: 6, fontSize: 14,
    background: T.bgInput, border: "1px solid " + T.border,
    color: T.text, boxSizing: "border-box", outline: "none", fontFamily: "'Outfit', sans-serif",
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 22, color: T.cream, fontWeight: 700 }}>Compras</div>
          <div style={{ fontSize: 13, color: T.textMuted, marginTop: 2 }}>Registro de tropas ingresadas al campo</div>
        </div>
        <button onClick={() => setShowForm(v => !v)}
          style={{ padding: "10px 24px", borderRadius: 7, border: "none", background: T.green, color: "#fff", cursor: "pointer", fontSize: 15, fontWeight: 600, fontFamily: "'Outfit', sans-serif" }}>
          {showForm ? "Cancelar" : "+ Nueva compra"}
        </button>
      </div>

      {/* Formulario nueva compra */}
      {showForm && (
        <div style={{ background: T.bgCard, border: "1px solid " + T.green, borderRadius: 10, padding: 22, marginBottom: 24 }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 17, color: T.greenLight, marginBottom: 18, fontWeight: 700 }}>
            Nueva compra de hacienda
          </div>

          {/* Fila 1 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>Número de tropa</div>
              <input placeholder="Ej: T-2025-01" value={form.tropa} onChange={e => setForm(f => ({ ...f, tropa: e.target.value }))} style={inp} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>Fecha de compra</div>
              <input type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} style={inp} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>Productor / Vendedor</div>
              <input placeholder="Nombre del vendedor" value={form.productor} onChange={e => setForm(f => ({ ...f, productor: e.target.value }))} style={inp} />
            </div>
          </div>

          {/* Fila 2 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>Cantidad de cabezas</div>
              <input type="number" placeholder="Ej: 120" value={form.cabezas} onChange={e => setForm(f => ({ ...f, cabezas: e.target.value }))} style={inp} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>Sexo</div>
              <select value={form.sexo} onChange={e => setForm(f => ({ ...f, sexo: e.target.value }))} style={inp}>
                <option value="macho">Macho</option>
                <option value="hembra">Hembra</option>
                <option value="mixto">Mixto</option>
              </select>
            </div>
            <div>
              <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>Tipo de compra</div>
              <select value={form.tipoCompra} onChange={e => setForm(f => ({ ...f, tipoCompra: e.target.value }))} style={inp}>
                <option value="personal">Personal</option>
                <option value="remate">Remate</option>
              </select>
            </div>
            <div>
              <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>Peso promedio (kg/cab)</div>
              <input type="number" placeholder="Ej: 200" value={form.pesoPromedio} onChange={e => setForm(f => ({ ...f, pesoPromedio: e.target.value }))} style={inp} />
            </div>
          </div>

          {/* Campos mixto */}
          {form.sexo === "mixto" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12, padding: "14px", background: T.bgHover, borderRadius: 8, border: "1px solid " + T.borderLight }}>
              <div>
                <div style={{ fontSize: 11, color: T.tealLight, marginBottom: 4, fontWeight: 700 }}>Cantidad de machos</div>
                <input type="number" placeholder="Ej: 60" value={form.machosCount}
                  onChange={e => {
                    const m = parseInt(e.target.value) || 0;
                    const h = parseInt(form.hembrasCount) || 0;
                    setForm(f => ({ ...f, machosCount: e.target.value, cabezas: String(m + h) }));
                  }} style={inp} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: T.brownLight, marginBottom: 4, fontWeight: 700 }}>Cantidad de hembras</div>
                <input type="number" placeholder="Ej: 60" value={form.hembrasCount}
                  onChange={e => {
                    const h = parseInt(e.target.value) || 0;
                    const m = parseInt(form.machosCount) || 0;
                    setForm(f => ({ ...f, hembrasCount: e.target.value, cabezas: String(m + h) }));
                  }} style={inp} />
              </div>
              {form.cabezas && (
                <div style={{ gridColumn: "1/-1", fontSize: 12, color: T.textMuted }}>
                  Total: <b style={{ color: T.cream }}>{form.cabezas} cabezas</b>
                  {form.machosCount && form.hembrasCount && (
                    <span> ({Math.round(parseInt(form.machosCount)/parseInt(form.cabezas)*100)}% machos / {Math.round(parseInt(form.hembrasCount)/parseInt(form.cabezas)*100)}% hembras)</span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Fila 3 - Costos */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>Precio x kg</div>
              <input type="number" placeholder="Ej: 2500" value={form.precioKg} onChange={e => setForm(f => ({ ...f, precioKg: e.target.value }))} style={inp} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>Moneda</div>
              <select value={form.moneda} onChange={e => setForm(f => ({ ...f, moneda: e.target.value }))} style={inp}>
                <option value="ARS">Pesos (ARS)</option>
                <option value="USD">Dólares (USD)</option>
              </select>
            </div>
            <div>
              <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>IVA hacienda (%)</div>
              <input type="number" placeholder="10.5" value={form.iva} onChange={e => setForm(f => ({ ...f, iva: e.target.value }))} style={inp} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>Flete</div>
              <input type="number" placeholder="0" value={form.flete} onChange={e => setForm(f => ({ ...f, flete: e.target.value }))} style={inp} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>Otros gastos</div>
              <input type="number" placeholder="0" value={form.otrosGastos} onChange={e => setForm(f => ({ ...f, otrosGastos: e.target.value }))} style={inp} />
            </div>
          </div>

          {/* Observaciones */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>Observaciones</div>
            <input placeholder="Notas adicionales..." value={form.observaciones} onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))} style={inp} />
          </div>

          {/* Resumen calculado */}
          {form.cabezas && form.pesoPromedio && form.precioKg && (
            <div style={{ background: T.bgHover, border: "1px solid " + T.border, borderRadius: 8, padding: "14px 18px", marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, letterSpacing: "0.07em", marginBottom: 10 }}>RESUMEN CALCULADO</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
                {[
                  { label: "Kg totales",       value: fmt(calc.kgTotal) + " kg" },
                  { label: "Subtotal hacienda", value: form.moneda + " " + fmt(calc.subTotal) },
                  { label: "IVA (" + form.iva + "%)", value: form.moneda + " " + fmt(calc.ivaVal) },
                  { label: "Total puesto campo", value: form.moneda + " " + fmt(calc.total), highlight: true },
                  { label: "$ / kg puesto",     value: form.moneda + " " + fmt(calc.pKgPuesto) + "/kg", highlight: true },
                ].map(s => (
                  <div key={s.label}>
                    <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 3 }}>{s.label}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: s.highlight ? T.greenLight : T.text }}>{s.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button onClick={handleGuardar} disabled={loading || !form.tropa || !form.cabezas || !form.pesoPromedio || !form.precioKg}
            style={{ padding: "9px 28px", borderRadius: 7, border: "none", background: T.green, color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: "'Outfit', sans-serif", opacity: loading ? 0.7 : 1 }}>
            {loading ? "Guardando..." : "Guardar compra"}
          </button>
        </div>
      )}

      {/* Lista de compras */}
      {compras.length === 0 ? (
        <div style={{ background: T.bgCard, border: "1px solid " + T.border, borderRadius: 10, padding: 40, textAlign: "center" }}>
          <div style={{ fontSize: 28, color: T.borderLight, marginBottom: 12 }}>◎</div>
          <div style={{ color: T.textMuted, fontSize: 14 }}>No hay compras registradas aún</div>
        </div>
      ) : (
        compras.map(c => (
          <div key={c.id} onClick={() => setShowDetalle(c)}
            style={{ background: T.bgCard, border: "1px solid " + T.border, borderRadius: 10, padding: 18, marginBottom: 12, cursor: "pointer", transition: "border 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.borderColor = T.borderLight}
            onMouseLeave={e => e.currentTarget.style.borderColor = T.border}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 17, color: T.cream, fontWeight: 700 }}>
                    Tropa {c.tropa}
                  </div>
                  <div style={{ padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                    background: c.sexo === "macho" ? T.teal + "22" : c.sexo === "hembra" ? T.brown + "22" : T.bgHover,
                    color: c.sexo === "macho" ? T.tealLight : c.sexo === "hembra" ? T.brownLight : T.textMuted,
                    border: "1px solid " + (c.sexo === "macho" ? T.teal : c.sexo === "hembra" ? T.brown : T.border) }}>
                    {c.sexo}
                  </div>
                  {c.stockRestante < c.cabezas && (
                    <div style={{ padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: T.green + "22", color: T.greenLight, border: "1px solid " + T.green }}>
                      {c.stockRestante} sin asignar
                    </div>
                  )}
                  {c.stockRestante === 0 && (
                    <div style={{ padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: T.bgHover, color: T.textDim, border: "1px solid " + T.border }}>
                      Asignada completa
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 12, color: T.textMuted }}>
                  {c.fecha} · {c.productor} · {c.cabezas} cab. · {c.pesoPromedio} kg/cab · {c.moneda} {fmt(c.precioKg)}/kg
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 11, color: T.textMuted }}>Total puesto en campo</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: T.greenLight }}>{c.moneda} {fmt(c.total)}</div>
                  <div style={{ fontSize: 11, color: T.textMuted }}>{c.moneda} {fmt(c.pKgPuesto)}/kg puesto</div>
                </div>
                {c.stockRestante > 0 && (
                  <button onClick={() => { setShowAsignar(c); setAsignarForm({ parcela: "", cantidad: c.stockRestante }); }}
                    style={{ padding: "7px 16px", borderRadius: 7, border: "none", background: T.teal, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "'Outfit', sans-serif" }}>
                    Asignar a parcela
                  </button>
                )}
              </div>
            </div>
          </div>
        ))
      )}

      {/* Modal asignar a parcela */}
      {showAsignar && (
        <div onClick={() => setShowAsignar(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: T.bgCard, border: "1px solid " + T.teal, borderRadius: 12, padding: 24, minWidth: 340, maxWidth: 440, width: "90%", boxShadow: "0 8px 40px rgba(0,0,0,0.5)" }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 18, color: T.cream, fontWeight: 700, marginBottom: 6 }}>
              Asignar tropa {showAsignar.tropa}
            </div>
            <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 18 }}>
              Stock disponible: <b style={{ color: T.greenLight }}>{showAsignar.stockRestante} cabezas</b>
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>Parcela destino</div>
              <select value={asignarForm.parcela} onChange={e => setAsignarForm(f => ({ ...f, parcela: e.target.value }))}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 6, fontSize: 14, background: T.bgInput, border: "1px solid " + T.border, color: T.text, fontFamily: "'Outfit', sans-serif" }}>
                <option value="">— Seleccionar parcela —</option>
                {Object.keys({ ...PARCELAS_DEFAULT, ...parcelas }).sort().map(k => {
                  const data = parcelas[k];
                  const tieneAnimales = data?.animales > 0;
                  return (
                    <option key={k} value={k}>
                      {k} {tieneAnimales ? "⚠ pastoreando (" + data.animales + " cab.)" : "(vacía)"}
                    </option>
                  );
                })}
              </select>
            </div>
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>Cantidad a asignar</div>
              <input type="number" min={1} max={showAsignar.stockRestante} value={asignarForm.cantidad}
                onChange={e => setAsignarForm(f => ({ ...f, cantidad: e.target.value }))}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 6, fontSize: 14, background: T.bgInput, border: "1px solid " + T.border, color: T.text, boxSizing: "border-box", fontFamily: "'Outfit', sans-serif" }} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleAsignar} disabled={loading || !asignarForm.parcela || !asignarForm.cantidad}
                style={{ flex: 1, padding: "9px 0", borderRadius: 7, border: "none", background: T.teal, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "'Outfit', sans-serif" }}>
                {loading ? "Asignando..." : "Confirmar asignación"}
              </button>
              <button onClick={() => setShowAsignar(null)}
                style={{ padding: "9px 16px", borderRadius: 7, border: "1px solid " + T.border, background: "transparent", color: T.textMuted, cursor: "pointer", fontSize: 13, fontFamily: "'Outfit', sans-serif" }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal detalle compra */}
      {showDetalle && (
        <div onClick={() => setShowDetalle(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: T.bgCard, border: "1px solid " + T.border, borderRadius: 12, padding: 28, minWidth: 480, maxWidth: 580, width: "90%", boxShadow: "0 8px 40px rgba(0,0,0,0.6)", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 24, color: T.cream, fontWeight: 700, letterSpacing: "0.02em" }}>
                  Tropa {showDetalle.tropa}
                </div>
                <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>{showDetalle.fecha} · {showDetalle.productor}</div>
              </div>
              <div style={{ padding: "3px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                background: showDetalle.sexo === "macho" ? T.teal + "22" : showDetalle.sexo === "hembra" ? T.brown + "22" : T.bgHover,
                color: showDetalle.sexo === "macho" ? T.tealLight : showDetalle.sexo === "hembra" ? T.brownLight : T.textMuted,
                border: "1px solid " + (showDetalle.sexo === "macho" ? T.teal : showDetalle.sexo === "hembra" ? T.brown : T.border) }}>
                {showDetalle.sexo}
              </div>
            </div>

            {/* Stats hacienda */}
            <div style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, letterSpacing: "0.07em", marginBottom: 10 }}>HACIENDA</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 20 }}>
              {[
                { label: "Cabezas",         value: showDetalle.cabezas + " cab." },
                { label: "Peso promedio",   value: showDetalle.pesoPromedio + " kg/cab" },
                { label: "Kg totales",      value: fmt(showDetalle.kgTotal) + " kg" },
                { label: "Stock asignado",  value: (showDetalle.cabezas - showDetalle.stockRestante) + " cab." },
                { label: "Stock restante",  value: showDetalle.stockRestante + " cab." },
                { label: "Moneda",          value: showDetalle.moneda },
              ].map(s => (
                <div key={s.label} style={{ background: T.bgHover, borderRadius: 8, padding: "10px 14px", border: "1px solid " + T.border }}>
                  <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 3 }}>{s.label}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Costos */}
            <div style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, letterSpacing: "0.07em", marginBottom: 10 }}>COSTOS</div>
            <div style={{ background: T.bgHover, borderRadius: 8, padding: "14px 18px", marginBottom: 20, border: "1px solid " + T.border }}>
              {[
                { label: "Precio x kg",        value: showDetalle.moneda + " " + fmt(showDetalle.precioKg) + "/kg" },
                { label: "Subtotal hacienda",   value: showDetalle.moneda + " " + fmt(showDetalle.subTotal) },
                { label: "IVA (" + showDetalle.iva + "%)", value: showDetalle.moneda + " " + fmt(showDetalle.ivaVal) },
                { label: "Flete",               value: showDetalle.moneda + " " + fmt(showDetalle.flete) },
                { label: "Otros gastos",        value: showDetalle.moneda + " " + fmt(showDetalle.otrosGastos) },
              ].map((s, i) => (
                <div key={s.label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: i < 4 ? "1px solid " + T.border : "none", fontSize: 13 }}>
                  <span style={{ color: T.textMuted }}>{s.label}</span>
                  <span style={{ color: T.text, fontWeight: 600 }}>{s.value}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0 4px", fontSize: 15, marginTop: 4 }}>
                <span style={{ color: T.cream, fontWeight: 700 }}>Total puesto en campo</span>
                <span style={{ color: T.greenLight, fontWeight: 800 }}>{showDetalle.moneda} {fmt(showDetalle.total)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: T.textMuted }}>Precio por kg puesto</span>
                <span style={{ color: T.greenLight, fontWeight: 700 }}>{showDetalle.moneda} {fmt(showDetalle.pKgPuesto)}/kg</span>
              </div>
            </div>

            {showDetalle.observaciones && (
              <div style={{ fontSize: 13, color: T.textMuted, fontStyle: "italic", marginBottom: 16, padding: "10px 14px", background: T.bgHover, borderRadius: 8, borderLeft: "3px solid " + T.brownLight }}>
                {showDetalle.observaciones}
              </div>
            )}

            <button onClick={() => setShowDetalle(null)}
              style={{ width: "100%", padding: "9px 0", borderRadius: 7, border: "1px solid " + T.border, background: "transparent", color: T.textMuted, cursor: "pointer", fontSize: 13, fontFamily: "'Outfit', sans-serif" }}>
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Placeholder({ label, T }) {
  return (
    <div style={{ background: T.bgCard, border: "1px solid " + T.border, borderRadius: 10, padding: 60, textAlign: "center" }}>
      <div style={{ fontSize: 28, color: T.borderLight, marginBottom: 14 }}>◌</div>
      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 22, color: T.cream, marginBottom: 8, fontWeight: 700 }}>{label}</div>
      <div style={{ color: T.textMuted, fontSize: 14 }}>Esta sección está en desarrollo</div>
    </div>
  );
}

export default function App() {
  const [themeKey, setThemeKey]   = useState("dark");
  const [tab, setTab]             = useState("campo");
  const [sidebarOpen, setSidebar] = useState(true);
  const [parcelas, setParcelas]   = useState(PARCELAS_DEFAULT);
  const [infra, setInfra]           = useState([]);
  const [feedlotTropas, setFeedlotTropas] = useState([]);
  const [loadingDB, setLoadingDB] = useState(true);
  const T = THEMES[themeKey];

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "infraestructura"), (snap) => {
      setInfra(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoadingDB(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "parcelas"), (snap) => {
      if (snap.docs.length > 0) {
        const data = {};
        snap.docs.forEach(d => { data[d.id] = d.data(); });
        setParcelas(data);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "feedlot_tropas"), snap => {
      setFeedlotTropas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const totalAnimales    = Object.values(parcelas).reduce((s, p) => s + (p.animales || 0), 0);
  const totalArrendados  = Object.values(parcelas).filter(p => p.tipo === "arrendamiento").reduce((s, p) => s + (p.animales || 0), 0);
  const totalFeedlot     = feedlotTropas.reduce((s, t) => s + (t.stockActual || 0), 0);

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Outfit:wght@300;400;600;700&display=swap" rel="stylesheet" />
      <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: "'Outfit', sans-serif", display: "flex", transition: "background 0.3s" }}>

        <aside style={{ width: sidebarOpen ? 260 : 68, flexShrink: 0, background: T.bgSidebar, borderRight: "1px solid " + T.border, display: "flex", flexDirection: "column", transition: "width 0.22s ease", overflow: "hidden" }}>
          <div style={{ padding: "18px 14px", borderBottom: "1px solid " + T.border, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: T.brown, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 18 }}>C</div>
            {sidebarOpen && (
              <div>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 16, color: T.cream, fontWeight: 700, lineHeight: 1.15 }}>Los Cachorros</div>
                <div style={{ fontSize: 13, color: T.textMuted }}>Campo ganadero</div>
              </div>
            )}
          </div>

          <nav style={{ flex: 1, padding: "10px 6px", display: "flex", flexDirection: "column", gap: 1 }}>
            {NAV_ITEMS.map(item => {
              const active = tab === item.id;
              return (
                <div key={item.id} onClick={() => setTab(item.id)} title={!sidebarOpen ? item.label : ""}
                  style={{ display: "flex", alignItems: "center", gap: 10,
                    padding: sidebarOpen ? "11px 14px" : "11px 0", justifyContent: sidebarOpen ? "flex-start" : "center",
                    borderRadius: 7, cursor: "pointer", transition: "all 0.12s",
                    background: active ? T.activeNavBg : "transparent",
                    color: active ? T.activeNavColor : T.textMuted,
                    borderLeft: active ? "3px solid " + T.activeNavBorder : "3px solid transparent" }}>
                  <span style={{ fontSize: 13, flexShrink: 0 }}>{item.icon}</span>
                  {sidebarOpen && <span style={{ fontSize: 15, fontWeight: active ? 600 : 400, whiteSpace: "nowrap" }}>{item.label}</span>}
                </div>
              );
            })}
          </nav>

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

        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <header style={{ padding: "18px 32px", borderBottom: "1px solid " + T.border, background: T.bgCard, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 26, color: T.cream, fontWeight: 700 }}>
                {NAV_ITEMS.find(n => n.id === tab)?.label}
              </div>
              <div style={{ fontSize: 14, color: T.textMuted, marginTop: 2 }}>
                {new Date().toLocaleDateString("es-AR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {loadingDB && <div style={{ fontSize: 12, color: T.textMuted }}>Conectando...</div>}
              <div style={{ padding: "7px 18px", borderRadius: 20, background: T.teal + "18", border: "1px solid " + T.teal, fontSize: 14, color: T.tealLight, fontWeight: 600 }}>
                {totalAnimales} pastoreando
              </div>
              <div style={{ padding: "7px 18px", borderRadius: 20, background: T.brown + "18", border: "1px solid " + T.brown, fontSize: 14, color: T.brownLight, fontWeight: 600 }}>
                {totalArrendados} arrendadas
              </div>
              {totalFeedlot > 0 && (
                <div style={{ padding: "7px 18px", borderRadius: 20, background: T.green + "18", border: "1px solid " + T.green, fontSize: 14, color: T.greenLight, fontWeight: 600 }}>
                  {totalFeedlot} en feedlot
                </div>
              )}
            </div>
          </header>

          <main style={{ flex: 1, padding: 32, overflowY: "auto" }}>
            {tab === "campo"   && <MapaCampo parcelas={parcelas} infra={infra} T={T} />}
            {tab === "stock"   && <Stock T={T} />}
            {tab === "compras" && <Compras T={T} parcelas={parcelas} />}
            {tab !== "campo" && tab !== "stock" && tab !== "compras" && tab !== "arrendamiento" && tab !== "lluvias" && tab !== "finanzas" && tab !== "mantenimiento" && tab !== "feedlot" && <Placeholder label={NAV_ITEMS.find(n => n.id === tab)?.label} T={T} />}
            {tab === "feedlot" && <Feedlot T={T} parcelas={parcelas} setParcelas={setParcelas} />}
            {tab === "finanzas"     && <Finanzas T={T} />}
            {tab === "mantenimiento" && <Mantenimiento T={T} infra={infra} />}
            {tab === "lluvias" && <Lluvias T={T} />}
            {tab === "arrendamiento" && <Arrendamiento T={T} parcelas={parcelas} />}
          </main>
        </div>
      </div>
    </>
  );
}
