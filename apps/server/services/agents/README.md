# Agents Service

The Cortex module is the AI-powered brain of the Torii platform, providing intelligent tutoring, assessment, and analytics for Japanese language learning. It integrates multiple specialized agents to deliver personalized, adaptive learning experiences focused on JLPT preparation and foundational language skills.

## Prerequisites

### Python Setup for TTS (Text-to-Speech)

The Sensei Agent uses Microsoft Azure Neural TTS voices (Nanami & Keita) via the `edge-tts` Python package. You need to set up a Python virtual environment:

```bash
# Navigate to server directory
cd apps/server

# Create virtual environment
python3 -m venv .venv

# Activate virtual environment
# On Linux/Mac:
source .venv/bin/activate
# On Windows:
# .venv\Scripts\activate

# Install edge-tts
pip install edge-tts

# Verify installation
edge-tts --version
```

**Note**: The virtual environment must be created at `apps/server/.venv` as this path is hardcoded in the TTS service.

## Agents

### Sensei Agent

The Sensei Agent acts as an intelligent tutor focused on foundational language skills, providing immediate, context-aware assistance to learners. It leverages AI to handle everyday learning tasks, making it easier for users to build vocabulary, understand grammar rules, and practice translations without needing constant human intervention.

#### Features:

- **Grammar Explanation and Correction**: Analyzes user-input sentences or phrases in Japanese, identifies grammatical errors (e.g., particle misuse, verb conjugation issues), and provides detailed explanations with examples. It can suggest corrections and alternative phrasings, tailored to the learner's JLPT level (N5 to N1).
- **Translation Assistance**: Offers bidirectional translation between Japanese and Vietnamese (or English as a fallback), including idiomatic expressions, cultural nuances, and context-specific meanings. Users can input text, sentences, or paragraphs, and the agent returns accurate translations with breakdowns of key vocabulary and grammar points.
- **Flashcard Generation and Management**: Automatically creates personalized flashcards based on user progress or specific topics (e.g., kanji, vocabulary from JLPT word lists). Features include spaced repetition scheduling (SRS) to optimize review timing, multimedia support (adding audio pronunciation or images), and interactive quizzes where users flip cards, match terms, or fill in blanks.
- **Practice Drills**: Generates targeted exercises for grammar or vocabulary practice, such as fill-in-the-gaps, sentence building, or multiple-choice questions. It adapts difficulty based on user performance and provides instant feedback.
- **Conversation Simulation**: Simulates basic dialogues in Japanese, allowing users to practice responses with real-time corrections and suggestions to improve fluency.
- **Resource Recommendations**: Suggests supplementary materials like JLPT-aligned videos, articles, or exercises from the platform's library when a user struggles with a concept.
- **Integration with Live Classes**: During WebRTC sessions, it can provide on-the-fly grammar tips or translations in a chat sidebar, assisting instructors and students without disrupting the flow.

### Assessment Agent

The Assessment Agent specializes in testing and evaluation, ensuring learners are prepared for JLPT exams by simulating real test conditions and providing objective scoring. It focuses on generating dynamic content and analyzing performance to help users gauge their readiness.

#### Features:

- **Test Generation**: Creates customized JLPT-style tests (for levels N5 to N1) based on user preferences, such as focusing on vocabulary, grammar, reading, listening, or kanji. Tests can be short quizzes (5-10 questions) or full mock exams, pulling from a question bank while randomizing to prevent memorization.
- **Question Variety**: Supports multiple formats, including multiple-choice, reading comprehension with passages, listening exercises (with audio clips), kanji matching, and sentence rearrangement. It ensures questions align with official JLPT standards and difficulty levels.
- **Automated Evaluation**: Scores tests instantly upon submission, providing detailed breakdowns (e.g., correct/incorrect answers, time taken per section). It highlights error patterns, such as common mistakes in verb tenses or vocabulary confusion.
- **Adaptive Testing**: Adjusts question difficulty in real-time during a session—if a user excels in one area, it increases challenge; if they struggle, it simplifies or offers hints.
- **Progress Benchmarking**: Compares user scores against JLPT passing thresholds and historical performance, generating reports like "You're 75% ready for N4 vocabulary but need work on N4 listening."
- **Feedback and Explanations**: For each incorrect answer, provides in-depth explanations, links to relevant grammar rules or vocabulary from the Sensei Agent, and suggestions for review.
- **Exam Scheduling and Reminders**: Allows users to schedule practice tests and sends notifications via the platform, integrating with the adaptive learning journey to recommend tests at optimal times.
- **Integration with Analytics**: Shares test data with the Analytics Agent to inform personalized study paths, ensuring assessments feed into broader progress tracking.

### Analytics Agent

The Analytics Agent serves as the data-driven brain of the system, monitoring user activity to deliver insights and recommendations. It enables adaptive learning by analyzing patterns and suggesting optimizations, helping both learners and instructors make informed decisions.

#### Features:

- **Progress Tracking**: Monitors key metrics like completion rates for courses, quiz scores, time spent on topics, and JLPT level progression. It visualizes data through dashboards (e.g., progress charts, heatmaps of weak areas).
- **Personalized Study Paths**: Based on performance data, generates customized roadmaps following the JLPT curriculum. For example, if a user is weak in kanji, it prioritizes related flashcards and tests, adjusting the sequence of lessons or recommending extra practice.
- **Weakness Identification**: Uses AI to detect patterns in errors (e.g., recurring issues with polite forms or specific kanji radicals) and flags them for targeted intervention.
- **Predictive Analytics**: Forecasts JLPT readiness, such as estimating exam scores based on trends or predicting dropout risk if engagement drops, with alerts to users or instructors.
- **Gamification Integration**: Tracks points, badges, and achievements earned through the platform's reward system, unlocking vouchers or bonuses when milestones are reached (e.g., "Complete 50 flashcards for a discount on premium content").
- **Reporting for Instructors and Managers**: Provides aggregated insights for language centers, such as class-wide performance trends, dropout rates, or instructor effectiveness. Managers can use this for operational decisions like course adjustments or resource allocation.
- **Adaptive Recommendations**: Suggests real-time adjustments, like "Switch to live class on grammar if self-study isn't improving scores," or integrates with WebRTC to recommend group sessions for collaborative practice.
- **Data Privacy and Export**: Ensures all tracking complies with privacy standards, allowing users to export their progress reports (e.g., PDF summaries) for personal records or sharing with employers.
