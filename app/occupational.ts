import { getRisk, getRole, type RiskDefinition, type RoleDefinition } from "./pgr-data";
import { getSelectedRoles } from "./pgr-selectors";
import type {
  LtcatConfig,
  LtcatFunctionAssessment,
  LtcatRiskAssessment,
  PcmsoConfig,
  PcmsoRoleProtocol,
  PgrState,
} from "./pgr-types";

function addYearsIso(value: string, years: number) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return "";
  const date = new Date(Date.UTC(year + years, month - 1, day));
  return date.toISOString().slice(0, 10);
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function normalized(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
}

export function createDefaultPcmso(issueDate: string): PcmsoConfig {
  const endDate = addYearsIso(issueDate, 1);
  return {
    included: true,
    startDate: issueDate,
    endDate,
    cnae: "",
    riskGrade: "",
    physicianName: "",
    physicianCrm: "",
    physicianRqe: "",
    clinicName: "",
    emergencyReferral: "",
    vaccinationGuidance: "Manter imunizações ocupacionais e do calendário oficial atualizadas, conforme os riscos e a avaliação médica.",
    analyticalReportDueDate: endDate,
    notes: "",
    roleProtocols: {},
  };
}

export function createDefaultLtcat(issueDate: string): LtcatConfig {
  return {
    included: true,
    assessmentDate: issueDate,
    professionalName: "",
    professionalTitle: "",
    professionalRegistration: "",
    inspectionMethod:
      "Reconhecimento das atividades, ambientes, fontes geradoras, vias de exposição, frequência e duração, com avaliações qualitativas ou quantitativas conforme o agente e o critério previdenciário aplicável.",
    equipment: "",
    calibration: "",
    technicalNotes: "",
    functionAssessments: {},
    riskAssessments: {},
  };
}

export function mergePcmsoConfig(value: Partial<PcmsoConfig> | undefined, issueDate: string): PcmsoConfig {
  const defaults = createDefaultPcmso(issueDate);
  return {
    ...defaults,
    ...value,
    roleProtocols: value?.roleProtocols ?? {},
  };
}

export function mergeLtcatConfig(value: Partial<LtcatConfig> | undefined, issueDate: string): LtcatConfig {
  const defaults = createDefaultLtcat(issueDate);
  return {
    ...defaults,
    ...value,
    functionAssessments: value?.functionAssessments ?? {},
    riskAssessments: value?.riskAssessments ?? {},
  };
}

export type RoleRiskStatus =
  | "Caracterizado na configuração do PGR"
  | "Cenário não caracterizado"
  | "Não caracterizado após revisão";

export interface RoleRiskDetail {
  risk: RiskDefinition;
  included: boolean;
  status: RoleRiskStatus;
  potentialPrevidentiaryAgent: boolean;
}

export function isPotentialPrevidentiaryAgent(risk: RiskDefinition) {
  const type = normalized(risk.type);
  return type.includes("fisic") || type.includes("quimic") || type.includes("biologic");
}

export function getRoleRiskDetails(state: PgrState, role: RoleDefinition): RoleRiskDetail[] {
  return role.riskIds
    .map(getRisk)
    .filter((risk): risk is RiskDefinition => Boolean(risk))
    .map((risk) => {
      const override = state.riskOverrides[`${role.id}:${risk.id}`];
      const scenarioCharacterized = !risk.condition || Boolean(state.scenarios[risk.condition]);
      const included = typeof override === "boolean" ? override : scenarioCharacterized;
      const status: RoleRiskStatus = included
        ? "Caracterizado na configuração do PGR"
        : override === false
          ? "Não caracterizado após revisão"
          : "Cenário não caracterizado";
      return {
        risk,
        included,
        status,
        potentialPrevidentiaryAgent: isPotentialPrevidentiaryAgent(risk),
      };
    });
}

export function includedRisksForRole(state: PgrState, role: RoleDefinition) {
  return getRoleRiskDetails(state, role)
    .filter((detail) => detail.included)
    .map((detail) => detail.risk);
}

export interface PcmsoProtocolRow {
  roleId: string;
  roleName: string;
  ghe: string;
  quantity: number;
  riskFactors: string;
  possibleHarms: string;
  clinicalFocus: string;
  complementaryExams: string;
  periodicity: string;
}

