import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '@server/shared/prisma/prisma.service';

type LevelCode = 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
type SectionCode = 'LANGUAGE_VOCAB' | 'LANGUAGE_GRAMMAR_READING' | 'LISTENING';

type SeedMondai = {
  code: string;
  titleJa: string;
  titleVi: string;
  orderIndex: number;
  recommendedQuestionCount: number;
};

type SeedSection = {
  code: SectionCode;
  title: string;
  durationMinutes: number;
  orderIndex: number;
  isListening: boolean;
  mondai: SeedMondai[];
};

type SeedLevel = {
  code: LevelCode;
  nameVi: string;
  sections: SeedSection[];
  scoring: {
    minLanguageScaled: number;
    minReadingScaled: number;
    minListeningScaled: number;
    minTotalScaled: number;
    // PREP reference raw maxima per domain for mapping raw -> scaled(0..60).
    rawMaxByDomain: {
      LANGUAGE: number;
      READING: number;
      LISTENING: number;
    };
  };
};

const JLPT_SCORING_PROFILE_NAME = 'JLPT_OFFICIAL_SCORING_V1';

const JLPT_SEED: SeedLevel[] = [
  {
    code: 'N5',
    nameVi: 'JLPT N5',
    scoring: {
      // PREP reference: pass (Language+Reading) >= 80, Listening >= 19, Total >= 80.
      minLanguageScaled: 40,
      minReadingScaled: 40,
      minListeningScaled: 19,
      minTotalScaled: 80,
      rawMaxByDomain: {
        LANGUAGE: 58,
        READING: 34,
        LISTENING: 60,
      },
    },
    sections: [
      {
        code: 'LANGUAGE_VOCAB',
        title: 'Language Knowledge (Vocabulary)',
        durationMinutes: 25,
        orderIndex: 1,
        isListening: false,
        mondai: [
          {
            code: 'N5_M1_KANJI_READING',
            titleJa: '漢字読み',
            titleVi: 'Đọc Hán tự',
            orderIndex: 1,
            recommendedQuestionCount: 12,
          },
          {
            code: 'N5_M2_ORTHOGRAPHY',
            titleJa: '表記',
            titleVi: 'Chuyển đổi cách viết',
            orderIndex: 2,
            recommendedQuestionCount: 8,
          },
          {
            code: 'N5_M3_CONTEXT_VOCAB',
            titleJa: '文脈規定',
            titleVi: 'Từ vựng theo ngữ cảnh',
            orderIndex: 3,
            recommendedQuestionCount: 10,
          },
          {
            code: 'N5_M4_PARAPHRASE',
            titleJa: '言い換え類義',
            titleVi: 'Diễn đạt tương đương',
            orderIndex: 4,
            recommendedQuestionCount: 5,
          },
        ],
      },
      {
        code: 'LANGUAGE_GRAMMAR_READING',
        title: 'Language Knowledge (Grammar) · Reading',
        durationMinutes: 50,
        orderIndex: 2,
        isListening: false,
        mondai: [
          {
            code: 'N5_M1_GRAMMAR_SENTENCE',
            titleJa: '文の文法１',
            titleVi: 'Ngữ pháp câu 1',
            orderIndex: 1,
            recommendedQuestionCount: 16,
          },
          {
            code: 'N5_M2_GRAMMAR_SENTENCE',
            titleJa: '文の文法２',
            titleVi: 'Ngữ pháp câu 2',
            orderIndex: 2,
            recommendedQuestionCount: 5,
          },
          {
            code: 'N5_M3_GRAMMAR_PASSAGE',
            titleJa: '文章の文法',
            titleVi: 'Ngữ pháp trong đoạn văn',
            orderIndex: 3,
            recommendedQuestionCount: 5,
          },
          {
            code: 'N5_M4_READING_SHORT',
            titleJa: '内容理解（短文）',
            titleVi: 'Đọc hiểu đoạn ngắn',
            orderIndex: 4,
            recommendedQuestionCount: 3,
          },
          {
            code: 'N5_M5_READING_MEDIUM',
            titleJa: '内容理解（中文）',
            titleVi: 'Đọc hiểu đoạn vừa',
            orderIndex: 5,
            recommendedQuestionCount: 2,
          },
          {
            code: 'N5_M6_INFO_SEARCH',
            titleJa: '情報検索',
            titleVi: 'Tìm kiếm thông tin',
            orderIndex: 6,
            recommendedQuestionCount: 1,
          },
        ],
      },
      {
        code: 'LISTENING',
        title: 'Listening',
        durationMinutes: 30,
        orderIndex: 3,
        isListening: true,
        mondai: [
          {
            code: 'N5_M1_LISTEN_TASK',
            titleJa: '課題理解',
            titleVi: 'Nghe hiểu nhiệm vụ',
            orderIndex: 1,
            recommendedQuestionCount: 7,
          },
          {
            code: 'N5_M2_LISTEN_POINT',
            titleJa: 'ポイント理解',
            titleVi: 'Nghe ý chính',
            orderIndex: 2,
            recommendedQuestionCount: 6,
          },
          {
            code: 'N5_M3_LISTEN_EXPRESSION',
            titleJa: '発表現話',
            titleVi: 'Chọn lời thoại phù hợp',
            orderIndex: 3,
            recommendedQuestionCount: 5,
          },
          {
            code: 'N5_M4_LISTEN_RESPONSE',
            titleJa: '即時応答',
            titleVi: 'Ứng đáp nhanh',
            orderIndex: 4,
            recommendedQuestionCount: 6,
          },
        ],
      },
    ],
  },
  {
    code: 'N4',
    nameVi: 'JLPT N4',
    scoring: {
      // PREP reference: pass (Language+Reading) >= 90, Listening >= 19, Total >= 90.
      minLanguageScaled: 45,
      minReadingScaled: 45,
      minListeningScaled: 19,
      minTotalScaled: 90,
      rawMaxByDomain: {
        LANGUAGE: 80,
        READING: 40,
        LISTENING: 60,
      },
    },
    sections: [
      {
        code: 'LANGUAGE_VOCAB',
        title: 'Language Knowledge (Vocabulary)',
        durationMinutes: 30,
        orderIndex: 1,
        isListening: false,
        mondai: [
          {
            code: 'N4_M1_KANJI_READING',
            titleJa: '漢字読み',
            titleVi: 'Đọc Hán tự',
            orderIndex: 1,
            recommendedQuestionCount: 9,
          },
          {
            code: 'N4_M2_ORTHOGRAPHY',
            titleJa: '表記',
            titleVi: 'Chuyển đổi cách viết',
            orderIndex: 2,
            recommendedQuestionCount: 6,
          },
          {
            code: 'N4_M3_CONTEXT_VOCAB',
            titleJa: '文脈規定',
            titleVi: 'Từ vựng theo ngữ cảnh',
            orderIndex: 3,
            recommendedQuestionCount: 10,
          },
          {
            code: 'N4_M4_PARAPHRASE',
            titleJa: '言い換え類義',
            titleVi: 'Diễn đạt tương đương',
            orderIndex: 4,
            recommendedQuestionCount: 5,
          },
          {
            code: 'N4_M5_USAGE',
            titleJa: '用法',
            titleVi: 'Cách dùng từ',
            orderIndex: 5,
            recommendedQuestionCount: 5,
          },
        ],
      },
      {
        code: 'LANGUAGE_GRAMMAR_READING',
        title: 'Language Knowledge (Grammar) · Reading',
        durationMinutes: 60,
        orderIndex: 2,
        isListening: false,
        mondai: [
          {
            code: 'N4_M1_GRAMMAR_SENTENCE',
            titleJa: '文の文法１',
            titleVi: 'Ngữ pháp câu 1',
            orderIndex: 1,
            recommendedQuestionCount: 15,
          },
          {
            code: 'N4_M2_GRAMMAR_SENTENCE',
            titleJa: '文の文法２',
            titleVi: 'Ngữ pháp câu 2',
            orderIndex: 2,
            recommendedQuestionCount: 5,
          },
          {
            code: 'N4_M3_GRAMMAR_PASSAGE',
            titleJa: '文章の文法',
            titleVi: 'Ngữ pháp trong đoạn văn',
            orderIndex: 3,
            recommendedQuestionCount: 5,
          },
          {
            code: 'N4_M4_READING_SHORT',
            titleJa: '内容理解（短文）',
            titleVi: 'Đọc hiểu đoạn ngắn',
            orderIndex: 4,
            recommendedQuestionCount: 4,
          },
          {
            code: 'N4_M5_READING_MEDIUM',
            titleJa: '内容理解（中文）',
            titleVi: 'Đọc hiểu đoạn vừa',
            orderIndex: 5,
            recommendedQuestionCount: 4,
          },
          {
            code: 'N4_M6_INFO_SEARCH',
            titleJa: '情報検索',
            titleVi: 'Tìm kiếm thông tin',
            orderIndex: 6,
            recommendedQuestionCount: 2,
          },
        ],
      },
      {
        code: 'LISTENING',
        title: 'Listening',
        durationMinutes: 35,
        orderIndex: 3,
        isListening: true,
        mondai: [
          {
            code: 'N4_M1_LISTEN_TASK',
            titleJa: '課題理解',
            titleVi: 'Nghe hiểu nhiệm vụ',
            orderIndex: 1,
            recommendedQuestionCount: 8,
          },
          {
            code: 'N4_M2_LISTEN_POINT',
            titleJa: 'ポイント理解',
            titleVi: 'Nghe ý chính',
            orderIndex: 2,
            recommendedQuestionCount: 7,
          },
          {
            code: 'N4_M3_LISTEN_EXPRESSION',
            titleJa: '発表現話',
            titleVi: 'Chọn lời thoại phù hợp',
            orderIndex: 3,
            recommendedQuestionCount: 5,
          },
          {
            code: 'N4_M4_LISTEN_RESPONSE',
            titleJa: '即時応答',
            titleVi: 'Ứng đáp nhanh',
            orderIndex: 4,
            recommendedQuestionCount: 8,
          },
        ],
      },
    ],
  },
  {
    code: 'N3',
    nameVi: 'JLPT N3',
    scoring: {
      minLanguageScaled: 19,
      minReadingScaled: 19,
      minListeningScaled: 19,
      minTotalScaled: 95,
      rawMaxByDomain: {
        LANGUAGE: 58,
        READING: 60,
        LISTENING: 60,
      },
    },
    sections: [
      {
        code: 'LANGUAGE_VOCAB',
        title: 'Language Knowledge (Vocabulary)',
        durationMinutes: 30,
        orderIndex: 1,
        isListening: false,
        mondai: [
          {
            code: 'N3_M1_KANJI_READING',
            titleJa: '漢字読み',
            titleVi: 'Đọc Hán tự',
            orderIndex: 1,
            recommendedQuestionCount: 8,
          },
          {
            code: 'N3_M2_ORTHOGRAPHY',
            titleJa: '表記',
            titleVi: 'Chuyển đổi cách viết',
            orderIndex: 2,
            recommendedQuestionCount: 6,
          },
          {
            code: 'N3_M3_CONTEXT_VOCAB',
            titleJa: '文脈規定',
            titleVi: 'Từ vựng theo ngữ cảnh',
            orderIndex: 3,
            recommendedQuestionCount: 11,
          },
          {
            code: 'N3_M4_PARAPHRASE',
            titleJa: '言い換え類義',
            titleVi: 'Diễn đạt tương đương',
            orderIndex: 4,
            recommendedQuestionCount: 5,
          },
          {
            code: 'N3_M5_USAGE',
            titleJa: '用法',
            titleVi: 'Cách dùng từ',
            orderIndex: 5,
            recommendedQuestionCount: 5,
          },
        ],
      },
      {
        code: 'LANGUAGE_GRAMMAR_READING',
        title: 'Language Knowledge (Grammar) · Reading',
        durationMinutes: 70,
        orderIndex: 2,
        isListening: false,
        mondai: [
          {
            code: 'N3_M1_GRAMMAR_SENTENCE',
            titleJa: '文の文法１',
            titleVi: 'Ngữ pháp câu 1',
            orderIndex: 1,
            recommendedQuestionCount: 13,
          },
          {
            code: 'N3_M2_GRAMMAR_SENTENCE',
            titleJa: '文の文法２',
            titleVi: 'Ngữ pháp câu 2',
            orderIndex: 2,
            recommendedQuestionCount: 5,
          },
          {
            code: 'N3_M3_GRAMMAR_PASSAGE',
            titleJa: '文章の文法',
            titleVi: 'Ngữ pháp trong đoạn văn',
            orderIndex: 3,
            recommendedQuestionCount: 5,
          },
          {
            code: 'N3_M4_READING_SHORT',
            titleJa: '内容理解（短文）',
            titleVi: 'Đọc hiểu đoạn ngắn',
            orderIndex: 4,
            recommendedQuestionCount: 4,
          },
          {
            code: 'N3_M5_READING_MEDIUM',
            titleJa: '内容理解（中文）',
            titleVi: 'Đọc hiểu đoạn vừa',
            orderIndex: 5,
            recommendedQuestionCount: 6,
          },
          {
            code: 'N3_M6_READING_LONG',
            titleJa: '主張理解（長文）',
            titleVi: 'Đọc hiểu đoạn dài',
            orderIndex: 6,
            recommendedQuestionCount: 4,
          },
          {
            code: 'N3_M7_INFO_SEARCH',
            titleJa: '情報検索',
            titleVi: 'Tìm kiếm thông tin',
            orderIndex: 7,
            recommendedQuestionCount: 2,
          },
        ],
      },
      {
        code: 'LISTENING',
        title: 'Listening',
        durationMinutes: 40,
        orderIndex: 3,
        isListening: true,
        mondai: [
          {
            code: 'N3_M1_LISTEN_TASK',
            titleJa: '課題理解',
            titleVi: 'Nghe hiểu nhiệm vụ',
            orderIndex: 1,
            recommendedQuestionCount: 6,
          },
          {
            code: 'N3_M2_LISTEN_POINT',
            titleJa: 'ポイント理解',
            titleVi: 'Nghe ý chính',
            orderIndex: 2,
            recommendedQuestionCount: 6,
          },
          {
            code: 'N3_M3_LISTEN_SUMMARY',
            titleJa: '概要理解',
            titleVi: 'Nghe hiểu khái quát',
            orderIndex: 3,
            recommendedQuestionCount: 3,
          },
          {
            code: 'N3_M4_LISTEN_EXPRESSION',
            titleJa: '発表現話',
            titleVi: 'Chọn lời thoại phù hợp',
            orderIndex: 4,
            recommendedQuestionCount: 4,
          },
          {
            code: 'N3_M5_LISTEN_RESPONSE',
            titleJa: '即時応答',
            titleVi: 'Ứng đáp nhanh',
            orderIndex: 5,
            recommendedQuestionCount: 9,
          },
        ],
      },
    ],
  },
  {
    code: 'N2',
    nameVi: 'JLPT N2',
    scoring: {
      minLanguageScaled: 19,
      minReadingScaled: 19,
      minListeningScaled: 19,
      minTotalScaled: 90,
      rawMaxByDomain: {
        LANGUAGE: 60,
        READING: 61,
        LISTENING: 56,
      },
    },
    sections: [
      {
        code: 'LANGUAGE_GRAMMAR_READING',
        title: 'Language Knowledge (Vocabulary/Grammar) · Reading',
        durationMinutes: 105,
        orderIndex: 1,
        isListening: false,
        mondai: [
          {
            code: 'N2_M1_KANJI_READING',
            titleJa: '漢字読み',
            titleVi: 'Đọc Hán tự',
            orderIndex: 1,
            recommendedQuestionCount: 5,
          },
          {
            code: 'N2_M2_ORTHOGRAPHY',
            titleJa: '表記',
            titleVi: 'Chuyển đổi cách viết',
            orderIndex: 2,
            recommendedQuestionCount: 5,
          },
          {
            code: 'N2_M3_WORD_FORMATION',
            titleJa: '語形成',
            titleVi: 'Cấu tạo từ',
            orderIndex: 3,
            recommendedQuestionCount: 5,
          },
          {
            code: 'N2_M4_CONTEXT_VOCAB',
            titleJa: '文脈規定',
            titleVi: 'Từ vựng theo ngữ cảnh',
            orderIndex: 4,
            recommendedQuestionCount: 7,
          },
          {
            code: 'N2_M5_PARAPHRASE',
            titleJa: '言い換え類義',
            titleVi: 'Diễn đạt tương đương',
            orderIndex: 5,
            recommendedQuestionCount: 5,
          },
          {
            code: 'N2_M6_USAGE',
            titleJa: '用法',
            titleVi: 'Cách dùng từ',
            orderIndex: 6,
            recommendedQuestionCount: 5,
          },
          {
            code: 'N2_M7_GRAMMAR_SENTENCE',
            titleJa: '文の文法１',
            titleVi: 'Ngữ pháp câu 1',
            orderIndex: 7,
            recommendedQuestionCount: 12,
          },
          {
            code: 'N2_M8_GRAMMAR_SENTENCE',
            titleJa: '文の文法２',
            titleVi: 'Ngữ pháp câu 2',
            orderIndex: 8,
            recommendedQuestionCount: 5,
          },
          {
            code: 'N2_M9_GRAMMAR_PASSAGE',
            titleJa: '文章の文法',
            titleVi: 'Ngữ pháp trong đoạn văn',
            orderIndex: 9,
            recommendedQuestionCount: 5,
          },
          {
            code: 'N2_M10_READING_SHORT',
            titleJa: '内容理解（短文）',
            titleVi: 'Đọc hiểu đoạn ngắn',
            orderIndex: 10,
            recommendedQuestionCount: 5,
          },
          {
            code: 'N2_M11_READING_MEDIUM',
            titleJa: '内容理解（中文）',
            titleVi: 'Đọc hiểu đoạn vừa',
            orderIndex: 11,
            recommendedQuestionCount: 9,
          },
          {
            code: 'N2_M12_READING_INTEGRATED',
            titleJa: '統合理解',
            titleVi: 'Đọc hiểu tổng hợp',
            orderIndex: 12,
            recommendedQuestionCount: 2,
          },
          {
            code: 'N2_M13_READING_LONG',
            titleJa: '主張理解（長文）',
            titleVi: 'Đọc hiểu đoạn dài',
            orderIndex: 13,
            recommendedQuestionCount: 3,
          },
          {
            code: 'N2_M14_INFO_SEARCH',
            titleJa: '情報検索',
            titleVi: 'Tìm kiếm thông tin',
            orderIndex: 14,
            recommendedQuestionCount: 2,
          },
        ],
      },
      {
        code: 'LISTENING',
        title: 'Listening',
        durationMinutes: 50,
        orderIndex: 2,
        isListening: true,
        mondai: [
          {
            code: 'N2_M1_LISTEN_TASK',
            titleJa: '課題理解',
            titleVi: 'Nghe hiểu nhiệm vụ',
            orderIndex: 1,
            recommendedQuestionCount: 5,
          },
          {
            code: 'N2_M2_LISTEN_POINT',
            titleJa: 'ポイント理解',
            titleVi: 'Nghe ý chính',
            orderIndex: 2,
            recommendedQuestionCount: 6,
          },
          {
            code: 'N2_M3_LISTEN_SUMMARY',
            titleJa: '概要理解',
            titleVi: 'Nghe hiểu khái quát',
            orderIndex: 3,
            recommendedQuestionCount: 5,
          },
          {
            code: 'N2_M4_LISTEN_RESPONSE',
            titleJa: '即時応答',
            titleVi: 'Ứng đáp nhanh',
            orderIndex: 4,
            recommendedQuestionCount: 12,
          },
          {
            code: 'N2_M5_LISTEN_INTEGRATED',
            titleJa: '統合理解',
            titleVi: 'Nghe hiểu tổng hợp',
            orderIndex: 5,
            recommendedQuestionCount: 4,
          },
        ],
      },
    ],
  },
  {
    code: 'N1',
    nameVi: 'JLPT N1',
    scoring: {
      minLanguageScaled: 19,
      minReadingScaled: 19,
      minListeningScaled: 19,
      minTotalScaled: 100,
      rawMaxByDomain: {
        LANGUAGE: 60,
        READING: 60,
        LISTENING: 60,
      },
    },
    sections: [
      {
        code: 'LANGUAGE_GRAMMAR_READING',
        title: 'Language Knowledge (Vocabulary/Grammar) · Reading',
        durationMinutes: 110,
        orderIndex: 1,
        isListening: false,
        mondai: [
          {
            code: 'N1_M1_KANJI_READING',
            titleJa: '漢字読み',
            titleVi: 'Đọc Hán tự',
            orderIndex: 1,
            recommendedQuestionCount: 6,
          },
          {
            code: 'N1_M2_CONTEXT_VOCAB',
            titleJa: '文脈規定',
            titleVi: 'Từ vựng theo ngữ cảnh',
            orderIndex: 2,
            recommendedQuestionCount: 7,
          },
          {
            code: 'N1_M3_PARAPHRASE',
            titleJa: '言い換え類義',
            titleVi: 'Diễn đạt tương đương',
            orderIndex: 3,
            recommendedQuestionCount: 6,
          },
          {
            code: 'N1_M4_USAGE',
            titleJa: '用法',
            titleVi: 'Cách dùng từ',
            orderIndex: 4,
            recommendedQuestionCount: 6,
          },
          {
            code: 'N1_M5_GRAMMAR_SENTENCE',
            titleJa: '文の文法１',
            titleVi: 'Ngữ pháp câu 1',
            orderIndex: 5,
            recommendedQuestionCount: 10,
          },
          {
            code: 'N1_M6_GRAMMAR_SENTENCE',
            titleJa: '文の文法２',
            titleVi: 'Ngữ pháp câu 2',
            orderIndex: 6,
            recommendedQuestionCount: 5,
          },
          {
            code: 'N1_M7_GRAMMAR_PASSAGE',
            titleJa: '文章の文法',
            titleVi: 'Ngữ pháp trong đoạn văn',
            orderIndex: 7,
            recommendedQuestionCount: 5,
          },
          {
            code: 'N1_M8_READING_SHORT',
            titleJa: '内容理解（短文）',
            titleVi: 'Đọc hiểu đoạn ngắn',
            orderIndex: 8,
            recommendedQuestionCount: 4,
          },
          {
            code: 'N1_M9_READING_MEDIUM',
            titleJa: '内容理解（中文）',
            titleVi: 'Đọc hiểu đoạn vừa',
            orderIndex: 9,
            recommendedQuestionCount: 9,
          },
          {
            code: 'N1_M10_READING_LONG',
            titleJa: '内容理解（長文）',
            titleVi: 'Đọc hiểu đoạn dài',
            orderIndex: 10,
            recommendedQuestionCount: 4,
          },
          {
            code: 'N1_M11_READING_INTEGRATED',
            titleJa: '統合理解',
            titleVi: 'Đọc hiểu tổng hợp',
            orderIndex: 11,
            recommendedQuestionCount: 3,
          },
          {
            code: 'N1_M12_ARGUMENT_LONG',
            titleJa: '主張理解（長文）',
            titleVi: 'Đọc hiểu luận điểm đoạn dài',
            orderIndex: 12,
            recommendedQuestionCount: 4,
          },
          {
            code: 'N1_M13_INFO_SEARCH',
            titleJa: '情報検索',
            titleVi: 'Tìm kiếm thông tin',
            orderIndex: 13,
            recommendedQuestionCount: 2,
          },
        ],
      },
      {
        code: 'LISTENING',
        title: 'Listening',
        durationMinutes: 60,
        orderIndex: 2,
        isListening: true,
        mondai: [
          {
            code: 'N1_M1_LISTEN_TASK',
            titleJa: '課題理解',
            titleVi: 'Nghe hiểu nhiệm vụ',
            orderIndex: 1,
            recommendedQuestionCount: 6,
          },
          {
            code: 'N1_M2_LISTEN_POINT',
            titleJa: 'ポイント理解',
            titleVi: 'Nghe ý chính',
            orderIndex: 2,
            recommendedQuestionCount: 7,
          },
          {
            code: 'N1_M3_LISTEN_SUMMARY',
            titleJa: '概要理解',
            titleVi: 'Nghe hiểu khái quát',
            orderIndex: 3,
            recommendedQuestionCount: 6,
          },
          {
            code: 'N1_M4_LISTEN_RESPONSE',
            titleJa: '即時応答',
            titleVi: 'Ứng đáp nhanh',
            orderIndex: 4,
            recommendedQuestionCount: 14,
          },
          {
            code: 'N1_M5_LISTEN_INTEGRATED',
            titleJa: '統合理解',
            titleVi: 'Nghe hiểu tổng hợp',
            orderIndex: 5,
            recommendedQuestionCount: 4,
          },
        ],
      },
    ],
  },
];

