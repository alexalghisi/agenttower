export const LOCALES = ["en", "ro", "de", "fr", "es", "it"] as const;

export type Locale = (typeof LOCALES)[number];

export const LOCALE_STORAGE_KEY = "agenttower.locale";
export const LOCK_STORAGE_KEY = "agenttower.locale.locked";
export const DONE_STORAGE_KEY = "agenttower.guide.done";

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  ro: "Română",
  de: "Deutsch",
  fr: "Français",
  es: "Español",
  it: "Italiano",
};

export const GUIDE_GOAL_IDS = ["sign-in", "dashboard", "trace", "cost", "ingest"] as const;

export type GuideGoal = {
  id: (typeof GUIDE_GOAL_IDS)[number];
  title: string;
  detail: string;
};

export type GuideCopy = {
  language: string;
  lock: string;
  unlock: string;
  lockedHint: string;
  menuLabel: string;
  title: string;
  summary: string;
  goalsLabel: string;
  goals: GuideGoal[];
};

type GoalText = readonly [string, string];

type LocaleSource = Omit<GuideCopy, "goals"> & { goals: readonly GoalText[] };

const SOURCE: Record<Locale, LocaleSource> = {
  en: {
    language: "Language",
    lock: "Lock language",
    unlock: "Unlock language",
    lockedHint: "Language is locked",
    menuLabel: "Guide",
    title: "How to use AgentTower",
    summary: "Five goals. Do them in order, or skip around. The demo workspace already has traces.",
    goalsLabel: "Goals",
    goals: [
      ["Sign in", "Open Log in and use demo@agenttower.dev with password DemoPass123!."],
      ["Read the dashboard", "Choose 24h, 7d, or 30d. Check success rate, failures, and token burn."],
      ["Open one trace", "In Runs, open a row and read the step waterfall, the model, and the latency."],
      ["Check the cost", "Costs compares the budget with the estimated spend. Alerts are on Pro and Team."],
      ["Send your own run", "In Settings, API keys, copy the key shown once, then POST it to /api/v1/runs."],
    ],
  },
  ro: {
    language: "Limbă",
    lock: "Blochează limba",
    unlock: "Deblochează limba",
    lockedHint: "Limba este blocată",
    menuLabel: "Ghid",
    title: "Cum folosești AgentTower",
    summary: "Cinci obiective. Le poți parcurge în ordine sau sări între ele. Spațiul demo are deja urme.",
    goalsLabel: "Obiective",
    goals: [
      ["Intră în cont", "Deschide Log in și folosește demo@agenttower.dev cu parola DemoPass123!."],
      ["Citește panoul", "Alege 24h, 7d sau 30d. Uită-te la rata de succes, eșecuri și tokeni."],
      ["Deschide o urmă", "În Runs, deschide un rând și citește cascada de pași, modelul și latența."],
      ["Verifică costul", "Costs compară bugetul cu estimarea. Alertele sunt la planurile Pro și Team."],
      ["Trimite o rulare a ta", "În Settings, API keys, copiază cheia arătată o singură dată, apoi fă POST către /api/v1/runs."],
    ],
  },
  de: {
    language: "Sprache",
    lock: "Sprache festsetzen",
    unlock: "Sprache lösen",
    lockedHint: "Die Sprache ist festgesetzt",
    menuLabel: "Hilfe",
    title: "So nutzt du AgentTower",
    summary: "Fünf Ziele. Der Reihe nach oder querbeet. Der Demo-Arbeitsbereich enthält schon Läufe.",
    goalsLabel: "Ziele",
    goals: [
      ["Anmelden", "Öffne Log in und nutze demo@agenttower.dev mit dem Passwort DemoPass123!."],
      ["Die Übersicht lesen", "Wähle 24h, 7d oder 30d. Prüfe Erfolgsquote, Fehler und Token."],
      ["Einen Lauf öffnen", "Öffne unter Runs eine Zeile und lies die Schrittkaskade, das Modell und die Latenz."],
      ["Die Kosten prüfen", "Costs stellt das Budget der Schätzung gegenüber. Alerts gibt es in Pro und Team."],
      ["Einen eigenen Lauf senden", "Unter Settings, API keys, kopiere den einmal gezeigten Schlüssel und sende POST an /api/v1/runs."],
    ],
  },
  fr: {
    language: "Langue",
    lock: "Verrouiller la langue",
    unlock: "Déverrouiller la langue",
    lockedHint: "La langue est verrouillée",
    menuLabel: "Guide",
    title: "Comment utiliser AgentTower",
    summary: "Cinq objectifs, dans l'ordre ou non. L'espace de démo contient déjà des traces.",
    goalsLabel: "Objectifs",
    goals: [
      ["Se connecter", "Ouvre Log in et utilise demo@agenttower.dev avec le mot de passe DemoPass123!."],
      ["Lire le tableau de bord", "Choisis 24h, 7d ou 30d. Regarde le taux de succès, les échecs et les tokens."],
      ["Ouvrir une trace", "Dans Runs, ouvre une ligne et lis la cascade d'étapes, le modèle et la latence."],
      ["Vérifier le coût", "Costs compare le budget à l'estimation. Les alertes sont sur Pro et Team."],
      ["Envoyer votre exécution", "Dans Settings, API keys, copie la clé affichée une seule fois, puis envoie un POST vers /api/v1/runs."],
    ],
  },
  es: {
    language: "Idioma",
    lock: "Bloquear idioma",
    unlock: "Desbloquear idioma",
    lockedHint: "El idioma está bloqueado",
    menuLabel: "Guía",
    title: "Cómo usar AgentTower",
    summary: "Cinco metas, en orden o saltando. El espacio de demostración ya tiene trazas.",
    goalsLabel: "Metas",
    goals: [
      ["Entra", "Abre Log in y usa demo@agenttower.dev con la contraseña DemoPass123!."],
      ["Lee el panel", "Elige 24h, 7d o 30d. Mira la tasa de éxito, los fallos y los tokens."],
      ["Abre una traza", "En Runs, abre una fila y lee la cascada de pasos, el modelo y la latencia."],
      ["Revisa el coste", "Costs compara el presupuesto con la estimación. Las alertas están en Pro y Team."],
      ["Envía tu ejecución", "En Settings, API keys, copia la clave que se muestra una vez y haz POST a /api/v1/runs."],
    ],
  },
  it: {
    language: "Lingua",
    lock: "Blocca la lingua",
    unlock: "Sblocca la lingua",
    lockedHint: "La lingua è bloccata",
    menuLabel: "Guida",
    title: "Come si usa AgentTower",
    summary: "Cinque obiettivi, in ordine o saltando. Lo spazio demo ha già delle tracce.",
    goalsLabel: "Obiettivi",
    goals: [
      ["Entra", "Apri Log in e usa demo@agenttower.dev con la password DemoPass123!."],
      ["Leggi la panoramica", "Scegli 24h, 7d o 30d. Controlla il tasso di successo, gli errori e i token."],
      ["Apri una traccia", "In Runs, apri una riga e leggi la cascata dei passi, il modello e la latenza."],
      ["Controlla il costo", "Costs confronta il budget con la stima. Gli avvisi sono su Pro e Team."],
      ["Invia una tua esecuzione", "In Settings, API keys, copia la chiave mostrata una sola volta, poi fai POST su /api/v1/runs."],
    ],
  },
};

