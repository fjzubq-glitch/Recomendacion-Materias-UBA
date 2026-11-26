# Reglas del proyecto — Recomendación de Materias UBA

Sitio estático (HTML/CSS/JS vanilla) publicado en GitHub Pages desde `main`. Los datos
están en `cpc_data.json` y `cpo_data.json`, generados por scripts Python/Node.

## Generales
- Respondé en español y trabajá solo dentro de este repositorio.
- Antes de modificar código: plan breve, archivos afectados y riesgos.
- Cambios mínimos, respetando el estilo existente (JS vanilla en `js/`, estilos en
  `style.css`). No agregues frameworks ni dependencias sin aprobación.
- No toques secretos, tokens, `.env` ni `.github/workflows/` sin aprobación explícita.
- Nunca escribas tokens en código, comandos ni commits.

## Git (commit y push automáticos, solo en rama de trabajo)
- Al empezar, corré `git status` y avisá si hay cambios sin commitear. No los descartes.
- Trabajá en la rama `trabajo`. Si no existe, creala desde la actual con
  `git checkout -b trabajo`. No trabaje directamente en `main`.
- Al terminar cada tarea verificada (o un avance significativo), hacé commit
  convencional (`feat:`, `fix:`, `chore:`) y `git push origin trabajo`, sin pedirme
  confirmación, para poder abrir el trabajo en otra computadora.
- Hacé staging solo de los archivos que modificaste en esa tarea, con rutas explícitas.
  Nunca uses `git add -A` ni `git add .`.
- No commitees carpetas `backup_*`, planillas `.xlsx`, archivos temporales ni los
  cambios previos del repo que no sean de la tarea.
- Nunca hagas push a `main`, push forzado ni borres ramas. Pasar cambios a `main`
  (publica GitHub Pages) requiere mi OK explícito.
- Nunca escribas tokens en comandos ni archivos. Si el push pide credenciales,
  deteniste y avisame.

## Datos y pipeline
- `cpc_data.json` y `cpo_data.json` los genera el pipeline: no los edites a mano.
- No ejecutes `python actualizar_datos.py` sin avisarme: descarga de Sheets/Drive y puede
  borrar planillas locales. Si hace falta, usá `--compile-only` o `--no-clean`, con mi OK.
- `node mejorar_datos.js` es el post-procesado de los datos.
- El repo tiene archivos modificados y borrados sin commitear: no los reviertas.

## Verificación
- No hay tests. Verificá sirviendo el sitio localmente y revisando la consola del navegador.
- Si proponés tests, que sean mínimos: esquema de los JSON, `filters.js` y solapamientos
  en `report.js`.
- Si algo falla, diagnosticá la causa; no ocultes errores.

## Al finalizar
Entregá: archivos modificados, diff resumido, comandos ejecutados, resultados y pendientes.
