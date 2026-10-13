"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  applyLocaleChange,
  DONE_STORAGE_KEY,
  GUIDE_GOAL_IDS,
  guideFor,
  LOCALES,
  LOCALE_LABELS,
  LOCALE_STORAGE_KEY,
  LOCK_STORAGE_KEY,
  parseDone,
  resolveLocale,
  serializeDone,
  toggleDone,
  type Locale,
} from "@/lib/guide/catalog";

const GUIDE_EVENT = "agenttower-guide";
const SERVER_LOCALE: Locale = "en";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(GUIDE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(GUIDE_EVENT, onChange);
  };
}

function emit() {
  window.dispatchEvent(new Event(GUIDE_EVENT));
}

function readLocale(): Locale {
  return resolveLocale(window.localStorage.getItem(LOCALE_STORAGE_KEY));
}

function readLocked(): boolean {
  return window.localStorage.getItem(LOCK_STORAGE_KEY) === "1";
}

function readDone(): string {
  return window.localStorage.getItem(DONE_STORAGE_KEY) ?? "";
}

function serverLocale(): Locale {
  return SERVER_LOCALE;
}

function serverLocked(): boolean {
  return false;
}

function serverDone(): string {
  return "";
}

type Placement = "page" | "menu";

export function ProductGuide({ placement = "page" }: { placement?: Placement }) {
  const locale = useSyncExternalStore(subscribe, readLocale, serverLocale);
  const locked = useSyncExternalStore(subscribe, readLocked, serverLocked);
  const doneRaw = useSyncExternalStore(subscribe, readDone, serverDone);
  const copy = guideFor(locale);
  const done = parseDone(doneRaw, GUIDE_GOAL_IDS);
  const selectId = `guide-locale-${placement}`;

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  function onLocale(requested: string) {
    const current = readLocale();
    const next = applyLocaleChange(current, requested, readLocked());
    if (next === current) return;
    window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
    emit();
  }

  function onLock() {
    const nextLocked = !readLocked();
    window.localStorage.setItem(LOCK_STORAGE_KEY, nextLocked ? "1" : "0");
    window.localStorage.setItem(LOCALE_STORAGE_KEY, readLocale());
    emit();
  }

  function onToggle(id: string) {
    const current = parseDone(readDone(), GUIDE_GOAL_IDS);
    window.localStorage.setItem(DONE_STORAGE_KEY, serializeDone(toggleDone(current, id)));
    emit();
  }

  const controls = (
    <div className="flex flex-wrap items-center gap-2">
      <label className="text-xs text-muted-foreground" htmlFor={selectId}>
        {copy.language}
      </label>
      <select
        id={selectId}
        value={locale}
        disabled={locked}
        onChange={(event) => onLocale(event.target.value)}
        className="h-8 rounded-md border border-border bg-card px-2 text-xs text-foreground"
      >
        {LOCALES.map((code) => (
          <option key={code} value={code}>
            {LOCALE_LABELS[code]}
          </option>
        ))}
      </select>
      <button
        type="button"
        aria-pressed={locked}
        onClick={onLock}
        className="h-8 rounded-md border border-border px-2 text-xs hover:bg-secondary"
      >
        {locked ? copy.unlock : copy.lock}
      </button>
      <span className="text-xs text-muted-foreground">{locked ? copy.lockedHint : `${done.length}/${copy.goals.length}`}</span>
    </div>
  );

  const list = (
    <ol className={placement === "page" ? "mt-6 grid gap-3 md:grid-cols-2" : "mt-3 space-y-2"}>
      {copy.goals.map((goal, index) => (
        <li key={goal.id} className={placement === "menu" ? "rounded-lg border border-border bg-card p-3" : "rounded-xl border border-border bg-card p-4"}>
          <label className="flex items-start gap-3 text-sm font-semibold">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={done.includes(goal.id)}
              onChange={() => onToggle(goal.id)}
            />
            <span>
              {index + 1}. {goal.title}
            </span>
          </label>
          <p className="mt-2 pl-7 text-sm text-muted-foreground">{goal.detail}</p>
        </li>
      ))}
    </ol>
  );

  if (placement === "menu") {
    return (
      <details className="relative">
        <summary className="cursor-pointer list-none rounded-md px-2 py-1 text-xs hover:bg-secondary">
          {copy.menuLabel}
        </summary>
        <div className="absolute right-0 z-20 mt-2 max-h-[70vh] w-80 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-lg">
          <p className="text-sm font-semibold">{copy.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{copy.summary}</p>
          <div className="mt-3">{controls}</div>
          {list}
        </div>
      </details>
    );
  }

  return (
    <section id="guide" className="mx-auto max-w-6xl px-6 py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium tracking-[0.2em] text-primary uppercase">{copy.goalsLabel}</p>
          <h2 className="mt-3 text-2xl font-semibold">{copy.title}</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{copy.summary}</p>
        </div>
        {controls}
      </div>
      {list}
    </section>
  );
}
