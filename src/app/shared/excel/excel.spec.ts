import ExcelJS from 'exceljs';
import { Plantilla, leerExcel } from './excel';

const PLANTILLA: Plantilla = {
  id: 'prueba',
  nombre: 'Prueba',
  columnas: [
    { clave: 'documento', titulo: 'Documento', tipo: 'texto', obligatoria: true, ayuda: '', ejemplo: '' },
    { clave: 'fecha', titulo: 'Fecha', tipo: 'fecha', obligatoria: true, ayuda: '', ejemplo: '' },
    { clave: 'entrada', titulo: 'Entrada', tipo: 'hora', obligatoria: true, ayuda: '', ejemplo: '' },
    { clave: 'salario', titulo: 'Salario', tipo: 'numero', ayuda: '', ejemplo: '' },
    { clave: 'activo', titulo: 'Activo', tipo: 'sino', ayuda: '', ejemplo: '' },
  ],
};

async function archivo(filas: unknown[][], marca = 'prueba-v1'): Promise<File> {
  const wb = new ExcelJS.Workbook();
  const hoja = wb.addWorksheet('Datos');
  hoja.addRow(['Documento *', 'Fecha *', 'Entrada *', 'Salario', 'Activo']);
  filas.forEach((f) => hoja.addRow(f));
  wb.addWorksheet('_plantilla').getCell('A1').value = marca;
  const buffer = await wb.xlsx.writeBuffer();
  return new File([buffer], 'datos.xlsx');
}

describe('leerExcel', () => {
  it('convierte fechas, horas, números y Sí/No en sus distintos formatos', async () => {
    const { filas, errores } = await leerExcel(
      await archivo([
        ['123', new Date(Date.UTC(2026, 7, 7)), new Date(Date.UTC(1899, 11, 30, 22, 0)), 2100000, 'Sí'],
        ['456', '08/08/2026', '6:30 p. m.', '2.100.000', 'no'],
        ['789', '2026-08-09', 0.25, null, null],
      ]),
      PLANTILLA,
    );
    expect(errores).toEqual([]);
    expect(filas.map((f) => f.valores)).toEqual([
      { documento: '123', fecha: '2026-08-07', entrada: '22:00', salario: 2100000, activo: true },
      { documento: '456', fecha: '2026-08-08', entrada: '18:30', salario: 2100000, activo: false },
      { documento: '789', fecha: '2026-08-09', entrada: '06:00', salario: null, activo: null },
    ]);
  });

  it('reporta errores por fila y columna, e ignora filas vacías', async () => {
    const { filas, errores } = await leerExcel(
      await archivo([
        ['1', '2026-13-01', '25:00', 'abc', 'quizás'],
        [null, null, null, null, null],
        [null, '2026-08-07', '08:00', null, null],
      ]),
      PLANTILLA,
    );
    expect(filas).toEqual([]);
    expect(errores.map((e) => `${e.fila}:${e.columna}`)).toEqual([
      '2:Fecha',
      '2:Entrada',
      '2:Salario',
      '2:Activo',
      '4:Documento',
    ]);
  });

  it('rechaza la plantilla de otra sección', async () => {
    await expect(leerExcel(await archivo([], 'agentes-v1'), PLANTILLA)).rejects.toThrow(
      'no es la plantilla de Prueba',
    );
  });
});