@Injectable()
export class JlptDefaultSeederService implements OnModuleInit {
  private readonly logger = new Logger(JlptDefaultSeederService.name);
  private hasSeeded = false;

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    if (this.hasSeeded) return;
    this.hasSeeded = true;
    await this.seedJlptDefaultConfig();
  }

  private async seedJlptDefaultConfig() {
    for (const levelSeed of JLPT_SEED) {
      await this.prisma.$transaction(
        async (tx) => {
        const totalDurationMinutes = levelSeed.sections.reduce(
          (acc, section) => acc + section.durationMinutes,
          0,
        );

        const level = await tx.jlptLevel.upsert({
          where: { code: levelSeed.code },
          create: {
            code: levelSeed.code,
            nameVi: levelSeed.nameVi,
            totalDurationMinutes,
          },
          update: {
            nameVi: levelSeed.nameVi,
            totalDurationMinutes,
          },
          select: { id: true, code: true },
        });

        const sectionByCode = new Map<SectionCode, { id: string }>();
        for (const sectionSeed of levelSeed.sections) {
          const section = await tx.jlptSection.upsert({
            where: {
              levelId_code: {
                levelId: level.id,
                code: sectionSeed.code,
              },
            },
            create: {
              levelId: level.id,
              code: sectionSeed.code,
              nameVi: sectionSeed.title,
              durationMinutes: sectionSeed.durationMinutes,
              orderIndex: sectionSeed.orderIndex,
              isListening: sectionSeed.isListening,
            },
            update: {
              nameVi: sectionSeed.title,
              durationMinutes: sectionSeed.durationMinutes,
              orderIndex: sectionSeed.orderIndex,
              isListening: sectionSeed.isListening,
            },
            select: { id: true },
          });
          sectionByCode.set(sectionSeed.code, section);

          for (const mondaiSeed of sectionSeed.mondai) {
            await tx.jlptMondai.upsert({
              where: {
                sectionId_code: {
                  sectionId: section.id,
                  code: mondaiSeed.code,
                },
              },
              create: {
                sectionId: section.id,
                code: mondaiSeed.code,
                titleJa: mondaiSeed.titleJa,
                titleVi: mondaiSeed.titleVi,
                orderIndex: mondaiSeed.orderIndex,
                recommendedQuestionCount: mondaiSeed.recommendedQuestionCount,
              },
              update: {
                titleJa: mondaiSeed.titleJa,
                titleVi: mondaiSeed.titleVi,
                orderIndex: mondaiSeed.orderIndex,
                recommendedQuestionCount: mondaiSeed.recommendedQuestionCount,
              },
            });
          }
        }

        await tx.jlptScoringProfile.updateMany({
          where: { levelId: level.id, isActive: true },
          data: { isActive: false },
        });

        const existingProfile = await tx.jlptScoringProfile.findFirst({
          where: { levelId: level.id, name: JLPT_SCORING_PROFILE_NAME },
          select: { id: true },
        });

        const scoringProfile = existingProfile
          ? await tx.jlptScoringProfile.update({
              where: { id: existingProfile.id },
              data: {
                isActive: true,
                minLanguageScaled: levelSeed.scoring.minLanguageScaled,
                minReadingScaled: levelSeed.scoring.minReadingScaled,
                minListeningScaled: levelSeed.scoring.minListeningScaled,
                minTotalScaled: levelSeed.scoring.minTotalScaled,
              },
              select: { id: true },
            })
          : await tx.jlptScoringProfile.create({
              data: {
                levelId: level.id,
                name: JLPT_SCORING_PROFILE_NAME,
                isActive: true,
                minLanguageScaled: levelSeed.scoring.minLanguageScaled,
                minReadingScaled: levelSeed.scoring.minReadingScaled,
                minListeningScaled: levelSeed.scoring.minListeningScaled,
                minTotalScaled: levelSeed.scoring.minTotalScaled,
              },
              select: { id: true },
            });

        for (const domain of ['LANGUAGE', 'READING', 'LISTENING'] as const) {
          const domainRawMax = levelSeed.scoring.rawMaxByDomain[domain];
          // Keep wider range for future-proofing; values over domainRawMax are clamped to 60.
          for (let rawScore = 0; rawScore <= 200; rawScore += 1) {
            const scaledScore =
              domainRawMax <= 0
                ? 0
                : Math.max(
                    0,
                    Math.min(
                      60,
                      Math.round(
                        (Math.min(rawScore, domainRawMax) / domainRawMax) * 60,
                      ),
                    ),
                  );
            await tx.jlptScoringMapping.upsert({
              where: {
                profileId_domain_rawScore: {
                  profileId: scoringProfile.id,
                  domain,
                  rawScore,
                },
              },
              create: {
                profileId: scoringProfile.id,
                domain,
                rawScore,
                scaledScore,
              },
              update: {
                scaledScore,
              },
            });
          }
        }
      }, { timeout: 30000 });

      this.logger.log(
        `Seeded JLPT defaults for ${levelSeed.code} (upsert mode).`,
      );
    }
  }
}
