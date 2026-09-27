export type ScenarioId =
  | "produtosQuimicos"
  | "sanitariosResiduos"
  | "areasMolhadas"
  | "circulacaoVeiculos"
  | "areasExternas"
  | "ferramentas"
  | "eletricidade"
  | "trabalhoAltura"
  | "segurancaPatrimonial"
  | "trabalhoNoturno"
  | "garagemFechada"
  | "incendioEmergencia"
  | "atividadesNaoRotineiras";

export type Severity = 1 | 3 | 6 | 9;
export type Probability = 0 | 1 | 2 | 4 | 6 | 8;

export interface RiskDefinition {
  id: string;
  type: string;
  source: string;
  damages: string;
  severity: Severity;
  probability: Probability;
  treatment: string;
  condition?: ScenarioId;
}

export interface RoleDefinition {
  id: string;
  name: string;
  ghe: string;
  gheName: string;
  description: string;
  riskIds: string[];
  epis: string[];
}

export interface CondoDefinition {
  id: string;
  name: string;
  cnpj?: string;
  expectedTotal: number | null;
  suggestedRoleIds: string[];
  fixedCounts?: Record<string, number>;
  note?: string;
}

export interface ScenarioDefinition {
  id: ScenarioId;
  label: string;
  description: string;
  section: string;
  suggestedForGhes?: string[];
}

export interface ActionDefinition {
  id: string;
  action: string;
  ghe: string;
  priority: "Alta" | "Média" | "Contínua";
  deadline: string;
  responsible: string;
  condition?: ScenarioId;
}

export const gheCatalog = [
  { id: "GHE 01", name: "Administrativo e Gestão" },
  { id: "GHE 02", name: "Limpeza e Conservação" },
  { id: "GHE 03", name: "Portaria e Recepção" },
  { id: "GHE 04", name: "Zeladoria" },
  { id: "GHE 05", name: "Controle Patrimonial" },
  { id: "GHE 06", name: "Manutenção" },
  { id: "GHE 07", name: "Garagem" },
  { id: "GHE 08", name: "Encarregado Operacional" },
] as const;

