# Anlly Hub

Herramientas de operación en la web. Fase 1: **Nómina** (horas ordinarias, nocturnas, dominicales/festivas,
nocturnas festivas y horas extra) con carga uno a uno o desde Excel. Roles: **admin** (Nómina, Horarios, Usuarios)
y **supervisor** (herramientas futuras).

Stack: Angular 22 + Tailwind 4, Supabase (base de datos, login y seguridad por fila) y Cloudflare Pages.
Todo en planes gratuitos.

## 1. Crear la base de datos (Supabase, gratis)

1. Crea una cuenta en [supabase.com](https://supabase.com) y un proyecto nuevo (región São Paulo, la más cercana).
2. Ve a **SQL Editor**, pega todo `supabase/migrations/001_base_nomina.sql` y pulsa **Run**.
3. Ve a **Authentication → Users → Add user → Create new user**, escribe tu correo y contraseña y marca
   **Auto Confirm User**.
4. En **SQL Editor** conviértete en admin:
   ```sql
   update public.perfiles set rol = 'admin' where correo = 'tu-correo@ejemplo.com';
   ```
5. En **Authentication → Sign In / Providers** desactiva **Allow new users to sign up**: solo la admin crea usuarios.
6. Copia **Project URL** y la **anon public key** (Project Settings → API) en `src/environments/environment.ts`.
   La anon key es pública por diseño; los datos los protegen las políticas RLS del SQL.

> El plan gratuito pausa el proyecto tras 7 días sin uso; se reactiva con un clic en el panel.

## 2. Correr en local

```bash
npm install
npm start          # http://localhost:4200
npm test           # pruebas de los cálculos y del lector de Excel
```

## 3. Publicar (Cloudflare Pages, gratis)

1. Sube el repo a GitHub.
2. En Cloudflare → **Workers & Pages → Create → Pages → Connect to Git**, elige el repo y configura:
   - Build command: `npm run build:pages`
   - Build output directory: `dist/mi-proyecto/browser`
3. En Supabase → **Authentication → URL Configuration**, pon la URL de Cloudflare como **Site URL**.

## Cómo calcula la nómina

- Cada **vigencia** de recargos (Nómina → Configuración) aplica desde su fecha; un turno que cruza el cambio se
  liquida con la vigencia de cada día. Valores iniciales de Colombia: nocturno 19:00–06:00 al 35 %,
  dominical/festivo 80 % → 90 % desde 01/07/2026, 44 h → 42 h semanales desde 15/07/2026.
  **Valídalos con tu contador.**
- Los domingos pagan dominical. Nocturno en festivo = nocturno + festivo.
- El almuerzo no se paga: se registran dos tramos (antes y después). Los descansos sí se pagan.
- **Horas extra**: lo que pase de la jornada diaria (por agente o la general) o de las horas semanales, sin contar
  doble. Extra festiva = festivo + extra diurna/nocturna.
- Valor hora = valor manual del agente, o salario / (horas semanales ÷ 6 × 30).

Los cálculos están en `src/app/features/nomina/dominio/` (TypeScript puro, con pruebas).
