/**
 * Gợi ý questionType (domain) từ phần thi + mondai — khớp cấu trúc JLPT
 * (文字語彙 / 文法 / 読解 / 聴解).
 */
export type JlptQuestionTypeDomain = "VOCAB" | "GRAMMAR" | "READING" | "LISTENING";

export type MondaiLike = {
  code: string;
  titleVi?: string | null;
  titleJa?: string | null;
};

/** Theo section lớn (enum backend). */
export function inferQuestionTypeFromSection(sectionCode: string): JlptQuestionTypeDomain {
  if (sectionCode === "LANGUAGE_VOCAB") return "VOCAB";
  if (sectionCode === "LISTENING") return "LISTENING";
  return "GRAMMAR";
}

/**
 * Tinh chỉnh theo mã/tên mondai (vd: 内容理解, 文の文法, 課題理解).
 * Dùng cả tiếng Nhật trong title vì seed có thể dùng mã ngắn.
 */
export function inferQuestionTypeFromMondai(
  sectionCode: string,
  mondai: MondaiLike | null | undefined,
): JlptQuestionTypeDomain {
  const base = inferQuestionTypeFromSection(sectionCode);
  if (sectionCode === "LISTENING" || sectionCode === "LANGUAGE_VOCAB") {
    return base;
  }

  if (!mondai?.code && !mondai?.titleJa && !mondai?.titleVi) {
    return base;
  }

  const raw = `${mondai?.code ?? ""}\n${mondai?.titleJa ?? ""}\n${mondai?.titleVi ?? ""}`;

  // 読解・情報
  if (
    /読解|内容理解|統合理解|主張理解|情報検索|長文|中文|短文|DOCKAI|DOKKAI|NATTOKU|JYOUHOU|CHUUBUN|CHUBUN|TOKU|RYOUKAI/i.test(
      raw,
    )
  ) {
    return "READING";
  }

  // 文法
  if (/文法|文の文法|文章の文法|BUNPO|BUN_NO|GRAMMAR/i.test(raw)) {
    return "GRAMMAR";
  }

  // 語彙（文字）
  if (/漢字|語彙|表記|文脈|言い換え|用法|GOI|KANJI|HYOUKI/i.test(raw)) {
    return "VOCAB";
  }

  return base;
}
