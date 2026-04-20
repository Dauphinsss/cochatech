import { GoogleGenerativeAI } from "@google/generative-ai";

import { DEMO_CONTEXT, DEMO_RESPONSES } from "@/lib/demo";
import type { AyniResponse, UserContext } from "@/lib/types";

function buildSystemPrompt(ctx: UserContext) {
  return `
Eres Ayni, un consejero financiero express para jóvenes en Bolivia (20-35 años). Tu rol es dar una SEGUNDA OPINIÓN crítica ANTES de decisiones de gasto importantes. No educas ni reemplazas a un banco: ayudas a decidir en el momento clave.

CONTEXTO DEL USUARIO:
${JSON.stringify(ctx, null, 2)}

REGLAS DURAS:
1. Entiendes la realidad boliviana: pasanakus, cooperativas, USD/Bs, informalidad laboral, aguinaldos de fin de año, fiestas patronales.
2. Hablas en TÚ, cálido pero directo. Nunca usas usted.
3. PROHIBIDA la jerga: apalancamiento, liquidez, flujo de caja, capital, ratio, pasivo, activo, endeudamiento. Usa: ahorro, deuda, cuota, colchón, queda, sobra, alcanza, aprieta.
4. Cita SIEMPRE números concretos del CONTEXTO DEL USUARIO. Si la pregunta trae un monto, puedes usar ese monto de la pregunta.
5. Nombra SIEMPRE una alternativa concreta, incluso si el veredicto es ADELANTE.
6. Honesto sin paternalismo. Si la decisión es mala, dilo claro. Si es buena, dilo sin celebraciones.
7. El reasoning debe explicar el TRADE-OFF real: qué se gana y qué se pierde.

CRITERIOS DE VEREDICTO:
- ADELANTE: La decisión encaja con su realidad, no compromete metas y aporta satisfacción real.
- CUIDADO: Tiene sentido solo bajo condiciones específicas.
- ESPERA: Compromete estabilidad, hay alternativa claramente mejor o la satisfacción no justifica el costo.

CRITERIOS DE SCORES:
- satisfaction_score: qué tan satisfactoria será la decisión a mediano plazo (0 = se arrepentirá, 10 = sólidamente feliz).
- solvency_impact: cuánto golpea la estabilidad financiera (0 = ni se nota, 10 = pone en aprietos al mes siguiente).

Responde ÚNICAMENTE con un objeto JSON válido con este esquema exacto:
{
  "verdict": "ESPERA" | "ADELANTE" | "CUIDADO",
  "restated_question": "string",
  "reasoning": "string",
  "satisfaction_score": number,
  "solvency_impact": number,
  "alternative": "string",
  "factors": [
    { "layer": "contexto", "note": "string" },
    { "layer": "decision", "note": "string" },
    { "layer": "personal", "note": "string" }
  ]
}

No incluyas texto antes ni después del JSON. No uses markdown. Solo JSON puro.
  `.trim();
}

function isDemoContext(context: UserContext) {
  return JSON.stringify(context) === JSON.stringify(DEMO_CONTEXT);
}

function findDemoResponse(question: string) {
  const clean = question.toLowerCase();
  return DEMO_RESPONSES.find((entry) => entry.match.test(clean))?.response ?? null;
}

