"use client";

import {
  startTransition,
  useEffect,
  useEffectEvent,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  HashRouter,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  ArrowLeftIcon,
  ChevronDownIcon,
  LandmarkIcon,
  MenuIcon,
  PiggyBankIcon,
  PlusIcon,
  ScaleIcon,
  ShieldCheckIcon,
  Trash2Icon,
  UserRoundIcon,
  WalletIcon,
} from "lucide-react";
import { Toaster, toast } from "sonner";

import { askAyni } from "@/lib/ayni";
import {
  ANALYZING_STEPS,
  DEMO_CONTEXT,
  GOAL_OPTIONS,
  HOME_SUGGESTIONS,
  ROTATING_PLACEHOLDERS,
} from "@/lib/demo";
import {
  clearPendingQuestion,
  getLastResult,
  getPendingQuestion,
  getStoredContext,
  getStoredRecords,
  removeConsultRecord,
  saveConsultRecord,
  saveStoredContext,
  setLastResult,
  setPendingQuestion,
} from "@/lib/storage";
import type {
  AyniResponse,
  ConsultRecord,
  LastResultState,
  Layer,
  UserContext,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const verdictStyles: Record<AyniResponse["verdict"], string> = {
  ESPERA: "bg-brand-terracotta text-white",
  ADELANTE: "bg-brand-forest text-white",
  CUIDADO: "bg-brand-gold text-surface-dark",
};

const layerIcons: Record<Layer, typeof WalletIcon> = {
  contexto: WalletIcon,
  decision: ScaleIcon,
  personal: UserRoundIcon,
};

function formatCurrency(value: number, currency: "BS" | "USD" = "BS") {
  if (!Number.isFinite(value)) return currency === "USD" ? "$0" : "Bs 0";
  const rounded = Math.round(value);
  const formatted = rounded.toLocaleString("es-BO");
  return currency === "USD" ? `$${formatted}` : `Bs ${formatted}`;
}

function parseAmount(raw: string) {
  const numeric = raw.replace(/[^\d.]/g, "");
  if (!numeric) return 0;
  return Number(numeric);
}

function getFreeCash(context: UserContext) {
  const debtTotal = context.active_debts.reduce(
    (sum, debt) => sum + debt.monthly_payment_bs,
    0,
  );
  return context.monthly_income_bs - context.fixed_expenses_bs - debtTotal;
}

function useRotatingIndex(length: number, intervalMs: number) {
  const [index, setIndex] = useState(0);
  const rotate = useEffectEvent(() => {
    setIndex((current) => (current + 1) % length);
  });

  useEffect(() => {
    const id = window.setInterval(() => rotate(), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs, rotate]);

  return index;
}

function AppFrame({ children }: { children: ReactNode }) {
  const location = useLocation();
  const darkStage = location.pathname === "/analyzing";

  return (
    <div
      className={cn(
        "min-h-screen px-4 py-4 sm:px-6 sm:py-6",
        darkStage
          ? "bg-surface-dark"
          : "bg-[radial-gradient(circle_at_top,rgba(244,216,161,0.55),transparent_36%),radial-gradient(circle_at_bottom,rgba(196,74,37,0.1),transparent_30%),#FBFAF7]",
      )}
    >
      <div
        className={cn(
          "mx-auto min-h-[calc(100vh-2rem)] max-w-[440px] overflow-hidden rounded-[28px] border shadow-[0_18px_50px_rgba(26,31,46,0.08)] sm:min-h-[820px]",
          darkStage
            ? "border-white/10 bg-surface-dark"
            : "border-surface-line bg-surface-off-white",
        )}
      >
        {children}
      </div>
    </div>
  );
}

function AyniRouter() {
  return (
    <AppFrame>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/analyzing" element={<AnalyzingPage />} />
        <Route path="/result" element={<ResultPage />} />
        <Route path="/context" element={<ContextPage />} />
      </Routes>
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: "#FBFAF7",
            color: "#1A1F2E",
            border: "1px solid #E7E2DA",
          },
        }}
      />
    </AppFrame>
  );
}

