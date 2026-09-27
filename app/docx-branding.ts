import {
  AlignmentType,
  Footer,
  ImageRun,
  PageNumber,
  Paragraph,
  TextRun,
} from "docx";

export type DocxImageData = Uint8Array | ArrayBuffer;

const FOOTER_LINE_ONE = "BIOSAFE – Serviços Administrativos de Consultoria Técnica de SSMA";
const FOOTER_LINE_TWO =
  "Fone: (71) 71 99378-9268– (32) 99935-9208 E-mail: biosafeconsutoria@outlook.com Salvador/BA";

export async function loadBiosafeLogo(): Promise<DocxImageData | undefined> {
  try {
    const response = await fetch(new URL("biosafe-logo.png", document.baseURI));
    if (!response.ok) return undefined;
    return await response.arrayBuffer();
  } catch {
    return undefined;
  }
}

export function biosafeLogoParagraph(logoData?: DocxImageData) {
  return new Paragraph({
    children: logoData
      ? [
          new ImageRun({
            type: "png",
            data: logoData,
            transformation: { width: 170, height: 255 },
            altText: {
              title: "Logo BIOSAFE",
              description: "BIOSAFE Sua Segurança Estudos BIOSAFE",
              name: "Logo BIOSAFE",
            },
          }),
        ]
      : [
          new TextRun({
            text: "BIOSAFE",
            bold: true,
            color: "006838",
            font: "Arial",
            size: 34,
            characterSpacing: 80,
          }),
        ],
    alignment: AlignmentType.CENTER,
    spacing: { before: 100, after: 140 },
  });
}

export function biosafeFooter(documentLabel: string) {
  const footerRun = (value: string, bold = false) =>
    new TextRun({ text: value, bold, font: "Arial", size: 16, color: "4A555D" });

  return new Footer({
    children: [
      new Paragraph({
        children: [footerRun(FOOTER_LINE_ONE, true)],
        alignment: AlignmentType.CENTER,
        spacing: { after: 0, line: 190 },
      }),
      new Paragraph({
        children: [footerRun(FOOTER_LINE_TWO)],
        alignment: AlignmentType.CENTER,
        spacing: { after: 0, line: 190 },
      }),
      new Paragraph({
        children: [
          footerRun(`${documentLabel} | Página `),
          new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 16, color: "4A555D" }),
          footerRun(" de "),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], font: "Arial", size: 16, color: "4A555D" }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 0, line: 190 },
      }),
    ],
  });
}