function extractJson(text: string) {
  const trimmed = text.trim();

  if (trimmed.startsWith("{")) {
    return trimmed;
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");

  if (start >= 0 && end > start) {
    return trimmed.slice(start, end + 1);
  }

  return trimmed;
}

function clampScore(value: number) {
  return Math.max(0, Math.min(10, Math.round(value)));
}

function sanitizeResponse(response: AyniResponse): AyniResponse {
  const factors = response.factors.slice(0, 3);
  const layers = new Set(factors.map((factor) => factor.layer));

  if (!layers.has("contexto")) {
    factors.unshift({ layer: "contexto", note: "Tu margen mensual fue una pieza central para decidir." });
  }
  if (!layers.has("decision")) {
    factors.push({ layer: "decision", note: "El costo real frente a lo que ganas inclinó el veredicto." });
  }
  if (!layers.has("personal")) {
    factors.push({ layer: "personal", note: "Tus metas y prioridades ayudaron a definir si conviene o no." });
  }

  return {
    ...response,
    satisfaction_score: clampScore(response.satisfaction_score),
    solvency_impact: clampScore(response.solvency_impact),
    factors: factors.slice(0, 3),
  };
}

function extractAmount(question: string) {
  const match = question.match(/(\d[\d.,]*)/);
  if (!match) return null;
  return Number(match[1].replace(/[.,](?=\d{3}\b)/g, "").replace(",", "."));
}

function buildHeuristicFallback(question: string, context: UserContext): AyniResponse {
  const freeCash =
    context.monthly_income_bs -
    context.fixed_expenses_bs -
    context.active_debts.reduce((sum, debt) => sum + debt.monthly_payment_bs, 0);
  const amount = extractAmount(question) ?? 0;
  const lower = question.toLowerCase();
  const goals = context.goals.join(", ");

  if (lower.includes("pasanaku")) {
    return {
      verdict: freeCash >= 900 ? "ADELANTE" : "CUIDADO",
      restated_question: "¿Entrar al pasanaku?",
      reasoning: `Te quedan Bs ${freeCash} al mes después de tus gastos y deudas. Si el aporte no pasa de lo que puedes separar sin apretarte, te puede servir para ahorrar con disciplina.`,
      satisfaction_score: freeCash >= 900 ? 8 : 6,
      solvency_impact: freeCash >= 900 ? 3 : 5,
      alternative: `Si no confías del todo en el grupo, separa ese mismo monto cada mes por tu cuenta y compáralo con el pasanaku.`,
      factors: [
        { layer: "contexto", note: `Tu margen real hoy es de Bs ${freeCash} al mes.` },
        { layer: "decision", note: "El pasanaku suma orden, pero depende mucho de que el grupo responda." },
        { layer: "personal", note: `Tus metas actuales son ${goals || "ahorrar mejor"}, así que la disciplina pesa bastante.` },
      ],
    };
  }

  if (lower.includes("préstamo") || lower.includes("prestamo") || lower.includes("cooperativa")) {
    return {
      verdict: freeCash >= 1200 ? "CUIDADO" : "ESPERA",
      restated_question: "¿Tomar el préstamo?",
      reasoning: `Te quedan Bs ${freeCash} al mes. Un préstamo de Bs ${amount || 0} solo tiene sentido si genera ingreso pronto; si tarda, te aprieta justo cuando más necesitas colchón.`,
      satisfaction_score: freeCash >= 1200 ? 7 : 5,
      solvency_impact: freeCash >= 1200 ? 6 : 8,
      alternative: "Prueba una versión más chica primero o reduce el monto para no sumar una cuota que te deje sin margen.",
      factors: [
        { layer: "contexto", note: `Tu margen disponible es de Bs ${freeCash}, no sobra demasiado.` },
        { layer: "decision", note: "La deuda solo se defiende si compra una oportunidad real y cercana." },
        { layer: "personal", note: `Tus metas hoy son ${goals || "cuidar tu estabilidad"}, así que el riesgo pesa bastante.` },
      ],
    };
  }

  return {
    verdict: amount > freeCash * 2 ? "ESPERA" : amount > freeCash ? "CUIDADO" : "ADELANTE",
    restated_question: "¿Conviene tomar esta decisión?",
    reasoning: `Te quedan Bs ${freeCash} libres al mes. Si esta decisión te consume demasiado de ese margen, la satisfacción puede no compensar la presión del mes siguiente.`,
    satisfaction_score: amount > freeCash * 2 ? 4 : amount > freeCash ? 6 : 8,
    solvency_impact: amount > freeCash * 2 ? 8 : amount > freeCash ? 6 : 3,
    alternative: "Parte el gasto en etapas o espera un par de meses para entrar con más margen y menos presión.",
    factors: [
      { layer: "contexto", note: `Tu margen libre hoy es de Bs ${freeCash}.` },
      { layer: "decision", note: "El tamaño del gasto frente a lo que te queda fue la pieza principal." },
      { layer: "personal", note: `Tus metas actuales son ${goals || "cuidar lo que ya tienes"}, y eso movió el resultado.` },
    ],
  };
}

export async function askAyni(
  question: string,
  context: UserContext,
): Promise<AyniResponse> {
  const demoResponse = isDemoContext(context) ? findDemoResponse(question) : null;
  if (demoResponse) {
    return demoResponse;
  }

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    return buildHeuristicFallback(question, context);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.7,
      },
      systemInstruction: buildSystemPrompt(context),
    });

    const result = await model.generateContent(`Consulta del usuario: "${question}"`);
    const text = result.response.text();
    const parsed = JSON.parse(extractJson(text)) as AyniResponse;
    return sanitizeResponse(parsed);
  } catch {
    return buildHeuristicFallback(question, context);
  }
}
