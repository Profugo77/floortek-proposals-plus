import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { PresupuestoItem } from "@/types/presupuesto";

const EMERALD = [0, 121, 107] as const;

interface ListaObraData {
  numero: number;
  cliente_nombre: string;
  cliente_direccion: string;
  fecha: string;
  items: PresupuestoItem[];
  /** Mapa nombre -> unidad (m², ml, u, etc.) */
  unidadesPorNombre?: Record<string, string>;
  /** Mapa nombre -> m² por caja (solo para pisos) */
  m2PorCajaPorNombre?: Record<string, number>;
}

/** Agrupa materiales por nombre y suma cantidades */
function consolidarMateriales(
  items: PresupuestoItem[],
  unidadesPorNombre: Record<string, string> = {},
  m2PorCajaPorNombre: Record<string, number> = {}
) {
  const map = new Map<string, { nombre: string; cantidad: number; unidad: string; cajas: number | null }>();
  items
    .filter((i) => i.tipo === "material")
    .forEach((i) => {
      const key = i.producto_nombre.trim();
      const unidad =
        (i as any).unidad ||
        unidadesPorNombre[key] ||
        unidadesPorNombre[key.toLowerCase()] ||
        "";
      const existing = map.get(key);
      if (existing) {
        existing.cantidad += Number(i.cantidad) || 0;
        if (!existing.unidad && unidad) existing.unidad = unidad;
      } else {
        map.set(key, {
          nombre: i.producto_nombre,
          cantidad: Number(i.cantidad) || 0,
          unidad,
          cajas: null,
        });
      }
    });
  // Calcular cajas para items en m²
  for (const m of map.values()) {
    if (m.unidad === "m²" || m.unidad === "m2") {
      const m2caja = m2PorCajaPorNombre[m.nombre.trim()] || m2PorCajaPorNombre[m.nombre.trim().toLowerCase()];
      if (m2caja && m2caja > 0) {
        m.cajas = Math.ceil(m.cantidad / m2caja);
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

const fmtCantidad = (c: number, unidad: string) => {
  const num = Number.isInteger(c) ? String(c) : c.toFixed(2);
  return unidad ? `${num} ${unidad}` : num;
};

export function generateListaObraPdf(data: ListaObraData) {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  const materiales = consolidarMateriales(data.items, data.unidadesPorNombre, data.m2PorCajaPorNombre);

  if (materiales.length === 0) {
    throw new Error("No hay materiales en este presupuesto");
  }

  const numStr = `FT-${String(data.numero || 0).padStart(4, "0")}`;
  const [year, month, day] = data.fecha.split("-");
  const fechaStr = `${day}/${month}/${year}`;

  // ============ PÁGINA 1: CHECKLIST ============
  doc.setFillColor(...EMERALD);
  doc.rect(0, 0, pageW, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("LISTA DE OBRA - MATERIALES", pageW / 2, 13, { align: "center" });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Presupuesto ${numStr}  |  ${fechaStr}`, pageW / 2, 22, { align: "center" });

  // Datos cliente
  doc.setTextColor(0, 0, 0);
  doc.setFillColor(240, 240, 240);
  doc.rect(10, 34, pageW - 20, 16, "F");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Cliente:", 14, 41);
  doc.setFont("helvetica", "normal");
  doc.text(data.cliente_nombre, 32, 41);
  doc.setFont("helvetica", "bold");
  doc.text("Dirección:", 14, 47);
  doc.setFont("helvetica", "normal");
  doc.text(data.cliente_direccion || "-", 36, 47);

  // Tabla checklist
  autoTable(doc, {
    startY: 56,
    head: [["✓", "Material", "Cantidad"]],
    body: materiales.map((m) => [
      "",
      m.nombre,
      m.cajas
        ? `${fmtCantidad(m.cantidad, m.unidad)}\n(${m.cajas} caja${m.cajas > 1 ? "s" : ""})`
        : fmtCantidad(m.cantidad, m.unidad),
    ]),
    headStyles: {
      fillColor: [EMERALD[0], EMERALD[1], EMERALD[2]] as [number, number, number],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 11,
      halign: "center",
    },
    bodyStyles: {
      fontSize: 11,
      cellPadding: 4,
      minCellHeight: 10,
    },
    alternateRowStyles: { fillColor: [248, 250, 249] },
    columnStyles: {
      0: { cellWidth: 14, halign: "center" },
      1: { cellWidth: "auto" as any },
      2: { cellWidth: 38, halign: "center", fontStyle: "bold" },
    },
    margin: { left: 10, right: 10 },
    didDrawCell: (cellData) => {
      // Dibujar checkbox cuadrado en columna 0 del body
      if (cellData.section === "body" && cellData.column.index === 0) {
        const x = cellData.cell.x + cellData.cell.width / 2 - 3;
        const y = cellData.cell.y + cellData.cell.height / 2 - 3;
        doc.setDrawColor(80, 80, 80);
        doc.setLineWidth(0.4);
        doc.rect(x, y, 6, 6);
      }
    },
  });

  // Footer página checklist
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(
    `Total de materiales: ${materiales.length}  |  ${numStr} - ${data.cliente_nombre}`,
    pageW / 2,
    pageH - 8,
    { align: "center" }
  );

  // ============ HOJAS POR MATERIAL ============
  for (const mat of materiales) {
    doc.addPage();

    // Banda superior con número de presupuesto, cliente y dirección (referencia obra)
    doc.setFillColor(...EMERALD);
    doc.rect(0, 0, pageW, 20, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(`${numStr}  -  ${data.cliente_nombre}`, 10, 8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const dirText = `Obra: ${data.cliente_direccion || "-"}`;
    const dirLines = doc.splitTextToSize(dirText, pageW - 50);
    doc.text(dirLines[0], 10, 14);
    doc.text(fechaStr, pageW - 10, 8, { align: "right" });

    // Nombre del material - GRANDE, centrado vertical/horizontal en parte superior
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");

    // Calcular tamaño de fuente que entre en el ancho disponible
    const maxWidth = pageW - 30;
    let fontSize = 56;
    doc.setFontSize(fontSize);
    let lines = doc.splitTextToSize(mat.nombre.toUpperCase(), maxWidth);
    while (lines.length > 3 && fontSize > 24) {
      fontSize -= 4;
      doc.setFontSize(fontSize);
      lines = doc.splitTextToSize(mat.nombre.toUpperCase(), maxWidth);
    }

    // Centrar verticalmente el bloque del nombre en la mitad superior
    const nombreBlockH = lines.length * fontSize * 0.4;
    const nombreStartY = 60 + (90 - nombreBlockH) / 2;
    lines.forEach((line: string, i: number) => {
      doc.text(line, pageW / 2, nombreStartY + i * fontSize * 0.4, { align: "center" });
    });

    // Línea separadora
    doc.setDrawColor(...EMERALD);
    doc.setLineWidth(1.5);
    doc.line(30, 158, pageW - 30, 158);

    // CLIENTE Y DIRECCIÓN - bien visibles en el cuerpo
    doc.setTextColor(...EMERALD);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("CLIENTE", pageW / 2, 168, { align: "center" });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    const nombreLines = doc.splitTextToSize(data.cliente_nombre, pageW - 30);
    doc.text(nombreLines[0], pageW / 2, 177, { align: "center" });

    doc.setTextColor(...EMERALD);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("DIRECCIÓN", pageW / 2, 188, { align: "center" });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(15);
    doc.setFont("helvetica", "normal");
    const dirBodyLines = doc.splitTextToSize(data.cliente_direccion || "-", pageW - 30);
    dirBodyLines.slice(0, 2).forEach((line: string, i: number) => {
      doc.text(line, pageW / 2, 197 + i * 7, { align: "center" });
    });

    // CANTIDAD - GIGANTE
    doc.setTextColor(...EMERALD);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("CANTIDAD", pageW / 2, 220, { align: "center" });

    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");

    // Número gigante centrado y, debajo, la unidad bien grande también
    const cantidadStr = Number.isInteger(mat.cantidad)
      ? String(mat.cantidad)
      : mat.cantidad.toFixed(2);
    const tieneUnidad = !!mat.unidad;
    const cantidadFontSize = tieneUnidad ? 95 : 110;
    const cantidadY = tieneUnidad ? pageH - 45 : pageH - 30;

    doc.setFontSize(cantidadFontSize);
    doc.text(cantidadStr, pageW / 2, cantidadY, { align: "center" });

    if (tieneUnidad) {
      doc.setTextColor(...EMERALD);
      doc.setFontSize(48);
      doc.text(mat.unidad, pageW / 2, pageH - 18, { align: "center" });
    }
  }

  const safeNombre = data.cliente_nombre
    .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ ]/g, "")
    .trim()
    .replace(/\s+/g, "_");
  doc.save(`ListaObra-${numStr}-${safeNombre}.pdf`);
}
