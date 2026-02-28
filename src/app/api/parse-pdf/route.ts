import { NextRequest, NextResponse } from "next/server";
import { extractText, getDocumentProxy } from "unpdf";

export const runtime = "nodejs";
export const maxDuration = 60;

interface PageText {
  pageNum: number;
  text: string;
}

interface ParsedSection {
  title: string;
  content: string;
  pageStart: number;
  pageEnd: number;
}

/**
 * Extract text per page, then detect sections by heading patterns.
 */
async function parsePDFSections(buffer: ArrayBuffer): Promise<{ pages: PageText[]; sections: ParsedSection[]; totalPages: number }> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const totalPages = pdf.numPages;

  // Extract text per page
  const pages: PageText[] = [];
  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const tc = await page.getTextContent();
    const text = tc.items
      .map((item: Record<string, unknown>) => (item as { str: string }).str)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    pages.push({ pageNum, text });
  }

  // Build full text preserving page boundaries
  const fullLines: { line: string; pageNum: number }[] = [];
  for (const p of pages) {
    const lines = p.text.split(/(?<=[.!?])\s+/).filter((l) => l.trim().length > 0);
    for (const line of lines) {
      fullLines.push({ line: line.trim(), pageNum: p.pageNum });
    }
  }

  // Detect section headings
  const sections: ParsedSection[] = [];
  let current: { title: string; content: string[]; pageStart: number; pageEnd: number } | null = null;

  for (const { line, pageNum } of fullLines) {
    const isHeading =
      /^Section\s+\d+\s*[:\u2014\u2013-]/i.test(line) ||
      /^Appendix\s+[A-Z]/i.test(line) ||
      (/^[A-Z][A-Z\s&:,\-]{4,50}$/.test(line) && !/^\d+$/.test(line));

    if (isHeading) {
      if (current && current.content.length > 0) {
        sections.push({
          title: current.title,
          content: current.content.join(" "),
          pageStart: current.pageStart,
          pageEnd: current.pageEnd,
        });
      }
      current = { title: line.replace(/\s+/g, " ").trim(), content: [], pageStart: pageNum, pageEnd: pageNum };
    } else if (current) {
      current.content.push(line);
      current.pageEnd = pageNum;
    }
  }

  // Save last section
  if (current && current.content.length > 0) {
    sections.push({
      title: current.title,
      content: current.content.join(" "),
      pageStart: current.pageStart,
      pageEnd: current.pageEnd,
    });
  }

  // Fallback: if no sections detected, chunk by page
  if (sections.length === 0) {
    for (const p of pages) {
      if (p.text.length > 30) {
        sections.push({
          title: `Page ${p.pageNum}`,
          content: p.text,
          pageStart: p.pageNum,
          pageEnd: p.pageNum,
        });
      }
    }
  }

  return { pages, sections, totalPages };
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "File must be a PDF" }, { status: 400 });
    }

    console.log(`📄 Parsing PDF: ${file.name} (${file.size} bytes)`);

    const arrayBuffer = await file.arrayBuffer();

    const { sections, totalPages } = await parsePDFSections(arrayBuffer);

    console.log(`✅ Parsed ${sections.length} sections from ${totalPages} pages`);

    return NextResponse.json({
      success: true,
      fileName: file.name,
      totalPages,
      sections: sections.map((s) => ({
        title: s.title,
        content: s.content,
        pageStart: s.pageStart,
        pageEnd: s.pageEnd,
        wordCount: s.content.split(/\s+/).length,
      })),
    });
  } catch (error) {
    console.error("❌ PDF parsing error:", error);
    return NextResponse.json(
      { error: "Failed to parse PDF", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