function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [income, setIncome] = useState("");
  const [expenses, setExpenses] = useState("");
  const [currency, setCurrency] = useState<"BS" | "USD">("BS");
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [customGoal, setCustomGoal] = useState("");

  useEffect(() => {
    if (getStoredContext()) {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  const incomeValue = parseAmount(income);
  const expensesValue = parseAmount(expenses);
  const freeCash = Math.max(incomeValue - expensesValue, 0);

  function toggleGoal(goal: string) {
    setSelectedGoals((current) =>
      current.includes(goal)
        ? current.filter((item) => item !== goal)
        : [...current, goal],
    );
  }

  function submitContext(context: UserContext) {
    saveStoredContext(context);
    toast.success("Tu contexto quedó guardado en este teléfono.");
    navigate("/", { replace: true });
  }

  function handleContinue() {
    if (step === 1) {
      if (incomeValue <= 0) {
        toast.error("Pon un ingreso mensual aproximado para seguir.");
        return;
      }
      setStep(2);
      return;
    }

    if (step === 2) {
      if (expensesValue <= 0) {
        toast.error("Pon tus gastos fijos para calcular lo que te queda.");
        return;
      }
      setStep(3);
      return;
    }

    const extraGoal = customGoal.trim();
    const goals = extraGoal
      ? [...selectedGoals, extraGoal].filter(
          (goal, index, all) => all.indexOf(goal) === index,
        )
      : selectedGoals;

    submitContext({
      monthly_income_bs: incomeValue,
      fixed_expenses_bs: expensesValue,
      active_debts: [],
      goals,
      currency_pref: currency,
    });
  }

  return (
    <div className="flex min-h-full flex-col justify-between p-6">
      <div className="space-y-6">
        <div className="space-y-2">
          <span className="font-sans text-xs font-semibold uppercase tracking-[0.15em] text-brand-terracotta">
            Paso {step} de 3
          </span>
          <h1 className="font-serif text-4xl font-bold leading-tight text-surface-ink">
            {step === 1 &&
              "Primero, ¿cuánto ganas al mes más o menos?"}
            {step === 2 && "¿Cuánto se te va sí o sí cada mes?"}
            {step === 3 && "¿Qué te importa ahora?"}
          </h1>
          <p className="text-base text-surface-muted">
            {step === 1 && "Solo vive en tu teléfono. No se sube a ningún lado."}
            {step === 2 && "Alquiler, servicios, internet, cuotas…"}
            {step === 3 &&
              "Marca lo que hoy pesa más para ti. Ayni lo usa para no responderte como banco."}
          </p>
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-surface-line bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <Input
                  value={income}
                  onChange={(event) => setIncome(event.target.value)}
                  inputMode="numeric"
                  placeholder="4500"
                  className="h-16 border-0 bg-transparent px-0 text-4xl font-serif font-bold text-surface-ink shadow-none focus-visible:ring-0"
                />
                <div className="flex rounded-full border border-surface-line bg-surface-off-white p-1">
                  <button
                    type="button"
                    onClick={() => setCurrency("BS")}
                    className={cn(
                      "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                      currency === "BS"
                        ? "bg-brand-terracotta text-white"
                        : "text-surface-muted",
                    )}
                  >
                    Bs
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrency("USD")}
                    className={cn(
                      "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                      currency === "USD"
                        ? "bg-brand-terracotta text-white"
                        : "text-surface-muted",
                    )}
                  >
                    USD
                  </button>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-dashed border-brand-gold/60 bg-brand-gold-soft/50 p-4 text-sm text-surface-slate">
              <div className="flex items-center gap-2">
                <ShieldCheckIcon className="size-4 text-brand-forest" />
                <span>Privacidad visible: tus datos se quedan acá, en tu navegador.</span>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-surface-line bg-white p-4 shadow-sm">
              <Input
                value={expenses}
                onChange={(event) => setExpenses(event.target.value)}
                inputMode="numeric"
                placeholder="2800"
                className="h-16 border-0 bg-transparent px-0 text-4xl font-serif font-bold text-surface-ink shadow-none focus-visible:ring-0"
              />
            </div>
            <div className="rounded-xl border border-surface-line bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand-gold">
                Lo que te queda libre
              </p>
              <p className="mt-2 font-serif text-3xl font-bold text-brand-forest">
                {formatCurrency(freeCash, currency)}
              </p>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              {GOAL_OPTIONS.map((goal) => (
                <button
                  key={goal}
                  type="button"
                  onClick={() => toggleGoal(goal)}
                  className={cn(
                    "rounded-full border px-4 py-3 text-sm font-medium transition-colors",
                    selectedGoals.includes(goal)
                      ? "border-brand-terracotta bg-brand-terracotta text-white"
                      : "border-surface-line bg-white text-surface-slate",
                  )}
                >
                  {goal}
                </button>
              ))}
            </div>
            <Textarea
              value={customGoal}
              onChange={(event) => setCustomGoal(event.target.value)}
              placeholder="algo más…"
              className="min-h-24 rounded-xl border-surface-line bg-white"
            />
          </div>
        )}
      </div>

      <div className="space-y-4 pt-6">
        <Button
          onClick={handleContinue}
          className="h-14 w-full rounded-xl bg-brand-terracotta text-base font-semibold text-white hover:bg-brand-terracotta-deep"
        >
          {step < 3 ? "Seguir →" : "Listo, pregúntame lo que quieras →"}
        </Button>
        {step > 1 && (
          <button
            type="button"
            onClick={() => setStep((current) => current - 1)}
            className="w-full text-sm text-surface-muted"
          >
            Volver un paso
          </button>
        )}
        <button
          type="button"
          onClick={() => submitContext(DEMO_CONTEXT)}
          className="w-full text-sm text-brand-terracotta underline underline-offset-4"
        >
          Saltar con datos de ejemplo
        </button>
      </div>
    </div>
  );
}

