# shadcn/ui en este proyecto

Este proyecto usa `shadcn/ui` sobre Astro + React + Tailwind v4.

## Configuracion actual

- Framework: `Astro`
- Base: `radix`
- Style: `radix-nova`
- Iconos: `lucide-react`
- Alias principal: `@`
- CSS global: `src/styles/global.css`
- Componentes UI: `src/components/ui`
- Utilidades: `src/lib/utils.ts`

## Importaciones

Importa componentes desde `@/components/ui/...`.

```tsx
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
```

Usa `cn()` para clases condicionales:

```tsx
import { cn } from "@/lib/utils"
```

## Como funciona

- `shadcn/ui` no es una libreria cerrada: los componentes son archivos fuente dentro del proyecto.
- Puedes leerlos, modificarlos y versionarlos como parte de tu app.
- El tema vive en `src/styles/global.css` con tokens semanticos como `--background`, `--primary` y `--muted`.
- La composicion importa mas que los estilos sueltos. Muchos componentes requieren subcomponentes especificos.

## Reglas practicas

- Usa tokens semanticos como `bg-background`, `text-foreground`, `bg-primary`.
- Evita colores hardcodeados si el componente ya resuelve su estado con variantes.
- Usa `gap-*` en layouts, no `space-x-*` ni `space-y-*`.
- Usa `size-*` cuando ancho y alto sean iguales.
- En botones con iconos, agrega `data-icon="inline-start"` o `data-icon="inline-end"` al icono.
- Para clases condicionales, usa `cn(...)`.
- `Dialog`, `Sheet` y `Drawer` necesitan titulo para accesibilidad.
- `TabsTrigger` debe ir dentro de `TabsList`.
- `Avatar` debe incluir `AvatarFallback`.

## Componentes instalados

Se instaló el registry oficial completo disponible por CLI, incluyendo:

- acciones y feedback: `button`, `alert`, `alert-dialog`, `sonner`, `spinner`, `progress`, `skeleton`
- overlays: `dialog`, `sheet`, `drawer`, `popover`, `tooltip`, `hover-card`
- formularios: `field`, `input`, `input-group`, `textarea`, `checkbox`, `radio-group`, `switch`, `select`, `native-select`, `combobox`, `input-otp`, `slider`
- navegacion: `breadcrumb`, `navigation-menu`, `menubar`, `sidebar`, `tabs`, `pagination`
- data display: `card`, `table`, `badge`, `avatar`, `chart`, `empty`, `kbd`
- composicion y layout: `accordion`, `collapsible`, `resizable`, `scroll-area`, `separator`, `aspect-ratio`

## Providers a tener en cuenta

- Si usas `Tooltip`, envuelve la zona con `TooltipProvider`.
- Si usas `sonner`, renderiza `<Sonner />` una vez en la app para habilitar toasts.

## Uso minimo en Astro

Los componentes React de `shadcn/ui` se usan desde Astro con hidratacion:

```astro
---
import { Button } from "@/components/ui/button";
---

<Button client:load>Click</Button>
```

Si el componente solo renderiza markup estatico, prueba tambien `client:visible` o hidrata una isla React completa.

## Comandos utiles

```bash
npx shadcn@latest info --json
npx shadcn@latest add button
npx shadcn@latest add dialog sheet
npx shadcn@latest docs button dialog sidebar
npx shadcn@latest search @shadcn -q "dashboard"
```

## Referencias oficiales

- Docs base: https://ui.shadcn.com/docs
- Button: https://ui.shadcn.com/docs/components/radix/button
- Dialog: https://ui.shadcn.com/docs/components/radix/dialog
- Sidebar: https://ui.shadcn.com/docs/components/radix/sidebar
