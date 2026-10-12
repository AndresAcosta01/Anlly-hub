// ExcelJS pesa ~1 MB: se importa dinámicamente solo al leer o generar un archivo.
import type { CellValue, Workbook } from 'exceljs';

export type TipoColumna = 'texto' | 'numero' | 'fecha' | 'hora' | 'sino';
export type ValorCelda = string | number | boolean | null;

export interface Columna {
  clave: string;
  titulo: string;
  tipo: TipoColumna;
  obligatoria?: boolean;
  ayuda: string;
  ejemplo: string;
}

export interface Plantilla {
  id: string;
  nombre: string;
  columnas: Columna[];
}

export interface FilaLeida {
  fila: number;
  valores: Record<string, ValorCelda>;
}

export interface ErrorFila {
  fila: number;
  columna: string;
  valor: string;
  mensaje: string;
}

export const MAX_FILAS = 5000;
export const MAX_BYTES = 5 * 1024 * 1024;
const VERSION = 'v1';
const HOJA_DATOS = 'Datos';
const HOJA_META = '_plantilla';

const FORMATO: Record<TipoColumna, string> = {
  texto: 'Texto',
  numero: 'Número sin puntos ni signos (ej. 2100000)',
  fecha: 'Fecha AAAA-MM-DD o DD/MM/AAAA',
  hora: 'Hora 24 h HH:MM (ej. 22:00)',
  sino: 'Sí o No',
};

async function cargarExcelJs() {
  const m = await import('exceljs');
  return (m as unknown as { default?: typeof m }).default ?? m;
}

function descargar(buffer: ArrayBuffer, nombre: string): void {
  const url = URL.createObjectURL(
    new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
  );
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(url);
}

function estiloEncabezado(wb: Workbook, hoja: string): void {
  const fila = wb.getWorksheet(hoja)!.getRow(1);
  fila.font = { bold: true, color: { argb: 'FF1A1A1A' } };
  fila.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCDB4DB' } };
  fila.height = 22;
}

export async function descargarPlantilla(p: Plantilla): Promise<void> {
  const ExcelJS = await cargarExcelJs();
  const wb = new ExcelJS.Workbook();

  const hoja = wb.addWorksheet(HOJA_DATOS, { views: [{ state: 'frozen', ySplit: 1 }] });
  hoja.columns = p.columnas.map((c) => ({
    header: c.obligatoria ? `${c.titulo} *` : c.titulo,
    key: c.clave,
    width: Math.max(16, c.titulo.length + 6),
    style: {
      numFmt: c.tipo === 'fecha' ? 'yyyy-mm-dd' : c.tipo === 'hora' ? 'hh:mm' : undefined,
    },
  }));
  p.columnas.forEach((c, i) => {
    const letra = hoja.getColumn(i + 1).letter;
    for (let f = 2; f <= 1000; f++) {
      const celda = hoja.getCell(`${letra}${f}`);
      if (c.tipo === 'sino') {
        celda.dataValidation = { type: 'list', allowBlank: true, formulae: ['"Sí,No"'] };
      } else if (c.tipo === 'numero') {
        celda.dataValidation = {
          type: 'decimal',
          operator: 'greaterThanOrEqual',
          allowBlank: true,
          formulae: [0],
          showErrorMessage: true,
          errorTitle: 'Número inválido',
          error: 'Escribe un número mayor o igual a 0, sin puntos ni signos.',
        };
      }
    }
  });
  estiloEncabezado(wb, HOJA_DATOS);

  const ayuda = wb.addWorksheet('Instrucciones');
  ayuda.columns = [
    { header: 'Columna', key: 'columna', width: 22 },
    { header: 'Obligatoria', key: 'obligatoria', width: 12 },
    { header: 'Formato', key: 'formato', width: 40 },
    { header: 'Ejemplo', key: 'ejemplo', width: 16 },
    { header: 'Descripción', key: 'ayuda', width: 60 },
  ];
  for (const c of p.columnas) {
    ayuda.addRow({
      columna: c.titulo,
      obligatoria: c.obligatoria ? 'Sí' : 'No',
      formato: FORMATO[c.tipo],
      ejemplo: c.ejemplo,
      ayuda: c.ayuda,
    });
  }
  estiloEncabezado(wb, 'Instrucciones');

  const meta = wb.addWorksheet(HOJA_META, { state: 'veryHidden' });
  meta.getCell('A1').value = `${p.id}-${VERSION}`;

  descargar(await wb.xlsx.writeBuffer(), `plantilla-${p.id}.xlsx`);
}

