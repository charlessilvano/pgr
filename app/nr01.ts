export const NR01_MINIMUM_AGGREGATE_RESPONSES = 3;

export const nr01Answers = ["Nunca", "Raramente", "Às vezes", "Frequentemente", "Sempre"] as const;

export type Nr01Answer = (typeof nr01Answers)[number];
export type Nr01Classification = "Tolerável" | "Moderado" | "Alto";
export type Nr01Probability = "Remoto" | "Provável" | "Muito provável";
export type Nr01DomainId = "organizacao" | "relacoes" | "carga-mental" | "seguranca";
export type Nr01QuestionId =
  | "pausas"
  | "ritmo"
  | "jornada"
  | "conflitos"
  | "isolamento"
  | "clareza"
  | "interrupcoes"
  | "sobrecarga"
  | "atencao"
  | "inseguranca"
  | "desconforto";

type QuestionPolarity = "positive" | "negative";

export interface Nr01QuestionDefinition {
  id: Nr01QuestionId;
  title: string;
  prompt: string;
  headerKey: string;
  domainId: Nr01DomainId;
  polarity: QuestionPolarity;
}

export interface Nr01Response {
  timestamp: string;
  location: string;
  activityGroup: string;
  shift: string;
  answers: Record<Nr01QuestionId, Nr01Answer>;
  hasComment: boolean;
}

export interface Nr01Dataset {
  sourceFileName: string;
  importedAt: string;
  totalRows: number;
  skippedRows: number;
  locations: string[];
  responses: Nr01Response[];
}

export interface Nr01CountItem {
  label: string;
  count: number;
  percentage: number;
}

export interface Nr01QuestionResult {
  id: Nr01QuestionId;
  title: string;
  prompt: string;
  domainId: Nr01DomainId;
  average: number;
  favorablePercent: number;
  neutralPercent: number;
  unfavorablePercent: number;
  validResponses: number;
}

export interface Nr01DomainResult {
  id: Nr01DomainId;
  label: string;
  description: string;
  riskFactor: string;
  average: number;
  probability: Nr01Probability;
  severity: "Moderada";
  classification: Nr01Classification;
  actions: string[];
  reassessment: string;
}

export interface Nr01Report {
  sourceFileName: string;
  location: string;
  responseCount: number;
  expectedWorkers: number | null;
  participationPercent: number | null;
  startDate: string;
  endDate: string;
  commentCount: number;
  canPublishDetailedResults: boolean;
  activityGroups: Nr01CountItem[];
  shifts: Nr01CountItem[];
  questionResults: Nr01QuestionResult[];
  criticalQuestions: Nr01QuestionResult[];
  domainResults: Nr01DomainResult[];
  overallAverage: number;
  overallClassification: Nr01Classification;
}

export const nr01Questions: Nr01QuestionDefinition[] = [
  {
    id: "pausas",
    title: "Pausas e descanso",
    prompt: "O volume de trabalho permite pequenas pausas regulares durante o turno?",
    headerKey: "pausas e descanso",
    domainId: "organizacao",
    polarity: "positive",
  },
  {
    id: "ritmo",
    title: "Ritmo acelerado",
    prompt: "É necessário trabalhar em ritmo excessivamente rápido para concluir as tarefas?",
    headerKey: "ritmo acelerado",
    domainId: "organizacao",
    polarity: "negative",
  },
  {
    id: "jornada",
    title: "Interferência da jornada",
    prompt: "Horas extras frequentes ou dobras de escala prejudicam o descanso entre turnos?",
    headerKey: "interferencia da jornada",
    domainId: "organizacao",
    polarity: "negative",
  },
  {
    id: "conflitos",
    title: "Conflitos com o público",
    prompt: "Há contato frequente com pessoas impacientes, agressivas ou desrespeitosas?",
    headerKey: "conflitos com o publico",
    domainId: "relacoes",
    polarity: "negative",
  },
  {
    id: "isolamento",
    title: "Trabalho isolado",
    prompt: "As tarefas são realizadas sem apoio imediato em caso de problema grave ou emergência?",
    headerKey: "trabalho isolado",
    domainId: "relacoes",
    polarity: "negative",
  },
  {
    id: "clareza",
    title: "Clareza de papéis",
    prompt: "Há autonomia e orientações claras da supervisão para agir diante de problemas?",
    headerKey: "clareza de papeis",
    domainId: "relacoes",
    polarity: "positive",
  },
  {
    id: "interrupcoes",
    title: "Interrupções e urgências",
    prompt: "O trabalho é interrompido constantemente para atender demandas urgentes?",
    headerKey: "interrupcoes e urgencias",
    domainId: "carga-mental",
    polarity: "negative",
  },
  {
    id: "sobrecarga",
    title: "Sobrecarga de responsabilidade",
    prompt: "As responsabilidades superam os recursos, as ferramentas ou o tempo disponível?",
    headerKey: "sobrecarga de responsabilidade",
    domainId: "carga-mental",
    polarity: "negative",
  },
  {
    id: "atencao",
    title: "Nível de atenção exigido",
    prompt: "A exigência constante de atenção e alerta gera cansaço mental excessivo?",
    headerKey: "nivel de atencao exigido",
    domainId: "carga-mental",
    polarity: "negative",
  },
  {
    id: "inseguranca",
    title: "Sensação de insegurança",
    prompt: "Há receio de sofrer violência física ou verbal durante o trabalho?",
    headerKey: "sensacao de inseguranca",
    domainId: "seguranca",
    polarity: "negative",
  },
  {
    id: "desconforto",
    title: "Desconforto ambiental",
    prompt: "O posto de trabalho apresenta desconforto constante que agrava o estresse?",
    headerKey: "desconforto ambiental",
    domainId: "seguranca",
    polarity: "negative",
  },
];

