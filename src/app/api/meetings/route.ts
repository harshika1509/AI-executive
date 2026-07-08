import { NextResponse } from 'next/server';
import { getMeetings, saveMeeting } from '@/utils/db';
import { isApiKeyConfigured } from '@/utils/ai';

export async function GET() {
  try {
    const meetings = getMeetings();
    // Return only metadata to minimize payload size
    const metadata = meetings.map(m => ({
      id: m.id,
      title: m.title,
      date: m.date,
      duration: m.duration,
      fileType: m.fileType,
      fileName: m.fileName,
      summary: m.analysis.summary
    }));
    
    return NextResponse.json({
      meetings: metadata,
      isApiKeySet: isApiKeyConfigured()
    });
  } catch (error) {
    console.error('API Error in /api/meetings GET:', error);
    return NextResponse.json({ error: 'Failed to fetch meetings' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body || !body.id) {
      return NextResponse.json({ error: 'Invalid meeting data' }, { status: 400 });
    }
    
    saveMeeting(body);
    return NextResponse.json({ success: true, meeting: body });
  } catch (error) {
    console.error('API Error in /api/meetings POST:', error);
    return NextResponse.json({ error: 'Failed to save meeting' }, { status: 500 });
  }
}
