# Ayni

Prototipo hackathon de un consejero financiero express para jóvenes bolivianos. El usuario pregunta en lenguaje natural y recibe un veredicto claro: `ESPERA`, `ADELANTE` o `CUIDADO`, con reasoning, métricas y una alternativa concreta.

## Stack

- Astro 6
- React 19
- Tailwind CSS v4
- shadcn/ui
- React Router
- Framer Motion
- Google Gemini API con `@google/generative-ai`
- `localStorage` para contexto y últimas consultas

## Correr local

1. Instala dependencias:

```bash
npm install
```

2. Crea tu archivo `.env.local` en la raíz:

```env
VITE_GEMINI_API_KEY=tu_api_key_aqui
```

La key se obtiene en `https://aistudio.google.com/app/apikey`.

3. Levanta el proyecto:

```bash
npm run dev
```

4. Build de verificación:

```bash
npm run build
```

## Demo rápida

En el onboarding puedes usar `Saltar con datos de ejemplo`. Eso carga:

- ingreso: `Bs 4500`
- gastos fijos: `Bs 2800`
- deuda activa: `Bs 600` de universidad
- metas: `ahorrar`, `estudiar`

Con ese contexto, estas preguntas quedan estables para el pitch:

- `¿compro el celular a crédito de Bs 3500?` → `ESPERA`
- `¿me sumo al pasanaku de Bs 300 al mes?` → `ADELANTE`
- `¿acepto el préstamo de Bs 8000 de la cooperativa para emprender?` → `CUIDADO`

## Qué guarda localmente

- `ayni_context`: contexto financiero del usuario
- `ayni_records`: últimas 5 decisiones guardadas
- `ayni_pending_question`: consulta en curso
- `ayni_last_result`: último resultado para sostener la navegación

## Notas

- Para demo local de hackathon, Gemini corre directo desde el frontend con Vite env vars.
- Si falta la API key o Gemini falla, Ayni usa un fallback local para que el flujo no se rompa.
- El prototipo usa `HashRouter` para que las vistas funcionen bien en build estático.