const domainDefinitions: Array<{
  id: Nr01DomainId;
  label: string;
  description: string;
  riskFactor: string;
  actions: string[];
}> = [
  {
    id: "organizacao",
    label: "Organização e ritmo",
    description: "Pausas, ritmo de execução, extensão da jornada e recuperação entre turnos.",
    riskFactor: "Sobrecarga, ritmo intenso e interferência da jornada",
    actions: [
      "Revisar a distribuição de tarefas, prioridades e dimensionamento da equipe.",
      "Assegurar pausas regulares e acompanhar horas extras e dobras de escala.",
      "Definir indicadores de volume, ritmo e recuperação entre jornadas.",
    ],
  },
  {
    id: "relacoes",
    label: "Relações e apoio",
    description: "Conflitos com o público, trabalho isolado, apoio imediato e clareza para agir.",
    riskFactor: "Conflitos, isolamento e insuficiência de orientação ou apoio",
    actions: [
      "Definir protocolos para conflitos com moradores, visitantes e prestadores.",
      "Garantir meios de comunicação e apoio imediato em emergências ou trabalho isolado.",
      "Clarificar responsabilidades, autonomia e fluxo de escalonamento à supervisão.",
    ],
  },
  {
    id: "carga-mental",
    label: "Carga mental e cobrança",
    description: "Interrupções, urgências, responsabilidade, recursos disponíveis e atenção contínua.",
    riskFactor: "Sobrecarga cognitiva, interrupções e responsabilidade excessiva",
    actions: [
      "Mapear interrupções recorrentes e definir critérios objetivos de prioridade.",
      "Compatibilizar responsabilidades com tempo, ferramentas e suporte disponíveis.",
      "Organizar pausas de recuperação e rotinas de acompanhamento da carga mental.",
    ],
  },
  {
    id: "seguranca",
    label: "Segurança e ambiente",
    description: "Percepção de violência e desconfortos de mobiliário, iluminação, ruído e ventilação.",
    riskFactor: "Insegurança, violência e desconforto ambiental",
    actions: [
      "Revisar protocolos de prevenção e resposta a violência física ou verbal.",
      "Registrar ocorrências e divulgar canal seguro de comunicação e denúncia.",
      "Realizar AEP e corrigir mobiliário, iluminação, ruído, ventilação e demais desconfortos.",
    ],
  },
];

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[“”"'`´]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLocaleLowerCase("pt-BR");
}

function locationNameOnly(value: string) {
  return value
    .replace(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g, "")
    .replace(/[–—-]+\s*$/g, "")
    .trim();
}

function detectDelimiter(text: string) {
  const candidates = [",", ";", "\t"];
  let inQuotes = false;
  const counts = Object.fromEntries(candidates.map((candidate) => [candidate, 0])) as Record<string, number>;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (inQuotes && text[index + 1] === '"') index += 1;
      else inQuotes = !inQuotes;
      continue;
    }
    if (!inQuotes && (character === "\n" || character === "\r")) break;
    if (!inQuotes && candidates.includes(character)) counts[character] += 1;
  }
  return candidates.sort((left, right) => counts[right] - counts[left])[0];
}