export async function descargarErrores(p: Plantilla, errores: ErrorFila[]): Promise<void> {
  const ExcelJS = await cargarExcelJs();
  const wb = new ExcelJS.Workbook();
  const hoja = wb.addWorksheet('Errores');
  hoja.columns = [
    { header: 'Fila', key: 'fila', width: 8 },
    { header: 'Columna', key: 'columna', width: 22 },
    { header: 'Valor', key: 'valor', width: 24 },
    { header: 'Mensaje', key: 'mensaje', width: 70 },
  ];
  // Todo se escribe como texto para que un valor como "=..." nunca se interprete como fórmula.
  for (const e of errores) hoja.addRow({ ...e, valor: String(e.valor) });
  estiloEncabezado(wb, 'Errores');
  descargar(await wb.xlsx.writeBuffer(), `errores-${p.id}.xlsx`);
}

// ─── Lectura ───

const normalizar = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ*]/g, '')
    .trim()
    .toLowerCase();

const dos = (n: number) => String(n).padStart(2, '0');

/** Valor "plano" de una celda de ExcelJS (resuelve fórmulas, texto enriquecido e hipervínculos). */
function plano(v: CellValue): string | number | boolean | Date | null {
  if (v === null || v === undefined) return null;
  if (v instanceof Date || typeof v !== 'object') return v as string | number | boolean | Date;
  if ('result' in v) return plano(v.result as CellValue);
  if ('richText' in v) return v.richText.map((t) => t.text).join('');
  if ('text' in v) return String(v.text);
  return null;
}

/** Convierte una celda al tipo de la columna; lanza un mensaje si el formato es inválido. */
function convertir(v: ReturnType<typeof plano>, tipo: TipoColumna): ValorCelda {
  if (v === null || (typeof v === 'string' && !v.trim())) return null;

  switch (tipo) {
    case 'texto':
      return v instanceof Date ? v.toISOString().slice(0, 10) : String(v).trim();

    case 'numero': {
      if (typeof v === 'number') return v;
      const s = String(v).replace(/[\s$]/g, '');
      // "2.100.000" o "2.100.000,50" → formato colombiano con punto de miles.
      const n = /^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)
        ? Number(s.replace(/\./g, '').replace(',', '.'))
        : Number(s.replace(',', '.'));
      if (Number.isNaN(n)) throw 'Debe ser un número.';
      return n;
    }

    case 'fecha': {
      // ExcelJS entrega las fechas en UTC.
      if (v instanceof Date) return `${v.getUTCFullYear()}-${dos(v.getUTCMonth() + 1)}-${dos(v.getUTCDate())}`;
      if (typeof v === 'number') {
        const d = new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 86_400_000);
        return d.toISOString().slice(0, 10);
      }
      const s = String(v).trim();
      const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
      const latina = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
      const [a, m, d] = iso
        ? [+iso[1], +iso[2], +iso[3]]
        : latina
          ? [+latina[3], +latina[2], +latina[1]]
          : [0, 0, 0];
      const fecha = a ? `${a}-${dos(m)}-${dos(d)}` : '';
      // Descarta fechas que no existen, como 2026-13-01 o 31/02/2026.
      if (!a || new Date(Date.UTC(a, m - 1, d)).toISOString().slice(0, 10) !== fecha) {
        throw 'Fecha inválida, usa AAAA-MM-DD o DD/MM/AAAA.';
      }
      return fecha;
    }

    case 'hora': {
      if (v instanceof Date) return `${dos(v.getUTCHours())}:${dos(v.getUTCMinutes())}`;
      if (typeof v === 'number' && v >= 0 && v < 1) {
        const min = Math.round(v * 1440) % 1440;
        return `${dos(Math.floor(min / 60))}:${dos(min % 60)}`;
      }
      const m = /^(\d{1,2}):(\d{2})(?::\d{2})?\s*([ap])?\.?\s*m?\.?$/i.exec(String(v).trim());
      if (!m) throw 'Hora inválida, usa HH:MM en formato 24 h.';
      let h = Number(m[1]);
      const sufijo = m[3]?.toLowerCase();
      if (sufijo === 'p' && h < 12) h += 12;
      if (sufijo === 'a' && h === 12) h = 0;
      if (h > 23 || Number(m[2]) > 59) throw 'Hora inválida, usa HH:MM en formato 24 h.';
      return `${dos(h)}:${m[2]}`;
    }

    case 'sino': {
      if (typeof v === 'boolean') return v;
      const s = normalizar(String(v));
      if (['si', 's', 'x', 'true', '1', 'activo'].includes(s)) return true;
      if (['no', 'n', 'false', '0', 'inactivo'].includes(s)) return false;
      throw 'Escribe Sí o No.';
    }
  }
}

