import {
  AlignmentType,
  BorderStyle,
  HeadingLevel,
  PageBreak,
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

import type { Nr01Classification, Nr01Report } from "./nr01";
import type { PgrState } from "./pgr-types";

const COLORS = {
  navy: "163B55",
  teal: "0D6171",
  ink: "17212B",
  muted: "5A6872",
  line: "D9E0E5",
  pale: "F5F7F8",
  white: "FFFFFF",
  green: "DDEFE4",
  yellow: "FFF0BF",
  red: "F8D6D6",
  blue: "E1EEF0",
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

function formatNumber(value: number) {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatPercent(value: number | null) {
  if (value === null) return "Não calculada";
  return `${value.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
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
  return new Paragraph({ children, alignment: align, spacing: { after: 150, line: 360 } });
}

function bullet(value: string) {
  return new Paragraph({
    children: [new TextRun(value)],
    bullet: { level: 0 },
    spacing: { after: 90, line: 360 },
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

function classificationFill(classification: Nr01Classification) {
  if (classification === "Alto") return COLORS.red;
  if (classification === "Moderado") return COLORS.yellow;
  return COLORS.green;
}

function tableCell(
  value: string | Paragraph[],
  options: {
    header?: boolean;
    fill?: string;
    width?: number;
    align?: (typeof AlignmentType)[keyof typeof AlignmentType];
    bold?: boolean;
  } = {},
) {
  const { header, fill, width, align = AlignmentType.LEFT, bold } = options;
  const children = Array.isArray(value)
    ? value
    : [
        new Paragraph({
          children: [new TextRun({ text: value, bold: header || bold, color: header ? COLORS.white : COLORS.ink, size: 24, font: "Arial" })],
          alignment: align,
          spacing: { after: 0, line: 360 },
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

function dataTable(headers: string[], rows: string[][], widths?: number[], rowFills?: Array<string | undefined>) {
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
                fill: rowFills?.[rowIndex] ?? (rowIndex % 2 ? COLORS.pale : COLORS.white),
              }),
            ),
          }),
      ),
    ],
  });
}

function sectionGap() {
  return new Paragraph({ spacing: { after: 100 } });
}

function countSummary(items: Nr01Report["activityGroups"]) {
  return items.length
    ? items.map((item) => `${item.label}: ${item.count} (${formatPercent(item.percentage)})`).join("; ")
    : "Não informado";
}

export function buildNr01Annex(report: Nr01Report, state: PgrState): Array<Paragraph | Table> {
  const children: Array<Paragraph | Table> = [
    new Paragraph({ children: [new PageBreak()] }),
    new Paragraph({
      children: [new TextRun({ text: "ANEXO – NR-01", bold: true, color: COLORS.teal, size: 22, characterSpacing: 80 })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 720, after: 400 },
    }),
    new Paragraph({
      children: [new TextRun({ text: "Monitoramento de fatores de risco psicossociais relacionados ao trabalho", bold: true, color: COLORS.ink, size: 34 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 280, line: 390 },
    }),
    new Paragraph({
      children: [new TextRun({ text: text(state.condoName), bold: true, color: COLORS.navy, size: 28 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 560 },
    }),
    dataTable(
      ["Informação", "Registro"],
      [
        ["Local identificado no questionário", report.location],
        ["Período das respostas", report.startDate === report.endDate ? report.startDate : `${report.startDate} a ${report.endDate}`],
        ["Respostas válidas", String(report.responseCount)],
        ["Trabalhadores no PGR", report.expectedWorkers === null ? "Não informado" : String(report.expectedWorkers)],
        ["Cobertura estimada", formatPercent(report.participationPercent)],
      ],
      [38, 62],
    ),
    new Paragraph({ spacing: { before: 430 } }),
    bodyParagraph(
      "Relatório elaborado a partir do questionário de triagem fornecido pela empresa. O instrumento não corresponde ao HSE Indicator Tool completo e seus resultados devem ser integrados à avaliação das condições e da organização real do trabalho.",
      { italic: true, align: AlignmentType.CENTER },
    ),
    new Paragraph({ children: [new PageBreak()] }),
    heading("1. Fundamento e finalidade"),
    bodyParagraph(
      "A NR-01 determina que o gerenciamento de riscos ocupacionais abranja os fatores de risco psicossociais relacionados ao trabalho, considere as condições de trabalho previstas na NR-17 e registre os critérios utilizados para avaliar, classificar e tratar os riscos.",
    ),
    bodyParagraph(
      "Este relatório consolida a percepção dos trabalhadores sobre quatro dimensões: organização e ritmo, relações e apoio, carga mental e cobrança, e segurança e ambiente. O questionário é um recurso de consulta e triagem coletiva. Ele não realiza diagnóstico clínico nem substitui o reconhecimento técnico, a Avaliação Ergonômica Preliminar ou outras avaliações indicadas.",
    ),
    heading("2. Metodologia"),
    bodyParagraph(
      "Foram analisadas 11 perguntas com respostas em escala de frequência de cinco pontos. Nas perguntas favoráveis, respostas mais frequentes recebem maior pontuação. Nas perguntas que descrevem exposição indesejada, a escala é invertida. Assim, em todas as questões, médias maiores indicam condição mais favorável.",
    ),
    dataTable(
      ["Média favorável", "Probabilidade adotada", "Severidade", "Classificação"],
      [
        ["3,20 a 5,00", "Remoto", "Moderada", "Tolerável"],
        ["2,40 a 3,19", "Provável", "Moderada", "Moderado"],
        ["1,00 a 2,39", "Muito provável", "Moderada", "Alto"],
      ],
      [24, 25, 23, 28],
      [COLORS.green, COLORS.yellow, COLORS.red],
    ),
    sectionGap(),
    bodyParagraph(
      "A severidade moderada é adotada nesta triagem como referência preliminar, considerando a possibilidade de agravos reversíveis e incapacidade temporária. O responsável técnico deve confirmar ou ajustar essa gradação diante das atividades reais, das medidas existentes e das consequências potenciais.",
    ),
    bodyParagraph(
      "Para preservar o sigilo, respostas abertas não são reproduzidas no relatório. Resultados detalhados somente são apresentados quando há pelo menos três respostas válidas no local selecionado.",
    ),
    heading("3. Participação e perfil agregado"),
    dataTable(
      ["Indicador", "Resultado"],
      [
        ["Respostas válidas", String(report.responseCount)],
        ["Cobertura estimada", formatPercent(report.participationPercent)],
        ["Grupos de atividades", report.canPublishDetailedResults ? countSummary(report.activityGroups) : "Detalhamento suprimido por sigilo"],
        ["Turnos", report.canPublishDetailedResults ? countSummary(report.shifts) : "Detalhamento suprimido por sigilo"],
        ["Respostas abertas registradas", `${report.commentCount} registro(s) contabilizado(s); os textos não são armazenados na importação`],
      ],
      [35, 65],
    ),
  ];

  if (!report.canPublishDetailedResults) {
    children.push(
      sectionGap(),
      dataTable(
        ["Situação", "Encaminhamento"],
        [[
          "Amostra insuficiente para divulgação coletiva",
          `Foram registradas ${report.responseCount} resposta(s). Não são exibidas médias ou distribuições detalhadas para evitar identificação indireta. Complementar a avaliação por observação da atividade, AEP, escuta técnica confidencial e nova coleta quando possível.`,
        ]],
        [34, 66],
        [COLORS.yellow],
      ),
      heading("4. Plano de continuidade"),
      bullet("Manter registro da aplicação e ampliar a participação sem vincular respostas a nomes."),
      bullet("Realizar observação técnica das tarefas, jornadas, pausas, exigências cognitivas, relações e condições ambientais."),
      bullet("Integrar os achados da AEP, do PCMSO e de registros de ocorrências ao inventário de riscos e ao plano de ação."),
      bullet("Reaplicar a pesquisa após mudanças relevantes ou em prazo definido pelo responsável técnico."),
      heading("5. Conclusão"),
      bodyParagraph(
        "A quantidade de respostas não permite classificar coletivamente os domínios sem comprometer a confidencialidade. O registro permanece válido como evidência de consulta, mas a avaliação dos fatores psicossociais deve ser concluída por outros elementos técnicos e documentais.",
      ),
    );
  } else {
    children.push(
      heading("4. Resultado por domínio"),
      bodyParagraph(
        `A média geral favorável foi ${formatNumber(report.overallAverage)}, com classificação ${report.overallClassification.toLocaleLowerCase("pt-BR")}. A leitura deve priorizar os domínios e itens de menor média, sem interpretar o resultado como diagnóstico individual.`,
      ),
      dataTable(
        ["Domínio", "Média", "Probabilidade", "Severidade", "Classificação"],
        report.domainResults.map((domain) => [
          domain.label,
          formatNumber(domain.average),
          domain.probability,
          domain.severity,
          domain.classification,
        ]),
        [30, 14, 20, 17, 19],
        report.domainResults.map((domain) => classificationFill(domain.classification)),
      ),
      heading("5. Aspectos prioritários"),
      bodyParagraph(
        "A tabela apresenta as cinco questões com menor média favorável. Percentuais desfavoráveis correspondem a Nunca/Raramente nas perguntas positivas e Frequentemente/Sempre nas perguntas de exposição indesejada.",
      ),
      dataTable(
        ["Questão", "Média", "Favorável", "Neutra", "Desfavorável"],
        report.criticalQuestions.map((question) => [
          question.title,
          formatNumber(question.average),
          formatPercent(question.favorablePercent),
          formatPercent(question.neutralPercent),
          formatPercent(question.unfavorablePercent),
        ]),
        [38, 13, 17, 15, 17],
      ),
      heading("6. Distribuição das respostas por questão"),
      dataTable(
        ["Dimensão avaliada", "Média", "Favorável", "Às vezes", "Desfavorável"],
        report.questionResults.map((question) => [
          question.title,
          formatNumber(question.average),
          formatPercent(question.favorablePercent),
          formatPercent(question.neutralPercent),
          formatPercent(question.unfavorablePercent),
        ]),
        [38, 13, 17, 15, 17],
      ),
      heading("7. Plano de ação sugerido"),
      bodyParagraph(
        "As medidas abaixo devem ser confirmadas com os trabalhadores e pela análise da atividade real. O plano de ação definitivo deve indicar responsável, prazo, acompanhamento e forma de aferição dos resultados.",
      ),
    );

    report.domainResults.forEach((domain, index) => {
      children.push(
        subheading(`7.${index + 1} ${domain.label}`),
        dataTable(
          ["Campo", "Registro"],
          [
            ["Fator monitorado", domain.riskFactor],
            ["Descrição", domain.description],
            ["Classificação", `${domain.classification} – média ${formatNumber(domain.average)}`],
            ["Ações", domain.actions.join(" ")],
            ["Reavaliação sugerida", domain.reassessment],
          ],
          [29, 71],
          [undefined, undefined, classificationFill(domain.classification)],
        ),
      );
    });

    children.push(
      heading("8. Conclusão"),
      bodyParagraph(
        "Os resultados representam a percepção agregada do grupo no período informado e devem ser confrontados com a organização real do trabalho, as jornadas, os recursos disponíveis, as medidas de prevenção, os registros do PCMSO e a participação dos trabalhadores.",
      ),
      bodyParagraph(
        "Domínios moderados ou altos devem ser priorizados no inventário de riscos e no plano de ação. Domínios toleráveis exigem manutenção dos controles e acompanhamento, especialmente após mudanças, ocorrências ou manifestações justificadas dos trabalhadores.",
      ),
    );
  }

  children.push(
    heading(report.canPublishDetailedResults ? "9. Responsáveis e validação" : "6. Responsáveis e validação"),
    dataTable(
      ["Validação da empresa", "Responsável técnico"],
      [[
        `Nome: ${text(state.localResponsible)}. Assinatura: ____________________. Data: ____/____/________.`,
        `Nome: ${text(state.technicalResponsible)}. ${text(state.professionalTitle, "Função não informada")}. Registro: ${text(state.professionalRegistration)}. Assinatura: ____________________.`,
      ]],
      [50, 50],
    ),
  );

  return children;
}