function defaultPcmsoProtocol(state: PgrState, role: RoleDefinition): PcmsoRoleProtocol {
  const risks = includedRisksForRole(state, role);
  const clinical: string[] = ["Anamnese ocupacional e exame clínico direcionado aos riscos da função"];
  const complementary: string[] = [];
  const allText = normalized(risks.map((risk) => `${risk.type} ${risk.source}`).join(" "));

  if (allText.includes("ergonom")) {
    clinical.push("Avaliação de sintomas osteomusculares, mobilidade, postura e limitações funcionais");
  }
  if (allText.includes("psicossocial") || state.scenarios.trabalhoNoturno) {
    clinical.push("Investigação clínica de sono, fadiga, estresse e sinais de sofrimento psíquico, com encaminhamento quando indicado");
  }
  if (allText.includes("quimic") || allText.includes("gases")) {
    clinical.push("Avaliação de pele, olhos e vias respiratórias conforme os produtos e as vias de exposição");
    complementary.push("Exames específicos somente após identificação do agente, análise da FDS, dose e critério médico");
  }
  if (allText.includes("biologic")) {
    clinical.push("Verificação de sintomas infecciosos, integridade cutânea e histórico de exposições acidentais");
    complementary.push("Imunização e exames pós-exposição conforme protocolo e indicação médica");
  }
  if (allText.includes("ruido")) {
    complementary.push("Audiometria condicionada à confirmação de exposição a níveis de pressão sonora elevados, conforme a NR-07");
  }
  if (allText.includes("calor") || allText.includes("intemper")) {
    clinical.push("Avaliação de tolerância ao calor, hidratação e condições clínicas agravadas pela exposição");
  }
  if (
    state.scenarios.trabalhoAltura ||
    state.scenarios.eletricidade ||
    allText.includes("veiculo") ||
    allText.includes("violencia")
  ) {
    clinical.push("Avaliação clínica dirigida às exigências e aos riscos críticos da atividade, sem presunção automática de aptidão");
  }

  return {
    periodicity: risks.length
      ? "A cada 12 meses, ou em intervalo menor definido pelo médico responsável"
      : "A cada 24 meses, salvo indicação médica ou mudança de risco",
    complementaryExams: complementary.length
      ? unique(complementary).join("; ")
      : "Não predefinidos; solicitar somente por indicação médica e conforme os riscos confirmados",
    clinicalFocus: unique(clinical).join("; "),
  };
}

export function getPcmsoProtocolRows(state: PgrState): PcmsoProtocolRow[] {
  return getSelectedRoles(state).map((role) => {
    const riskDetails = getRoleRiskDetails(state, role);
    const defaults = defaultPcmsoProtocol(state, role);
    const override = state.pcmso.roleProtocols[role.id];
    return {
      roleId: role.id,
      roleName: role.name,
      ghe: role.ghe,
      quantity: role.quantity,
      riskFactors: riskDetails.length
        ? riskDetails
            .map((detail) => `${detail.risk.type}: ${detail.risk.source} — ${detail.status}`)
            .join("; ")
        : "Nenhum risco ocupacional incluído no inventário",
      possibleHarms: riskDetails.length
        ? riskDetails.map((detail) => `${detail.risk.type}: ${detail.risk.damages}`).join("; ")
        : "A confirmar",
      clinicalFocus: override?.clinicalFocus || defaults.clinicalFocus,
      complementaryExams: override?.complementaryExams || defaults.complementaryExams,
      periodicity: override?.periodicity || defaults.periodicity,
    };
  });
}

export interface LtcatExposureRow {
  key: string;
  roleId: string;
  roleName: string;
  ghe: string;
  riskId: string;
  agentType: string;
  source: string;
  damages: string;
  assessment: LtcatRiskAssessment;
}

