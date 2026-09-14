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
}
