import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  PageBreak,
  PageNumber,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from "docx";

import {
  classifyRisk,
  getRisk,
  getRole,
  gheCatalog,
  normativeReferences,
  scenarioCatalog,
  type ActionDefinition,
  type Probability,
  type RiskDefinition,
  type Severity,
} from "./pgr-data";
import type { PgrState } from "./pgr-types";
import { getIncludedActions, getSelectedRoles } from "./pgr-selectors";

const COLORS = {
  navy: "163B55",
  navySoft: "E9F0F4",
  ink: "17212B",
  muted: "5A6872",
  line: "D9E0E5",
  pale: "F5F7F8",
  white: "FFFFFF",
  green: "DDEFE4",
  yellow: "FFF0BF",
  red: "F8D6D6",
};

const tableBorders = {
  top: { style: BorderStyle.SINGLE, size: 1, color: COLORS.line },
  bottom: { style: BorderStyle.SINGLE, size: 1, color: COLORS.line },
  left: { style: BorderStyle.SINGLE, size: 1, color: COLORS.line },
  right: { style: BorderStyle.SINGLE, size: 1, color: COLORS.line },
  insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: COLORS.line },
  insideVertical: { style: BorderStyle.SINGLE, size: 1, color: COLORS.line },
};

const cellMargins = { top: 105, bottom: 105, left: 125, right: 125 };

function text(value: unknown, fallback = "Não informado") {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

function formatDate(value: string) {
  if (!value) return "Não informada";
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function bodyParagraph(value: string, options: { boldLead?: string; italic?: boolean; align?: (typeof AlignmentType)[keyof typeof AlignmentType] } = {}) {
  const { boldLead, italic, align } = options;
  const children: TextRun[] = [];
  if (boldLead && value.startsWith(boldLead)) {
    children.push(new TextRun({ text: boldLead, bold: true }));
    children.push(new TextRun({ text: value.slice(boldLead.length), italics: italic }));
  } else {
    children.push(new TextRun({ text: value, italics: italic }));
  }
  return new Paragraph({
    children,
    alignment: align,
    spacing: { after: 150, line: 300 },
  });
}

function bullet(value: string) {
  return new Paragraph({
    children: [new TextRun(value)],
    bullet: { level: 0 },
    spacing: { after: 90, line: 285 },
  });
}

function heading(value: string) {
  return new Paragraph({
    text: value,
    heading: HeadingLevel.HEADING_1,
    keepNext: true,
    spacing: { before: 260, after: 140 },
  });
}

function subheading(value: string) {
  return new Paragraph({
    text: value,
    heading: HeadingLevel.HEADING_2,
    keepNext: true,
    spacing: { before: 210, after: 110 },
  });
}

function tableCell(
  value: string | Paragraph[],
  options: { header?: boolean; fill?: string; width?: number; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; bold?: boolean } = {},
) {
  const { header, fill, width, align = AlignmentType.LEFT, bold } = options;
  const children = Array.isArray(value)
    ? value
    : [
        new Paragraph({
          children: [new TextRun({ text: value, bold: header || bold, color: header ? COLORS.white : COLORS.ink, size: header ? 18 : 18 })],
          alignment: align,
          spacing: { after: 0, line: 240 },
        }),
      ];
  return new TableCell({
    children,
    borders: tableBorders,
    margins: cellMargins,
    verticalAlign: VerticalAlign.CENTER,
    width: width ? { size: width, type: WidthType.PERCENTAGE } : undefined,
    shading: header
      ? { fill: COLORS.navy, color: "auto", type: ShadingType.CLEAR }
      : fill
        ? { fill, color: "auto", type: ShadingType.CLEAR }
        : undefined,
  });
}

function dataTable(headers: string[], rows: string[][], widths?: number[]) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: tableBorders,
    rows: [
      new TableRow({
        tableHeader: true,
        cantSplit: true,
        children: headers.map((header, index) => tableCell(header, { header: true, width: widths?.[index] })),
      }),
      ...rows.map(
        (row, rowIndex) =>
          new TableRow({
            cantSplit: true,
            children: row.map((cell, cellIndex) =>
              tableCell(cell, {
                width: widths?.[cellIndex],
                fill: rowIndex % 2 ? COLORS.pale : COLORS.white,
                align: cellIndex === 0 ? AlignmentType.LEFT : AlignmentType.LEFT,
              }),
            ),
          }),
      ),
    ],
  });
}

function borderlessCell(
  value: string,
  bold = false,
  align: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.LEFT,
) {
  const none = { style: BorderStyle.NONE, size: 0, color: COLORS.white };
  return new TableCell({
    children: [
      new Paragraph({
        children: [new TextRun({ text: value, bold, color: COLORS.ink })],
        alignment: align,
        spacing: { after: 0 },
      }),
    ],
    borders: { top: none, bottom: none, left: none, right: none },
    margins: { top: 40, bottom: 40, left: 0, right: 0 },
    verticalAlign: VerticalAlign.CENTER,
  });
}