export const riskCatalog: RiskDefinition[] = [
  {
    id: "admin-ergonomia",
    type: "Ergonômico",
    source: "Postura, computador e demanda cognitiva",
    damages: "Desconforto, DORT e fadiga",
    severity: 3,
    probability: 4,
    treatment: "Adequar mobiliário, pausas e organização do trabalho",
  },
  {
    id: "admin-acidentes",
    type: "Acidentes",
    source: "Circulação, escadas e áreas comuns",
    damages: "Quedas e contusões",
    severity: 3,
    probability: 2,
    treatment: "Manter rotas seguras, iluminadas e desobstruídas",
  },
  {
    id: "admin-psicossocial",
    type: "Psicossocial",
    source: "Demandas, conflitos e organização do trabalho",
    damages: "Estresse e adoecimento",
    severity: 3,
    probability: 4,
    treatment: "Avaliar carga, comunicação e organização do trabalho",
  },
  {
    id: "limpeza-quimico",
    type: "Químico",
    source: "Saneantes e produtos de limpeza",
    damages: "Irritação, dermatites e intoxicação",
    severity: 3,
    probability: 4,
    treatment: "FDS, identificação, diluição segura e EPI compatível",
    condition: "produtosQuimicos",
  },
  {
    id: "limpeza-biologico",
    type: "Biológico",
    source: "Sanitários, resíduos e superfícies contaminadas",
    damages: "Infecções e outros agravos",
    severity: 6,
    probability: 2,
    treatment: "Procedimentos de higiene, descarte e proteção adequada",
    condition: "sanitariosResiduos",
  },
  {
    id: "limpeza-acidentes",
    type: "Acidentes",
    source: "Piso molhado, cortes e perfurações",
    damages: "Quedas, cortes e contusões",
    severity: 6,
    probability: 4,
    treatment: "Sinalização, organização e utensílios em bom estado",
  },
  {
    id: "limpeza-ergonomia",
    type: "Ergonômico",
    source: "Força, postura e repetitividade",
    damages: "DORT e fadiga",
    severity: 3,
    probability: 4,
    treatment: "Métodos adequados, alternância de tarefas e AEP",
  },
  {
    id: "limpeza-fisico",
    type: "Físico",
    source: "Umidade, calor e ruído eventual",
    damages: "Fadiga e desconforto",
    severity: 3,
    probability: 2,
    treatment: "Confirmar exposição e manter controles",
    condition: "areasMolhadas",
  },
  {
    id: "portaria-ergonomia",
    type: "Ergonômico",
    source: "Permanência sentada ou em pé",
    damages: "Fadiga e DORT",
    severity: 3,
    probability: 4,
    treatment: "Alternância de postura, mobiliário e pausas",
  },
  {
    id: "portaria-veiculos",
    type: "Acidentes",
    source: "Circulação de veículos, acessos e escadas",
    damages: "Atropelamento, queda e trauma",
    severity: 6,
    probability: 2,
    treatment: "Separar fluxos, sinalizar e orientar manobras",
    condition: "circulacaoVeiculos",
  },
  {
    id: "portaria-psicossocial",
    type: "Psicossocial",
    source: "Atendimento ao público e conflitos",
    damages: "Estresse e desgaste emocional",
    severity: 3,
    probability: 4,
    treatment: "Protocolos de atendimento e apoio da gestão",
  },
  {
    id: "portaria-intemperies",
    type: "Físico",
    source: "Intempéries e ruído ambiental",
    damages: "Desconforto e outros agravos",
    severity: 3,
    probability: 2,
    treatment: "Abrigo, hidratação e proteção conforme exposição",
    condition: "areasExternas",
  },
  {
    id: "zeladoria-acidentes",
    type: "Acidentes",
    source: "Ferramentas, quedas e objetos",
    damages: "Cortes, contusões e traumas",
    severity: 6,
    probability: 4,
    treatment: "Inspeção, organização e procedimento de trabalho",
    condition: "ferramentas",
  },
  {
    id: "zeladoria-eletrico",
    type: "Elétrico",
    source: "Instalações e equipamentos elétricos",
    damages: "Choque, queimadura e óbito",
    severity: 9,
    probability: 2,
    treatment: "Somente pessoal autorizado e controles da NR-10",
    condition: "eletricidade",
  },
  {
    id: "zeladoria-altura",
    type: "Acidentes",
    source: "Trabalho com risco de queda de nível",
    damages: "Trauma grave ou fatal",
    severity: 9,
    probability: 2,
    treatment: "Planejamento, proteção coletiva e controles da NR-35",
    condition: "trabalhoAltura",
  },
  {
    id: "zeladoria-ergonomia",
    type: "Ergonômico",
    source: "Força, alcance e posturas forçadas",
    damages: "DORT e fadiga",
    severity: 3,
    probability: 4,
    treatment: "Organização, ferramentas adequadas e AEP",
  },
  {
    id: "patrimonio-violencia",
    type: "Acidentes e violência",
    source: "Conflitos, roubos e agressões",
    damages: "Trauma grave",
    severity: 9,
    probability: 2,
    treatment: "Protocolo de comunicação e não confrontação",
    condition: "segurancaPatrimonial",
  },
  {
    id: "patrimonio-intemperies",
    type: "Físico",
    source: "Exposição a intempéries",
    damages: "Desconforto e outros agravos",
    severity: 3,
    probability: 2,
    treatment: "Abrigo, hidratação e proteção conforme exposição",
    condition: "areasExternas",
  },
  {
    id: "patrimonio-psicossocial",
    type: "Psicossocial",
    source: "Vigilância, conflitos e trabalho noturno",
    damages: "Estresse e fadiga",
    severity: 6,
    probability: 2,
    treatment: "Procedimentos, comunicação e organização de turnos",
  },
  {
    id: "manutencao-acidentes",
    type: "Acidentes",
    source: "Ferramentas, projeções e cortes",
    damages: "Traumas e cortes",
    severity: 6,
    probability: 4,
    treatment: "Inspeção pré-uso, proteção e procedimento",
    condition: "ferramentas",
  },
  {
    id: "manutencao-eletrico",
    type: "Elétrico",
    source: "Instalações elétricas",
    damages: "Choque, queimadura e óbito",
    severity: 9,
    probability: 2,
    treatment: "Desenergização, bloqueio e controles da NR-10",
    condition: "eletricidade",
  },
  {
    id: "manutencao-altura",
    type: "Acidentes",
    source: "Trabalho com risco de queda de nível",
    damages: "Trauma grave ou fatal",
    severity: 9,
    probability: 2,
    treatment: "Planejamento, SPIQ e controles da NR-35",
    condition: "trabalhoAltura",
  },
  {
    id: "manutencao-ruido",
    type: "Físico",
    source: "Ferramentas e equipamentos ruidosos",
    damages: "Perda auditiva e desconforto",
    severity: 6,
    probability: 2,
    treatment: "Avaliação preliminar, medição quando aplicável e controle",
    condition: "ferramentas",
  },
  {
    id: "manutencao-quimico",
    type: "Químico",
    source: "Tintas, solventes e outros produtos",
    damages: "Irritação e intoxicação",
    severity: 6,
    probability: 2,
    treatment: "FDS, ventilação e EPI compatível",
    condition: "produtosQuimicos",
  },
  {
    id: "garagem-acidentes",
    type: "Acidentes",
    source: "Movimentação de veículos",
    damages: "Atropelamento e esmagamento",
    severity: 9,
    probability: 2,
    treatment: "Controle de circulação e alta visibilidade",
    condition: "circulacaoVeiculos",
  },
  {
    id: "garagem-fisico",
    type: "Físico e químico",
    source: "Ruído, gases de combustão e calor",
    damages: "Desconforto e outros agravos",
    severity: 6,
    probability: 2,
    treatment: "Ventilação e avaliação ambiental quando necessária",
    condition: "garagemFechada",
  },
  {
    id: "garagem-ergonomia",
    type: "Ergonômico",
    source: "Permanência em pé e deslocamentos",
    damages: "Fadiga e DORT",
    severity: 3,
    probability: 4,
    treatment: "Organização do trabalho, pausas e AEP",
  },
  {
    id: "encarregado-ergonomia",
    type: "Ergonômico",
    source: "Coordenação e atividade administrativa",
    damages: "Fadiga e DORT",
    severity: 3,
    probability: 4,
    treatment: "Organização, pausas e avaliação ergonômica",
  },
  {
    id: "encarregado-acidentes",
    type: "Acidentes",
    source: "Circulação e atividade supervisionada",
    damages: "Quedas e traumas",
    severity: 6,
    probability: 2,
    treatment: "Aplicar controles da área acompanhada",
  },
  {
    id: "encarregado-processo",
    type: "Processo",
    source: "Riscos das equipes acompanhadas",
    damages: "Conforme atividade",
    severity: 6,
    probability: 2,
    treatment: "Ajustar aos GHEs efetivamente supervisionados",
  },
];

