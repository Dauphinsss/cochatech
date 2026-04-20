import type { AyniResponse, UserContext } from "@/lib/types";

export const DEMO_CONTEXT: UserContext = {
  monthly_income_bs: 4500,
  fixed_expenses_bs: 2800,
  active_debts: [{ name: "universidad", monthly_payment_bs: 600 }],
  goals: ["ahorrar", "estudiar"],
  currency_pref: "BS",
};

export const GOAL_OPTIONS = [
  "ahorrar",
  "estudiar",
  "emprender",
  "vivienda",
  "viaje",
  "familia",
  "salir de deudas",
  "invertir",
];

export const HOME_SUGGESTIONS = [
  "¿compro el celular a crédito de Bs 3500?",
  "¿me sumo al pasanaku de Bs 300 al mes?",
  "¿acepto el préstamo de Bs 8000 de la cooperativa para emprender?",
  "¿me animo al viaje con los panas?",
];

export const ROTATING_PLACEHOLDERS = [
  "¿compro el celular a crédito?",
  "¿me sumo al pasanaku de la oficina?",
  "¿acepto el préstamo de la cooperativa?",
  "¿cambio el ofertón del mercadito?",
  "¿me animo al viaje con los panas?",
];

export const ANALYZING_STEPS = [
  "analizando tu contexto…",
  "evaluando la decisión…",
  "cruzando con tus hábitos…",
];

export const DEMO_RESPONSES: Array<{
  match: RegExp;
  response: AyniResponse;
}> = [
  {
    match: /celular.*3500|3500.*celular/i,
    response: {
      verdict: "ESPERA",
      restated_question: "¿Comprar el celular a crédito?",
      reasoning:
        "Con Bs 4500 al mes, Bs 2800 en gastos fijos y Bs 600 ya comprometidos, te quedan Bs 1100. Meter otra cuota por un celular te aprieta y te aleja de ahorrar y estudiar.",
      satisfaction_score: 4,
      solvency_impact: 8,
      alternative:
        "Ahorra 3 meses con Bs 900 por mes y cómpralo sin crédito. Te quedas con margen y no sumas otra cuota a tus Bs 600 actuales.",
      factors: [
        {
          layer: "contexto",
          note: "Después de gastos y deuda, solo te quedan Bs 1100 libres al mes.",
        },
        {
          layer: "decision",
          note: "Un celular a crédito te da uso rápido, pero te deja meses pagando algo que se devalúa.",
        },
        {
          layer: "personal",
          note: "Ahora tus metas son ahorrar y estudiar, así que esta compra te saca foco.",
        },
      ],
    },
  },
  {
    match: /pasanaku.*300|300.*pasanaku/i,
    response: {
      verdict: "ADELANTE",
      restated_question: "¿Entrar al pasanaku de Bs 300 al mes?",
      reasoning:
        "Con Bs 1100 libres al mes, apartar Bs 300 todavía te deja Bs 800 para moverte. Si el grupo es serio, el pasanaku encaja mejor con tus metas que sumar otra deuda.",
      satisfaction_score: 8,
      solvency_impact: 3,
      alternative:
        "Entra solo si el grupo es confiable y fija ese mismo monto como ahorro base. Si ves desorden, guarda esos Bs 300 por tu cuenta.",
      factors: [
        {
          layer: "contexto",
          note: "Bs 300 cabe dentro de tu margen mensual sin comerse todo lo que te queda.",
        },
        {
          layer: "decision",
          note: "El costo es manejable y puede ayudarte a ordenar un ahorro que sí usarías.",
        },
        {
          layer: "personal",
          note: "Tus metas de ahorrar y estudiar hacen que esta disciplina te sume más de lo que te aprieta.",
        },
      ],
    },
  },
  {
    match: /prestamo.*8000|8000.*prestamo|cooperativa.*8000/i,
    response: {
      verdict: "CUIDADO",
      restated_question: "¿Tomar el préstamo de Bs 8000 para emprender?",
      reasoning:
        "Tienes Bs 1100 libres al mes, así que una cuota nueva puede entrar, pero te deja con poco colchón si el emprendimiento tarda. Puede valer, solo si el plan arranca ingresos pronto.",
      satisfaction_score: 7,
      solvency_impact: 6,
      alternative:
        "Pide menos o arranca por etapas. Si logras probar el negocio con Bs 3000 a Bs 4000, reduces la presión mientras ves si realmente responde.",
      factors: [
        {
          layer: "contexto",
          note: "Tu margen existe, pero no es tan ancho como para absorber una cuota grande sin tensión.",
        },
        {
          layer: "decision",
          note: "La deuda tiene sentido si compra una oportunidad real de ingreso y no solo equipos por si acaso.",
        },
        {
          layer: "personal",
          note: "Emprender sí conversa con crecer, pero no debería comerse tu meta de construir ahorro.",
        },
      ],
    },
  },
];