function defaultLtcatAssessment(role: RoleDefinition, risk: RiskDefinition): LtcatRiskAssessment {
  const riskText = normalized(`${risk.type} ${risk.source}`);
  const isBiological = riskText.includes("biologic");
  const isNoise = riskText.includes("ruido");
  const isChemical = riskText.includes("quimic") || riskText.includes("gases");
  return {
    method: isBiological ? "Qualitativa" : "Pendente",
    result: "",
    unit: isNoise ? "dB(A)" : "",
    criterion: isNoise
      ? "Decreto 3.048/1999, Anexo IV, e procedimento técnico aplicável à exposição ocupacional ao ruído"
      : isBiological
        ? "Decreto 3.048/1999, Anexo IV; caracterização qualitativa conforme atividade e condições reais"
        : isChemical
          ? "Decreto 3.048/1999, Anexo IV; agente, concentração e metodologia a confirmar"
          : "Decreto 3.048/1999, Anexo IV, e critério técnico aplicável ao agente",
    exposure: risk.source,
    epc: "A confirmar na inspeção técnica",
    epi: role.epis.length ? role.epis.join("; ") : "A confirmar",
    effectiveness: "Pendente",
    conclusion: "Pendente de avaliação técnica",
  };
}

export function getLtcatExposureRows(state: PgrState): LtcatExposureRow[] {
  return getSelectedRoles(state).flatMap((role) =>
    includedRisksForRole(state, role)
      .filter(isPotentialPrevidentiaryAgent)
      .map((risk) => {
        const key = `${role.id}:${risk.id}`;
        const defaults = defaultLtcatAssessment(role, risk);
        return {
          key,
          roleId: role.id,
          roleName: role.name,
          ghe: role.ghe,
          riskId: risk.id,
          agentType: risk.type,
          source: risk.source,
          damages: risk.damages,
          assessment: { ...defaults, ...state.ltcat.riskAssessments[key] },
        };
      }),
  );
}

export interface LtcatFunctionRow {
  roleId: string;
  roleName: string;
  ghe: string;
  quantity: number;
  description: string;
  riskDetails: RoleRiskDetail[];
  potentialAgentCount: number;
  assessment: LtcatFunctionAssessment;
}

export function getLtcatFunctionRows(state: PgrState): LtcatFunctionRow[] {
  return getSelectedRoles(state).map((role) => {
    const riskDetails = getRoleRiskDetails(state, role);
    const saved = state.ltcat.functionAssessments[role.id];
    return {
      roleId: role.id,
      roleName: role.name,
      ghe: role.ghe,
      quantity: role.quantity,
      description: role.description,
      riskDetails,
      potentialAgentCount: riskDetails.filter((detail) => detail.included && detail.potentialPrevidentiaryAgent).length,
      assessment: {
        environmentalConditions:
          saved?.environmentalConditions ||
          `Atividade: ${role.description} Ambientes, fontes geradoras, frequência, duração e medidas de controle devem ser confirmados na inspeção técnica.`,
        conclusion: saved?.conclusion || "Pendente de avaliação técnica",
      },
    };
  });
}

export function ltcatRowIsComplete(row: LtcatExposureRow) {
  const assessment = row.assessment;
  if (assessment.method === "Pendente" || assessment.conclusion === "Pendente de avaliação técnica") return false;
  if (!assessment.criterion.trim() || !assessment.exposure.trim()) return false;
  if (assessment.method === "Quantitativa" && (!assessment.result.trim() || !assessment.unit.trim())) return false;
  return true;
}

export function getPcmsoReadiness(state: PgrState) {
  const fields = [
    state.pcmso.startDate,
    state.pcmso.endDate,
    state.pcmso.cnae,
    state.pcmso.riskGrade,
    state.pcmso.physicianName,
    state.pcmso.physicianCrm,
  ];
  return Math.round((fields.filter((value) => String(value).trim()).length / fields.length) * 100);
}

export function getLtcatReadiness(state: PgrState) {
  const rows = getLtcatExposureRows(state);
  const functions = getLtcatFunctionRows(state);
  const professionalComplete = Boolean(
    state.ltcat.professionalName.trim() &&
      state.ltcat.professionalTitle &&
      state.ltcat.professionalRegistration.trim() &&
      state.ltcat.assessmentDate,
  );
  const completedRows = rows.length ? rows.filter(ltcatRowIsComplete).length / rows.length : 1;
  const completedFunctions = functions.length
    ? functions.filter(
        (row) =>
          row.assessment.environmentalConditions.trim() &&
          row.assessment.conclusion !== "Pendente de avaliação técnica",
      ).length / functions.length
    : 0;
  return Math.round(((professionalComplete ? 1 : 0) + completedRows + completedFunctions) / 3 * 100);
}

export function getRoleDefinition(roleId: string) {
  return getRole(roleId);
}
