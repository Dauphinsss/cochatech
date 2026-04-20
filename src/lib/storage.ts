import type { ConsultRecord, LastResultState, UserContext } from "@/lib/types";

const CONTEXT_KEY = "ayni_context";
const RECORDS_KEY = "ayni_records";
const PENDING_QUESTION_KEY = "ayni_pending_question";
const LAST_RESULT_KEY = "ayni_last_result";

function canUseStorage() {
  return typeof window !== "undefined";
}

export function getStoredContext(): UserContext | null {
  if (!canUseStorage()) return null;
  const raw = window.localStorage.getItem(CONTEXT_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as UserContext;
  } catch {
    return null;
  }
}

export function saveStoredContext(context: UserContext) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(CONTEXT_KEY, JSON.stringify(context));
}

export function getStoredRecords(): ConsultRecord[] {
  if (!canUseStorage()) return [];
  const raw = window.localStorage.getItem(RECORDS_KEY);
  if (!raw) return [];

  try {
    return JSON.parse(raw) as ConsultRecord[];
  } catch {
    return [];
  }
}

export function saveConsultRecord(record: ConsultRecord) {
  if (!canUseStorage()) return;
  const next = [record, ...getStoredRecords()].slice(0, 5);
  window.localStorage.setItem(RECORDS_KEY, JSON.stringify(next));
}

export function removeConsultRecord(id: string) {
  if (!canUseStorage()) return;
  const next = getStoredRecords().filter((record) => record.id !== id);
  window.localStorage.setItem(RECORDS_KEY, JSON.stringify(next));
}

export function setPendingQuestion(question: string) {
  if (!canUseStorage()) return;
  window.sessionStorage.setItem(PENDING_QUESTION_KEY, question);
}

export function getPendingQuestion() {
  if (!canUseStorage()) return null;
  return window.sessionStorage.getItem(PENDING_QUESTION_KEY);
}

export function clearPendingQuestion() {
  if (!canUseStorage()) return;
  window.sessionStorage.removeItem(PENDING_QUESTION_KEY);
}

export function setLastResult(state: LastResultState) {
  if (!canUseStorage()) return;
  window.sessionStorage.setItem(LAST_RESULT_KEY, JSON.stringify(state));
}

export function getLastResult(): LastResultState | null {
  if (!canUseStorage()) return null;
  const raw = window.sessionStorage.getItem(LAST_RESULT_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as LastResultState;
  } catch {
    return null;
  }
}
