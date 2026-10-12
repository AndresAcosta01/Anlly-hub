import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Avisos } from '../../../../shared/ui/avisos';
import { EstadoVacio } from '../../../../shared/ui/estado-vacio';
import { Icono } from '../../../../shared/ui/icono';
import { Agente, Festivo, NominaDatos, Registro, VigenciaGuardada } from '../../datos/nomina-datos';
import { Liquidacion, liquidar, valorHora } from '../../dominio/liquidacion';
import {
  ResumenMinutos,
  TIPOS_HORA,
  TipoHora,
  clasificarTramos,
  resumirMinutos,
} from '../../dominio/particion-horas';
import { fechaDesdePartes, hoy, inicioSemana, sumarDias } from '../../dominio/tiempo';
import { vigenciaPara } from '../../dominio/vigencias';
import { HorasPipe, PesosPipe } from '../../pipes';
import { COLOR_TIPO, NOMBRE_TIPO } from '../../tipos-hora';

interface FilaResumen {
  agente: Agente;
  minutos: ResumenMinutos;
  total: number;
  totalExtras: number;
  valorHora: number;
  liquidacion: Liquidacion;
}

interface Segmento {
  clase: string;
  minutos: number;
  texto: string;
}

@Component({
  selector: 'app-resumen',
  imports: [RouterLink, Icono, EstadoVacio, PesosPipe, HorasPipe],
  templateUrl: './resumen.html',
})
export class Resumen implements OnInit {
  private readonly datos = inject(NominaDatos);
  private readonly avisos = inject(Avisos);

  protected readonly nombreTipo = NOMBRE_TIPO;
  protected readonly colorTipo = COLOR_TIPO;
  protected readonly tipos = TIPOS_HORA;

  protected readonly cargando = signal(true);
  protected readonly agentes = signal<Agente[]>([]);
  protected readonly vigencias = signal<VigenciaGuardada[]>([]);
  protected readonly festivos = signal<Festivo[]>([]);
  protected readonly registros = signal<Registro[]>([]);
  protected readonly desde = signal(hoy().slice(0, 8) + '01');
  protected readonly hasta = signal(this.finDeMes(hoy()));
  protected readonly filtroAgente = signal('');
  protected readonly abierto = signal<string | null>(null);

  protected readonly filas = computed<FilaResumen[]>(() => {
    const vigencias = this.vigencias();
    if (!vigencias.length) return [];
    const festivos = new Set(this.festivos().map((f) => f.fecha));
    const esFestivo = (f: string) => festivos.has(f);
    const vHasta = vigenciaPara(this.hasta(), vigencias);

    const porAgente = new Map<string, Registro[]>();
    for (const r of this.registros()) {
      porAgente.set(r.agenteId, [...(porAgente.get(r.agenteId) ?? []), r]);
    }

    return this.agentes()
      .filter((a) => porAgente.has(a.id) && (!this.filtroAgente() || a.id === this.filtroAgente()))
      .map((agente) => {
        // Se clasifican desde el inicio de semana para que las extras semanales sean correctas;
        // luego solo se cuentan los tramos del período.
        const subtramos = clasificarTramos(
          porAgente.get(agente.id)!,
          esFestivo,
          vigencias,
          agente.jornadaDiariaHoras,
        ).filter((s) => s.fechaTramo >= this.desde() && s.fechaTramo <= this.hasta());
        const minutos = resumirMinutos(subtramos);
        const suma = (b: Record<TipoHora, number>) => TIPOS_HORA.reduce((s, t) => s + b[t], 0);
        const totalExtras = suma(minutos.extras);
        return {
          agente,
          minutos,
          totalExtras,
          total: suma(minutos.normales) + totalExtras,
          valorHora: valorHora(agente, vHasta),
          liquidacion: liquidar(subtramos, agente),
        };
      })
      .filter((f) => f.total > 0)
      .sort((a, b) => b.liquidacion.total - a.liquidacion.total);
  });

  protected readonly totales = computed(() =>
    this.filas().reduce(
      (t, f) => ({
        pagar: t.pagar + f.liquidacion.total,
        minutos: t.minutos + f.total,
        extras: t.extras + f.totalExtras,
        valorExtras: t.valorExtras + f.liquidacion.totalExtras,
        recargos: t.recargos + f.liquidacion.totalRecargos,
      }),
      { pagar: 0, minutos: 0, extras: 0, valorExtras: 0, recargos: 0 },
    ),
  );

  protected readonly sinValorHora = computed(() => this.filas().filter((f) => !f.valorHora).length);

  async ngOnInit(): Promise<void> {
    try {
      const [agentes, vigencias, festivos] = await Promise.all([
        this.datos.agentes(),
        this.datos.vigencias(),
        this.datos.festivos(),
      ]);
      this.agentes.set(agentes);
      this.vigencias.set(vigencias);
      this.festivos.set(festivos);
      await this.cargarRegistros();
    } catch (e) {
      this.avisos.error((e as Error).message);
    } finally {
      this.cargando.set(false);
    }
  }

  protected async cargarRegistros(): Promise<void> {
    if (!this.vigencias().length) return;
    const inicio = inicioSemana(this.desde(), vigenciaPara(this.desde(), this.vigencias()).inicioSemana);
    try {
      this.registros.set(await this.datos.registros(inicio, this.hasta()));
    } catch (e) {
      this.avisos.error((e as Error).message);
    }
  }

  protected cambiarPeriodo(desde: string, hasta: string): void {
    if (!desde || !hasta || desde > hasta) return;
    this.desde.set(desde);
    this.hasta.set(hasta);
    void this.cargarRegistros();
  }

  protected mesActual(): void {
    this.cambiarPeriodo(hoy().slice(0, 8) + '01', this.finDeMes(hoy()));
  }

  protected quincena(): void {
    const d = hoy();
    const dia = Number(d.slice(8));
    const base = d.slice(0, 8);
    this.cambiarPeriodo(dia <= 15 ? base + '01' : base + '16', dia <= 15 ? base + '15' : this.finDeMes(d));
  }

  private finDeMes(fecha: string): string {
    const [a, m] = fecha.split('-').map(Number);
    return sumarDias(fechaDesdePartes(a, m + 1, 1), -1);
  }

  protected alternar(id: string): void {
    this.abierto.update((a) => (a === id ? null : id));
  }

  /** Segmentos de la barra apilada: los 4 tipos normales y las extras juntas. */
  protected segmentos(f: FilaResumen): Segmento[] {
    const s: Segmento[] = TIPOS_HORA.map((t) => ({
      clase: COLOR_TIPO[t],
      minutos: f.minutos.normales[t],
      texto: NOMBRE_TIPO[t],
    }));
    s.push({ clase: 'bg-alerta', minutos: f.totalExtras, texto: 'Extras' });
    return s.filter((x) => x.minutos > 0);
  }

  protected descripcionBarra(f: FilaResumen): string {
    const horas = (m: number) => `${Math.round((m / 60) * 10) / 10} h`;
    return this.segmentos(f)
      .map((s) => `${s.texto}: ${horas(s.minutos)}`)
      .join(', ');
  }
}