function parseCsv(text: string) {
  const normalizedText = text.replace(/^\uFEFF/, "");
  const delimiter = detectDelimiter(normalizedText);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < normalizedText.length; index += 1) {
    const character = normalizedText[index];
    if (character === '"') {
      if (inQuotes && normalizedText[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (!inQuotes && character === delimiter) {
      row.push(cell.trim());
      cell = "";
      continue;
    }
    if (!inQuotes && (character === "\n" || character === "\r")) {
      if (character === "\r" && normalizedText[index + 1] === "\n") index += 1;
      row.push(cell.trim());
      if (row.some((value) => value.length)) rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    cell += character;
  }
  row.push(cell.trim());
  if (row.some((value) => value.length)) rows.push(row);
  if (inQuotes) throw new Error("O CSV contém um campo de texto sem fechamento de aspas.");
  return rows;
}

function findHeader(headers: string[], keys: string[]) {
  return headers.findIndex((header) => {
    const normalizedHeader = normalize(header);
    return keys.some((key) => normalizedHeader.includes(key));
  });
}

function canonicalAnswer(value: string): Nr01Answer | null {
  const normalizedValue = normalize(value);
  const index = nr01Answers.findIndex((answer) => normalize(answer) === normalizedValue);
  return index >= 0 ? nr01Answers[index] : null;
}

export function parseNr01Csv(text: string, sourceFileName: string): Nr01Dataset {
  const rows = parseCsv(text);
  if (rows.length < 2) throw new Error("O CSV não contém respostas para analisar.");

  const headers = rows[0];
  const timestampIndex = findHeader(headers, ["carimbo de data hora", "data hora", "timestamp"]);
  const locationIndex = findHeader(headers, ["selecione o local de trabalho", "local de trabalho"]);
  const activityIndex = findHeader(headers, ["grupo de atividades", "grupo de atividade"]);
  const shiftIndex = findHeader(headers, ["turno principal", "turno de trabalho"]);
  const commentIndex = findHeader(headers, ["situacao especifica", "nao foi perguntada acima"]);
  const questionIndexes = Object.fromEntries(
    nr01Questions.map((question) => [question.id, findHeader(headers, [question.headerKey])]),
  ) as Record<Nr01QuestionId, number>;

  const missing: string[] = [];
  if (locationIndex < 0) missing.push("local de trabalho");
  if (activityIndex < 0) missing.push("grupo de atividades");
  if (shiftIndex < 0) missing.push("turno principal");
  for (const question of nr01Questions) {
    if (questionIndexes[question.id] < 0) missing.push(question.title);
  }
  if (missing.length) {
    throw new Error(`Colunas não reconhecidas no CSV: ${missing.join(", ")}. Use a exportação original do Google Forms.`);
  }

  const responses: Nr01Response[] = [];
  let skippedRows = 0;
  for (const row of rows.slice(1)) {
    const location = row[locationIndex]?.trim() ?? "";
    const activityGroup = row[activityIndex]?.trim() ?? "";
    const shift = row[shiftIndex]?.trim() ?? "";
    const answers = {} as Record<Nr01QuestionId, Nr01Answer>;
    let valid = Boolean(location && activityGroup && shift);
    for (const question of nr01Questions) {
      const answer = canonicalAnswer(row[questionIndexes[question.id]] ?? "");
      if (!answer) valid = false;
      else answers[question.id] = answer;
    }
    if (!valid) {
      skippedRows += 1;
      continue;
    }
    responses.push({
      timestamp: timestampIndex >= 0 ? row[timestampIndex]?.trim() ?? "" : "",
      location,
      activityGroup,
      shift,
      answers,
      hasComment: commentIndex >= 0 && Boolean(row[commentIndex]?.trim()),
    });
  }
  if (!responses.length) throw new Error("Nenhuma linha completa e válida foi encontrada no CSV.");

  return {
    sourceFileName,
    importedAt: new Date().toISOString(),
    totalRows: rows.length - 1,
    skippedRows,
    locations: [...new Set(responses.map((response) => response.location))].sort((a, b) => a.localeCompare(b, "pt-BR")),
    responses,
  };
}

export function matchNr01Location(dataset: Nr01Dataset | null, condoName: string, cnpj = "") {
  if (!dataset || !condoName.trim()) return "";
  const condoKey = normalize(locationNameOnly(condoName));
  const cnpjDigits = cnpj.replace(/\D/g, "");
  const byCnpj = cnpjDigits.length === 14
    ? dataset.locations.find((location) => location.replace(/\D/g, "").includes(cnpjDigits))
    : undefined;
  if (byCnpj) return byCnpj;

  const exact = dataset.locations.find((location) => normalize(locationNameOnly(location)) === condoKey);
  if (exact) return exact;
  return dataset.locations.find((location) => {
    const locationKey = normalize(locationNameOnly(location));
    return locationKey.length > 8 && (locationKey.includes(condoKey) || condoKey.includes(locationKey));
  }) ?? "";
}

function answerScore(answer: Nr01Answer, polarity: QuestionPolarity) {
  const index = nr01Answers.indexOf(answer);
  return polarity === "positive" ? index + 1 : nr01Answers.length - index;
}

function classifyAverage(average: number): {
  probability: Nr01Probability;
  classification: Nr01Classification;
} {
  if (average >= 3.2) return { probability: "Remoto", classification: "Tolerável" };
  if (average >= 2.4) return { probability: "Provável", classification: "Moderado" };
  return { probability: "Muito provável", classification: "Alto" };
}

function round(value: number, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function countItems(values: string[]): Nr01CountItem[] {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count, percentage: round((count / values.length) * 100, 1) }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, "pt-BR"));
}

function dateKey(timestamp: string) {
  const yearFirst = timestamp.match(/\b(\d{4})[/-](\d{1,2})[/-](\d{1,2})\b/);
  if (yearFirst) return `${yearFirst[1]}-${yearFirst[2].padStart(2, "0")}-${yearFirst[3].padStart(2, "0")}`;
  const dayFirst = timestamp.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b/);
  if (dayFirst) return `${dayFirst[3]}-${dayFirst[2].padStart(2, "0")}-${dayFirst[1].padStart(2, "0")}`;
  const parsed = new Date(timestamp);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}

