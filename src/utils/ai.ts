import { GoogleGenAI } from '@google/genai';
import { MeetingAnalysis } from './db';

const getGeminiKey = () => process.env.GEMINI_API_KEY || '';
const getOpenRouterKey = () => process.env.OPENROUTER_API_KEY || '';
const getOpenRouterModel = () => process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-exp:free';

export function isApiKeyConfigured(): boolean {
  return getGeminiKey().trim().length > 0 || getOpenRouterKey().trim().length > 0;
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = getGeminiKey();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is missing.');
  }
  return new GoogleGenAI({ apiKey });
}

// JSON Schema for structured analysis
const analysisSchema = {
  type: 'OBJECT' as const,
  properties: {
    summary: {
      type: 'OBJECT' as const,
      properties: {
        title: { type: 'STRING' as const, description: 'A concise and clear title for the meeting.' },
        oneLiner: { type: 'STRING' as const, description: 'A single sentence summarizing the entire meeting.' },
        overview: { type: 'STRING' as const, description: 'A detailed executive summary paragraph of what transpired.' }
      },
      required: ['title', 'oneLiner', 'overview']
    },
    actionItems: {
      type: 'ARRAY' as const,
      description: 'List of actionable tasks extracted from the meeting.',
      items: {
        type: 'OBJECT' as const,
        properties: {
          task: { type: 'STRING' as const, description: 'The specific task to be done.' },
          owner: { type: 'STRING' as const, description: 'The person responsible for this task. Use "Unassigned" if unknown.' },
          deadline: { type: 'STRING' as const, description: 'The deadline or timeline mentioned. Use "No deadline" if none specified.' },
          priority: { 
            type: 'STRING' as const, 
            enum: ['high', 'medium', 'low'],
            description: 'The urgency level of this action item.'
          }
        },
        required: ['task', 'owner', 'deadline', 'priority']
      }
    },
    decisions: {
      type: 'ARRAY' as const,
      description: 'Key decisions made during the meeting.',
      items: { type: 'STRING' as const }
    },
    owners: {
      type: 'ARRAY' as const,
      description: 'Key participants identified as task owners or main speakers.',
      items: {
        type: 'OBJECT' as const,
        properties: {
          name: { type: 'STRING' as const, description: 'Full name or identifier of the participant.' },
          role: { type: 'STRING' as const, description: 'Implicit or explicit role of the participant in this context (optional).' }
        },
        required: ['name']
      }
    }
  },
  required: ['summary', 'actionItems', 'decisions', 'owners']
};

/**
 * Analyzes a raw text transcript. Splits path between Gemini and OpenRouter.
 */
export async function analyzeTextTranscript(transcriptText: string): Promise<MeetingAnalysis> {
  const geminiKey = getGeminiKey();
  if (geminiKey) {
    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `You are an expert meeting assistant. Analyze the following meeting transcript. Extract the title, a one-liner summary, a detailed overview, all action items (with their owners, deadlines, and priorities), key decisions, and a list of key owners/participants.
      
Transcript:
${transcriptText}`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: analysisSchema,
      }
    });

    if (!response.text) {
      throw new Error('Empty response from Gemini during analysis.');
    }

    const parsed = JSON.parse(response.text) as MeetingAnalysis;
    parsed.actionItems = (parsed.actionItems || []).map((item, idx) => ({
      ...item,
      id: `act-${idx}-${Date.now()}`,
      completed: false
    }));
    return parsed;
  } else {
    // OpenRouter Mode
    const openrouterKey = getOpenRouterKey();
    if (!openrouterKey) {
      throw new Error('No API Key configured. Please add GEMINI_API_KEY or OPENROUTER_API_KEY to your .env file.');
    }
    return queryOpenRouterAnalysis(transcriptText, openrouterKey);
  }
}

/**
 * Transcribes and analyzes audio/video files. Requires direct Gemini Key.
 */
export async function transcribeAndAnalyzeMedia(
  filePath: string,
  mimeType: string
): Promise<{ transcript: string; analysis: MeetingAnalysis }> {
  const geminiKey = getGeminiKey();
  
  if (!geminiKey) {
    throw new Error(
      'Direct audio/video transcription is not supported on OpenRouter\'s free tier. ' +
      'Please upload a text transcript (.txt, .vtt, .srt) instead, or configure a direct GEMINI_API_KEY in your .env file.'
    );
  }

  const ai = getGeminiClient();
  console.log(`Uploading file ${filePath} (${mimeType}) to Gemini File API...`);
  const uploadResult = await ai.files.upload({
    file: filePath,
    config: { mimeType }
  });
  console.log(`File uploaded successfully. URI: ${uploadResult.uri}`);

  const mediaOutputSchema = {
    type: 'OBJECT' as const,
    properties: {
      transcript: { 
        type: 'STRING' as const, 
        description: 'Verbatim or highly detailed transcript of the audio/video file, including speaker diarization (e.g. "Speaker A: ...") if identifiable.' 
      },
      analysis: analysisSchema
    },
    required: ['transcript', 'analysis']
  };

  try {
    console.log('Sending request to Gemini model for transcription and analysis...');
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [
        {
          fileData: {
            fileUri: uploadResult.uri,
            mimeType: uploadResult.mimeType
          }
        },
        'Analyze this meeting recording. First, transcribe the entire meeting in detail (identifying different speakers if possible, e.g., "Person A: ..."). Second, analyze the conversation to extract the meeting title, a one-liner summary, a detailed overview, all action items (with owners, deadlines, and priorities), key decisions, and the participants list.'
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: mediaOutputSchema
      }
    });

    if (!response.text) {
      throw new Error('Empty response from Gemini during media processing.');
    }

    const parsed = JSON.parse(response.text) as { transcript: string; analysis: MeetingAnalysis };
    parsed.analysis.actionItems = (parsed.analysis.actionItems || []).map((item, idx) => ({
      ...item,
      id: `act-${idx}-${Date.now()}`,
      completed: false
    }));

    return parsed;
  } finally {
    try {
      if (uploadResult.name) {
        await ai.files.delete({ name: uploadResult.name });
        console.log(`Cleaned up temp upload file: ${uploadResult.name}`);
      }
    } catch (e) {
      console.warn(`Failed to delete temporary file ${uploadResult.name} (will auto-delete in 48 hours):`, e);
    }
  }
}