function sectionGap() {
  return new Paragraph({ spacing: { after: 90 } });
}

function riskKey(roleId: string, riskId: string) {
  return `${roleId}:${riskId}`;
}

function riskIsIncluded(state: PgrState, roleId: string, risk: RiskDefinition) {
  const override = state.riskOverrides[riskKey(roleId, risk.id)];
  if (typeof override === "boolean") return override;
  return !risk.condition || Boolean(state.scenarios[risk.condition]);
}

function riskAssessment(state: PgrState, roleId: string, risk: RiskDefinition) {
  return state.riskAssessments[riskKey(roleId, risk.id)] ?? {
    severity: risk.severity,
    probability: risk.probability,
  };
}

function actionValue(state: PgrState, action: ActionDefinition) {
  const setting = state.actions[action.id];
  return {
    deadline: setting?.deadline || action.deadline,
    responsible: setting?.responsible || action.responsible,
  };
}

function riskClassFill(score: number) {
  const classification = classifyRisk(score);
  if (classification === "Alto") return COLORS.red;
  if (classification === "Médio") return COLORS.yellow;
  return COLORS.green;
}

function selectedScenarioLabels(state: PgrState) {
  return scenarioCatalog.filter((item) => state.scenarios[item.id]).map((item) => item.label);
}

function selectedGhes(state: PgrState) {
  const ids = new Set(getSelectedRoles(state).map((role) => role.ghe));
  return gheCatalog.filter((ghe) => ids.has(ghe.id));
}

function addConditionalStatement(enabled: boolean, enabledText: string, disabledText: string) {
  return bodyParagraph(enabled ? enabledText : disabledText);
}

