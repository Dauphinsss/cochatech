export type Verdict = "ESPERA" | "ADELANTE" | "CUIDADO";
export type Layer = "contexto" | "decision" | "personal";

export interface Debt {
  name: string;
  monthly_payment_bs: number;
}

export interface UserContext {
  monthly_income_bs: number;
  fixed_expenses_bs: number;
  active_debts: Debt[];
  goals: string[];
  currency_pref: "BS" | "USD";
}

export interface AyniResponse {
  verdict: Verdict;
  restated_question: string;
  reasoning: string;
  satisfaction_score: number;
  solvency_impact: number;
  alternative: string;
  factors: { layer: Layer; note: string }[];
}

export interface ConsultRecord {
  id: string;
  question: string;
  response: AyniResponse;
  timestamp: number;
}

export interface LastResultState {
  question: string;
  response: AyniResponse;
}
