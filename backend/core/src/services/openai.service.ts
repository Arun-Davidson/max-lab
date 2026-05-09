import axios from 'axios';
import config from '../config';
import logger from '../config/logger';

/**
 * Service to interact with OpenAI API for code review and grading.
 */
export const reviewCode = async (
  problemDescription: string,
  userCode: string,
  testResults: any,
): Promise<{ review: string; grade: number; improvedCode: string | null }> => {
  try {
    if (!config.services.openai.apiKey) {
      logger.warn('OpenAI API Key not configured. Skipping code review.');
      return { review: 'OpenAI review skipped: API key missing.', grade: 0, improvedCode: null };
    }

    const prompt = `
      You are an expert software engineer and interviewer. Review the following code submission for a coding problem.
      
      Problem Description:
      ${problemDescription}
      
      User Code:
      \`\`\`
      ${userCode}
      \`\`\`
      
      Test Execution Results:
      ${JSON.stringify(testResults, null, 2)}
      
      Provide a concise qualitative review (readability, complexity, efficiency) and a numeric grade from 0 to 100.
      Respond ONLY in JSON format:
      {
        "review": "Your review text here",
        "grade": 85,
        "improvedCode": "Complete improved source code here"
      }
    `;

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4', // or gpt-3.5-turbo
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
      },
      {
        headers: {
          Authorization: `Bearer ${config.services.openai.apiKey}`,
          'Content-Type': 'application/json',
        },
      },
    );

    const content = response.data.choices[0].message.content;
    const result = JSON.parse(content);

    return {
      review: result.review || 'No review provided.',
      grade: typeof result.grade === 'number' ? result.grade : 0,
      improvedCode: result.improvedCode || null,
    };
  } catch (error: any) {
    logger.error('OpenAI API Error:', error.response?.data || error.message);
    return { review: 'Failed to generate review from OpenAI.', grade: 0, improvedCode: null };
  }
};