function displayDate(value: string) {
  if (!value) return "Não informada";
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

export function buildNr01Report(
  dataset: Nr01Dataset | null,
  location: string,
  expectedWorkers: number | null,
): Nr01Report | null {
  if (!dataset || !location) return null;
  const responses = dataset.responses.filter((response) => response.location === location);
  if (!responses.length) return null;

  const questionResults = nr01Questions.map((question): Nr01QuestionResult => {
    const answerValues = responses.map((response) => response.answers[question.id]);
    const scores = answerValues.map((answer) => answerScore(answer, question.polarity));
    let favorable = 0;
    let neutral = 0;
    let unfavorable = 0;
    for (const answer of answerValues) {
      const answerIndex = nr01Answers.indexOf(answer);
      if (answerIndex === 2) neutral += 1;
      else if ((question.polarity === "positive" && answerIndex >= 3) || (question.polarity === "negative" && answerIndex <= 1)) favorable += 1;
      else unfavorable += 1;
    }
    return {
      id: question.id,
      title: question.title,
      prompt: question.prompt,
      domainId: question.domainId,
      average: round(scores.reduce((sum, value) => sum + value, 0) / scores.length),
      favorablePercent: round((favorable / answerValues.length) * 100, 1),
      neutralPercent: round((neutral / answerValues.length) * 100, 1),
      unfavorablePercent: round((unfavorable / answerValues.length) * 100, 1),
      validResponses: answerValues.length,
    };
  });

  const domainResults = domainDefinitions.map((domain): Nr01DomainResult => {
    const results = questionResults.filter((question) => question.domainId === domain.id);
    const average = round(results.reduce((sum, question) => sum + question.average, 0) / results.length);
    const classification = classifyAverage(average);
    const actions = classification.classification === "Tolerável"
      ? ["Manter os controles existentes, comunicar canais de apoio e acompanhar os indicadores do domínio."]
      : domain.actions;
    return {
      id: domain.id,
      label: domain.label,
      description: domain.description,
      riskFactor: domain.riskFactor,
      average,
      probability: classification.probability,
      severity: "Moderada",
      classification: classification.classification,
      actions,
      reassessment: classification.classification === "Alto" ? "6 meses" : classification.classification === "Moderado" ? "12 meses" : "24 meses",
    };
  });

  const overallAverage = round(questionResults.reduce((sum, question) => sum + question.average, 0) / questionResults.length);
  const dateKeys = responses.map((response) => dateKey(response.timestamp)).filter(Boolean).sort();
  return {
    sourceFileName: dataset.sourceFileName,
    location,
    responseCount: responses.length,
    expectedWorkers,
    participationPercent: expectedWorkers && expectedWorkers > 0 ? round((responses.length / expectedWorkers) * 100, 1) : null,
    startDate: displayDate(dateKeys[0] ?? ""),
    endDate: displayDate(dateKeys.at(-1) ?? ""),
    commentCount: responses.filter((response) => response.hasComment).length,
    canPublishDetailedResults: responses.length >= NR01_MINIMUM_AGGREGATE_RESPONSES,
    activityGroups: countItems(responses.map((response) => response.activityGroup)),
    shifts: countItems(responses.map((response) => response.shift)),
    questionResults,
    criticalQuestions: [...questionResults]
      .sort((left, right) => left.average - right.average || right.unfavorablePercent - left.unfavorablePercent)
      .slice(0, 5),
    domainResults,
    overallAverage,
    overallClassification: classifyAverage(overallAverage).classification,
  };
}