const managementRisks = ["admin-ergonomia", "admin-acidentes", "admin-psicossocial"];
const cleaningRisks = [
  "limpeza-quimico",
  "limpeza-biologico",
  "limpeza-acidentes",
  "limpeza-ergonomia",
  "limpeza-fisico",
];
const receptionRisks = [
  "portaria-ergonomia",
  "portaria-veiculos",
  "portaria-psicossocial",
  "portaria-intemperies",
];
const caretakerRisks = [
  "zeladoria-acidentes",
  "zeladoria-eletrico",
  "zeladoria-altura",
  "zeladoria-ergonomia",
];
const securityRisks = [
  "patrimonio-violencia",
  "patrimonio-intemperies",
  "patrimonio-psicossocial",
];

const managementEpis = [
  "Sem EPI automático em atividade exclusivamente administrativa",
  "EPI obrigatório da área quando houver acesso operacional",
];

export const roleCatalog: RoleDefinition[] = [
  {
    id: "auxiliar-servicos-gerais",
    name: "Auxiliar de Serviços Gerais",
    ghe: "GHE 02",
    gheName: "Limpeza e Conservação",
    description:
      "Executar limpeza e conservação de áreas comuns, pisos, corredores, escadas, halls, sanitários e áreas externas; coletar e acondicionar resíduos; utilizar utensílios e saneantes.",
    riskIds: cleaningRisks,
    epis: ["Luva compatível", "Calçado antiderrapante", "Óculos contra respingos", "Avental impermeável quando aplicável", "Proteção adicional conforme FDS"],
  },
  {
    id: "servicos-gerais",
    name: "Serviços Gerais",
    ghe: "GHE 02",
    gheName: "Limpeza e Conservação",
    description:
      "Executar limpeza, conservação, apoio operacional e movimentação de materiais conforme a rotina do condomínio.",
    riskIds: cleaningRisks,
    epis: ["Luva compatível", "Calçado de segurança", "Óculos", "Avental conforme atividade"],
  },
  {
    id: "agente-limpeza",
    name: "Agente de Limpeza",
    ghe: "GHE 02",
    gheName: "Limpeza e Conservação",
    description:
      "Realizar higienização e conservação de ambientes, superfícies e sanitários com utilização de produtos saneantes.",
    riskIds: cleaningRisks,
    epis: ["Luva compatível", "Calçado antiderrapante", "Óculos", "Avental impermeável", "Proteção adicional conforme FDS"],
  },
  {
    id: "porteiro",
    name: "Porteiro",
    ghe: "GHE 03",
    gheName: "Portaria e Recepção",
    description:
      "Controlar acesso de moradores, visitantes e prestadores; atender o público; receber correspondências e comunicar ocorrências.",
    riskIds: receptionRisks,
    epis: ["Sem EPI automático", "Colete de alta visibilidade quando aplicável", "Capa de chuva e proteção solar quando aplicável"],
  },
  {
    id: "porteiro-edificio",
    name: "Porteiro de Edifício",
    ghe: "GHE 03",
    gheName: "Portaria e Recepção",
    description: "Executar atividades de portaria e controle de acesso em edifício.",
    riskIds: receptionRisks,
    epis: ["Sem EPI automático", "Colete de alta visibilidade quando aplicável", "Capa de chuva quando aplicável"],
  },
  {
    id: "recepcionista",
    name: "Recepcionista",
    ghe: "GHE 03",
    gheName: "Portaria e Recepção",
    description:
      "Recepcionar usuários, atender telefone, cadastrar visitantes, orientar o público e executar rotinas administrativas da recepção.",
    riskIds: receptionRisks,
    epis: ["Sem EPI em atividade administrativa", "EPI da área ao acessar operação"],
  },
  {
    id: "zelador",
    name: "Zelador",
    ghe: "GHE 04",
    gheName: "Zeladoria",
    description:
      "Inspecionar áreas, acompanhar prestadores, apoiar a conservação e executar pequenos reparos conforme a rotina do condomínio.",
    riskIds: caretakerRisks,
    epis: ["Calçado de segurança", "Luvas adequadas", "Óculos", "Capacete quando aplicável", "Protetor auditivo quando indicado", "SPIQ quando aplicável"],
  },
  {
    id: "zelador-edificio",
    name: "Zelador de Edifício",
    ghe: "GHE 04",
    gheName: "Zeladoria",
    description: "Executar atividades de zeladoria e conservação predial conforme a rotina local.",
    riskIds: caretakerRisks,
    epis: ["Calçado de segurança", "Luvas adequadas", "Óculos", "Capacete quando aplicável", "SPIQ quando aplicável"],
  },
  {
    id: "agente-patrimonio",
    name: "Agente de Patrimônio",
    ghe: "GHE 05",
    gheName: "Controle Patrimonial",
    description:
      "Realizar controle patrimonial, controle de acesso, rondas, observação e apoio à segurança do patrimônio conforme o contrato.",
    riskIds: securityRisks,
    epis: ["Calçado adequado", "Colete de alta visibilidade quando aplicável", "Capa de chuva", "Proteção solar"],
  },
  {
    id: "vigia",
    name: "Vigia",
    ghe: "GHE 05",
    gheName: "Controle Patrimonial",
    description: "Realizar vigilância e observação de áreas, controle e comunicação de ocorrências conforme o contrato.",
    riskIds: securityRisks,
    epis: ["Calçado adequado", "Colete de alta visibilidade quando aplicável", "Capa de chuva", "Proteção solar"],
  },
  {
    id: "manutencista",
    name: "Manutencista",
    ghe: "GHE 06",
    gheName: "Manutenção",
    description:
      "Executar manutenção predial preventiva e corretiva, pequenos reparos, uso de ferramentas manuais ou elétricas e apoio a sistemas prediais.",
    riskIds: ["manutencao-acidentes", "manutencao-eletrico", "manutencao-altura", "manutencao-ruido", "manutencao-quimico"],
    epis: ["Capacete", "Óculos", "Calçado de segurança", "Luvas adequadas", "Proteção auditiva, facial ou respiratória conforme risco", "SPIQ quando aplicável"],
  },
  {
    id: "garagista",
    name: "Garagista",
    ghe: "GHE 07",
    gheName: "Garagem",
    description:
      "Orientar e apoiar a movimentação e o estacionamento de veículos, controlar vagas e circular na garagem.",
    riskIds: ["garagem-acidentes", "garagem-fisico", "garagem-ergonomia"],
    epis: ["Calçado de segurança", "Colete de alta visibilidade", "Proteção auditiva se indicada", "Luva quando necessária", "Capa de chuva quando aplicável"],
  },
  {
    id: "encarregado",
    name: "Encarregado",
    ghe: "GHE 08",
    gheName: "Encarregado Operacional",
    description:
      "Coordenar a equipe, distribuir tarefas, acompanhar a execução e verificar o cumprimento dos procedimentos, podendo atuar em campo.",
    riskIds: ["encarregado-ergonomia", "encarregado-acidentes", "encarregado-processo"],
    epis: ["EPI conforme atividade e área acompanhada"],
  },
  ...[
    ["gerente", "Gerente", "Gerenciar operação e contratos, supervisionar equipes, atender demandas e realizar inspeções e deslocamentos."],
    ["gerente-administrativo", "Gerente Administrativo", "Gerenciar rotinas administrativas, pessoal, documentos e atendimento."],
    ["gerente-operacional", "Gerente Operacional", "Gerenciar a operação, acompanhar equipes e resultados e circular pelos condomínios."],
    ["gerente-predial", "Gerente Predial", "Acompanhar funcionamento predial, fornecedores, manutenção, demandas de moradores e infraestrutura."],
    ["coordenador-administrativo", "Coordenador Administrativo", "Coordenar atividades administrativas e atendimento."],
    ["coordenador-operacional", "Coordenador Operacional", "Coordenar equipes operacionais, acompanhar serviços e realizar inspeções."],
    ["supervisor", "Supervisor", "Supervisionar rotinas, equipes e cumprimento de procedimentos."],
    ["supervisor-administrativo", "Supervisor Administrativo", "Supervisionar rotinas administrativas, atendimento e controles."],
    ["supervisor-operacional", "Supervisor Operacional", "Supervisionar equipes e a execução dos serviços nas áreas contratadas."],
    ["assistente-administrativo", "Assistente Administrativo", "Executar rotinas administrativas, controles, documentos, atendimento e trabalho em computador."],
    ["assistente-dp", "Assistente de Departamento de Pessoal", "Executar rotinas de pessoal, documentos, atendimento e sistemas informatizados."],
    ["assistente-operacional", "Assistente Operacional", "Apoiar a supervisão e a operação, realizar registros, acompanhamento e deslocamentos."],
  ].map(([id, name, description]) => ({
    id,
    name,
    ghe: "GHE 01",
    gheName: "Administrativo e Gestão",
    description,
    riskIds: managementRisks,
    epis: managementEpis,
  })),
];

