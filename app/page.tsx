"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Building2,
  Check,
  ChevronDown,
  CircleDot,
  ClipboardCheck,
  Download,
  FileCheck2,
  FileSearch,
  FileSpreadsheet,
  FileText,
  HardHat,
  HeartPulse,
  ListChecks,
  Minus,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
  Sparkles,
  Users,
  Wifi,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Toaster } from "@/components/ui/sonner";

import {
  actionCatalog,
  classifyRisk,
  condoCatalog,
  environmentAreas,
  getRisk,
  getRole,
  getSuggestedScenarios,
  gheCatalog,
  roleCatalog,
  scenarioCatalog,
  type Probability,
  type ScenarioId,
  type Severity,
} from "./pgr-data";
import { getIncludedActions, getSelectedRoles } from "./pgr-selectors";
import {
  buildNr01Report,
  matchNr01Location,
  parseNr01Csv,
  type Nr01Dataset,
} from "./nr01";
import {
  createDefaultLtcat,
  createDefaultPcmso,
  getLtcatExposureRows,
  getLtcatFunctionRows,
  getLtcatReadiness,
  getPcmsoProtocolRows,
  getPcmsoReadiness,
  mergeLtcatConfig,
  mergePcmsoConfig,
} from "./occupational";
import type {
  LtcatConfig,
  LtcatFunctionAssessment,
  LtcatRiskAssessment,
  PcmsoConfig,
  PgrState,
} from "./pgr-types";

const STORAGE_PREFIX = "dinamizza-pgr-v1:";
const LAST_CONDO_KEY = "dinamizza-pgr-v1:last-condo";
const NR01_DATA_KEY = "dinamizza-pgr-v1:nr01-dataset";
const NR01_SETTINGS_KEY = "dinamizza-pgr-v1:nr01-settings";

type Nr01Settings = {
  locationByCondo: Record<string, string>;
  includeByCondo: Record<string, boolean>;
};

const emptyNr01Settings: Nr01Settings = { locationByCondo: {}, includeByCondo: {} };

const steps = [
  { id: 0, label: "Identificação", short: "Dados", icon: Building2 },
  { id: 1, label: "Quadro de funcionários", short: "Quadro", icon: Users },
  { id: 2, label: "Atividades e exposições", short: "Atividades", icon: ListChecks },
  { id: 3, label: "Inventário de riscos", short: "Riscos", icon: ShieldCheck },
  { id: 4, label: "Relatório NR-01", short: "NR-01", icon: BarChart3 },
  { id: 5, label: "PCMSO", short: "Saúde", icon: HeartPulse },
  { id: 6, label: "LTCAT", short: "Previdenciário", icon: FileSearch },
  { id: 7, label: "Plano e exportação", short: "Exportar", icon: FileCheck2 },
] as const;

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type ModelContext = {
  registerTool: (
    tool: {
      name: string;
      title?: string;
      description: string;
      inputSchema: Record<string, unknown>;
      annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean };
      execute: (input: unknown) => unknown | Promise<unknown>;
    },
    options?: { signal?: AbortSignal },
  ) => void | Promise<void>;
};

function todayIso() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function suggestedAreasForRoles(roleIds: string[]) {
  const ghes = new Set(roleIds.map((id) => getRole(id)?.ghe));
  const areas = new Set<string>(["Halls e corredores", "Escadas e rampas"]);
  if (ghes.has("GHE 01")) areas.add("Áreas administrativas");
  if (ghes.has("GHE 02")) {
    areas.add("Sanitários");
    areas.add("Áreas externas");
  }
  if (ghes.has("GHE 03") || ghes.has("GHE 05")) areas.add("Portaria e acessos");
  if (ghes.has("GHE 04") || ghes.has("GHE 06")) {
    areas.add("Áreas técnicas");
    areas.add("Locais de manutenção");
  }
  if (ghes.has("GHE 06")) areas.add("Depósitos e almoxarifados");
  if (ghes.has("GHE 07")) areas.add("Garagens");
  return [...areas];
}

function createStateForCondo(condoId: string): PgrState {
  const condo = condoCatalog.find((item) => item.id === condoId) ?? condoCatalog[0];
  const issueDate = todayIso();
  const roles = Object.fromEntries(
    roleCatalog.map((role) => [
      role.id,
      {
        selected: condo.suggestedRoleIds.includes(role.id),
        quantity: condo.fixedCounts?.[role.id] ?? 0,
      },
    ]),
  );
  return {
    condoId: condo.id,
    condoName: condo.id === "personalizado" ? "" : condo.name,
    expectedTotal: condo.expectedTotal,
    cnpj: condo.cnpj ?? "",
    address: "",
    cityState: "",
    contractingCompany: "GRUPO DINAMIZZA",
    localResponsible: "",
    issueDate,
    reviewDate: "",
    technicalResponsible: "",
    professionalTitle: "",
    professionalRegistration: "",
    environmentDescription:
      "Condomínio ou edificação pronta e em funcionamento, com ambientes a confirmar em visita técnica quanto a ventilação, iluminação, circulação, pisos, acessos, sinalização, rotas de fuga, equipamentos de emergência e instalações elétricas.",
    selectedAreas: suggestedAreasForRoles(condo.suggestedRoleIds),
    notes: condo.note ?? "",
    roles,
    scenarios: getSuggestedScenarios(condo.suggestedRoleIds),
    riskOverrides: {},
    riskAssessments: {},
    actions: {},
    pcmso: createDefaultPcmso(issueDate),
    ltcat: createDefaultLtcat(issueDate),
  };
}

function loadState(condoId: string) {
  if (typeof window === "undefined") return createStateForCondo(condoId);
  try {
    const stored = window.localStorage.getItem(`${STORAGE_PREFIX}${condoId}`);
    if (!stored) return createStateForCondo(condoId);
    const parsed = JSON.parse(stored) as PgrState;
    const fresh = createStateForCondo(condoId);
    return {
      ...fresh,
      ...parsed,
      cnpj: parsed.cnpj || fresh.cnpj,
      roles: { ...fresh.roles, ...parsed.roles },
      scenarios: { ...fresh.scenarios, ...parsed.scenarios },
      riskOverrides: parsed.riskOverrides ?? {},
      riskAssessments: parsed.riskAssessments ?? {},
      actions: parsed.actions ?? {},
      pcmso: mergePcmsoConfig(parsed.pcmso, parsed.issueDate || fresh.issueDate),
      ltcat: mergeLtcatConfig(parsed.ltcat, parsed.issueDate || fresh.issueDate),
    };
  } catch {
    return createStateForCondo(condoId);
  }
}

function FieldLabel({ htmlFor, children, optional }: { htmlFor?: string; children: React.ReactNode; optional?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="field-label">
      <span>{children}</span>
      {optional && <span className="field-optional">opcional</span>}
    </label>
  );
}

function StatusPill({ tone, children }: { tone: "ok" | "warn" | "neutral" | "high"; children: React.ReactNode }) {
  return <span className={`status-pill status-${tone}`}>{children}</span>;
}

