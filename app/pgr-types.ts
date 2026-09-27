import type { Probability, ScenarioId, Severity } from "./pgr-data";

export interface RoleSelection {
  selected: boolean;
  quantity: number;
}

export interface RiskAssessment {
  severity: Severity;
  probability: Probability;
}

export interface ActionSettings {
  included: boolean;
  deadline: string;
  responsible: string;
}

export interface PcmsoRoleProtocol {
  periodicity: string;
  complementaryExams: string;
  clinicalFocus: string;
}

export interface PcmsoConfig {
  included: boolean;
  startDate: string;
  endDate: string;
  cnae: string;
  riskGrade: "" | "1" | "2" | "3" | "4";
  physicianName: string;
  physicianCrm: string;
  physicianRqe: string;
  clinicName: string;
  emergencyReferral: string;
  vaccinationGuidance: string;
  analyticalReportDueDate: string;
  notes: string;
  roleProtocols: Record<string, PcmsoRoleProtocol>;
}

export type LtcatAssessmentMethod = "Pendente" | "Qualitativa" | "Quantitativa";
export type LtcatEffectiveness = "Pendente" | "Sim" | "Não" | "Não se aplica";
export type LtcatConclusion =
  | "Pendente de avaliação técnica"
  | "Não caracterizada exposição especial"
  | "Caracterizada exposição especial";

export interface LtcatRiskAssessment {
  method: LtcatAssessmentMethod;
  result: string;
  unit: string;
  criterion: string;
  exposure: string;
  epc: string;
  epi: string;
  effectiveness: LtcatEffectiveness;
  conclusion: LtcatConclusion;
}

export interface LtcatFunctionAssessment {
  environmentalConditions: string;
  conclusion: LtcatConclusion;
}

export interface LtcatConfig {
  included: boolean;
  assessmentDate: string;
  professionalName: string;
  professionalTitle: "" | "Engenheiro de Segurança do Trabalho" | "Médico do Trabalho";
  professionalRegistration: string;
  inspectionMethod: string;
  equipment: string;
  calibration: string;
  technicalNotes: string;
  functionAssessments: Record<string, LtcatFunctionAssessment>;
  riskAssessments: Record<string, LtcatRiskAssessment>;
}

export interface PgrState {
  condoId: string;
  condoName: string;
  expectedTotal: number | null;
  cnpj: string;
  address: string;
  cityState: string;
  contractingCompany: string;
  localResponsible: string;
  issueDate: string;
  reviewDate: string;
  technicalResponsible: string;
  professionalTitle: string;
  professionalRegistration: string;
  environmentDescription: string;
  selectedAreas: string[];
  notes: string;
  roles: Record<string, RoleSelection>;
  scenarios: Record<ScenarioId, boolean>;
  riskOverrides: Record<string, boolean>;
  riskAssessments: Record<string, RiskAssessment>;
  actions: Record<string, ActionSettings>;
  pcmso: PcmsoConfig;
  ltcat: LtcatConfig;
}