export const condoCatalog: CondoDefinition[] = [
  { id: "porto-rico", name: "Porto Rico Residencial", cnpj: "61.844.360/0001-64", expectedTotal: 1, suggestedRoleIds: ["auxiliar-servicos-gerais"], fixedCounts: { "auxiliar-servicos-gerais": 1 } },
  { id: "morada-milionarios-ii", name: "Condomínio Morada dos Milionários II", expectedTotal: 1, suggestedRoleIds: ["zelador"], fixedCounts: { zelador: 1 } },
  { id: "wa-serv", name: "WA SERV LTDA", cnpj: "60.278.560/0001-34", expectedTotal: 13, suggestedRoleIds: ["gerente", "agente-patrimonio", "supervisor-operacional", "auxiliar-servicos-gerais"], note: "O documento informa o total e os cargos, mas não apresenta a divisão das quantidades por cargo." },
  { id: "aguas-olivenca", name: "Condomínio Águas de Olivença Privê", cnpj: "26.124.434/0001-97", expectedTotal: null, suggestedRoleIds: [], note: "Condomínio incluído a partir do formulário NR-01. Confirmar quadro e funções com o RH." },
  { id: "vila-toscana", name: "Condomínio Residencial Vila Toscana", cnpj: "29.750.278/0001-68", expectedTotal: 1, suggestedRoleIds: ["zelador"], fixedCounts: { zelador: 1 } },
  { id: "san-marino", name: "Condomínio San Marino Residencial", cnpj: "44.417.728/0001-99", expectedTotal: 5, suggestedRoleIds: ["supervisor-administrativo", "auxiliar-servicos-gerais"], note: "Confirmar a distribuição dos 5 trabalhadores entre os cargos indicados." },
  { id: "villa-lobos", name: "Condomínio Residencial Villa Lobos", cnpj: "16.595.824/0001-91", expectedTotal: 1, suggestedRoleIds: ["supervisor-operacional"], fixedCounts: { "supervisor-operacional": 1 } },
  { id: "victoria-blue", name: "Condomínio Victoria Blue", cnpj: "27.041.160/0001-35", expectedTotal: 1, suggestedRoleIds: ["auxiliar-servicos-gerais"], fixedCounts: { "auxiliar-servicos-gerais": 1 } },
  { id: "residencial-vitoria", name: "Condomínio Residencial Vitoria", cnpj: "19.969.350/0001-99", expectedTotal: 1, suggestedRoleIds: ["zelador"], fixedCounts: { zelador: 1 } },
  { id: "salvador-dali", name: "Condomínio Residencial Salvador Dali", cnpj: "16.684.217/0001-06", expectedTotal: null, suggestedRoleIds: [], note: "Condomínio incluído a partir do formulário NR-01. Confirmar quadro e funções com o RH." },
  { id: "vania-almeida", name: "Condomínio Vania Almeida", cnpj: "08.444.405/0001-20", expectedTotal: null, suggestedRoleIds: [], note: "Condomínio incluído a partir do formulário NR-01. Confirmar quadro e funções com o RH." },
  { id: "dinamizza-gestao", name: "Dinamizza Gestão e Administração de Condomínios LTDA - ME", cnpj: "54.325.282/0001-26", expectedTotal: 12, suggestedRoleIds: ["gerente-administrativo", "gerente-operacional", "coordenador-administrativo", "coordenador-operacional", "supervisor-administrativo", "supervisor-operacional", "assistente-administrativo", "assistente-dp", "assistente-operacional"], note: "A base descreve a equipe como administrativa e operacional; confirmar cargos e quantidades." },
  { id: "henri-matisse", name: "Condomínio Residencial Henri Matisse", cnpj: "11.571.265/0001-66", expectedTotal: 7, suggestedRoleIds: ["porteiro", "zelador", "gerente-predial"], note: "Confirmar a distribuição dos 7 trabalhadores entre os três cargos." },
  { id: "helena-chaves", name: "Condomínio Edifício Helena Chaves", cnpj: "13.271.853/0001-00", expectedTotal: 5, suggestedRoleIds: ["porteiro", "zelador"], note: "Confirmar a distribuição dos 5 trabalhadores entre portaria e zeladoria." },
  { id: "barra-grande", name: "Condomínio Barra Grande Exclusive Residence", cnpj: "24.602.206/0001-50", expectedTotal: 7, suggestedRoleIds: ["vigia", "servicos-gerais", "encarregado", "gerente"], note: "Confirmar a distribuição dos 7 trabalhadores entre os cargos indicados." },
  { id: "praias-atlantico", name: "Praias do Atlântico Condomínio Clube", cnpj: "18.119.293/0001-96", expectedTotal: 7, suggestedRoleIds: ["auxiliar-servicos-gerais", "porteiro", "agente-limpeza", "zelador-edificio"], note: "Confirmar a distribuição dos 7 trabalhadores entre os cargos indicados." },
  { id: "palazzo-milano", name: "Residencial Palazzo de Milano", cnpj: "54.259.704/0001-02", expectedTotal: 3, suggestedRoleIds: ["auxiliar-servicos-gerais", "zelador"], note: "Confirmar a distribuição dos 3 trabalhadores entre os cargos indicados." },
  { id: "massimo", name: "Condomínio Massimo Residencial", cnpj: "24.282.833/0001-50", expectedTotal: 6, suggestedRoleIds: ["porteiro", "auxiliar-servicos-gerais"], note: "Confirmar a distribuição dos 6 trabalhadores entre portaria e limpeza." },
  { id: "dinamizza-servicos", name: "Dinamizza Serviços Terceirizados LTDA", cnpj: "52.483.353/0001-93", expectedTotal: 66, suggestedRoleIds: roleCatalog.map((role) => role.id), note: "A própria referência registra divergência entre o total informado e a soma das funções. Validar integralmente com o RH." },
  { id: "victoria-ville", name: "Condomínio Residencial Victoria Ville", cnpj: "06.192.186/0001-04", expectedTotal: 2, suggestedRoleIds: [], note: "A base contém dois registros de 1 trabalhador e recomenda verificar possível duplicidade e os cargos." },
  { id: "maria-leandra", name: "Condomínio Edifício Maria Leandra", cnpj: "16.420.960/0001-40", expectedTotal: 6, suggestedRoleIds: ["porteiro", "auxiliar-servicos-gerais"], note: "Confirmar a distribuição dos 6 trabalhadores entre portaria e limpeza." },
  { id: "beira-rio", name: "Centro Médico Odontológico Beira Rio", cnpj: "11.599.116/0001-05", expectedTotal: 6, suggestedRoleIds: ["auxiliar-servicos-gerais", "zelador", "porteiro"], note: "Confirmar a distribuição dos 6 trabalhadores entre os cargos indicados." },
  { id: "personalizado", name: "Novo condomínio", expectedTotal: null, suggestedRoleIds: [], note: "Preencha a identificação e monte o quadro de funcionários." },
];

