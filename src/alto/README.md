# Alto AI Assistant

Alto is Strato's AI-powered financial analysis assistant. This directory contains all Alto-related code with built-in security measures.

## Structure

```
alto/
├── README.md          # This file
├── persona.ts         # Alto's personality and behavior (EDITABLE)
├── security.ts        # Security measures and input validation
├── client.ts          # AI API client and analysis logic
```

## Configuration

Environment variables (in `.env.local`):
- `ALTO_API_BASE_URL` - LiteLLM API endpoint
- `ALTO_API_KEY` - API key for authentication
- `ALTO_MODEL` - Model to use (gpt-4.1-mini, gpt-5-mini, sonar-pro)

## Customizing Alto

### Editing Persona

Open `persona.ts` to customize:
- **Tone**: Professional, casual, technical, etc.
- **Guidelines**: What Alto should/shouldn't do
- **Response Format**: How Alto structures its analysis
- **Disclaimer**: Legal/compliance text

Example:
```typescript
export const ALTO_PERSONA = {
  name: 'Alto',
  personality: {
    tone: 'friendly and approachable', // Change this
    style: 'conversational',           // Change this
    approach: 'balanced',               // Change this
  },
  // ... customize other fields
};
```

## Security Features

### Input Sanitization
- Removes control characters
- Limits input length (10,000 chars max)
- Escapes malicious patterns
- Validates data structure

### Prompt Injection Prevention
- Filters suspicious patterns
- Validates AI responses
- Sanitizes HTML/XSS
- Removes sensitive data (API keys, tokens, etc.)

### Rate Limiting
- Max 10 requests/minute
- Max 100 requests/hour
- Max 4000 tokens/request

## Usage in Learning Lab

1. **Build Workflow**
   - Add analysis nodes (News, Technical, Fundamental)
   - Connect them to "Ask Alto"

2. **Run Workflow**
   - Data flows through connected nodes
   - Alto receives all upstream data
   - Generates comprehensive analysis

3. **View Results**
   - Alto's analysis appears in results panel
   - Structured, formatted response
   - Cites data sources

## API Endpoint

`POST /api/alto/analyze`

Request:
```json
{
  "symbol": "AAPL",
  "exchange": "US",
  "inputs": [
    { /* technical data */ },
    { /* fundamental data */ },
    { /* news articles */ }
  ],
  "userContext": "Optional additional context"
}
```

Response:
```json
{
  "analysis": "Detailed analysis text...",
  "model": "gpt-4.1-mini",
  "timestamp": "2024-01-01T00:00:00Z",
  "tokensUsed": 1250
}
```

## Security Best Practices

1. **Never expose API keys** - Keep them in `.env.local`
2. **Validate all inputs** - Use provided sanitization functions
3. **Rate limit requests** - Prevent abuse
4. **Sanitize responses** - Check for injection attempts
5. **Audit regularly** - Review logs for suspicious activity

## Models Available

- **gpt-4.1-mini** (default) - Fast, cost-effective, good quality
- **gpt-5-mini** - Latest, most capable
- **sonar-pro** - Specialized for financial analysis

## Extending Alto

### Adding New Capabilities

1. Edit `client.ts` to add new analysis functions
2. Update `persona.ts` if behavior needs to change
3. Add new API routes if needed
4. Update workflow executor to handle new node types

### Custom Data Formatters

Add to `client.ts`:
```typescript
export function formatCustomData(data: any): string {
  // Your custom formatting logic
  return formattedString;
}
```

## Troubleshooting

### "Configuration error: Invalid or missing ALTO_API_KEY"
- Check `.env.local` has `ALTO_API_KEY` set
- Restart dev server after adding env vars

### "Analysis failed: API request failed"
- Verify API endpoint is accessible
- Check API key is valid
- Ensure model name is correct

### "Invalid AI response: Response contains suspicious patterns"
- Security system detected potential injection
- Review input data for malicious content
- Check API response in logs

## Support

For issues or questions about Alto, check:
1. This README
2. Code comments in each file
3. API documentation at https://litellmprod.deriv.ai/

---

**Remember**: Alto is a tool to assist analysis, not provide financial advice. Always include appropriate disclaimers and encourage users to do their own research.
