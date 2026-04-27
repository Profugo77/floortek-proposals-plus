export const UNIDADES = ["m²", "ml", "u", "kg", "lt"] as const;
export type Unidad = (typeof UNIDADES)[number];

/** Devuelve la unidad inferida según palabras clave del nombre, o null si no hay match. */
export function inferirUnidad(nombre: string): Unidad | null {
  const n = nombre.toLowerCase();

  // Zócalos / molduras → metros lineales
  if (/\b(z[oó]calo|moldura|guardasilla|guardapolvo|cubrejunta|nariz)\b/.test(n)) {
    return "ml";
  }

  // Wall panel / paneles / placas → unidades
  if (/\b(wall\s*panel|panel|placa|tabla\s*decor|revestimiento)\b/.test(n)) {
    return "u";
  }

  // Pisos en general → m²
  if (
    /\b(piso|pisos|parquet|vin[ií]lico|laminado|tarima|spc|lvt|lvp|engineered|ingenier[ií]a|alfombra|carpet|porcelanato|cer[áa]mic[oa])\b/.test(
      n
    )
  ) {
    return "m²";
  }

  // Adhesivos, selladores, lacas, fondos → litros (o kg)
  if (/\b(laca|sellador|adhesivo|cola|fondo|barniz|imprimaci[oó]n|aceite)\b/.test(n)) {
    return "lt";
  }

  return null;
}