export const scenarioCatalog: ScenarioDefinition[] = [
  { id: "produtosQuimicos", label: "Produtos químicos e saneantes", description: "Há uso ou armazenamento de saneantes, tintas, solventes ou outros produtos.", section: "Produtos químicos e FDS", suggestedForGhes: ["GHE 02", "GHE 06"] },
  { id: "sanitariosResiduos", label: "Sanitários e resíduos", description: "A equipe higieniza sanitários, coleta ou acondiciona resíduos.", section: "Risco biológico e procedimentos de limpeza", suggestedForGhes: ["GHE 02"] },
  { id: "areasMolhadas", label: "Lavagem e áreas molhadas", description: "Há lavagem de pisos, umidade ou risco recorrente de piso molhado.", section: "Umidade, quedas e sinalização", suggestedForGhes: ["GHE 02"] },
  { id: "circulacaoVeiculos", label: "Circulação de veículos", description: "Trabalhadores circulam ou permanecem próximos a acessos, manobras ou garagens.", section: "Controle de circulação", suggestedForGhes: ["GHE 03", "GHE 07"] },
  { id: "areasExternas", label: "Áreas externas e intempéries", description: "Há exposição habitual a sol, chuva, calor ou outras condições externas.", section: "Intempéries", suggestedForGhes: ["GHE 04", "GHE 05", "GHE 07"] },
  { id: "ferramentas", label: "Ferramentas e pequenos reparos", description: "A equipe utiliza ferramentas manuais ou elétricas em manutenção e conservação.", section: "Segurança com ferramentas", suggestedForGhes: ["GHE 04", "GHE 06"] },
  { id: "eletricidade", label: "Intervenção em eletricidade", description: "Há intervenção em instalações ou equipamentos elétricos por trabalhador autorizado.", section: "NR-10 e instalações elétricas" },
  { id: "trabalhoAltura", label: "Trabalho em altura", description: "Há atividade com risco de queda de nível que exige controles específicos.", section: "NR-35 e trabalho em altura" },
  { id: "segurancaPatrimonial", label: "Segurança patrimonial", description: "Há rondas, vigilância, controle patrimonial ou potencial de confronto.", section: "Violência e enquadramento da NR-16", suggestedForGhes: ["GHE 05"] },
  { id: "trabalhoNoturno", label: "Trabalho noturno", description: "Há trabalhadores em turno noturno ou escala com impacto de fadiga.", section: "Organização de turnos" },
  { id: "garagemFechada", label: "Garagem fechada", description: "Há trabalho em garagem com possível exposição a ruído e gases de combustão.", section: "Ventilação e avaliação ambiental", suggestedForGhes: ["GHE 07"] },
  { id: "incendioEmergencia", label: "Incêndio e emergência", description: "Integrar a equipe às rotas de fuga, meios de comunicação e plano do condomínio.", section: "Proteção contra incêndio e emergências" },
  { id: "atividadesNaoRotineiras", label: "Atividades não rotineiras e terceiros", description: "Há manutenção extraordinária, mudanças ou contratação de terceiros para atividades especiais.", section: "APR, AR e PT quando aplicáveis" },
];

