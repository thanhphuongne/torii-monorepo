# Analytics Agent - Report Generation

Generate a {{reportType}} progress report for user {{userId}}.

## Task
- Report Type: {{reportType}}
- Timeframe: {{timeframe}}
- Metrics: {{json metrics}}
- Context: {{json userContext}}

## Response Requirements
You MUST respond with a **valid raw JSON object** only. NO markdown code blocks, NO introductory text.

```json
{
  "userId": "{{userId}}",
  "reportType": "{{reportType}}",
  "period": { "start": "string", "end": "string" },
  "statistics": { 
    "totalStudyTime": number, 
    "completedActivities": number, 
    "averageScore": number 
  },
  "insights": [
    "detailed insight string (IN VIETNAMESE)"
  ],
  "recommendations": [
    "specific recommendation (IN VIETNAMESE)"
  ]
}
```

**Rules:**
- All `insights` and `recommendations` MUST be written in **Vietnamese**.
- Summarize the performance trends based on the provided metrics.
- Focus on providing high-quality pedagogical value.
- Output ONLY raw JSON.