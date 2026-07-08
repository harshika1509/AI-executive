import { NextResponse } from 'next/server';
import { getMeetingById, saveMeeting, ChatMessage } from '@/utils/db';
import { isApiKeyConfigured, chatWithMeeting } from '@/utils/ai';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
  try {
    // 1. Check API Key
    if (!isApiKeyConfigured()) {
      return NextResponse.json(
        { error: 'Gemini API key is not configured. Please add GEMINI_API_KEY to your .env file.' },
        { status: 400 }
      );
    }

    const { meetingId, message } = await request.json();
    
    if (!meetingId || !message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Missing meetingId or message' }, { status: 400 });
    }

    const meeting = getMeetingById(meetingId);
    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    // 2. Prepare chat message history
    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: message,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };

    const updatedHistory = [...meeting.messages, userMessage];

    // 3. Query Gemini with the transcript context
    console.log(`Sending chat query to Gemini for meeting: ${meeting.title}`);
    const replyText = await chatWithMeeting(
      meeting.transcript,
      meeting.messages, // Send existing history
      message
    );

    const assistantMessage: ChatMessage = {
      id: uuidv4(),
      role: 'assistant',
      content: replyText,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };

    // 4. Save updated messages list back to the DB
    meeting.messages = [...updatedHistory, assistantMessage];
    saveMeeting(meeting);

    return NextResponse.json({
      reply: replyText,
      messages: meeting.messages
    });
  } catch (error: any) {
    console.error('API Error in /api/chat POST:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate chat response.' },
      { status: 500 }
    );
  }
}
