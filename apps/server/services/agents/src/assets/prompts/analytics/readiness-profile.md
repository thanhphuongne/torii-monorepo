# Learner Readiness Profile & Assessment Benchmark

Provide a comprehensive learner profile and JLPT readiness assessment for user {{userId}} targeting JLPT {{targetLevel}}.

## Context
- **Target Level**: {{targetLevel}}
- **User Activity Metrics (Real Data)**: {{json metrics}}
- **User Learning Meta-Context**: {{json userContext}}
- **Current Time**: {{timestamp}}

## Task
Analyze the user's REAL learning metrics and activity history to provide a narrative assessment:
1. Estimate overall readiness percentage for {{targetLevel}} based on the data.
2. Identify specific skill gaps in Vocabulary, Grammar, Reading, and Listening.
3. List specific weaknesses with severity levels.
4. Provide pedagogical recommendations and next steps for the student.
5. Summarize recent performance trends based on the metrics.

## Response Requirements
You MUST respond with a **valid raw JSON object** only. NO markdown code blocks, NO introductory text.

The JSON structure MUST strictly follow the `AgentReadinessProfileResponseSchema`:

```json
{
  "userId": "string",
  "targetLevel": "{{targetLevel}}",
  "readinessPercentage": number (0-100),
  "skillGaps": {
    "vocabulary": number (0-100),
    "grammar": number (0-100),
    "reading": number (0-100),
    "listening": number (0-100)
  },
  "weaknesses": [
    {
      "topic": "topic name (IN VIETNAMESE)",
      "severity": "low|medium|high",
      "description": "detailed description of the weakness (IN VIETNAMESE)",
      "suggestedReview": "specific action to improve (IN VIETNAMESE)"
    }
  ],
  "recommendations": [
    "pedagogical recommendation 1 (IN VIETNAMESE)",
    "pedagogical recommendation 2 (IN VIETNAMESE)"
  ],
  "recentPerformance": {
    "averageScore": number,
    "testsTaken": number,
    "trend": "improving|stable|declining"
  },
  "nextSteps": [
    "immediate next action 1 (IN VIETNAMESE)",
    "immediate next action 2 (IN VIETNAMESE)"
  ]
}
```

Additional Rules:
- All descriptive text, topic names, and recommendations MUST be in **Vietnamese**.
- Ensure the assessment is realistic based on the provided user context.
- Output ONLY raw JSON. No backticks.