function HomePage() {
  const navigate = useNavigate();
  const [context, setContext] = useState<UserContext | null>(null);
  const [question, setQuestion] = useState("");
  const [records, setRecords] = useState<ConsultRecord[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const placeholderIndex = useRotatingIndex(ROTATING_PLACEHOLDERS.length, 3000);

  useEffect(() => {
    const stored = getStoredContext();
    if (!stored) {
      navigate("/onboarding", { replace: true });
      return;
    }

    setContext(stored);
    setRecords(getStoredRecords());
  }, [navigate]);

  function handleSubmit(event?: FormEvent) {
    event?.preventDefault();
    if (!question.trim()) {
      toast.error("Escribe la decisión que estás pensando.");
      return;
    }

    setPendingQuestion(question.trim());
    startTransition(() => navigate("/analyzing"));
  }

  function handleRemoveRecord(id: string) {
    removeConsultRecord(id);
    setRecords(getStoredRecords());
  }

  const freeCash = context ? getFreeCash(context) : 0;

  return (
    <div className="flex min-h-full flex-col p-6">
      <header className="flex items-center justify-between">
        <div>
          <span className="font-serif text-4xl font-bold text-brand-terracotta">
            Ayni.
          </span>
          <p className="mt-1 text-sm text-surface-muted">
            Segunda opinión financiera, al momento de decidir.
          </p>
        </div>
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              className="rounded-full border border-surface-line bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
            >
              <MenuIcon className="size-5 text-surface-ink" />
              <span className="sr-only">Abrir menú</span>
            </button>
          </SheetTrigger>
          <SheetContent
            side="right"
            className="w-[88%] border-surface-line bg-surface-off-white sm:max-w-sm"
          >
            <SheetHeader className="px-6 pt-6">
              <SheetTitle className="font-serif text-2xl text-surface-ink">
                Ayni.
              </SheetTitle>
              <SheetDescription>
                Tu contexto y tus últimas decisiones viven acá.
              </SheetDescription>
            </SheetHeader>
            <div className="flex flex-1 flex-col gap-6 px-6 pb-6">
              <Card className="border-surface-line bg-white">
                <CardHeader className="pb-3">
                  <CardTitle className="font-serif text-xl">Mi contexto</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-surface-slate">
                  <p>Ingreso: {context ? formatCurrency(context.monthly_income_bs) : "—"}</p>
                  <p>Gastos fijos: {context ? formatCurrency(context.fixed_expenses_bs) : "—"}</p>
                  <p>Te queda libre: {formatCurrency(freeCash)}</p>
                  <Button
                    onClick={() => {
                      setSheetOpen(false);
                      navigate("/context");
                    }}
                    className="mt-3 w-full rounded-xl bg-brand-terracotta text-white hover:bg-brand-terracotta-deep"
                  >
                    Ver o editar contexto
                  </Button>
                </CardContent>
              </Card>

              <div className="space-y-3">
                <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-brand-gold">
                  Consultas pasadas
                </h2>
                <div className="space-y-3">
                  {records.length === 0 && (
                    <Card className="border-dashed border-surface-line bg-white">
                      <CardContent className="p-4 text-sm text-surface-muted">
                        Todavía no guardaste decisiones.
                      </CardContent>
                    </Card>
                  )}
                  {records.map((record) => (
                    <Card key={record.id} className="border-surface-line bg-white">
                      <CardContent className="space-y-2 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-serif text-lg text-surface-ink">
                              {record.response.verdict}
                            </p>
                            <p className="text-sm text-surface-slate">{record.question}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveRecord(record.id)}
                            className="rounded-full p-2 text-surface-muted hover:bg-surface-line/40"
                          >
                            <Trash2Icon className="size-4" />
                          </button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </header>

      <main className="flex flex-1 flex-col justify-center py-8">
        <div className="space-y-6 text-center">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand-gold">
              Contexto activo
            </p>
            <h1 className="font-serif text-4xl font-bold leading-tight text-surface-ink">
              ¿Qué decisión estás pensando?
            </h1>
            {context && (
              <p className="mx-auto max-w-sm text-sm text-surface-muted">
                Hoy te quedan {formatCurrency(freeCash, context.currency_pref)} libres
                al mes después de gastos y deudas.
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative overflow-hidden rounded-full border border-surface-line bg-white px-5 shadow-sm transition-shadow hover:shadow-md">
              <Input
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                className="h-16 border-0 bg-transparent px-0 pr-12 text-base shadow-none focus-visible:ring-0"
              />
              {!question && (
                <div className="pointer-events-none absolute inset-y-0 left-5 right-16 flex items-center overflow-hidden text-left">
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={placeholderIndex}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.25 }}
                      className="text-surface-muted"
                    >
                      {ROTATING_PLACEHOLDERS[placeholderIndex]}
                    </motion.span>
                  </AnimatePresence>
                </div>
              )}
              <button
                type="submit"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-brand-terracotta px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-terracotta-deep"
              >
                Ver
              </button>
            </div>
          </form>

          <div className="flex flex-wrap justify-center gap-3">
            {HOME_SUGGESTIONS.slice(0, 4).map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => setQuestion(suggestion)}
                className="rounded-full border border-surface-line bg-white px-4 py-3 text-sm text-surface-slate shadow-sm transition-colors hover:border-brand-terracotta hover:text-brand-terracotta"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </main>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl font-bold text-surface-ink">
            Últimas consultas
          </h2>
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="text-sm text-brand-terracotta"
          >
            Ver todas
          </button>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {records.length === 0 && (
            <Card className="min-w-[260px] border-dashed border-surface-line bg-white">
              <CardContent className="space-y-2 p-5">
                <p className="font-serif text-xl text-surface-ink">Todavía vacío</p>
                <p className="text-sm text-surface-muted">
                  Cuando guardes decisiones, aparecerán acá para compararlas.
                </p>
              </CardContent>
            </Card>
          )}
          {records.map((record) => (
            <Card
              key={record.id}
              className="min-w-[260px] border-surface-line bg-white shadow-sm"
            >
              <CardContent className="space-y-3 p-5">
                <div
                  className={cn(
                    "inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em]",
                    record.response.verdict === "ESPERA" &&
                      "bg-brand-terracotta text-white",
                    record.response.verdict === "ADELANTE" &&
                      "bg-brand-forest text-white",
                    record.response.verdict === "CUIDADO" &&
                      "bg-brand-gold-soft text-surface-ink",
                  )}
                >
                  {record.response.verdict}
                </div>
                <p className="font-serif text-xl text-surface-ink">{record.question}</p>
                <p className="text-sm text-surface-muted">
                  {record.response.reasoning}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

function AnalyzingPage() {
  const navigate = useNavigate();
  const stepIndex = useRotatingIndex(ANALYZING_STEPS.length, 600);

  useEffect(() => {
    const question = getPendingQuestion();
    const context = getStoredContext();

    if (!question || !context) {
      navigate(context ? "/" : "/onboarding", { replace: true });
      return;
    }

    let cancelled = false;

    async function run() {
      try {
        const [response] = await Promise.all([
          askAyni(question, context),
          new Promise((resolve) => window.setTimeout(resolve, 1800)),
        ]);

        if (cancelled) return;

        const nextState: LastResultState = { question, response };
        setLastResult(nextState);
        clearPendingQuestion();
        startTransition(() => {
          navigate("/result", { replace: true, state: nextState });
        });
      } catch {
        if (cancelled) return;
        toast.error("No pude terminar esa consulta. Prueba otra vez.");
        navigate("/", { replace: true });
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-surface-dark px-6 text-center text-white">
      <div className="space-y-10">
        <div className="flex items-center justify-center gap-3">
          {[0, 1, 2].map((dot, index) => (
            <motion.span
              key={dot}
              className="size-4 rounded-full bg-brand-terracotta"
              animate={{
                opacity: stepIndex === index ? 1 : 0.35,
                scale: stepIndex === index ? 1.2 : 0.9,
              }}
              transition={{ duration: 0.3 }}
            />
          ))}
        </div>
        <div className="space-y-3">
          <p className="font-serif text-4xl font-bold">Ayni.</p>
          <AnimatePresence mode="wait">
            <motion.p
              key={stepIndex}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="text-base text-surface-line"
            >
              {ANALYZING_STEPS[stepIndex]}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function AnimatedMetric({
  label,
  value,
  colorClass,
}: {
  label: string;
  value: number;
  colorClass: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-3"
    >
      <div className="flex items-end justify-between gap-3">
        <p className="text-sm text-surface-slate">{label}</p>
        <span className="font-serif text-3xl font-bold text-surface-ink">
          {value}
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-surface-line">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value * 10}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className={cn("h-full rounded-full", colorClass)}
        />
      </div>
    </motion.div>
  );
}

function ResultPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = (location.state as LastResultState | null) ?? getLastResult();
  const [saved, setSaved] = useState(false);
  const [openFactors, setOpenFactors] = useState(false);

  useEffect(() => {
    if (!routeState) {
      navigate("/", { replace: true });
    }
  }, [navigate, routeState]);

  if (!routeState) {
    return null;
  }

  const { question, response } = routeState;

  function handleSaveDecision() {
    if (saved) {
      toast.message("Esta decisión ya está guardada.");
      return;
    }

    saveConsultRecord({
      id: crypto.randomUUID(),
      question,
      response,
      timestamp: Date.now(),
    });
    setSaved(true);
    toast.success("La decisión quedó guardada.");
  }

  return (
    <div className="min-h-full overflow-y-auto p-6">
      <button
        type="button"
        onClick={() => navigate("/")}
        className="inline-flex items-center gap-2 text-sm text-brand-terracotta"
      >
        <ArrowLeftIcon className="size-4" />
        Nueva consulta
      </button>

      <div className="mt-6 space-y-6">
        <div className="space-y-3">
          <p className="font-serif text-3xl italic text-surface-ink">
            {response.restated_question || question}
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: "easeOut", delay: 0.2 }}
          className="text-center"
        >
          <div
            className={cn(
              "inline-flex rounded-full px-10 py-4 text-5xl font-serif font-bold",
              verdictStyles[response.verdict],
            )}
          >
            {response.verdict}
          </div>
          <p className="mt-3 text-sm text-surface-muted">{response.reasoning}</p>
        </motion.div>

        <Card className="border-surface-line bg-white">
          <CardContent className="space-y-3 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand-gold">
              El por qué
            </p>
            <p className="text-lg leading-relaxed text-surface-ink">
              {response.reasoning}
            </p>
          </CardContent>
        </Card>

        <Card className="border-surface-line bg-white">
          <CardContent className="space-y-5 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand-gold">
              Los números
            </p>
            <AnimatedMetric
              label="Satisfacción esperada"
              value={response.satisfaction_score}
              colorClass="bg-brand-forest"
            />
            <AnimatedMetric
              label="Impacto en solvencia"
              value={response.solvency_impact}
              colorClass="bg-brand-terracotta"
            />
          </CardContent>
        </Card>

        <Card className="border-brand-gold/40 bg-brand-gold-soft">
          <CardContent className="flex gap-4 p-6">
            <div className="w-1 rounded-full bg-brand-gold" />
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand-terracotta">
                La alternativa
              </p>
              <p className="text-lg text-surface-ink">{response.alternative}</p>
            </div>
          </CardContent>
        </Card>

        <Collapsible open={openFactors} onOpenChange={setOpenFactors}>
          <Card className="border-surface-line bg-white">
            <CardContent className="p-0">
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-6 py-5 text-left"
                >
                  <span className="text-base text-surface-ink">
                    Ver los 3 factores que pesaron
                  </span>
                  <ChevronDownIcon
                    className={cn(
                      "size-4 text-surface-muted transition-transform",
                      openFactors && "rotate-180",
                    )}
                  />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-4 border-t border-surface-line px-6 py-5">
                  {response.factors.map((factor) => {
                    const Icon = layerIcons[factor.layer];
                    return (
                      <div key={`${factor.layer}-${factor.note}`} className="flex gap-3">
                        <div className="rounded-full bg-surface-off-white p-2">
                          <Icon className="size-4 text-brand-terracotta" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold capitalize text-surface-ink">
                            {factor.layer}
                          </p>
                          <p className="text-sm text-surface-slate">{factor.note}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </CardContent>
          </Card>
        </Collapsible>

        <div className="flex flex-col gap-3 pb-6">
          <Button
            onClick={handleSaveDecision}
            variant="outline"
            className="h-12 rounded-xl border-surface-line bg-white"
          >
            {saved ? "Decisión guardada" : "Guardar decisión"}
          </Button>
          <Button
            onClick={() => navigate("/")}
            className="h-12 rounded-xl bg-brand-terracotta text-white hover:bg-brand-terracotta-deep"
          >
            Consultar otra
          </Button>
        </div>
      </div>
    </div>
  );
}

function ContextPage() {
  const navigate = useNavigate();
  const [context, setContext] = useState<UserContext | null>(null);
  const [customDebtName, setCustomDebtName] = useState("");
  const [customDebtPayment, setCustomDebtPayment] = useState("");

  useEffect(() => {
    const stored = getStoredContext();
    if (!stored) {
      navigate("/onboarding", { replace: true });
      return;
    }

    setContext(stored);
  }, [navigate]);

  if (!context) {
    return null;
  }

  function updateContext(next: UserContext) {
    setContext(next);
    saveStoredContext(next);
  }

  function handleGoalToggle(goal: string) {
    const currentGoals = context.goals.includes(goal)
      ? context.goals.filter((item) => item !== goal)
      : [...context.goals, goal];
    updateContext({ ...context, goals: currentGoals });
  }

  function addDebt() {
    const name = customDebtName.trim();
    const payment = parseAmount(customDebtPayment);

    if (!name || payment <= 0) {
      toast.error("Pon un nombre y una cuota mensual para agregar la deuda.");
      return;
    }

    updateContext({
      ...context,
      active_debts: [
        ...context.active_debts,
        { name, monthly_payment_bs: payment },
      ],
    });
    setCustomDebtName("");
    setCustomDebtPayment("");
  }

  function removeDebt(index: number) {
    updateContext({
      ...context,
      active_debts: context.active_debts.filter((_, item) => item !== index),
    });
  }

  const freeCash = getFreeCash(context);

  return (
    <div className="min-h-full overflow-y-auto p-6">
      <button
        type="button"
        onClick={() => navigate("/")}
        className="inline-flex items-center gap-2 text-sm text-brand-terracotta"
      >
        <ArrowLeftIcon className="size-4" />
        Volver
      </button>

      <div className="mt-6 space-y-6">
        <div className="rounded-2xl border border-brand-gold/40 bg-brand-gold-soft p-5">
          <div className="flex items-start gap-3">
            <ShieldCheckIcon className="mt-0.5 size-5 text-brand-forest" />
            <div className="space-y-1">
              <p className="font-semibold text-surface-ink">
                🔒 Todo esto vive solo en tu teléfono.
              </p>
              <p className="text-sm text-surface-slate">
                Ayni no lo sube a ningún lado. Lo guardamos en tu navegador para que no tengas que repetirlo.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="font-serif text-4xl font-bold text-surface-ink">
            Mi contexto
          </h1>
          <p className="text-sm text-surface-muted">
            Ajusta esto cuando tu realidad cambie. Eso mueve el veredicto.
          </p>
        </div>

        <Card className="border-surface-line bg-white">
          <CardContent className="space-y-4 p-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.15em] text-brand-gold">
                Ingreso mensual
              </label>
              <Input
                value={String(context.monthly_income_bs)}
                onChange={(event) =>
                  updateContext({
                    ...context,
                    monthly_income_bs: parseAmount(event.target.value),
                  })
                }
                inputMode="numeric"
                className="h-12 rounded-xl border-surface-line"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.15em] text-brand-gold">
                Gastos fijos
              </label>
              <Input
                value={String(context.fixed_expenses_bs)}
                onChange={(event) =>
                  updateContext({
                    ...context,
                    fixed_expenses_bs: parseAmount(event.target.value),
                  })
                }
                inputMode="numeric"
                className="h-12 rounded-xl border-surface-line"
              />
            </div>

            <div className="rounded-xl bg-surface-off-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand-gold">
                Te queda hoy
              </p>
              <p className="mt-2 font-serif text-3xl font-bold text-brand-forest">
                {formatCurrency(freeCash, context.currency_pref)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-surface-line bg-white">
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center gap-2">
              <LandmarkIcon className="size-4 text-brand-terracotta" />
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand-gold">
                Deudas activas
              </p>
            </div>

            <div className="space-y-3">
              {context.active_debts.length === 0 && (
                <p className="text-sm text-surface-muted">
                  No cargaste deudas todavía.
                </p>
              )}
              {context.active_debts.map((debt, index) => (
                <div
                  key={`${debt.name}-${index}`}
                  className="flex items-center justify-between rounded-xl border border-surface-line p-4"
                >
                  <div>
                    <p className="font-medium text-surface-ink">{debt.name}</p>
                    <p className="text-sm text-surface-muted">
                      {formatCurrency(debt.monthly_payment_bs)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeDebt(index)}
                    className="rounded-full p-2 text-surface-muted hover:bg-surface-line/40"
                  >
                    <Trash2Icon className="size-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <Input
                value={customDebtName}
                onChange={(event) => setCustomDebtName(event.target.value)}
                placeholder="nombre"
                className="h-12 rounded-xl border-surface-line"
              />
              <Input
                value={customDebtPayment}
                onChange={(event) => setCustomDebtPayment(event.target.value)}
                inputMode="numeric"
                placeholder="cuota"
                className="h-12 w-28 rounded-xl border-surface-line"
              />
              <Button
                onClick={addDebt}
                variant="outline"
                className="h-12 rounded-xl border-surface-line"
              >
                <PlusIcon className="size-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-surface-line bg-white">
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center gap-2">
              <PiggyBankIcon className="size-4 text-brand-terracotta" />
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand-gold">
                Metas
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {GOAL_OPTIONS.map((goal) => (
                <button
                  key={goal}
                  type="button"
                  onClick={() => handleGoalToggle(goal)}
                  className={cn(
                    "rounded-full border px-4 py-3 text-sm transition-colors",
                    context.goals.includes(goal)
                      ? "border-brand-terracotta bg-brand-terracotta text-white"
                      : "border-surface-line bg-surface-off-white text-surface-slate",
                  )}
                >
                  {goal}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Button
          onClick={() => {
            toast.success("Contexto actualizado.");
            navigate("/");
          }}
          className="h-12 w-full rounded-xl bg-brand-terracotta text-white hover:bg-brand-terracotta-deep"
        >
          Guardar y volver
        </Button>
      </div>
    </div>
  );
}

export function AyniApp() {
  return (
    <HashRouter>
      <AyniRouter />
    </HashRouter>
  );
}