function toCopy(source: LocaleSource): GuideCopy {
  return {
    language: source.language,
    lock: source.lock,
    unlock: source.unlock,
    lockedHint: source.lockedHint,
    menuLabel: source.menuLabel,
    title: source.title,
    summary: source.summary,
    goalsLabel: source.goalsLabel,
    goals: GUIDE_GOAL_IDS.map((id, index) => ({
      id,
      title: source.goals[index][0],
      detail: source.goals[index][1],
    })),
  };
}

const COPY: Record<Locale, GuideCopy> = {
  en: toCopy(SOURCE.en),
  ro: toCopy(SOURCE.ro),
  de: toCopy(SOURCE.de),
  fr: toCopy(SOURCE.fr),
  es: toCopy(SOURCE.es),
  it: toCopy(SOURCE.it),
};

export function isLocale(value: string | null | undefined): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export function resolveLocale(value: string | null | undefined): Locale {
  return isLocale(value) ? value : "en";
}

export function applyLocaleChange(current: Locale, requested: string, locked: boolean): Locale {
  if (locked) return current;
  return resolveLocale(requested);
}

export function guideFor(locale: Locale): GuideCopy {
  return COPY[locale];
}

export function parseDone(raw: string | null, ids: readonly string[]): string[] {
  if (!raw) return [];
  const known = new Set(ids);
  const seen = new Set<string>();
  const parsed: string[] = [];
  for (const part of raw.split(",")) {
    const id = part.trim();
    if (!known.has(id) || seen.has(id)) continue;
    seen.add(id);
    parsed.push(id);
  }
  return parsed;
}

export function toggleDone(done: readonly string[], id: string): string[] {
  if (done.includes(id)) return done.filter((item) => item !== id);
  return [...done, id];
}

export function serializeDone(done: readonly string[]): string {
  return done.join(",");
}
