import { Plantilla } from '../../shared/excel/excel';

export const PLANTILLA_AGENTES: Plantilla = {
  id: 'agentes',
  nombre: 'Agentes',
  columnas: [
    { clave: 'documento', titulo: 'Documento', tipo: 'texto', obligatoria: true, ayuda: 'Número de documento, único por agente.', ejemplo: '1032456789' },
    { clave: 'nombre', titulo: 'Nombre', tipo: 'texto', obligatoria: true, ayuda: 'Nombre completo.', ejemplo: 'Laura Gómez' },
    { clave: 'salarioBase', titulo: 'Salario base', tipo: 'numero', ayuda: 'Salario mensual. Se usa para calcular el valor de la hora.', ejemplo: '1750905' },
    { clave: 'valorHora', titulo: 'Valor hora', tipo: 'numero', ayuda: 'Opcional. Si lo llenas, reemplaza el cálculo desde el salario.', ejemplo: '' },
    { clave: 'jornadaDiaria', titulo: 'Jornada diaria', tipo: 'numero', ayuda: 'Opcional. Horas diarias antes de contar extra. Vacío = la de configuración.', ejemplo: '8' },
    { clave: 'activo', titulo: 'Activo', tipo: 'sino', ayuda: 'Sí o No. Vacío = Sí.', ejemplo: 'Sí' },
  ],
};

export const PLANTILLA_HORAS: Plantilla = {
  id: 'horas',
  nombre: 'Horas trabajadas',
  columnas: [
    { clave: 'documento', titulo: 'Documento', tipo: 'texto', obligatoria: true, ayuda: 'Documento de un agente ya registrado.', ejemplo: '1032456789' },
    { clave: 'fecha', titulo: 'Fecha', tipo: 'fecha', obligatoria: true, ayuda: 'Día en que inició el tramo.', ejemplo: '2026-10-12' },
    { clave: 'entrada', titulo: 'Entrada', tipo: 'hora', obligatoria: true, ayuda: 'Hora de inicio en formato 24 h.', ejemplo: '22:00' },
    { clave: 'salida', titulo: 'Salida', tipo: 'hora', obligatoria: true, ayuda: 'Hora de fin. Si es menor que la entrada, termina al día siguiente. Si hubo almuerzo, registra dos filas (antes y después).', ejemplo: '06:00' },
    { clave: 'observacion', titulo: 'Observación', tipo: 'texto', ayuda: 'Opcional.', ejemplo: 'Cubre turno' },
  ],
};

export const PLANTILLA_FESTIVOS: Plantilla = {
  id: 'festivos',
  nombre: 'Festivos',
  columnas: [
    { clave: 'fecha', titulo: 'Fecha', tipo: 'fecha', obligatoria: true, ayuda: 'Fecha del festivo.', ejemplo: '2026-12-25' },
    { clave: 'nombre', titulo: 'Nombre', tipo: 'texto', obligatoria: true, ayuda: 'Nombre del festivo.', ejemplo: 'Navidad' },
  ],
};