/** Lee la hoja "Datos" y valida formato y obligatorios. Las filas con errores no se devuelven. */
export async function leerExcel(
  archivo: File,
  p: Plantilla,
): Promise<{ filas: FilaLeida[]; errores: ErrorFila[] }> {
  if (archivo.size > MAX_BYTES) throw new Error('El archivo supera 5 MB.');
  if (!archivo.name.toLowerCase().endsWith('.xlsx')) throw new Error('Sube un archivo .xlsx.');

  const ExcelJS = await cargarExcelJs();
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(await archivo.arrayBuffer());
  } catch {
    throw new Error('No se pudo leer el archivo. ¿Es un Excel válido?');
  }

  const marca = wb.getWorksheet(HOJA_META)?.getCell('A1').value;
  if (marca && marca !== `${p.id}-${VERSION}`) {
    throw new Error(`Este archivo no es la plantilla de ${p.nombre}. Descárgala de nuevo.`);
  }

  const hoja = wb.getWorksheet(HOJA_DATOS) ?? wb.worksheets[0];
  if (!hoja) throw new Error('El archivo no tiene hojas.');

  const indice = new Map<string, number>();
  hoja.getRow(1).eachCell((celda, col) => indice.set(normalizar(String(plano(celda.value) ?? '')), col));
  const faltantes = p.columnas.filter((c) => !indice.has(normalizar(c.titulo)));
  if (faltantes.length) {
    throw new Error(`Faltan columnas: ${faltantes.map((c) => c.titulo).join(', ')}.`);
  }

  const filas: FilaLeida[] = [];
  const errores: ErrorFila[] = [];
  let leidas = 0;

  hoja.eachRow((row, numero) => {
    if (numero === 1) return;
    const crudos = p.columnas.map((c) => plano(row.getCell(indice.get(normalizar(c.titulo))!).value));
    if (crudos.every((v) => v === null || v === '')) return;
    if (++leidas > MAX_FILAS) return;

    const valores: Record<string, ValorCelda> = {};
    let ok = true;
    p.columnas.forEach((c, i) => {
      try {
        valores[c.clave] = convertir(crudos[i], c.tipo);
        if (c.obligatoria && valores[c.clave] === null) throw 'Es obligatoria.';
      } catch (mensaje) {
        ok = false;
        errores.push({ fila: numero, columna: c.titulo, valor: String(crudos[i] ?? ''), mensaje: String(mensaje) });
      }
    });
    if (ok) filas.push({ fila: numero, valores });
  });

  if (leidas > MAX_FILAS) throw new Error(`El archivo supera ${MAX_FILAS} filas. Divídelo en partes.`);
  return { filas, errores };
}