export default function Home() {
  const [step, setStep] = useState(0);
  const [state, setState] = useState<PgrState>(() => createStateForCondo(condoCatalog[0].id));
  const [roleSearch, setRoleSearch] = useState("");
  const [isOnline, setIsOnline] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingDocument, setGeneratingDocument] = useState<"pgr" | "pcmso" | "ltcat" | null>(null);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [nr01Dataset, setNr01Dataset] = useState<Nr01Dataset | null>(null);
  const [nr01Settings, setNr01Settings] = useState<Nr01Settings>(emptyNr01Settings);
  const stateRef = useRef(state);
  const nr01DatasetRef = useRef<Nr01Dataset | null>(null);
  const nr01SettingsRef = useRef<Nr01Settings>(emptyNr01Settings);
  const nr01FileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const lastCondo = window.localStorage.getItem(LAST_CONDO_KEY);
      setState(loadState(lastCondo && condoCatalog.some((condo) => condo.id === lastCondo) ? lastCondo : condoCatalog[0].id));
      try {
        const storedDataset = window.localStorage.getItem(NR01_DATA_KEY);
        const storedSettings = window.localStorage.getItem(NR01_SETTINGS_KEY);
        if (storedDataset) setNr01Dataset(JSON.parse(storedDataset) as Nr01Dataset);
        if (storedSettings) setNr01Settings({ ...emptyNr01Settings, ...(JSON.parse(storedSettings) as Nr01Settings) });
      } catch {
        window.localStorage.removeItem(NR01_DATA_KEY);
        window.localStorage.removeItem(NR01_SETTINGS_KEY);
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    stateRef.current = state;
    window.localStorage.setItem(`${STORAGE_PREFIX}${state.condoId}`, JSON.stringify(state));
    window.localStorage.setItem(LAST_CONDO_KEY, state.condoId);
  }, [state]);

  useEffect(() => {
    nr01DatasetRef.current = nr01Dataset;
    if (nr01Dataset) window.localStorage.setItem(NR01_DATA_KEY, JSON.stringify(nr01Dataset));
    else window.localStorage.removeItem(NR01_DATA_KEY);
  }, [nr01Dataset]);

  useEffect(() => {
    nr01SettingsRef.current = nr01Settings;
    window.localStorage.setItem(NR01_SETTINGS_KEY, JSON.stringify(nr01Settings));
  }, [nr01Settings]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setIsOnline(window.navigator.onLine));
    const online = () => setIsOnline(true);
    const offline = () => setIsOnline(false);
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => undefined);
    }
    const captureInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", captureInstall);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
      window.removeEventListener("beforeinstallprompt", captureInstall);
    };
  }, []);

  useEffect(() => {
    const context = (document as Document & { modelContext?: ModelContext }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const register = (tool: Parameters<ModelContext["registerTool"]>[0]) => {
      try {
        void Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(() => undefined);
      } catch {
        // WebMCP is optional and feature-detected.
      }
    };

    register({
      name: "get_pgr_summary",
      title: "Consultar resumo do PGR",
      description: "Retorna o condomínio atual, cargos, total de trabalhadores e conferência com a referência.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: () => {
        const current = stateRef.current;
        const roles = getSelectedRoles(current);
        const total = roles.reduce((sum, role) => sum + role.quantity, 0);
        return {
          condominium: current.condoName,
          workers: total,
          roles: roles.map((role) => ({ name: role.name, quantity: role.quantity, ghe: role.ghe })),
          expectedWorkers: current.expectedTotal,
          totalMatchesReference: current.expectedTotal === null || current.expectedTotal === total,
        };
      },
    });

    register({
      name: "select_condominium",
      title: "Selecionar condomínio",
      description: "Abre ou inicia a configuração de um condomínio cadastrado.",
      inputSchema: {
        type: "object",
        properties: { condoId: { type: "string", enum: condoCatalog.map((condo) => condo.id) } },
        required: ["condoId"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: (input) => {
        const condoId = (input as { condoId?: string }).condoId;
        const condo = condoCatalog.find((item) => item.id === condoId);
        if (!condo) throw new Error("Condomínio não encontrado.");
        const next = loadState(condo.id);
        stateRef.current = next;
        setState(next);
        setStep(0);
        return { condoId: condo.id, condominium: next.condoName || condo.name, status: "selected" };
      },
    });

    register({
      name: "configure_staffing",
      title: "Configurar quadro de funcionários",
      description: "Substitui o quadro atual por uma lista validada de cargos e quantidades.",
      inputSchema: {
        type: "object",
        properties: {
          roles: {
            type: "array",
            minItems: 1,
            items: {
              type: "object",
              properties: {
                roleId: { type: "string", enum: roleCatalog.map((role) => role.id) },
                quantity: { type: "integer", minimum: 0, maximum: 999 },
              },
              required: ["roleId", "quantity"],
              additionalProperties: false,
            },
          },
        },
        required: ["roles"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: (input) => {
        const items = (input as { roles?: Array<{ roleId?: string; quantity?: number }> }).roles;
        if (!Array.isArray(items) || !items.length) throw new Error("Informe ao menos um cargo.");
        const seen = new Set<string>();
        for (const item of items) {
          if (!item.roleId || !getRole(item.roleId) || !Number.isInteger(item.quantity) || (item.quantity ?? -1) < 0) throw new Error("Cargo ou quantidade inválida.");
          if (seen.has(item.roleId)) throw new Error("Cargo duplicado.");
          seen.add(item.roleId);
        }
        const current = stateRef.current;
        const roles = Object.fromEntries(
          roleCatalog.map((role) => {
            const item = items.find((entry) => entry.roleId === role.id);
            return [role.id, { selected: Boolean(item && (item.quantity ?? 0) > 0), quantity: item?.quantity ?? 0 }];
          }),
        );
        const selectedIds = items.filter((item) => (item.quantity ?? 0) > 0).map((item) => item.roleId as string);
        const next = { ...current, roles, scenarios: { ...current.scenarios, ...getSuggestedScenarios(selectedIds) } };
        stateRef.current = next;
        setState(next);
        setStep(1);
        return { workers: items.reduce((sum, item) => sum + (item.quantity ?? 0), 0), configuredRoles: selectedIds.length };
      },
    });

    register({
      name: "export_pgr_docx",
      title: "Gerar PGR em Word",
      description: "Gera e baixa o arquivo DOCX do condomínio atualmente configurado.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: async () => {
        const current = stateRef.current;
        if (!getSelectedRoles(current).length) throw new Error("O quadro de funcionários está vazio.");
        const dataset = nr01DatasetRef.current;
        const settings = nr01SettingsRef.current;
        const configuredLocation = settings.locationByCondo[current.condoId];
        const location = dataset?.locations.includes(configuredLocation)
          ? configuredLocation
          : matchNr01Location(dataset, current.condoName, current.cnpj);
        const workerCount = getSelectedRoles(current).reduce((sum, role) => sum + role.quantity, 0);
        const report = buildNr01Report(dataset, location, workerCount || current.expectedTotal);
        const includeNr01 = settings.includeByCondo[current.condoId] ?? true;
        const { downloadPgrDocx } = await import("./docx-generator");
        await downloadPgrDocx(current, includeNr01 ? report ?? undefined : undefined);
        return { status: "download_started", condominium: current.condoName, nr01Included: Boolean(includeNr01 && report) };
      },
    });

    register({
      name: "export_pcmso_docx",
      title: "Gerar PCMSO em Word",
      description: "Gera e baixa a minuta do PCMSO integrada aos riscos do PGR atualmente configurado.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: async () => {
        const current = stateRef.current;
        if (!getSelectedRoles(current).length) throw new Error("O quadro de funcionários está vazio.");
        const { downloadPcmsoDocx } = await import("./occupational-docx");
        await downloadPcmsoDocx(current);
        return {
          status: "download_started",
          condominium: current.condoName,
          medicalValidationPending: !current.pcmso.physicianName || !current.pcmso.physicianCrm,
        };
      },
    });

    register({
      name: "export_ltcat_docx",
      title: "Gerar LTCAT em Word",
      description: "Gera e baixa a minuta do LTCAT com as avaliações técnicas preenchidas no aplicativo.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: async () => {
        const current = stateRef.current;
        if (!getSelectedRoles(current).length) throw new Error("O quadro de funcionários está vazio.");
        const { downloadLtcatDocx } = await import("./occupational-docx");
        await downloadLtcatDocx(current);
        return {
          status: "download_started",
          condominium: current.condoName,
          technicalValidationRequired: true,
        };
      },
    });

    return () => lifecycle.abort();
  }, []);

  const currentCondo = condoCatalog.find((condo) => condo.id === state.condoId) ?? condoCatalog[0];
  const selectedRoles = useMemo(() => getSelectedRoles(state), [state]);
  const totalWorkers = selectedRoles.reduce((sum, role) => sum + role.quantity, 0);
  const selectedGheCount = new Set(selectedRoles.map((role) => role.ghe)).size;
  const selectedScenarioCount = scenarioCatalog.filter((scenario) => state.scenarios[scenario.id]).length;
  const includedActions = useMemo(() => getIncludedActions(state), [state]);
  const includedRiskCount = useMemo(
    () => selectedRoles.reduce(
      (total, role) => total + role.riskIds.filter((riskId) => {
        const risk = getRisk(riskId);
        if (!risk) return false;
        const override = state.riskOverrides[`${role.id}:${riskId}`];
        return typeof override === "boolean" ? override : !risk.condition || state.scenarios[risk.condition];
      }).length,
      0,
    ),
    [selectedRoles, state.riskOverrides, state.scenarios],
  );
  const automaticNr01Location = useMemo(
    () => matchNr01Location(nr01Dataset, state.condoName, state.cnpj),
    [nr01Dataset, state.condoName, state.cnpj],
  );
  const configuredNr01Location = nr01Settings.locationByCondo[state.condoId];
  const selectedNr01Location = nr01Dataset?.locations.includes(configuredNr01Location)
    ? configuredNr01Location
    : automaticNr01Location;
  const nr01Report = useMemo(
    () => buildNr01Report(nr01Dataset, selectedNr01Location, totalWorkers || state.expectedTotal),
    [nr01Dataset, selectedNr01Location, state.expectedTotal, totalWorkers],
  );
  const includeNr01 = nr01Settings.includeByCondo[state.condoId] ?? true;
  const pcmsoProtocolRows = useMemo(() => getPcmsoProtocolRows(state), [state]);
  const ltcatExposureRows = useMemo(() => getLtcatExposureRows(state), [state]);
  const ltcatFunctionRows = useMemo(() => getLtcatFunctionRows(state), [state]);
  const pcmsoReadiness = useMemo(() => getPcmsoReadiness(state), [state]);
  const ltcatReadiness = useMemo(() => getLtcatReadiness(state), [state]);
  const pendingLtcatRows = ltcatExposureRows.filter((row) =>
    row.assessment.method === "Pendente" || row.assessment.conclusion === "Pendente de avaliação técnica",
  );
  const pendingLtcatFunctions = ltcatFunctionRows.filter(
    (row) => row.assessment.conclusion === "Pendente de avaliação técnica",
  );
  const totalLtcatPending = pendingLtcatRows.length + pendingLtcatFunctions.length;

  const warnings = useMemo(() => {
    const items: string[] = [];
    if (!state.condoName.trim()) items.push("Informe o nome do condomínio.");
    if (!state.cnpj.trim()) items.push("CNPJ ainda não informado.");
    if (!state.address.trim() || !state.cityState.trim()) items.push("Complete o endereço do estabelecimento.");
    if (!selectedRoles.length) items.push("Inclua ao menos um cargo com quantidade.");
    if (state.expectedTotal !== null && totalWorkers !== state.expectedTotal) items.push(`O quadro soma ${totalWorkers}, mas a referência indica ${state.expectedTotal}.`);
    if (!state.technicalResponsible.trim()) items.push("Responsável técnico ainda não informado.");
    if (nr01Dataset && !selectedNr01Location) items.push("Selecione o local correspondente no CSV da NR-01.");
    if (includeNr01 && nr01Report && !nr01Report.canPublishDetailedResults) items.push("A NR-01 tem menos de 3 respostas; os resultados detalhados serão suprimidos por sigilo.");
    if (state.pcmso.included && (!state.pcmso.physicianName.trim() || !state.pcmso.physicianCrm.trim())) items.push("PCMSO: informe o médico responsável e o CRM.");
    if (state.pcmso.included && (!state.pcmso.cnae.trim() || !state.pcmso.riskGrade)) items.push("PCMSO: informe o CNAE e o grau de risco.");
    if (state.ltcat.included && (!state.ltcat.professionalName.trim() || !state.ltcat.professionalRegistration.trim())) items.push("LTCAT: informe o profissional habilitado e o registro.");
    if (state.ltcat.included && totalLtcatPending) items.push(`LTCAT: ${totalLtcatPending} avaliação(ões) ainda estão pendentes.`);
    return items;
  }, [includeNr01, nr01Dataset, nr01Report, selectedNr01Location, selectedRoles.length, state, totalLtcatPending, totalWorkers]);

  const completedChecks = [
    Boolean(state.condoName.trim()),
    Boolean(state.address.trim() && state.cityState.trim()),
    selectedRoles.length > 0,
    state.expectedTotal === null || totalWorkers === state.expectedTotal,
    state.selectedAreas.length > 0,
    selectedScenarioCount > 0,
    includedRiskCount > 0,
    Boolean(state.technicalResponsible.trim()),
    !state.pcmso.included || pcmsoReadiness === 100,
    !state.ltcat.included || Boolean(state.ltcat.professionalName.trim() && state.ltcat.professionalRegistration.trim()),
  ].filter(Boolean).length;
  const readiness = Math.round((completedChecks / 10) * 100);

  const filteredRoleGroups = useMemo(() => {
    const query = roleSearch.trim().toLocaleLowerCase("pt-BR");
    return gheCatalog.map((ghe) => ({
      ...ghe,
      roles: roleCatalog.filter((role) => role.ghe === ghe.id && (!query || role.name.toLocaleLowerCase("pt-BR").includes(query))),
    })).filter((ghe) => ghe.roles.length);
  }, [roleSearch]);

  const update = <K extends keyof PgrState>(key: K, value: PgrState[K]) => setState((current) => ({ ...current, [key]: value }));

  const updatePcmso = <K extends keyof PcmsoConfig>(key: K, value: PcmsoConfig[K]) => {
    setState((current) => ({ ...current, pcmso: { ...current.pcmso, [key]: value } }));
  };

  const updatePcmsoProtocol = (
    roleId: string,
    patch: Partial<{ periodicity: string; complementaryExams: string; clinicalFocus: string }>,
  ) => {
    setState((current) => {
      const derived = getPcmsoProtocolRows(current).find((row) => row.roleId === roleId);
      if (!derived) return current;
      const existing = current.pcmso.roleProtocols[roleId] ?? {
        periodicity: derived.periodicity,
        complementaryExams: derived.complementaryExams,
        clinicalFocus: derived.clinicalFocus,
      };
      return {
        ...current,
        pcmso: {
          ...current.pcmso,
          roleProtocols: {
            ...current.pcmso.roleProtocols,
            [roleId]: { ...existing, ...patch },
          },
        },
      };
    });
  };

  const updateLtcat = <K extends keyof LtcatConfig>(key: K, value: LtcatConfig[K]) => {
    setState((current) => ({ ...current, ltcat: { ...current.ltcat, [key]: value } }));
  };

  const updateLtcatAssessment = (key: string, patch: Partial<LtcatRiskAssessment>) => {
    setState((current) => {
      const derived = getLtcatExposureRows(current).find((row) => row.key === key);
      if (!derived) return current;
      return {
        ...current,
        ltcat: {
          ...current.ltcat,
          riskAssessments: {
            ...current.ltcat.riskAssessments,
            [key]: { ...derived.assessment, ...patch },
          },
        },
      };
    });
  };

  const updateLtcatFunctionAssessment = (roleId: string, patch: Partial<LtcatFunctionAssessment>) => {
    setState((current) => {
      const derived = getLtcatFunctionRows(current).find((row) => row.roleId === roleId);
      if (!derived) return current;
      return {
        ...current,
        ltcat: {
          ...current.ltcat,
          functionAssessments: {
            ...current.ltcat.functionAssessments,
            [roleId]: { ...derived.assessment, ...patch },
          },
        },
      };
    });
  };

  const selectCondo = (condoId: string) => {
    setState(loadState(condoId));
    setStep(0);
    setRoleSearch("");
    const condo = condoCatalog.find((item) => item.id === condoId);
    toast.info(condoId === "personalizado" ? "Nova configuração iniciada" : `Configuração aberta: ${condo?.name}`);
  };

  const updateRole = (roleId: string, patch: Partial<{ selected: boolean; quantity: number }>) => {
    setState((current) => {
      const currentRole = current.roles[roleId] ?? { selected: false, quantity: 0 };
      const nextRole = { ...currentRole, ...patch };
      if (patch.selected === true && nextRole.quantity === 0) nextRole.quantity = 1;
      if (patch.quantity !== undefined) {
        nextRole.quantity = Math.max(0, Math.min(999, Math.trunc(Number(patch.quantity) || 0)));
        nextRole.selected = nextRole.quantity > 0 || currentRole.selected;
      }
      return { ...current, roles: { ...current.roles, [roleId]: nextRole } };
    });
  };

  const toggleArea = (area: string, checked: boolean) => update("selectedAreas", checked ? [...new Set([...state.selectedAreas, area])] : state.selectedAreas.filter((item) => item !== area));
  const toggleScenario = (scenarioId: ScenarioId, checked: boolean) => setState((current) => ({ ...current, scenarios: { ...current.scenarios, [scenarioId]: checked } }));
  const toggleRisk = (roleId: string, riskId: string, checked: boolean) => setState((current) => ({ ...current, riskOverrides: { ...current.riskOverrides, [`${roleId}:${riskId}`]: checked } }));

  const updateRiskAssessment = (roleId: string, riskId: string, patch: Partial<{ severity: Severity; probability: Probability }>) => {
    const risk = getRisk(riskId);
    if (!risk) return;
    const key = `${roleId}:${riskId}`;
    setState((current) => ({
      ...current,
      riskAssessments: {
        ...current.riskAssessments,
        [key]: {
          severity: current.riskAssessments[key]?.severity ?? risk.severity,
          probability: current.riskAssessments[key]?.probability ?? risk.probability,
          ...patch,
        },
      },
    }));
  };

  const toggleAction = (actionId: string, included: boolean) => {
    const action = actionCatalog.find((item) => item.id === actionId);
    if (!action) return;
    setState((current) => ({
      ...current,
      actions: { ...current.actions, [actionId]: { included, deadline: current.actions[actionId]?.deadline ?? action.deadline, responsible: current.actions[actionId]?.responsible ?? action.responsible } },
    }));
  };

  const updateAction = (actionId: string, patch: Partial<{ deadline: string; responsible: string }>) => {
    const action = actionCatalog.find((item) => item.id === actionId);
    if (!action) return;
    const defaultIncluded = !action.condition || state.scenarios[action.condition];
    setState((current) => ({
      ...current,
      actions: {
        ...current.actions,
        [actionId]: {
          included: current.actions[actionId]?.included ?? defaultIncluded,
          deadline: current.actions[actionId]?.deadline ?? action.deadline,
          responsible: current.actions[actionId]?.responsible ?? action.responsible,
          ...patch,
        },
      },
    }));
  };

  const handleInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") toast.success("Aplicativo instalado");
    setInstallPrompt(null);
  };

  const handleNr01File = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.name.toLocaleLowerCase("pt-BR").endsWith(".csv")) {
      toast.error("Selecione um arquivo CSV exportado do Google Forms.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("O CSV excede o limite de 10 MB.");
      return;
    }
    try {
      const dataset = parseNr01Csv(await file.text(), file.name);
      const matchedLocation = matchNr01Location(dataset, state.condoName, state.cnpj);
      setNr01Dataset(dataset);
      setNr01Settings((current) => ({
        locationByCondo: matchedLocation
          ? { ...current.locationByCondo, [state.condoId]: matchedLocation }
          : current.locationByCondo,
        includeByCondo: { ...current.includeByCondo, [state.condoId]: true },
      }));
      toast.success(`${dataset.responses.length} respostas válidas importadas de ${dataset.locations.length} local(is).`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível ler o CSV da NR-01.");
    }
  };

  const selectNr01Location = (location: string) => {
    setNr01Settings((current) => ({
      ...current,
      locationByCondo: { ...current.locationByCondo, [state.condoId]: location },
    }));
  };

  const setNr01Included = (included: boolean) => {
    setNr01Settings((current) => ({
      ...current,
      includeByCondo: { ...current.includeByCondo, [state.condoId]: included },
    }));
  };

  const clearNr01Dataset = () => {
    setNr01Dataset(null);
    setNr01Settings(emptyNr01Settings);
    toast.info("Dados importados da NR-01 removidos deste dispositivo.");
  };

  const handleGenerate = async () => {
    if (!state.condoName.trim()) {
      setStep(0);
      toast.error("Informe o nome do condomínio antes de gerar o PGR.");
      return;
    }
    if (!selectedRoles.length) {
      setStep(1);
      toast.error("Inclua ao menos um cargo com quantidade superior a zero.");
      return;
    }
    setIsGenerating(true);
    setGeneratingDocument("pgr");
    try {
      const { downloadPgrDocx } = await import("./docx-generator");
      await downloadPgrDocx(state, includeNr01 ? nr01Report ?? undefined : undefined);
      toast.success(includeNr01 && nr01Report ? "PGR com relatório NR-01 gerado com sucesso" : "Arquivo Word gerado com sucesso");
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível gerar o Word. Tente novamente.");
    } finally {
      setIsGenerating(false);
      setGeneratingDocument(null);
    }
  };

  const handleGeneratePcmso = async () => {
    if (!state.condoName.trim()) {
      setStep(0);
      toast.error("Informe o nome do condomínio antes de gerar o PCMSO.");
      return;
    }
    if (!selectedRoles.length) {
      setStep(1);
      toast.error("Inclua ao menos um cargo antes de gerar o PCMSO.");
      return;
    }
    setIsGenerating(true);
    setGeneratingDocument("pcmso");
    try {
      const { downloadPcmsoDocx } = await import("./occupational-docx");
      await downloadPcmsoDocx(state);
      if (!state.pcmso.physicianName.trim() || !state.pcmso.physicianCrm.trim()) {
        toast.warning("Minuta do PCMSO gerada. Complete a identificação e obtenha a validação do médico responsável.");
      } else {
        toast.success("PCMSO gerado para revisão e assinatura médica");
      }
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível gerar o PCMSO. Tente novamente.");
    } finally {
      setIsGenerating(false);
      setGeneratingDocument(null);
    }
  };

  const handleGenerateLtcat = async () => {
    if (!state.condoName.trim()) {
      setStep(0);
      toast.error("Informe o nome do condomínio antes de gerar o LTCAT.");
      return;
    }
    if (!selectedRoles.length) {
      setStep(1);
      toast.error("Inclua ao menos um cargo antes de gerar o LTCAT.");
      return;
    }
    setIsGenerating(true);
    setGeneratingDocument("ltcat");
    try {
      const { downloadLtcatDocx } = await import("./occupational-docx");
      await downloadLtcatDocx(state);
      if (pendingLtcatRows.length || !state.ltcat.professionalName.trim() || !state.ltcat.professionalRegistration.trim()) {
        toast.warning("Minuta do LTCAT gerada com pendências técnicas claramente identificadas.");
      } else {
        toast.success("LTCAT gerado para conferência e assinatura técnica");
      }
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível gerar o LTCAT. Tente novamente.");
    } finally {
      setIsGenerating(false);
      setGeneratingDocument(null);
    }
  };

  const renderIdentification = () => (
    <div className="step-stack">
      <section className="section-card section-intro">
        <div>
          <span className="eyebrow">Etapa 1 de 8</span>
          <h1>Identificação do estabelecimento</h1>
          <p>Selecione o cadastro-base e complete os dados que aparecerão na capa e no escopo do PGR.</p>
        </div>
        <div className="source-chip"><FileText aria-hidden="true" /><span>Modelo-base carregado</span></div>
      </section>

      <section className="section-card featured-card">
        <div className="field-grid field-grid-2">
          <div className="field-span-2">
            <FieldLabel>Condomínio ou estabelecimento</FieldLabel>
            <Select value={state.condoId} onValueChange={selectCondo}>
              <SelectTrigger className="select-large"><SelectValue placeholder="Selecione o condomínio" /></SelectTrigger>
              <SelectContent position="popper" className="max-w-[min(92vw,620px)]">
                {condoCatalog.map((condo) => <SelectItem key={condo.id} value={condo.id}>{condo.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="field-span-2">
            <FieldLabel htmlFor="condo-name">Nome que aparecerá no documento</FieldLabel>
            <Input id="condo-name" value={state.condoName} onChange={(event) => update("condoName", event.target.value)} placeholder="Nome completo do estabelecimento" />
          </div>
          <div>
            <FieldLabel htmlFor="cnpj">CNPJ</FieldLabel>
            <Input id="cnpj" value={state.cnpj} onChange={(event) => update("cnpj", event.target.value)} placeholder="00.000.000/0000-00" inputMode="numeric" />
          </div>
          <div>
            <FieldLabel htmlFor="expected-total">Total de referência</FieldLabel>
            <Input id="expected-total" type="number" min={0} value={state.expectedTotal ?? ""} onChange={(event) => update("expectedTotal", event.target.value === "" ? null : Math.max(0, Number(event.target.value)))} placeholder="Não informado" />
          </div>
          <div className="field-span-2">
            <FieldLabel htmlFor="address">Endereço</FieldLabel>
            <Input id="address" value={state.address} onChange={(event) => update("address", event.target.value)} placeholder="Rua, número, bairro" />
          </div>
          <div>
            <FieldLabel htmlFor="city-state">Cidade e UF</FieldLabel>
            <Input id="city-state" value={state.cityState} onChange={(event) => update("cityState", event.target.value)} placeholder="Cidade – UF" />
          </div>
          <div>
            <FieldLabel htmlFor="local-responsible">Responsável local</FieldLabel>
            <Input id="local-responsible" value={state.localResponsible} onChange={(event) => update("localResponsible", event.target.value)} placeholder="Nome do síndico ou gestor" />
          </div>
          <div>
            <FieldLabel htmlFor="provider">Empresa prestadora</FieldLabel>
            <Input id="provider" value={state.contractingCompany} onChange={(event) => update("contractingCompany", event.target.value)} />
          </div>
          <div className="date-row">
            <div><FieldLabel htmlFor="issue-date">Data de emissão</FieldLabel><Input id="issue-date" type="date" value={state.issueDate} onChange={(event) => update("issueDate", event.target.value)} /></div>
            <div><FieldLabel htmlFor="review-date" optional>Revisão prevista</FieldLabel><Input id="review-date" type="date" value={state.reviewDate} onChange={(event) => update("reviewDate", event.target.value)} /></div>
          </div>
        </div>
        {currentCondo.note && <div className="notice notice-amber"><AlertTriangle aria-hidden="true" /><div><strong>Atenção à base cadastral</strong><p>{currentCondo.note}</p></div></div>}
      </section>

      <section className="section-card">
        <div className="section-heading"><div><span className="eyebrow">Assinatura técnica</span><h2>Responsável pelo documento</h2></div></div>
        <div className="field-grid field-grid-3">
          <div><FieldLabel htmlFor="technical-name">Nome</FieldLabel><Input id="technical-name" value={state.technicalResponsible} onChange={(event) => update("technicalResponsible", event.target.value)} placeholder="Responsável técnico" /></div>
          <div><FieldLabel htmlFor="technical-title">Função ou título</FieldLabel><Input id="technical-title" value={state.professionalTitle} onChange={(event) => update("professionalTitle", event.target.value)} placeholder="Ex.: Engenheiro de Segurança" /></div>
          <div><FieldLabel htmlFor="technical-registration">Registro profissional</FieldLabel><Input id="technical-registration" value={state.professionalRegistration} onChange={(event) => update("professionalRegistration", event.target.value)} placeholder="CREA, CRM ou outro" /></div>
        </div>
      </section>
    </div>
  );

  const renderStaffing = () => (
    <div className="step-stack">
      <section className="section-card section-intro">
        <div><span className="eyebrow">Etapa 2 de 8</span><h1>Quadro de funcionários</h1><p>Marque os cargos existentes e informe a quantidade real em cada função.</p></div>
        <div className="metric-strip" aria-label="Resumo do quadro">
          <div><span>Configurado</span><strong>{totalWorkers}</strong></div>
          <div><span>Referência</span><strong>{state.expectedTotal ?? "—"}</strong></div>
          <div><span>Diferença</span><strong className={state.expectedTotal !== null && totalWorkers !== state.expectedTotal ? "metric-warn" : ""}>{state.expectedTotal === null ? "—" : totalWorkers - state.expectedTotal}</strong></div>
        </div>
      </section>
      <section className="section-card">
        <div className="toolbar-row">
          <div className="search-box"><Search aria-hidden="true" /><Input value={roleSearch} onChange={(event) => setRoleSearch(event.target.value)} placeholder="Buscar cargo" aria-label="Buscar cargo" /></div>
          <StatusPill tone={state.expectedTotal === null || totalWorkers === state.expectedTotal ? "ok" : "warn"}>{state.expectedTotal === null || totalWorkers === state.expectedTotal ? "Total conferido" : "Quantidade divergente"}</StatusPill>
        </div>
        <div className="role-groups">
          {filteredRoleGroups.map((ghe) => (
            <div className="role-group" key={ghe.id}>
              <div className="role-group-title"><span>{ghe.id}</span><h2>{ghe.name}</h2><small>{ghe.roles.filter((role) => state.roles[role.id]?.selected).length} selecionado(s)</small></div>
              <div className="role-list">
                {ghe.roles.map((role) => {
                  const selection = state.roles[role.id];
                  const suggested = currentCondo.suggestedRoleIds.includes(role.id);
                  return (
                    <div className={`role-row ${selection?.selected ? "role-selected" : ""}`} key={role.id}>
                      <Checkbox id={`role-${role.id}`} checked={selection?.selected ?? false} onCheckedChange={(checked) => updateRole(role.id, { selected: checked === true })} aria-label={`Incluir ${role.name}`} />
                      <label htmlFor={`role-${role.id}`} className="role-name"><strong>{role.name}</strong><span>{suggested ? "Indicado na referência" : role.gheName}</span></label>
                      <div className="quantity-control" aria-label={`Quantidade de ${role.name}`}>
                        <Button type="button" variant="ghost" size="icon-sm" onClick={() => updateRole(role.id, { quantity: Math.max(0, (selection?.quantity ?? 0) - 1) })} disabled={!selection?.selected || (selection?.quantity ?? 0) === 0} aria-label="Diminuir quantidade"><Minus /></Button>
                        <Input type="number" min={0} max={999} value={selection?.quantity ?? 0} onChange={(event) => updateRole(role.id, { quantity: Number(event.target.value) })} disabled={!selection?.selected} aria-label={`Quantidade de ${role.name}`} />
                        <Button type="button" variant="ghost" size="icon-sm" onClick={() => updateRole(role.id, { quantity: (selection?.quantity ?? 0) + 1 })} disabled={!selection?.selected} aria-label="Aumentar quantidade"><Plus /></Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );

  const renderActivities = () => (
    <div className="step-stack">
      <section className="section-card section-intro">
        <div><span className="eyebrow">Etapa 3 de 8</span><h1>Atividades e exposições</h1><p>Marque somente o que ocorre na rotina. As escolhas alimentam o PGR, o PCMSO e o LTCAT.</p></div>
        <StatusPill tone="neutral">{selectedScenarioCount} condições incluídas</StatusPill>
      </section>
      <section className="section-card">
        <div className="section-heading"><div><span className="eyebrow">Ambientes</span><h2>Áreas abrangidas pelo trabalho</h2></div></div>
        <div className="check-grid">
          {environmentAreas.map((area) => <label key={area} className={`check-tile ${state.selectedAreas.includes(area) ? "check-tile-selected" : ""}`}><Checkbox checked={state.selectedAreas.includes(area)} onCheckedChange={(checked) => toggleArea(area, checked === true)} /><span>{area}</span></label>)}
        </div>
        <div className="field-block"><FieldLabel htmlFor="environment-description">Caracterização do ambiente</FieldLabel><Textarea id="environment-description" rows={4} value={state.environmentDescription} onChange={(event) => update("environmentDescription", event.target.value)} /></div>
      </section>
      <section className="section-card">
        <div className="section-heading"><div><span className="eyebrow">Checklist técnico</span><h2>Condições existentes</h2></div><p>Cada item pode adicionar riscos e requisitos ao documento.</p></div>
        <div className="scenario-grid">
          {scenarioCatalog.map((scenario) => {
            const checked = state.scenarios[scenario.id];
            const highAttention = scenario.id === "eletricidade" || scenario.id === "trabalhoAltura" || scenario.id === "segurancaPatrimonial";
            return (
              <label key={scenario.id} className={`scenario-card ${checked ? "scenario-selected" : ""}`}>
                <div className="scenario-top"><Checkbox checked={checked} onCheckedChange={(value) => toggleScenario(scenario.id, value === true)} /><span className="scenario-label">{scenario.label}</span>{highAttention && <StatusPill tone="high">atenção</StatusPill>}</div>
                <p>{scenario.description}</p><span className="scenario-impact">Inclui: {scenario.section}</span>
              </label>
            );
          })}
        </div>
      </section>
      <section className="section-card"><FieldLabel htmlFor="technical-notes" optional>Observações da visita e validações pendentes</FieldLabel><Textarea id="technical-notes" rows={5} value={state.notes} onChange={(event) => update("notes", event.target.value)} placeholder="Registre divergências, limitações, tarefas eventuais e pontos que precisam ser confirmados." /></section>
    </div>
  );

  const renderInventory = () => (
    <div className="step-stack">
      <section className="section-card section-intro">
        <div><span className="eyebrow">Etapa 4 de 8</span><h1>Inventário de riscos</h1><p>Revise os riscos sugeridos para cada cargo e ajuste severidade e probabilidade quando o reconhecimento técnico justificar.</p></div>
        <div className="metric-strip compact"><div><span>Funções</span><strong>{selectedRoles.length}</strong></div><div><span>Riscos</span><strong>{includedRiskCount}</strong></div><div><span>GHEs</span><strong>{selectedGheCount}</strong></div></div>
      </section>
      {!selectedRoles.length ? (
        <section className="empty-state section-card"><Users aria-hidden="true" /><h2>O quadro ainda está vazio</h2><p>Volte à etapa anterior e informe ao menos um cargo com quantidade superior a zero.</p><Button onClick={() => setStep(1)}><ArrowLeft /> Voltar ao quadro</Button></section>
      ) : (
        <section className="risk-stack">
          {selectedRoles.map((role, index) => {
            const visibleRisks = role.riskIds.map(getRisk).filter(Boolean);
            return (
              <details className="risk-role-card" key={role.id} open={index === 0}>
                <summary><div className="risk-summary-icon"><HardHat /></div><div><strong>{role.name}</strong><span>{role.quantity} trabalhador(es) · {role.ghe} · {role.gheName}</span></div><StatusPill tone="neutral">{visibleRisks.length} sugestões</StatusPill><ChevronDown className="details-chevron" /></summary>
                <div className="risk-role-content">
                  <p className="role-description">{role.description}</p>
                  <div className="risk-table-wrap"><table className="risk-table"><thead><tr><th>Incluir</th><th>Risco e fonte</th><th>Severidade</th><th>Probabilidade</th><th>Nível</th></tr></thead><tbody>
                    {visibleRisks.map((riskMaybe) => {
                      if (!riskMaybe) return null;
                      const risk = riskMaybe;
                      const key = `${role.id}:${risk.id}`;
                      const defaultIncluded = !risk.condition || state.scenarios[risk.condition];
                      const included = typeof state.riskOverrides[key] === "boolean" ? state.riskOverrides[key] : defaultIncluded;
                      const assessment = state.riskAssessments[key] ?? { severity: risk.severity, probability: risk.probability };
                      const score = assessment.severity * assessment.probability;
                      const classification = classifyRisk(score);
                      return (
                        <tr key={risk.id} className={!included ? "risk-disabled" : ""}>
                          <td><Checkbox checked={included} onCheckedChange={(checked) => toggleRisk(role.id, risk.id, checked === true)} aria-label={`Incluir risco ${risk.type}`} /></td>
                          <td><strong>{risk.type}</strong><span>{risk.source}</span><small>{risk.damages}</small></td>
                          <td><Select value={String(assessment.severity)} onValueChange={(value) => updateRiskAssessment(role.id, risk.id, { severity: Number(value) as Severity })} disabled={!included}><SelectTrigger className="risk-select"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1">1 · Irrelevante</SelectItem><SelectItem value="3">3 · Marginal</SelectItem><SelectItem value="6">6 · Crítica</SelectItem><SelectItem value="9">9 · Catastrófica</SelectItem></SelectContent></Select></td>
                          <td><Select value={String(assessment.probability)} onValueChange={(value) => updateRiskAssessment(role.id, risk.id, { probability: Number(value) as Probability })} disabled={!included}><SelectTrigger className="risk-select"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="0">0 · Impossível</SelectItem><SelectItem value="1">1 · Raro</SelectItem><SelectItem value="2">2 · Incomum</SelectItem><SelectItem value="4">4 · Ocasional</SelectItem><SelectItem value="6">6 · Frequente</SelectItem><SelectItem value="8">8 · Contínuo</SelectItem></SelectContent></Select></td>
                          <td><StatusPill tone={classification === "Alto" ? "high" : classification === "Médio" ? "warn" : "ok"}>{score} · {classification}</StatusPill></td>
                        </tr>
                      );
                    })}
                  </tbody></table></div>
                </div>
              </details>
            );
          })}
        </section>
      )}
    </div>
  );

  const renderNr01 = () => (
    <div className="step-stack">
      <section className="section-card section-intro">
        <div><span className="eyebrow">Etapa 5 de 8</span><h1>Relatório psicossocial da NR-01</h1><p>Importe o CSV do Google Forms, confirme o local e revise os indicadores que serão anexados ao PGR.</p></div>
        {nr01Report ? (
          <div className="metric-strip compact" aria-label="Resumo da NR-01">
            <div><span>Respostas</span><strong>{nr01Report.responseCount}</strong></div>
            <div><span>Quadro PGR</span><strong>{totalWorkers || "—"}</strong></div>
            <div><span>Cobertura</span><strong>{nr01Report.participationPercent === null ? "—" : `${nr01Report.participationPercent.toLocaleString("pt-BR")}%`}</strong></div>
          </div>
        ) : <StatusPill tone="neutral">Aguardando CSV</StatusPill>}
      </section>

      <section className="section-card">
        <div className="section-heading"><div><span className="eyebrow">Fonte dos dados</span><h2>Respostas do Google Forms</h2></div><p>O arquivo é processado no navegador e não é enviado a um servidor.</p></div>
        <input ref={nr01FileInputRef} className="sr-only" type="file" accept=".csv,text/csv" onChange={handleNr01File} aria-label="Selecionar CSV da NR-01" />
        {!nr01Dataset ? (
          <div className="nr01-upload-zone">
            <div className="nr01-upload-icon"><FileSpreadsheet aria-hidden="true" /></div>
            <div><strong>Selecione a exportação CSV do formulário</strong><span>O sistema reconhece as 11 perguntas, separa as respostas por local e inverte automaticamente as questões de exposição.</span></div>
            <Button type="button" onClick={() => nr01FileInputRef.current?.click()}><Upload /> Selecionar CSV</Button>
          </div>
        ) : (
          <div className="nr01-imported-file">
            <div className="nr01-file-icon"><FileSpreadsheet aria-hidden="true" /></div>
            <div className="nr01-file-copy"><strong>{nr01Dataset.sourceFileName}</strong><span>{nr01Dataset.responses.length} respostas válidas · {nr01Dataset.locations.length} locais · importado neste dispositivo</span></div>
            <div className="nr01-file-actions">
              <Button type="button" variant="outline" onClick={() => nr01FileInputRef.current?.click()}><Upload /> Substituir</Button>
              <Button type="button" variant="ghost" onClick={clearNr01Dataset} aria-label="Remover CSV importado"><Trash2 /> Remover</Button>
            </div>
          </div>
        )}
        {nr01Dataset?.skippedRows ? <div className="notice notice-amber"><AlertTriangle aria-hidden="true" /><div><strong>Linhas não utilizadas</strong><p>{nr01Dataset.skippedRows} linha(s) estavam incompletas ou continham respostas fora da escala esperada.</p></div></div> : null}
      </section>

      {nr01Dataset && (
        <section className="section-card">
          <div className="section-heading"><div><span className="eyebrow">Vinculação</span><h2>Local analisado neste PGR</h2></div><StatusPill tone={selectedNr01Location ? "ok" : "warn"}>{selectedNr01Location ? "Local vinculado" : "Seleção necessária"}</StatusPill></div>
          <div className="nr01-link-grid">
            <div>
              <FieldLabel htmlFor="nr01-location">Local informado no formulário</FieldLabel>
              <Select value={selectedNr01Location} onValueChange={selectNr01Location}>
                <SelectTrigger id="nr01-location" className="select-large"><SelectValue placeholder="Selecione o local correspondente" /></SelectTrigger>
                <SelectContent position="popper" className="max-w-[min(92vw,760px)]">
                  {nr01Dataset.locations.map((location) => {
                    const count = nr01Dataset.responses.filter((response) => response.location === location).length;
                    return <SelectItem key={location} value={location}>{location} · {count} resposta(s)</SelectItem>;
                  })}
                </SelectContent>
              </Select>
              {automaticNr01Location && automaticNr01Location === selectedNr01Location && <p className="field-hint">Correspondência identificada automaticamente pelo nome ou CNPJ.</p>}
            </div>
            <label className={`nr01-include-card ${includeNr01 ? "nr01-include-active" : ""}`}>
              <Checkbox checked={includeNr01} onCheckedChange={(checked) => setNr01Included(checked === true)} disabled={!nr01Report} />
              <span><strong>Incluir no PGR em Word</strong><small>O relatório será acrescentado como anexo no mesmo arquivo.</small></span>
            </label>
          </div>
        </section>
      )}

      {nr01Dataset && !nr01Report && (
        <section className="empty-state section-card"><BarChart3 aria-hidden="true" /><h2>Selecione um local do CSV</h2><p>Escolha o local correspondente ao condomínio para calcular os indicadores.</p></section>
      )}

      {nr01Report && !nr01Report.canPublishDetailedResults && (
        <section className="section-card">
          <div className="notice notice-amber notice-flush"><AlertTriangle aria-hidden="true" /><div><strong>Amostra protegida por sigilo</strong><p>Há {nr01Report.responseCount} resposta(s) para este local. O Word incluirá o registro da aplicação, mas não exibirá médias, distribuições ou comentários enquanto houver menos de 3 respostas.</p></div></div>
          <div className="nr01-continuity-grid">
            <div><span>Período</span><strong>{nr01Report.startDate === nr01Report.endDate ? nr01Report.startDate : `${nr01Report.startDate} a ${nr01Report.endDate}`}</strong></div>
            <div><span>Encaminhamento</span><strong>Complementar com AEP e análise da atividade</strong></div>
          </div>
        </section>
      )}

      {nr01Report?.canPublishDetailedResults && (
        <>
          <section className="section-card">
            <div className="section-heading"><div><span className="eyebrow">Resultado agregado</span><h2>Indicadores por domínio</h2></div><p>Média favorável de 1 a 5. Quanto maior, melhor a condição percebida.</p></div>
            <div className="nr01-domain-grid">
              {nr01Report.domainResults.map((domain) => {
                const tone = domain.classification === "Alto" ? "high" : domain.classification === "Moderado" ? "warn" : "ok";
                return (
                  <article className={`nr01-domain-card nr01-domain-${tone}`} key={domain.id}>
                    <div className="nr01-domain-top"><div><span>{domain.label}</span><strong>{domain.average.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong></div><StatusPill tone={tone}>{domain.classification}</StatusPill></div>
                    <div className="nr01-score-track" aria-label={`${domain.average} de 5`}><span style={{ width: `${(domain.average / 5) * 100}%` }} /></div>
                    <p>{domain.riskFactor}</p>
                    <small>{domain.probability} · severidade {domain.severity.toLocaleLowerCase("pt-BR")} · reavaliar em {domain.reassessment}</small>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="section-card">
            <div className="section-heading"><div><span className="eyebrow">Pontos de atenção</span><h2>Questões com menor média favorável</h2></div><StatusPill tone={nr01Report.overallClassification === "Alto" ? "high" : nr01Report.overallClassification === "Moderado" ? "warn" : "ok"}>Geral {nr01Report.overallAverage.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</StatusPill></div>
            <div className="risk-table-wrap"><table className="risk-table nr01-table"><thead><tr><th>Questão</th><th>Média</th><th>Favorável</th><th>Às vezes</th><th>Desfavorável</th></tr></thead><tbody>
              {nr01Report.criticalQuestions.map((question) => <tr key={question.id}><td><strong>{question.title}</strong><span>{question.prompt}</span></td><td>{question.average.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td><td>{question.favorablePercent.toLocaleString("pt-BR")}%</td><td>{question.neutralPercent.toLocaleString("pt-BR")}%</td><td>{question.unfavorablePercent.toLocaleString("pt-BR")}%</td></tr>)}
            </tbody></table></div>
          </section>

          <section className="section-card">
            <div className="section-heading"><div><span className="eyebrow">Composição da amostra</span><h2>Atividades e turnos</h2></div><p>Os comentários abertos não são exibidos para preservar a confidencialidade.</p></div>
            <div className="nr01-profile-grid">
              <div><h3>Grupos de atividades</h3><ul>{nr01Report.activityGroups.map((item) => <li key={item.label}><span>{item.label}</span><strong>{item.count} · {item.percentage.toLocaleString("pt-BR")}%</strong></li>)}</ul></div>
              <div><h3>Turnos</h3><ul>{nr01Report.shifts.map((item) => <li key={item.label}><span>{item.label}</span><strong>{item.count} · {item.percentage.toLocaleString("pt-BR")}%</strong></li>)}</ul></div>
            </div>
            <div className="notice notice-blue"><ClipboardCheck aria-hidden="true" /><div><strong>Critério documentado</strong><p>3,20 a 5,00: tolerável; 2,40 a 3,19: moderado; 1,00 a 2,39: alto. A severidade moderada é preliminar e deve ser validada pelo responsável técnico.</p></div></div>
          </section>
        </>
      )}
    </div>
  );

  const renderPcmso = () => (
    <div className="step-stack">
      <section className="section-card section-intro pcmso-intro">
        <div><span className="eyebrow">Etapa 6 de 8 · Prioridade</span><h1>Programa de Controle Médico de Saúde Ocupacional</h1><p>Transforme os riscos do PGR em uma matriz de vigilância da saúde para revisão e assinatura do médico responsável.</p></div>
        <div className="metric-strip compact" aria-label="Consistência do PCMSO">
          <div><span>Protocolo</span><strong>{pcmsoProtocolRows.length}</strong></div>
          <div><span>Quadro</span><strong>{totalWorkers}</strong></div>
          <div><span>Preenchido</span><strong>{pcmsoReadiness}%</strong></div>
        </div>
      </section>

      <section className="section-card">
        <label className={`module-toggle-card ${state.pcmso.included ? "module-toggle-active" : ""}`}>
          <Checkbox checked={state.pcmso.included} onCheckedChange={(checked) => updatePcmso("included", checked === true)} />
          <span><strong>Incluir PCMSO no processo deste condomínio</strong><small>O documento será gerado separadamente em Word e permanecerá vinculado ao mesmo PGR.</small></span>
          <StatusPill tone={pcmsoReadiness === 100 ? "ok" : "warn"}>{pcmsoReadiness === 100 ? "Cadastro completo" : "Completar cadastro"}</StatusPill>
        </label>
      </section>

      <section className="section-card">
        <div className="section-heading"><div><span className="eyebrow">Identificação médica</span><h2>Dados do programa e do responsável</h2></div><p>O documento sempre sai como minuta para revisão clínica e assinatura.</p></div>
        <div className="field-grid field-grid-3">
          <div><FieldLabel htmlFor="pcmso-start">Início da vigência</FieldLabel><Input id="pcmso-start" type="date" value={state.pcmso.startDate} onChange={(event) => updatePcmso("startDate", event.target.value)} /></div>
          <div><FieldLabel htmlFor="pcmso-end">Fim da vigência</FieldLabel><Input id="pcmso-end" type="date" value={state.pcmso.endDate} onChange={(event) => updatePcmso("endDate", event.target.value)} /></div>
          <div><FieldLabel htmlFor="pcmso-report">Relatório analítico até</FieldLabel><Input id="pcmso-report" type="date" value={state.pcmso.analyticalReportDueDate} onChange={(event) => updatePcmso("analyticalReportDueDate", event.target.value)} /></div>
          <div><FieldLabel htmlFor="pcmso-cnae">CNAE</FieldLabel><Input id="pcmso-cnae" value={state.pcmso.cnae} onChange={(event) => updatePcmso("cnae", event.target.value)} placeholder="Ex.: 8112-5/00" /></div>
          <div>
            <FieldLabel>Grau de risco</FieldLabel>
            <Select value={state.pcmso.riskGrade || undefined} onValueChange={(value) => updatePcmso("riskGrade", value as PcmsoConfig["riskGrade"])}><SelectTrigger className="select-large"><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent><SelectItem value="1">1</SelectItem><SelectItem value="2">2</SelectItem><SelectItem value="3">3</SelectItem><SelectItem value="4">4</SelectItem></SelectContent></Select>
          </div>
          <div><FieldLabel htmlFor="pcmso-clinic" optional>Clínica ou serviço</FieldLabel><Input id="pcmso-clinic" value={state.pcmso.clinicName} onChange={(event) => updatePcmso("clinicName", event.target.value)} placeholder="Serviço de saúde ocupacional" /></div>
          <div><FieldLabel htmlFor="pcmso-doctor">Médico responsável</FieldLabel><Input id="pcmso-doctor" value={state.pcmso.physicianName} onChange={(event) => updatePcmso("physicianName", event.target.value)} placeholder="Nome completo" /></div>
          <div><FieldLabel htmlFor="pcmso-crm">CRM e UF</FieldLabel><Input id="pcmso-crm" value={state.pcmso.physicianCrm} onChange={(event) => updatePcmso("physicianCrm", event.target.value)} placeholder="CRM/UF 00000" /></div>
          <div><FieldLabel htmlFor="pcmso-rqe" optional>RQE</FieldLabel><Input id="pcmso-rqe" value={state.pcmso.physicianRqe} onChange={(event) => updatePcmso("physicianRqe", event.target.value)} placeholder="Quando aplicável" /></div>
        </div>
        <div className="notice notice-blue"><HeartPulse aria-hidden="true" /><div><strong>Limite clínico preservado</strong><p>O sistema sugere foco clínico e critérios condicionais. Aptidão, exames complementares e condutas não são decididos automaticamente.</p></div></div>
      </section>

      <section className="section-card">
        <div className="section-heading"><div><span className="eyebrow">Exames obrigatórios</span><h2>Ciclo ocupacional previsto na NR-07</h2></div><p>As periodicidades individuais continuam sob responsabilidade médica.</p></div>
        <div className="exam-grid">
          {[
            ["Admissional", "Antes de assumir as atividades"],
            ["Periódico", "12 ou 24 meses, conforme riscos e decisão médica"],
            ["Retorno", "Antes do retorno após afastamento de 30 dias ou mais"],
            ["Mudança de riscos", "Antes da alteração dos riscos ocupacionais"],
            ["Demissional", "Em até 10 dias, observadas as dispensas da NR-07"],
          ].map(([name, description]) => <article className="exam-card" key={name}><span><Check /></span><div><strong>{name}</strong><p>{description}</p></div></article>)}
        </div>
      </section>

      <section className="section-card">
        <div className="section-heading"><div><span className="eyebrow">Matriz clínica</span><h2>Protocolos por função</h2></div><p>As sugestões abaixo vêm dos riscos incluídos no inventário.</p></div>
        {!pcmsoProtocolRows.length ? (
          <div className="empty-state"><Users aria-hidden="true" /><h2>Inclua funções no quadro</h2><p>O PCMSO precisa das funções e dos riscos do PGR para montar os protocolos.</p></div>
        ) : (
          <div className="protocol-stack">
            {pcmsoProtocolRows.map((row, index) => (
              <details className="protocol-card" key={row.roleId} open={index === 0}>
                <summary><div><span>{row.ghe}</span><strong>{row.roleName}</strong><small>{row.quantity} trabalhador(es)</small></div><StatusPill tone="neutral">Proposta médica</StatusPill><ChevronDown /></summary>
                  <div className="protocol-content">
                    <div className="protocol-risk"><span>Riscos detalhados da função</span><p>{row.riskFactors}</p><small>“Cenário não caracterizado” identifica expressamente o risco que não foi confirmado nesta configuração. Possíveis agravos: {row.possibleHarms}</small></div>
                  <div className="field-grid field-grid-2">
                    <div className="field-span-2"><FieldLabel htmlFor={`pcmso-clinical-${row.roleId}`}>Avaliação clínica direcionada</FieldLabel><Textarea id={`pcmso-clinical-${row.roleId}`} rows={3} value={row.clinicalFocus} onChange={(event) => updatePcmsoProtocol(row.roleId, { clinicalFocus: event.target.value })} /></div>
                    <div className="field-span-2"><FieldLabel htmlFor={`pcmso-exams-${row.roleId}`}>Exames complementares e critérios</FieldLabel><Textarea id={`pcmso-exams-${row.roleId}`} rows={3} value={row.complementaryExams} onChange={(event) => updatePcmsoProtocol(row.roleId, { complementaryExams: event.target.value })} /></div>
                    <div className="field-span-2"><FieldLabel htmlFor={`pcmso-period-${row.roleId}`}>Periodicidade proposta</FieldLabel><Input id={`pcmso-period-${row.roleId}`} value={row.periodicity} onChange={(event) => updatePcmsoProtocol(row.roleId, { periodicity: event.target.value })} /></div>
                  </div>
                </div>
              </details>
            ))}
          </div>
        )}
      </section>

      <section className="section-card">
        <div className="section-heading"><div><span className="eyebrow">Governança clínica</span><h2>Encaminhamentos e acompanhamento anual</h2></div></div>
        <div className="field-grid field-grid-2">
          <div className="field-span-2"><FieldLabel htmlFor="pcmso-emergency">Referência para urgência e emergência</FieldLabel><Input id="pcmso-emergency" value={state.pcmso.emergencyReferral} onChange={(event) => updatePcmso("emergencyReferral", event.target.value)} placeholder="Serviço, contato ou fluxo de encaminhamento" /></div>
          <div className="field-span-2"><FieldLabel htmlFor="pcmso-vaccine">Diretriz de imunização</FieldLabel><Textarea id="pcmso-vaccine" rows={3} value={state.pcmso.vaccinationGuidance} onChange={(event) => updatePcmso("vaccinationGuidance", event.target.value)} /></div>
          <div className="field-span-2"><FieldLabel htmlFor="pcmso-notes" optional>Observações do médico responsável</FieldLabel><Textarea id="pcmso-notes" rows={4} value={state.pcmso.notes} onChange={(event) => updatePcmso("notes", event.target.value)} placeholder="Ajustes de protocolo, critérios de encaminhamento e orientações aos examinadores." /></div>
        </div>
      </section>

      <section className="module-export-card pcmso-export-card">
        <div className="export-document-icon"><HeartPulse /></div>
        <div className="export-copy"><span className="eyebrow">Documento prioritário</span><h2>PCMSO de {state.condoName || "condomínio"}</h2><p>{pcmsoProtocolRows.length} protocolo(s) ocupacional(is), ciclo de exames, ASO, prontuários e relatório analítico anual.</p><div className="export-tags"><span>Word editável</span><span>Integrado ao PGR</span><span>Revisão médica obrigatória</span></div></div>
        <Button className="export-button" size="lg" onClick={handleGeneratePcmso} disabled={isGenerating || !selectedRoles.length}>{generatingDocument === "pcmso" ? <Sparkles className="animate-pulse" /> : <Download />}{generatingDocument === "pcmso" ? "Montando PCMSO..." : "Gerar PCMSO em Word"}</Button>
      </section>
    </div>
  );

  const renderLtcat = () => (
    <div className="step-stack">
      <section className="section-card section-intro">
        <div><span className="eyebrow">Etapa 7 de 8</span><h1>Laudo Técnico das Condições Ambientais do Trabalho</h1><p>Registre todas as funções e grupos existentes, suas condições ambientais e a conclusão previdenciária sobre a exposição.</p></div>
        <div className="metric-strip compact"><div><span>Funções</span><strong>{ltcatFunctionRows.length}</strong></div><div><span>Agentes</span><strong>{ltcatExposureRows.length}</strong></div><div><span>Pendências</span><strong className={totalLtcatPending ? "metric-warn" : ""}>{totalLtcatPending}</strong></div><div><span>Preenchido</span><strong>{ltcatReadiness}%</strong></div></div>
      </section>

      <section className="section-card">
        <label className={`module-toggle-card ${state.ltcat.included ? "module-toggle-active" : ""}`}>
          <Checkbox checked={state.ltcat.included} onCheckedChange={(checked) => updateLtcat("included", checked === true)} />
          <span><strong>Incluir LTCAT no processo deste condomínio</strong><small>Todas as funções serão incluídas, mesmo quando não houver agente nocivo inicialmente caracterizado.</small></span>
          <StatusPill tone={totalLtcatPending ? "warn" : "ok"}>{totalLtcatPending ? `${totalLtcatPending} pendência(s)` : "Avaliações preenchidas"}</StatusPill>
        </label>
        <div className="notice notice-amber"><AlertTriangle aria-hidden="true" /><div><strong>Sem conclusão automática</strong><p>O LTCAT deve registrar todas as funções e verificar se existe exposição a agentes prejudiciais à saúde. A conclusão continua reservada ao médico do trabalho ou engenheiro de segurança do trabalho.</p></div></div>
      </section>

      <section className="section-card">
        <div className="section-heading"><div><span className="eyebrow">Responsabilidade técnica</span><h2>Profissional e estratégia de avaliação</h2></div></div>
        <div className="field-grid field-grid-3">
          <div><FieldLabel htmlFor="ltcat-date">Data da avaliação</FieldLabel><Input id="ltcat-date" type="date" value={state.ltcat.assessmentDate} onChange={(event) => updateLtcat("assessmentDate", event.target.value)} /></div>
          <div><FieldLabel htmlFor="ltcat-name">Profissional habilitado</FieldLabel><Input id="ltcat-name" value={state.ltcat.professionalName} onChange={(event) => updateLtcat("professionalName", event.target.value)} placeholder="Nome completo" /></div>
          <div><FieldLabel htmlFor="ltcat-registration">Registro profissional</FieldLabel><Input id="ltcat-registration" value={state.ltcat.professionalRegistration} onChange={(event) => updateLtcat("professionalRegistration", event.target.value)} placeholder="CREA ou CRM" /></div>
          <div>
            <FieldLabel>Habilitação</FieldLabel>
            <Select value={state.ltcat.professionalTitle || undefined} onValueChange={(value) => updateLtcat("professionalTitle", value as LtcatConfig["professionalTitle"])}><SelectTrigger className="select-large"><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent><SelectItem value="Engenheiro de Segurança do Trabalho">Engenheiro de Segurança do Trabalho</SelectItem><SelectItem value="Médico do Trabalho">Médico do Trabalho</SelectItem></SelectContent></Select>
          </div>
          <div><FieldLabel htmlFor="ltcat-equipment" optional>Equipamentos utilizados</FieldLabel><Input id="ltcat-equipment" value={state.ltcat.equipment} onChange={(event) => updateLtcat("equipment", event.target.value)} placeholder="Modelo, número de série" /></div>
          <div><FieldLabel htmlFor="ltcat-calibration" optional>Calibração e rastreabilidade</FieldLabel><Input id="ltcat-calibration" value={state.ltcat.calibration} onChange={(event) => updateLtcat("calibration", event.target.value)} placeholder="Certificado, data e laboratório" /></div>
          <div className="field-span-2"><FieldLabel htmlFor="ltcat-method">Método geral de inspeção</FieldLabel><Textarea id="ltcat-method" rows={4} value={state.ltcat.inspectionMethod} onChange={(event) => updateLtcat("inspectionMethod", event.target.value)} /></div>
          <div><FieldLabel htmlFor="ltcat-notes" optional>Observações técnicas</FieldLabel><Textarea id="ltcat-notes" rows={4} value={state.ltcat.technicalNotes} onChange={(event) => updateLtcat("technicalNotes", event.target.value)} placeholder="Limitações, representatividade e condições da inspeção." /></div>
        </div>
      </section>

      <section className="section-card">
        <div className="section-heading"><div><span className="eyebrow">Abrangência integral</span><h2>Condições e riscos por função</h2></div><p>As expressões abreviadas foram substituídas pela situação completa de cada risco e cenário.</p></div>
        <div className="protocol-stack">
          {ltcatFunctionRows.map((row, index) => (
            <details className="protocol-card" key={row.roleId} open={index === 0}>
              <summary><div><span>{row.ghe} · {row.quantity} trabalhador(es)</span><strong>{row.roleName}</strong><small>{row.riskDetails.length} risco(s) mapeado(s) · {row.potentialAgentCount} agente(s) previdenciário(s) potencial(is)</small></div><StatusPill tone={row.assessment.conclusion === "Pendente de avaliação técnica" ? "warn" : "ok"}>{row.assessment.conclusion === "Pendente de avaliação técnica" ? "Pendente" : "Concluído"}</StatusPill><ChevronDown /></summary>
              <div className="protocol-content">
                <div className="protocol-risk">
                  <span>Riscos detalhados da função</span>
                  {row.riskDetails.map((detail) => <p key={detail.risk.id}><strong>{detail.risk.type}:</strong> {detail.risk.source} — {detail.status}. {detail.potentialPrevidentiaryAgent ? "Agente potencial para análise previdenciária." : "Fator ocupacional registrado, sem enquadramento previdenciário automático."}</p>)}
                </div>
                <div className="field-grid">
                  <div className="field-span-2"><FieldLabel htmlFor={`ltcat-function-conditions-${row.roleId}`}>Condições ambientais da função</FieldLabel><Textarea id={`ltcat-function-conditions-${row.roleId}`} rows={4} value={row.assessment.environmentalConditions} onChange={(event) => updateLtcatFunctionAssessment(row.roleId, { environmentalConditions: event.target.value, conclusion: "Pendente de avaliação técnica" })} /></div>
                  <div>
                    <FieldLabel>Conclusão previdenciária da função</FieldLabel>
                    <Select value={row.assessment.conclusion} onValueChange={(value) => updateLtcatFunctionAssessment(row.roleId, { conclusion: value as LtcatFunctionAssessment["conclusion"] })}><SelectTrigger className="select-large"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Pendente de avaliação técnica">Pendente de avaliação técnica</SelectItem><SelectItem value="Não caracterizada exposição especial">Não caracterizada exposição especial</SelectItem><SelectItem value="Caracterizada exposição especial">Caracterizada exposição especial</SelectItem></SelectContent></Select>
                  </div>
                </div>
              </div>
            </details>
          ))}
        </div>
      </section>

      <section className="section-card">
        <div className="section-heading"><div><span className="eyebrow">Agentes previdenciários</span><h2>Avaliações específicas trazidas do PGR</h2></div><p>Agentes físicos, químicos e biológicos recebem avaliação própria; os demais riscos permanecem detalhados na respectiva função.</p></div>
        {!ltcatExposureRows.length ? (
          <div className="empty-state"><FileSearch aria-hidden="true" /><h2>Nenhum agente nocivo potencial selecionado</h2><p>As funções continuam no LTCAT. Confirme em campo a ausência de agentes físicos, químicos ou biológicos antes de concluir cada função.</p></div>
        ) : (
          <div className="protocol-stack">
            {ltcatExposureRows.map((row, index) => {
              const assessment = row.assessment;
              const methodReady = Boolean(assessment.method !== "Pendente" && assessment.criterion.trim() && (assessment.method !== "Quantitativa" || (assessment.result.trim() && assessment.unit.trim())));
              return (
                <details className="protocol-card" key={row.key} open={index === 0}>
                  <summary><div><span>{row.ghe} · {row.agentType}</span><strong>{row.roleName}</strong><small>{row.source}</small></div><StatusPill tone={assessment.conclusion === "Pendente de avaliação técnica" ? "warn" : "ok"}>{assessment.conclusion === "Pendente de avaliação técnica" ? "Pendente" : "Preenchido"}</StatusPill><ChevronDown /></summary>
                  <div className="protocol-content">
                    <div className="field-grid field-grid-3">
                      <div>
                        <FieldLabel>Método</FieldLabel>
                        <Select value={assessment.method} onValueChange={(value) => updateLtcatAssessment(row.key, { method: value as LtcatRiskAssessment["method"], conclusion: "Pendente de avaliação técnica" })}><SelectTrigger className="select-large"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Pendente">Pendente</SelectItem><SelectItem value="Qualitativa">Qualitativa</SelectItem><SelectItem value="Quantitativa">Quantitativa</SelectItem></SelectContent></Select>
                      </div>
                      <div><FieldLabel htmlFor={`ltcat-result-${row.key}`}>Resultado</FieldLabel><Input id={`ltcat-result-${row.key}`} value={assessment.result} onChange={(event) => updateLtcatAssessment(row.key, { result: event.target.value, conclusion: "Pendente de avaliação técnica" })} placeholder={assessment.method === "Qualitativa" ? "Descrição ou não aplicável" : "Valor medido"} /></div>
                      <div><FieldLabel htmlFor={`ltcat-unit-${row.key}`}>Unidade</FieldLabel><Input id={`ltcat-unit-${row.key}`} value={assessment.unit} onChange={(event) => updateLtcatAssessment(row.key, { unit: event.target.value, conclusion: "Pendente de avaliação técnica" })} placeholder="dB(A), ppm, mg/m³..." /></div>
                      <div className="field-span-2"><FieldLabel htmlFor={`ltcat-criterion-${row.key}`}>Critério e metodologia</FieldLabel><Textarea id={`ltcat-criterion-${row.key}`} rows={3} value={assessment.criterion} onChange={(event) => updateLtcatAssessment(row.key, { criterion: event.target.value, conclusion: "Pendente de avaliação técnica" })} /></div>
                      <div><FieldLabel htmlFor={`ltcat-exposure-${row.key}`}>Exposição, frequência e duração</FieldLabel><Textarea id={`ltcat-exposure-${row.key}`} rows={3} value={assessment.exposure} onChange={(event) => updateLtcatAssessment(row.key, { exposure: event.target.value, conclusion: "Pendente de avaliação técnica" })} /></div>
                      <div><FieldLabel htmlFor={`ltcat-epc-${row.key}`}>EPC e medidas administrativas</FieldLabel><Textarea id={`ltcat-epc-${row.key}`} rows={3} value={assessment.epc} onChange={(event) => updateLtcatAssessment(row.key, { epc: event.target.value, conclusion: "Pendente de avaliação técnica" })} /></div>
                      <div><FieldLabel htmlFor={`ltcat-epi-${row.key}`}>EPI e registros</FieldLabel><Textarea id={`ltcat-epi-${row.key}`} rows={3} value={assessment.epi} onChange={(event) => updateLtcatAssessment(row.key, { epi: event.target.value, conclusion: "Pendente de avaliação técnica" })} /></div>
                      <div>
                        <FieldLabel>Eficácia dos controles</FieldLabel>
                        <Select value={assessment.effectiveness} onValueChange={(value) => updateLtcatAssessment(row.key, { effectiveness: value as LtcatRiskAssessment["effectiveness"], conclusion: "Pendente de avaliação técnica" })}><SelectTrigger className="select-large"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Pendente">Pendente</SelectItem><SelectItem value="Sim">Sim</SelectItem><SelectItem value="Não">Não</SelectItem><SelectItem value="Não se aplica">Não se aplica</SelectItem></SelectContent></Select>
                      </div>
                      <div className="field-span-2">
                        <FieldLabel>Conclusão previdenciária</FieldLabel>
                        <Select value={assessment.conclusion} onValueChange={(value) => updateLtcatAssessment(row.key, { conclusion: value as LtcatRiskAssessment["conclusion"] })} disabled={!methodReady}><SelectTrigger className="select-large"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Pendente de avaliação técnica">Pendente de avaliação técnica</SelectItem><SelectItem value="Não caracterizada exposição especial">Não caracterizada exposição especial</SelectItem><SelectItem value="Caracterizada exposição especial">Caracterizada exposição especial</SelectItem></SelectContent></Select>
                        {!methodReady && <p className="field-hint">Complete método, critério e, quando quantitativa, resultado e unidade para liberar a conclusão.</p>}
                      </div>
                    </div>
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </section>

      <section className="module-export-card">
        <div className="export-document-icon"><FileSearch /></div>
        <div className="export-copy"><span className="eyebrow">Documento previdenciário</span><h2>LTCAT de {state.condoName || "condomínio"}</h2><p>{ltcatFunctionRows.length} função(ões), {ltcatExposureRows.length} agente(s) potencial(is) e {totalLtcatPending} avaliação(ões) pendente(s).</p><div className="export-tags"><span>Todas as funções incluídas</span><span>Base para conferência do PPP</span><span>Assinatura técnica obrigatória</span></div></div>
        <Button className="export-button" size="lg" onClick={handleGenerateLtcat} disabled={isGenerating || !selectedRoles.length}>{generatingDocument === "ltcat" ? <Sparkles className="animate-pulse" /> : <Download />}{generatingDocument === "ltcat" ? "Montando LTCAT..." : "Gerar LTCAT em Word"}</Button>
      </section>
    </div>
  );

  const renderExport = () => (
    <div className="step-stack">
      <section className="section-card section-intro">
        <div><span className="eyebrow">Etapa 8 de 8</span><h1>Plano de ação e documentos</h1><p>Confirme as ações aplicáveis e gere separadamente o PGR, o PCMSO e o LTCAT em Word.</p></div>
        <StatusPill tone={warnings.length ? "warn" : "ok"}>{warnings.length ? `${warnings.length} pendência(s)` : "Pronto para exportar"}</StatusPill>
      </section>
      <section className="section-card">
        <div className="section-heading"><div><span className="eyebrow">Plano de ação</span><h2>{includedActions.length} ações incluídas</h2></div><p>Ações condicionais aparecem conforme as atividades marcadas.</p></div>
        <div className="action-list">
          {actionCatalog.map((action) => {
            const defaultIncluded = !action.condition || state.scenarios[action.condition];
            const settings = state.actions[action.id];
            const included = settings?.included ?? defaultIncluded;
            return (
              <div className={`action-row ${included ? "action-included" : ""}`} key={action.id}>
                <Checkbox checked={included} onCheckedChange={(checked) => toggleAction(action.id, checked === true)} aria-label={`Incluir ação ${action.action}`} />
                <div className="action-copy"><strong>{action.action}</strong><span>{action.ghe} · Prioridade {action.priority}</span></div>
                <div className="action-field"><span>Prazo</span><Input value={settings?.deadline ?? action.deadline} onChange={(event) => updateAction(action.id, { deadline: event.target.value })} disabled={!included} /></div>
                <div className="action-field action-owner"><span>Responsável</span><Input value={settings?.responsible ?? action.responsible} onChange={(event) => updateAction(action.id, { responsible: event.target.value })} disabled={!included} /></div>
              </div>
            );
          })}
        </div>
      </section>
      <section className="section-card">
        <div className="section-heading"><div><span className="eyebrow">Central de documentos</span><h2>Arquivos Word do condomínio</h2></div><p>Cada arquivo mantém seus próprios responsáveis e critérios de validação.</p></div>
        <div className="document-grid">
          <article className="document-card">
            <div className="document-card-icon"><FileCheck2 /></div>
            <div><span className="eyebrow">Gerenciamento</span><h3>PGR</h3><p>{includedRiskCount} riscos, {includedActions.length} ações{includeNr01 && nr01Report ? ` e NR-01 com ${nr01Report.responseCount} respostas` : ""}.</p></div>
            <div className="document-card-status"><StatusPill tone={selectedRoles.length && state.technicalResponsible.trim() ? "ok" : "warn"}>{selectedRoles.length && state.technicalResponsible.trim() ? "Pronto para revisão" : "Cadastro incompleto"}</StatusPill></div>
            <Button onClick={handleGenerate} disabled={isGenerating || !selectedRoles.length}>{generatingDocument === "pgr" ? <Sparkles className="animate-pulse" /> : <Download />}{generatingDocument === "pgr" ? "Gerando..." : "Gerar PGR"}</Button>
          </article>
          <article className="document-card document-card-primary">
            <div className="document-card-icon"><HeartPulse /></div>
            <div><span className="eyebrow">Prioridade</span><h3>PCMSO</h3><p>{pcmsoProtocolRows.length} protocolos de saúde integrados ao inventário do PGR.</p></div>
            <div className="document-card-status"><StatusPill tone={pcmsoReadiness === 100 ? "ok" : "warn"}>{pcmsoReadiness}% preenchido</StatusPill></div>
            <Button onClick={handleGeneratePcmso} disabled={isGenerating || !selectedRoles.length}>{generatingDocument === "pcmso" ? <Sparkles className="animate-pulse" /> : <Download />}{generatingDocument === "pcmso" ? "Gerando..." : "Gerar PCMSO"}</Button>
          </article>
          <article className="document-card">
            <div className="document-card-icon"><FileSearch /></div>
            <div><span className="eyebrow">Previdenciário</span><h3>LTCAT</h3><p>{ltcatExposureRows.length} agentes e {pendingLtcatRows.length} avaliações ainda pendentes.</p></div>
            <div className="document-card-status"><StatusPill tone={pendingLtcatRows.length ? "warn" : "ok"}>{pendingLtcatRows.length ? "Minuta com pendências" : "Pronto para revisão"}</StatusPill></div>
            <Button onClick={handleGenerateLtcat} disabled={isGenerating || !selectedRoles.length}>{generatingDocument === "ltcat" ? <Sparkles className="animate-pulse" /> : <Download />}{generatingDocument === "ltcat" ? "Gerando..." : "Gerar LTCAT"}</Button>
          </article>
        </div>
      </section>
      <div className="notice notice-blue"><ClipboardCheck aria-hidden="true" /><div><strong>Responsabilidades preservadas</strong><p>O PGR depende da avaliação de SST; o PCMSO depende da revisão e assinatura médica; o LTCAT depende de inspeção, avaliação ambiental e assinatura de profissional legalmente habilitado.</p></div></div>
    </div>
  );

  const currentStepContent = [renderIdentification, renderStaffing, renderActivities, renderInventory, renderNr01, renderPcmso, renderLtcat, renderExport][step]();

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-block"><div className="brand-mark" aria-hidden="true"><FileText /></div><div><strong>Gerador de SST</strong><span>PGR · PCMSO · LTCAT · Grupo Dinamizza</span></div></div>
        <div className="topbar-actions">
          <span className={`connection-state ${isOnline ? "online" : "offline"}`}>{isOnline ? <Wifi /> : <WifiOff />}{isOnline ? "Salvo neste dispositivo" : "Modo offline ativo"}</span>
          {installPrompt && <Button variant="outline" onClick={handleInstall}><Download /> Instalar app</Button>}
          <Button onClick={() => setStep(7)} disabled={!selectedRoles.length} className="header-export"><FileCheck2 /> <span className="desktop-label">Documentos</span></Button>
        </div>
      </header>

      <div className="workspace-shell">
        <aside className="left-rail">
          <div className="rail-section condo-picker">
            <span className="rail-label">Documento em edição</span>
            <Select value={state.condoId} onValueChange={selectCondo}><SelectTrigger className="rail-select"><SelectValue /></SelectTrigger><SelectContent position="popper" className="max-w-[min(92vw,620px)]">{condoCatalog.map((condo) => <SelectItem key={condo.id} value={condo.id}>{condo.name}</SelectItem>)}</SelectContent></Select>
            <div className="rail-condo-meta"><span>{totalWorkers} trabalhadores</span><span>{selectedGheCount} GHEs</span></div>
          </div>
          <nav className="step-nav" aria-label="Etapas dos documentos de SST">
            {steps.map((item) => {
              const Icon = item.icon;
              const active = step === item.id;
              const complete = item.id < step;
              return <button type="button" key={item.id} className={`step-button ${active ? "step-active" : ""} ${complete ? "step-complete" : ""}`} onClick={() => setStep(item.id)} aria-current={active ? "step" : undefined}><span className="step-index">{complete ? <Check /> : <Icon />}</span><span><strong>{item.label}</strong><small>{item.short}</small></span></button>;
            })}
          </nav>
          <div className="rail-source"><CircleDot aria-hidden="true" /><div><strong>Base técnica integrada</strong><span>PGR, NR-01, PCMSO e LTCAT</span></div></div>
        </aside>

        <main className="main-workspace">
          {currentStepContent}
          <div className="step-footer">
            <Button variant="outline" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0}><ArrowLeft /> Anterior</Button>
            {step < steps.length - 1 ? <Button onClick={() => setStep((current) => Math.min(steps.length - 1, current + 1))}>Próxima etapa <ArrowRight /></Button> : <Button onClick={handleGeneratePcmso} disabled={isGenerating || !selectedRoles.length}><HeartPulse /> Gerar PCMSO</Button>}
          </div>
        </main>

        <aside className="right-rail">
          <section className="readiness-card"><div className="readiness-top"><span className="eyebrow">Consistência</span><strong>{readiness}%</strong></div><Progress value={readiness} aria-label={`${readiness}% da configuração preenchida`} /><p>{warnings.length ? "Revise as pendências antes da assinatura." : "Os campos principais estão completos."}</p></section>
          <section className="summary-card"><h2>Resumo do processo</h2><dl><div><dt>Trabalhadores</dt><dd>{totalWorkers}</dd></div><div><dt>Funções</dt><dd>{selectedRoles.length}</dd></div><div><dt>Riscos</dt><dd>{includedRiskCount}</dd></div><div><dt>NR-01</dt><dd>{includeNr01 && nr01Report ? `${nr01Report.responseCount} resp.` : "—"}</dd></div><div><dt>PCMSO</dt><dd>{state.pcmso.included ? `${pcmsoReadiness}%` : "fora"}</dd></div><div><dt>LTCAT</dt><dd>{state.ltcat.included ? `${pendingLtcatRows.length} pend.` : "fora"}</dd></div></dl></section>
          <section className="pending-card"><h2>{warnings.length ? "Pendências" : "Conferência concluída"}</h2>{warnings.length ? <ul>{warnings.slice(0, 4).map((warning) => <li key={warning}><AlertTriangle /> <span>{warning}</span></li>)}</ul> : <div className="all-good"><Check /><span>Configuração pronta para revisão técnica.</span></div>}{warnings.length > 4 && <button type="button" onClick={() => setStep(7)}>Ver todas as {warnings.length} pendências</button>}</section>
        </aside>
      </div>
      <Toaster position="bottom-right" richColors />
    </div>
  );
}