export const environmentAreas = [
  "Áreas administrativas",
  "Portaria e acessos",
  "Halls e corredores",
  "Escadas e rampas",
  "Sanitários",
  "Áreas externas",
  "Garagens",
  "Áreas técnicas",
  "Depósitos e almoxarifados",
  "Locais de manutenção",
];

export const actionCatalog: ActionDefinition[] = [
  { id: "validar-quadro", action: "Validar cargos e quantitativos com o RH", ghe: "Todos", priority: "Alta", deadline: "Imediato", responsible: "RH/SST" },
  { id: "visita-tecnica", action: "Realizar visita técnica e confirmar ambientes e tarefas", ghe: "Todos", priority: "Alta", deadline: "30 dias", responsible: "SST" },
  { id: "revisar-epi", action: "Revisar matriz de EPI, CAs e registros de entrega", ghe: "Todos", priority: "Alta", deadline: "15 dias", responsible: "SST/Compras" },
  { id: "realizar-aep", action: "Realizar AEP e registrar os resultados no inventário", ghe: "GHEs aplicáveis", priority: "Média", deadline: "60 dias", responsible: "SST" },
  { id: "integrar-pcmso", action: "Integrar o PGR ao PCMSO", ghe: "Todos", priority: "Alta", deadline: "30 dias", responsible: "SST/Médico do Trabalho" },
  { id: "atualizar-pgr", action: "Atualizar o PGR após mudanças, acidentes ou novas exposições", ghe: "Todos", priority: "Contínua", deadline: "Contínuo", responsible: "SST" },
  { id: "inventario-fds", action: "Implantar inventário de produtos e manter as FDS disponíveis", ghe: "GHE 02/06", priority: "Alta", deadline: "15 dias", responsible: "Gestão/SST", condition: "produtosQuimicos" },
  { id: "avaliar-biologico", action: "Confirmar condições de limpeza de sanitários e manejo de resíduos", ghe: "GHE 02", priority: "Alta", deadline: "30 dias", responsible: "SST/Gestão", condition: "sanitariosResiduos" },
  { id: "plano-veiculos", action: "Revisar segregação de pedestres, sinalização e orientação de manobras", ghe: "GHE 03/07", priority: "Alta", deadline: "30 dias", responsible: "Gestão/Condomínio", condition: "circulacaoVeiculos" },
  { id: "avaliar-quantitativas", action: "Avaliar a necessidade de medições ambientais", ghe: "GHEs aplicáveis", priority: "Média", deadline: "60 dias", responsible: "Responsável técnico", condition: "garagemFechada" },
  { id: "nr16-patrimonio", action: "Verificar o enquadramento da atividade de segurança patrimonial na NR-16", ghe: "GHE 05", priority: "Alta", deadline: "30 dias", responsible: "Responsável técnico/Jurídico", condition: "segurancaPatrimonial" },
  { id: "nr10-eletrica", action: "Verificar autorização, capacitação e controles para atividades elétricas", ghe: "GHE 04/06", priority: "Alta", deadline: "30 dias", responsible: "SST/Manutenção", condition: "eletricidade" },
  { id: "nr35-altura", action: "Verificar capacitação, análise de risco e proteção contra quedas", ghe: "GHE 04/06", priority: "Alta", deadline: "30 dias", responsible: "SST", condition: "trabalhoAltura" },
  { id: "emergencia", action: "Compatibilizar procedimentos com o plano de emergência do condomínio", ghe: "Todos", priority: "Média", deadline: "60 dias", responsible: "Gestão/Condomínio", condition: "incendioEmergencia" },
  { id: "nao-rotineiras", action: "Definir fluxo de APR, AR e PT para serviços não rotineiros", ghe: "Todos", priority: "Média", deadline: "60 dias", responsible: "SST/Gestão", condition: "atividadesNaoRotineiras" },
];