/**
 * Chat with meeting transcript. Supports direct Gemini and OpenRouter.
 */
export async function chatWithMeeting(
  transcript: string,
  chatHistory: { role: 'user' | 'assistant'; content: string }[],
  nextMessage: string
): Promise<string> {
  const geminiKey = getGeminiKey();
  if (geminiKey) {
    const ai = getGeminiClient();
    const formattedHistory = chatHistory.map(msg => ({
      role: msg.role === 'user' ? 'user' as const : 'model' as const,
      parts: [{ text: msg.content }]
    }));

    const systemPrompt = `You are a helpful AI Meeting Assistant. You have access to the meeting transcript below. 
Your goal is to answer any questions about the meeting accurately based ONLY on the transcript. If the answer is not in the transcript, say "I cannot find that information in the transcript."
Keep answers concise, direct, and professional.

Meeting Transcript:
---
${transcript}
---`;

    const chat = ai.chats.create({
      model: 'gemini-2.0-flash',
      config: { systemInstruction: systemPrompt },
      history: formattedHistory
    });

    const response = await chat.sendMessage({ message: nextMessage });
    return response.text || 'Sorry, I could not process that request.';
  } else {
    // OpenRouter Mode
    const openrouterKey = getOpenRouterKey();
    if (!openrouterKey) {
      throw new Error('No API Key configured. Please add GEMINI_API_KEY or OPENROUTER_API_KEY to your .env file.');
    }
    return queryOpenRouterChat(transcript, chatHistory, nextMessage, openrouterKey);
  }
}

/**
 * OpenRouter analysis fetch query.
 */
async function queryOpenRouterAnalysis(transcript: string, apiKey: string): Promise<MeetingAnalysis> {
  console.log(`Sending analysis request to OpenRouter using model: ${getOpenRouterModel()}`);
  
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'AI Meeting Assistant'
    },
    body: JSON.stringify({
      model: getOpenRouterModel(),
      messages: [
        {
          role: 'system',
          content: 'You are an expert meeting assistant. Analyze the meeting transcript. Extract the title, a one-liner summary, a detailed overview, all action items (with their owners, deadlines, and priorities), key decisions, and a list of key owners/participants. You must return your response in JSON format matching the schema provided below. Do not output any markdown text or formatting outside the JSON.\n\nJSON Schema:\n{\n  "summary": {\n    "title": "concise title",\n    "oneLiner": "single sentence summary",\n    "overview": "detailed paragraph overview"\n  },\n  "actionItems": [\n    {\n      "task": "task description",\n      "owner": "owner name or \'Unassigned\'",\n      "deadline": "due date or \'No deadline\'",\n      "priority": "high, medium, or low"\n    }\n  ],\n  "decisions": [\n    "decision 1"\n  ],\n  "owners": [\n    {\n      "name": "owner name",\n      "role": "owner role (optional)"\n    }\n  ]\n}'
        },
        {
          role: 'user',
          content: transcript
        }
      ],
      response_format: { type: 'json_object' }
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || 'OpenRouter API request failed.');
  }

  const text = data.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error('Empty response from OpenRouter.');
  }

  const parsed = JSON.parse(text) as MeetingAnalysis;
  
  parsed.actionItems = (parsed.actionItems || []).map((item, idx) => ({
    ...item,
    id: `act-${idx}-${Date.now()}`,
    completed: false
  }));

  return parsed;
}

/**
 * OpenRouter chat fetch query.
 */
async function queryOpenRouterChat(
  transcript: string,
  chatHistory: { role: 'user' | 'assistant'; content: string }[],
  nextMessage: string,
  apiKey: string
): Promise<string> {
  console.log(`Sending chat message to OpenRouter using model: ${getOpenRouterModel()}`);

  const systemPrompt = `You are a helpful AI Meeting Assistant. You have access to the meeting transcript below. 
Your goal is to answer any questions about the meeting accurately based ONLY on the transcript. If the answer is not in the transcript, say "I cannot find that information in the transcript."
Keep answers concise, direct, and professional.

Meeting Transcript:
---
${transcript}
---`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...chatHistory.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    })),
    { role: 'user', content: nextMessage }
  ];

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'AI Meeting Assistant'
    },
    body: JSON.stringify({
      model: getOpenRouterModel(),
      messages
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || 'OpenRouter Chat request failed.');
  }

  return data.choices?.[0]?.message?.content || 'Sorry, I could not process that request.';
}