export function buildPgrDocument(state: PgrState) {
  const selectedRoles = getSelectedRoles(state);
  const totalWorkers = selectedRoles.reduce((sum, role) => sum + role.quantity, 0);
  const ghes = selectedGhes(state);
  const actions = getIncludedActions(state);
  const areas = state.selectedAreas.length ? state.selectedAreas.join(", ") : "Áreas a confirmar em visita técnica";
  const scenarioLabels = selectedScenarioLabels(state);

  const children: (Paragraph | Table)[] = [];

  children.push(
    new Paragraph({
      children: [new TextRun({ text: "GRUPO DINAMIZZA", bold: true, color: COLORS.navy, size: 22, characterSpacing: 80 })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 980, after: 650 },
    }),
    new Paragraph({
      text: "Programa de Gerenciamento de Riscos",
      style: "Title",
      alignment: AlignmentType.CENTER,
      spacing: { after: 180 },
    }),
    new Paragraph({
      children: [new TextRun({ text: "Serviços terceirizados em condomínios e edificações prontas", bold: true, size: 26 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
    new Paragraph({
      children: [new TextRun({ text: text(state.condoName), bold: true, color: COLORS.navy, size: 30 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 680 },
    }),
    dataTable(
      ["Identificação", "Informação"],
      [
        ["Estabelecimento", text(state.condoName)],
        ["CNPJ", text(state.cnpj)],
        ["Endereço", [text(state.address), text(state.cityState, "")].filter(Boolean).join(" – ") || "Não informado"],
        ["Empresa prestadora", text(state.contractingCompany, "GRUPO DINAMIZZA")],
        ["Data de emissão", formatDate(state.issueDate)],
        ["Revisão prevista", formatDate(state.reviewDate)],
      ],
      [32, 68],
    ),
    new Paragraph({ spacing: { before: 520 } }),
    bodyParagraph(
      "Documento estruturado a partir da matriz-base fornecida. A emissão definitiva depende da confirmação das atividades, ambientes, exposições e controles em visita técnica e da validação do responsável técnico.",
      { italic: true, align: AlignmentType.CENTER },
    ),
    new Paragraph({ children: [new PageBreak()] }),
  );

  children.push(
    heading("Nota técnica de utilização"),
    bodyParagraph(
      "Este PGR foi configurado para o estabelecimento identificado, preservando a lógica do documento-base: reconhecimento, avaliação e classificação, organização por grupos homogêneos de exposição, inventário de riscos, medidas de controle, matriz de EPI, treinamentos, inspeções e plano de ação.",
    ),
    bodyParagraph(
      "As funções e quantidades devem ser confirmadas com o RH. A caracterização dos ambientes e das tarefas efetivamente executadas deve ser validada em visita técnica antes da emissão final do PGR, do LTCAT ou de conclusões sobre insalubridade e periculosidade.",
    ),
    heading("1. Identificação e escopo"),
    dataTable(
      ["Campo", "Informação"],
      [
        ["Estabelecimento", text(state.condoName)],
        ["CNPJ", text(state.cnpj)],
        ["Endereço", text(state.address)],
        ["Cidade e UF", text(state.cityState)],
        ["Responsável local", text(state.localResponsible)],
        ["Empresa prestadora", text(state.contractingCompany, "GRUPO DINAMIZZA")],
        ["Trabalhadores incluídos", String(totalWorkers)],
      ],
      [31, 69],
    ),
    sectionGap(),
    bodyParagraph(
      "O presente PGR abrange os trabalhadores selecionados que prestam serviços no estabelecimento, contemplando somente as funções, ambientes e exposições informados nesta configuração.",
    ),
    bodyParagraph(
      "As atividades rotineiras não são caracterizadas automaticamente como obras de construção civil. Intervenções de manutenção, reforma, instalação, trabalho em altura, eletricidade, uso de máquinas ou atividades especiais exigem análise específica e aplicação das NRs pertinentes.",
    ),
    heading("2. Objetivos do PGR"),
    bodyParagraph(
      "O Programa de Gerenciamento de Riscos tem por objetivo identificar perigos, avaliar e classificar riscos ocupacionais, definir medidas de prevenção e acompanhar a eficácia dos controles.",
    ),
    bullet("Identificar perigos e possíveis lesões ou agravos à saúde."),
    bullet("Avaliar e classificar os riscos segundo a metodologia definida."),
    bullet("Estabelecer medidas de prevenção conforme a hierarquia de controles."),
    bullet("Integrar o PGR ao PCMSO, treinamentos, inspeções e investigação de acidentes."),
    bullet("Atualizar o inventário diante de mudanças, novos riscos ou ocorrências."),
    heading("3. Referências normativas"),
    ...normativeReferences.map(bullet),
    bodyParagraph("As versões vigentes das normas e demais requisitos legais devem ser conferidas pelo responsável técnico na data da emissão."),
    heading("4. Responsabilidades"),
    subheading("4.1 Empregador e contratante"),
    bullet("Cumprir e fazer cumprir a legislação de SST e este PGR."),
    bullet("Disponibilizar recursos para implantação das medidas de prevenção."),
    bullet("Fornecer EPI adequado, gratuito e em condições de uso, com registro de entrega."),
    bullet("Comunicar mudanças de processo, ambiente, equipamento e função."),
    bullet("Investigar acidentes, incidentes e situações de risco."),
    subheading("4.2 Supervisores, encarregados e líderes"),
    bullet("Fiscalizar procedimentos, controles e uso dos EPIs definidos."),
    bullet("Interromper atividade diante de risco grave e iminente e comunicar o responsável."),
    bullet("Registrar desvios, incidentes, acidentes e mudanças nas condições de trabalho."),
    subheading("4.3 Trabalhadores"),
    bullet("Cumprir procedimentos, treinamentos e orientações de segurança."),
    bullet("Usar corretamente os EPIs e comunicar condições inseguras."),
    bullet("Não executar atividade para a qual não esteja capacitado ou autorizado."),
    subheading("4.4 Segurança e saúde no trabalho"),
    bullet("Manter o inventário de riscos e o plano de ação atualizados."),
    bullet("Realizar inspeções, acompanhar controles e integrar informações ao PCMSO."),
  );

  children.push(
    heading("5. Metodologia de reconhecimento e avaliação"),
    bodyParagraph(
      "O reconhecimento deve considerar atividade real, fonte geradora, agente, forma de exposição, frequência, duração, trabalhadores expostos, controles existentes e possíveis consequências. Para agentes físicos, químicos e biológicos, a análise preliminar define a necessidade de avaliação qualitativa ou quantitativa.",
    ),
    subheading("5.1 Classificação qualitativa pela matriz 6x4"),
    dataTable(
      ["Severidade", "Peso", "Descrição"],
      [
        ["Irrelevante", "1", "Sem lesão, doença ou efeito significativo"],
        ["Marginal", "3", "Lesão ou doença leve e reversível"],
        ["Crítica", "6", "Incapacidade ou dano irreversível"],
        ["Catastrófica", "9", "Morte ou evento de gravidade extrema"],
      ],
      [28, 14, 58],
    ),
    sectionGap(),
    dataTable(
      ["Probabilidade", "Peso", "Descrição"],
      [
        ["Impossível", "0", "Sem possibilidade identificada"],
        ["Raro", "1", "Até 10%"],
        ["Incomum", "2", "Entre 10% e 50%"],
        ["Ocasional", "4", "Entre 50% e 100%"],
        ["Frequente", "6", "Alta frequência"],
        ["Contínuo", "8", "Ocorrência recorrente ou muito provável"],
      ],
      [28, 14, 58],
    ),
    sectionGap(),
    dataTable(
      ["Pontuação", "Classificação", "Diretriz"],
      [
        ["0 a 8", "Baixo", "Manter controles e acompanhar"],
        ["9 a 24", "Médio", "Aperfeiçoar controles e monitorar"],
        ["Acima de 24", "Alto", "Tratar prioritariamente antes de manter a exposição"],
      ],
      [20, 25, 55],
    ),
    heading("6. Caracterização dos ambientes de trabalho"),
    bodyParagraph(
      text(
        state.environmentDescription,
        "O estabelecimento compreende as áreas selecionadas, que deverão ser verificadas quanto a ventilação, iluminação, circulação, condições do piso, acessos, sinalização, rotas de fuga, equipamentos de emergência, armazenamento e instalações elétricas.",
      ),
    ),
    bodyParagraph(`Áreas abrangidas: ${areas}.`, { boldLead: "Áreas abrangidas:" }),
    bodyParagraph(
      `Condições e atividades assinaladas: ${scenarioLabels.length ? scenarioLabels.join(", ") : "nenhuma condição adicional assinalada"}.`,
      { boldLead: "Condições e atividades assinaladas:" },
    ),
    heading("7. Organização dos GHEs"),
    ghes.length
      ? dataTable(
          ["GHE", "Denominação", "Funções incluídas"],
          ghes.map((ghe) => [
            ghe.id,
            ghe.name,
            selectedRoles.filter((role) => role.ghe === ghe.id).map((role) => role.name).join("; "),
          ]),
          [16, 28, 56],
        )
      : bodyParagraph("Nenhum GHE foi incluído. O quadro de funcionários deve ser preenchido antes da emissão."),
    sectionGap(),
    bodyParagraph("O agrupamento por GHE deve ser validado por similaridade real de atividades, ambientes e exposições."),
    heading("8. Inventário de riscos por função"),
    bodyParagraph(
      "O inventário a seguir foi composto a partir das funções, condições e riscos selecionados. As classificações são preliminares e devem ser ajustadas após reconhecimento em campo.",
    ),
  );

  selectedRoles.forEach((role, roleIndex) => {
    const risks = role.riskIds
      .map(getRisk)
      .filter((risk): risk is RiskDefinition => Boolean(risk))
      .filter((risk) => riskIsIncluded(state, role.id, risk));

    children.push(
      subheading(`8.${roleIndex + 1} ${role.name} – ${role.ghe}`),
      bodyParagraph(`Quantidade: ${role.quantity} trabalhador(es).`, { boldLead: "Quantidade:" }),
      bodyParagraph(`Descrição da atividade: ${role.description}`, { boldLead: "Descrição da atividade:" }),
      bodyParagraph(`EPI indicado: ${role.epis.join("; ")}.`, { boldLead: "EPI indicado:" }),
    );

    if (risks.length) {
      const rows = risks.map((risk) => {
        const assessment = riskAssessment(state, role.id, risk);
        const score = assessment.severity * assessment.probability;
        return [
          risk.type,
          risk.source,
          risk.damages,
          `${assessment.severity} x ${assessment.probability} = ${score} (${classifyRisk(score)})`,
          risk.treatment,
        ];
      });
      children.push(dataTable(["Tipo", "Fonte ou perigo", "Possíveis danos", "Avaliação", "Tratamento"], rows, [13, 23, 20, 19, 25]));
    } else {
      children.push(bodyParagraph("Nenhum risco foi incluído para esta função. Reavaliar a seleção antes da emissão."));
    }
    children.push(
      sectionGap(),
      bodyParagraph(
        "Nota: a classificação não substitui inspeção, avaliação ergonômica preliminar ou avaliação ambiental quando necessária.",
        { italic: true },
      ),
    );
  });

  if (!selectedRoles.length) {
    children.push(bodyParagraph("Nenhuma função com quantidade superior a zero foi incluída."));
  }

  const preventionRows: string[][] = [
    ["Todos", "Quedas e circulação", "Manter pisos, escadas e rotas seguras; corrigir irregularidades; sinalizar piso molhado; manter iluminação e desobstrução.", "Inspeções, sinalização e manutenção preventiva"],
    ["Todos", "Ergonomia", "Adequar mobiliário, posturas, pausas, métodos e organização do trabalho conforme a avaliação ergonômica.", "AEP e AET quando indicada"],
  ];
  if (state.scenarios.produtosQuimicos) preventionRows.push(["Limpeza e manutenção", "Produtos químicos", "Manter produtos identificados, armazenados e acompanhados de FDS; proibir misturas incompatíveis.", "Treinamento, ventilação e EPI compatível"]);
  if (state.scenarios.sanitariosResiduos) preventionRows.push(["Limpeza", "Biológicos", "Definir procedimentos para sanitários e resíduos, higiene das mãos, acondicionamento e descarte.", "Luvas, óculos, calçado e recursos adequados"]);
  if (state.scenarios.circulacaoVeiculos) preventionRows.push(["Portaria e garagem", "Veículos", "Separar fluxos quando possível, sinalizar acessos e orientar manobras.", "Alta visibilidade e inspeção de acessos"]);
  if (state.scenarios.segurancaPatrimonial) preventionRows.push(["Controle patrimonial", "Violência", "Adotar protocolos de acesso, comunicação e emergência; evitar confronto físico.", "Treinamento e meios de comunicação"]);
  if (state.scenarios.eletricidade) preventionRows.push(["Zeladoria e manutenção", "Eletricidade", "Somente pessoal autorizado; priorizar desenergização, bloqueio e ferramentas adequadas.", "Controles e capacitação da NR-10"]);
  if (state.scenarios.trabalhoAltura) preventionRows.push(["Zeladoria e manutenção", "Altura", "Eliminar a exposição quando possível, planejar a atividade e adotar proteção coletiva e individual.", "Análise de risco, PT e NR-35 quando aplicáveis"]);
  if (state.scenarios.ferramentas) preventionRows.push(["Zeladoria e manutenção", "Ferramentas", "Inspecionar antes do uso, manter, guardar e utilizar conforme o fabricante.", "Checklist e EPI conforme risco"]);
  if (state.scenarios.garagemFechada) preventionRows.push(["Garagem", "Ruído e gases", "Manter ventilação, controlar circulação e avaliar exposição quando relevante.", "Inspeção e avaliação ambiental"]);

  children.push(
    heading("9. Medidas de prevenção e controle"),
    bodyParagraph("A prioridade é eliminar ou reduzir o perigo, adotar proteção coletiva e medidas administrativas e, quando necessário, selecionar EPI compatível com o risco."),
    dataTable(["GHE ou área", "Perigo", "Medida de prevenção", "Controle e registro"], preventionRows, [16, 16, 43, 25]),
    heading("10. Matriz de EPI por função"),
    bodyParagraph("O EPI deve ser selecionado conforme o risco real, possuir CA quando exigido e ser acompanhado de orientação, registro de entrega, higienização, guarda e substituição."),
    selectedRoles.length
      ? dataTable(
          ["Função", "Quantidade", "EPI condicionado à avaliação"],
          selectedRoles.map((role) => [role.name, String(role.quantity), role.epis.join("; ")]),
          [31, 14, 55],
        )
      : bodyParagraph("Sem funções selecionadas para composição da matriz de EPI."),
    heading("11. Avaliação ergonômica"),
    bodyParagraph("Deverá ser realizada Avaliação Ergonômica Preliminar para as situações identificadas, integrando seus resultados ao inventário e ao plano de ação. A AET será realizada quando a AEP indicar necessidade de aprofundamento."),
    ...ghes.map((ghe) => bullet(`${ghe.id} – ${ghe.name}: avaliar postura, força, repetitividade, deslocamentos, ritmo, demanda cognitiva e organização conforme as atividades reais.`)),
    heading("12. Avaliações ambientais e critérios para LTCAT"),
    bodyParagraph("As medições devem ser definidas após análise preliminar. A estratégia é reconhecer a atividade, identificar o critério legal aplicável, realizar avaliação qualitativa quando suficiente e quantificar quando exigido ou tecnicamente necessário."),
  );

  const environmentalRows: string[][] = [];
  if (state.scenarios.ferramentas) environmentalRows.push(["Ruído e vibração", "Zeladoria e manutenção", "Avaliar ferramentas e tempo de uso; medir quando aplicável"]);
  if (state.scenarios.areasExternas) environmentalRows.push(["Calor e intempéries", "Áreas externas", "Caracterizar exposição; quantificar calor quando o critério aplicável exigir"]);
  if (state.scenarios.produtosQuimicos) environmentalRows.push(["Agentes químicos", "Limpeza e manutenção", "Analisar FDS, forma de uso e necessidade de avaliação específica"]);
  if (state.scenarios.sanitariosResiduos) environmentalRows.push(["Agentes biológicos", "Limpeza", "Avaliação qualitativa da atividade, frequência e condições"]);
  if (state.scenarios.eletricidade) environmentalRows.push(["Eletricidade", "Zeladoria e manutenção", "Avaliação qualitativa da atividade, instalações e controles"]);
  if (state.scenarios.segurancaPatrimonial) environmentalRows.push(["Violência", "Controle patrimonial", "Caracterizar atividade e avaliar eventual enquadramento legal"]);
  if (state.scenarios.trabalhoAltura) environmentalRows.push(["Queda de altura", "Zeladoria e manutenção", "Caracterizar atividade e controles; não presumir pelo cargo"]);
  if (state.scenarios.garagemFechada) environmentalRows.push(["Gases de combustão", "Garagem", "Avaliar ventilação, permanência e necessidade de medição"]);
  children.push(
    environmentalRows.length
      ? dataTable(["Agente ou situação", "GHE ou área", "Estratégia"], environmentalRows, [25, 27, 48])
      : bodyParagraph("Não foram assinaladas situações ambientais específicas. Confirmar essa conclusão em visita técnica."),
    heading("13. Insalubridade e periculosidade"),
    bodyParagraph("O PGR identifica e gerencia riscos, mas não substitui os laudos específicos. A caracterização depende das atividades reais e dos critérios das NR-15 e NR-16; não deve ser presumida apenas pelo cargo."),
    dataTable(
      ["Situação", "Diretriz preliminar"],
      [
        ...(state.scenarios.sanitariosResiduos ? [["Sanitários e resíduos", "Avaliar qualitativamente as condições e os critérios aplicáveis da NR-15"]] : []),
        ...(state.scenarios.produtosQuimicos ? [["Produtos químicos", "Avaliar agentes, concentração, forma e tempo de exposição"]] : []),
        ...(state.scenarios.segurancaPatrimonial ? [["Segurança patrimonial", "Verificar a atividade e os requisitos aplicáveis da NR-16"]] : []),
        ...(state.scenarios.eletricidade ? [["Eletricidade", "Avaliar atividade, instalações, autorização e controles"]] : []),
        ...(state.scenarios.garagemFechada ? [["Garagem", "Avaliar veículos, ventilação, ruído e gases"]] : []),
        ["Demais funções", "Sem enquadramento automático; confirmar em campo"],
      ],
      [35, 65],
    ),
    heading("14. Trabalhos em altura"),
    addConditionalStatement(
      state.scenarios.trabalhoAltura,
      "Foi informada atividade com risco de queda de nível. Antes da execução, devem ser confirmados enquadramento, planejamento, análise de risco, proteção coletiva, sistema de proteção contra quedas, capacitação, autorização e procedimentos de emergência e resgate.",
      "Não foi informada atividade rotineira com risco de queda de nível. A ausência deve ser confirmada em campo e reavaliada antes de qualquer atividade não rotineira.",
    ),
    heading("15. Instalações elétricas"),
    addConditionalStatement(
      state.scenarios.eletricidade,
      "Foi informada intervenção em eletricidade. A atividade deve ser restrita a trabalhadores autorizados e capacitados, com aplicação das medidas de desenergização, bloqueio, verificação, ferramentas e EPIs pertinentes.",
      "Não foi informada intervenção rotineira em instalações elétricas. Porteiros, trabalhadores da limpeza e pessoas não autorizadas não devem executar esse tipo de atividade.",
    ),
    heading("16. Produtos químicos e FDS"),
    addConditionalStatement(
      state.scenarios.produtosQuimicos,
      "Os produtos utilizados devem possuir FDS disponível, permanecer identificados e ser armazenados de forma segura. A seleção de luvas, óculos, aventais e proteção respiratória deve considerar o produto e a forma de exposição. É proibido misturar produtos sem orientação do fabricante ou reutilizar embalagens de alimentos.",
      "Não foi informado uso ocupacional de produtos químicos. Confirmar a informação e reavaliar esta seção antes da introdução de qualquer produto.",
    ),
    heading("17. Proteção contra incêndios e emergências"),
    addConditionalStatement(
      state.scenarios.incendioEmergencia,
      "A equipe deve conhecer rotas de fuga, comunicação, abandono e meios de emergência, mantendo saídas desobstruídas e integrando os procedimentos ao plano do condomínio e à legislação aplicável.",
      "A integração ao plano de emergência não foi marcada. Essa condição deve ser revista, pois todos os trabalhadores precisam receber orientações compatíveis com o estabelecimento.",
    ),
    heading("18. Atividades não rotineiras e terceiros"),
    addConditionalStatement(
      state.scenarios.atividadesNaoRotineiras,
      "Atividades extraordinárias, mudanças de processo, intervenções em áreas técnicas, altura, eletricidade, uso de novos produtos ou entrada de empresas terceirizadas devem ser precedidas de avaliação de riscos proporcional à complexidade, com APR, AR ou PT quando aplicável.",
      "Não foram assinaladas atividades não rotineiras. Mudanças futuras devem ser avaliadas antes da execução e incorporadas ao gerenciamento de riscos.",
    ),
    heading("19. Matriz de treinamentos"),
  );

  const trainingRows: string[][] = [
    ["Integração de SST e PGR", "Todos", "Admissão e mudanças relevantes"],
    ["NR-06 e EPI", "Trabalhadores que utilizam EPI", "Admissão e reciclagens conforme necessidade"],
    ["Ergonomia", "Todos os GHEs incluídos", "Integração e ações periódicas"],
  ];
  if (state.scenarios.produtosQuimicos) trainingRows.push(["Produtos químicos e FDS", "Limpeza e manutenção", "Admissão e introdução de novos produtos"]);
  if (state.scenarios.eletricidade) trainingRows.push(["NR-10", "Trabalhadores autorizados", "Conforme requisitos aplicáveis"]);
  if (state.scenarios.trabalhoAltura) trainingRows.push(["NR-35", "Trabalhadores autorizados", "Conforme requisitos aplicáveis"]);
  if (state.scenarios.segurancaPatrimonial) trainingRows.push(["Procedimentos de segurança patrimonial", "Controle patrimonial e portaria quando aplicável", "Admissão e reciclagens internas"]);
  if (state.scenarios.incendioEmergencia) trainingRows.push(["Prevenção de incêndio e emergência", "Todos", "Conforme plano e legislação aplicável"]);
  if (ghes.some((ghe) => ghe.id !== "GHE 01")) trainingRows.push(["DDS", "Equipes operacionais", "Periodicidade definida pela gestão"]);

  const inspectionRows: string[][] = [
    ["EPIs", "Mensal e rotina", "Checklist e ficha de EPI"],
    ["Pisos, escadas e rotas", "Mensal", "Checklist predial"],
    ["Ações do PGR", "Mensal ou trimestral", "Plano de ação atualizado"],
  ];
  if (state.scenarios.produtosQuimicos) inspectionRows.push(["Produtos químicos", "Mensal e a cada novo produto", "Inventário e FDS"]);
  if (state.scenarios.ferramentas) inspectionRows.push(["Ferramentas e equipamentos", "Antes do uso e periodicamente", "Checklist"]);
  if (state.scenarios.trabalhoAltura) inspectionRows.push(["Trabalho em altura", "Antes de cada serviço", "AR, PT e inspeção"]);
  if (state.scenarios.eletricidade) inspectionRows.push(["Instalações elétricas", "Conforme plano de manutenção", "Registro técnico"]);
  if (state.scenarios.incendioEmergencia) inspectionRows.push(["Extintores e rotas de fuga", "Conforme plano e legislação", "Checklist e relatório"]);

  children.push(
    dataTable(["Treinamento", "Público", "Periodicidade ou condição"], trainingRows, [34, 34, 32]),
    heading("20. Inspeções e monitoramento"),
    dataTable(["Item", "Periodicidade sugerida", "Registro"], inspectionRows, [36, 32, 32]),
    heading("21. Plano de ação"),
    actions.length
      ? dataTable(
          ["ID", "Ação", "GHE", "Prioridade", "Prazo", "Responsável"],
          actions.map((action, index) => {
            const values = actionValue(state, action);
            return [String(index + 1), action.action, action.ghe, action.priority, values.deadline, values.responsible];
          }),
          [7, 37, 14, 12, 12, 18],
        )
      : bodyParagraph("Nenhuma ação foi incluída. Revisar a configuração antes da emissão."),
    heading("22. Matriz de documentos e registros"),
    dataTable(
      ["Documento ou registro", "Aplicação", "Condição"],
      [
        ["PGR – Inventário e Plano de Ação", "Todos", "Atualização contínua e revisões"],
        ["PCMSO", "Todos", "Conforme NR-07"],
        ["LTCAT e PPP", "Quando houver necessidade previdenciária", "Conforme exposição e legislação"],
        ["Laudos de insalubridade ou periculosidade", "Quando houver hipótese de enquadramento", "Quando aplicável"],
        ["AEP e AET", "Ergonomia", "AEP e AET quando indicada"],
        ["Ficha de EPI", "Trabalhadores que recebem EPI", "A cada entrega ou substituição"],
        ...(state.scenarios.produtosQuimicos ? [["FDS", "Produtos químicos", "Atualizada para os produtos em uso"]] : []),
        ...(state.scenarios.atividadesNaoRotineiras ? [["APR, AR ou PT", "Atividades especiais", "Antes do serviço, quando aplicável"]] : []),
        ["Treinamentos", "Treinamentos obrigatórios e internos", "Conforme treinamento"],
        ["Inspeções", "Áreas, equipamentos e EPIs", "Conforme plano"],
        ["Investigação de acidentes", "Acidentes e incidentes", "A cada ocorrência"],
      ],
      [34, 34, 32],
    ),
    heading("23. Investigação de acidentes e incidentes"),
    bodyParagraph("Acidentes, quase acidentes, desvios críticos e situações de risco devem ser registrados e investigados, com análise de causas e definição de ações corretivas e preventivas. As conclusões devem retroalimentar o inventário e o plano de ação."),
    heading("24. Gestão de resultados"),
    bodyParagraph("A eficácia do PGR será acompanhada por indicadores de acidentes, incidentes, desvios, treinamentos, entrega e uso de EPI, inspeções, ações concluídas e reincidência de não conformidades."),
    heading("25. Conclusão"),
    bodyParagraph(`Este PGR organiza o gerenciamento dos riscos dos ${totalWorkers} trabalhador(es) incluídos no estabelecimento ${text(state.condoName)}. O documento contempla ${selectedRoles.length} função(ões) em ${ghes.length} GHE(s), com inventário, medidas preventivas, EPIs, treinamentos, inspeções e plano de ação.`),
    bodyParagraph("A emissão definitiva deve ser precedida de validação em campo, especialmente quanto às tarefas, ambientes, produtos, equipamentos, jornadas, frequência e duração das exposições e medidas existentes. A classificação apresentada é preliminar e deve ser validada pelo responsável técnico."),
    heading("26. Anexo – Resumo de cargos e quantidades"),
    selectedRoles.length
      ? dataTable(
          ["Cargo", "Quantidade", "GHE"],
          selectedRoles.map((role) => [role.name, String(role.quantity), role.ghe]),
          [58, 18, 24],
        )
      : bodyParagraph("Sem cargos selecionados."),
    heading("27. Observações e validações pendentes"),
    bodyParagraph(text(state.notes, "Sem observações adicionais registradas.")),
    bodyParagraph(
      state.expectedTotal !== null && state.expectedTotal !== totalWorkers
        ? `A base indica ${state.expectedTotal} trabalhador(es), enquanto esta configuração totaliza ${totalWorkers}. A divergência deve ser validada com o RH.`
        : "O total configurado está compatível com o total de referência informado, sem prejuízo da conferência nominal pelo RH.",
    ),
    new Paragraph({ spacing: { before: 620 } }),
    dataTable(
      ["Validação da empresa", "Responsável técnico"],
      [
        [
          `Nome: ${text(state.localResponsible)}\n\nAssinatura: ______________________________\n\nData: ____/____/________`,
          `Nome: ${text(state.technicalResponsible)}\n${text(state.professionalTitle, "Função: não informada")}\nRegistro: ${text(state.professionalRegistration)}\n\nAssinatura: ______________________________`,
        ],
      ],
      [50, 50],
    ),
  );

  const header = new Header({
    children: [
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        layout: TableLayoutType.FIXED,
        rows: [
          new TableRow({
            children: [
              borderlessCell("PGR | GRUPO DINAMIZZA", true),
              borderlessCell(text(state.condoName), false, AlignmentType.RIGHT),
            ],
          }),
        ],
      }),
    ],
  });

  const footer = new Footer({
    children: [
      new Paragraph({
        children: [
          new TextRun({ text: "PGR | Revisão 00 | Página ", color: COLORS.muted, size: 17 }),
          new TextRun({ children: [PageNumber.CURRENT], color: COLORS.muted, size: 17 }),
          new TextRun({ text: " de ", color: COLORS.muted, size: 17 }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], color: COLORS.muted, size: 17 }),
        ],
        alignment: AlignmentType.CENTER,
      }),
    ],
  });

  return new Document({
    creator: text(state.technicalResponsible, "GRUPO DINAMIZZA"),
    title: `Programa de Gerenciamento de Riscos – ${text(state.condoName)}`,
    subject: "Programa de Gerenciamento de Riscos para serviços terceirizados em condomínio",
    description: "PGR configurado a partir da matriz-base para condomínios e edificações prontas.",
    styles: {
      default: {
        document: {
          run: { font: "Arial", size: 21, color: COLORS.ink },
          paragraph: { spacing: { line: 300 } },
        },
      },
      paragraphStyles: [
        {
          id: "Title",
          name: "Title",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { font: "Arial", size: 40, bold: true, color: "000000" },
          paragraph: { spacing: { after: 220 }, alignment: AlignmentType.CENTER },
        },
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { font: "Arial", size: 25, bold: true, color: "000000" },
          paragraph: { spacing: { before: 260, after: 140 }, keepNext: true },
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { font: "Arial", size: 22, bold: true, color: "000000" },
          paragraph: { spacing: { before: 210, after: 110 }, keepNext: true },
        },
      ],
    },
    sections: [
      {
        properties: {
          titlePage: true,
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 920, right: 900, bottom: 920, left: 900, header: 420, footer: 420 },
          },
        },
        headers: { default: header, first: new Header({ children: [] }) },
        footers: { default: footer, first: new Footer({ children: [] }) },
        children,
      },
    ],
  });
}

export function makePgrFilename(state: PgrState) {
  const base = text(state.condoName, "condominio")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  return `PGR-${base || "condominio"}.docx`;
}

export async function downloadPgrDocx(state: PgrState) {
  const blob = await Packer.toBlob(buildPgrDocument(state));
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = makePgrFilename(state);
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export type { Probability, Severity };