export const normativeReferences = [
  "NR-01 – Disposições Gerais e Gerenciamento de Riscos Ocupacionais – GRO/PGR",
  "NR-04 – Serviços Especializados em Segurança e em Medicina do Trabalho, quando aplicável",
  "NR-05 – Comissão Interna de Prevenção de Acidentes e de Assédio – CIPA, quando aplicável",
  "NR-06 – Equipamento de Proteção Individual – EPI",
  "NR-07 – Programa de Controle Médico de Saúde Ocupacional – PCMSO",
  "NR-08 – Edificações",
  "NR-09 – Avaliação e Controle das Exposições Ocupacionais a Agentes Físicos, Químicos e Biológicos",
  "NR-10 – Segurança em Instalações e Serviços em Eletricidade, quando aplicável",
  "NR-11 – Transporte, Movimentação, Armazenagem e Manuseio de Materiais, quando aplicável",
  "NR-12 – Segurança no Trabalho em Máquinas e Equipamentos, quando aplicável",
  "NR-15 – Atividades e Operações Insalubres",
  "NR-16 – Atividades e Operações Perigosas",
  "NR-17 – Ergonomia",
  "NR-20 – Segurança e Saúde no Trabalho com Inflamáveis e Combustíveis, quando aplicável",
  "NR-21 – Trabalhos a Céu Aberto, quando aplicável",
  "NR-23 – Proteção Contra Incêndios",
  "NR-24 – Condições Sanitárias e de Conforto nos Locais de Trabalho",
  "NR-26 – Sinalização de Segurança",
  "NR-33 – Segurança e Saúde nos Trabalhos em Espaços Confinados, quando aplicável",
  "NR-35 – Trabalho em Altura, quando aplicável",
];

export const getRisk = (riskId: string) => riskCatalog.find((risk) => risk.id === riskId);
export const getRole = (roleId: string) => roleCatalog.find((role) => role.id === roleId);

export function classifyRisk(score: number) {
  if (score > 24) return "Alto";
  if (score >= 9) return "Médio";
  return "Baixo";
}

export function getSuggestedScenarios(roleIds: string[]): Record<ScenarioId, boolean> {
  const ghes = new Set(roleIds.map((id) => getRole(id)?.ghe).filter(Boolean));
  return Object.fromEntries(
    scenarioCatalog.map((scenario) => [
      scenario.id,
      scenario.id === "incendioEmergencia" ||
        scenario.id === "atividadesNaoRotineiras" ||
        Boolean(scenario.suggestedForGhes?.some((ghe) => ghes.has(ghe))),
    ]),
  ) as Record<ScenarioId, boolean>;
}
