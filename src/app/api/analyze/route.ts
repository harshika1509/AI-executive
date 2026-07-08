import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { saveMeeting, Meeting } from '@/utils/db';
import { isApiKeyConfigured, analyzeTextTranscript, transcribeAndAnalyzeMedia } from '@/utils/ai';

export const maxDuration = 300; // Allow serverless functions to run longer (up to 5 mins) for audio/video uploads

export async function POST(request: Request) {
  try {
    // 1. Check API Key
    if (!isApiKeyConfigured()) {
      return NextResponse.json(
        { error: 'Gemini API key is not configured. Please add GEMINI_API_KEY to your .env file.' },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const customTitle = formData.get('title') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
    }

    const mimeType = file.type;
    const fileName = file.name;
    const title = customTitle || fileName.replace(/\.[^/.]+$/, ''); // Remove file extension

    // Determine type based on mime type or file extension
    let detectedType: 'text' | 'audio' | 'video' = 'text';
    if (mimeType.startsWith('audio/') || /\.(mp3|wav|m4a|ogg|aac|flac)$/i.test(fileName)) {
      detectedType = 'audio';
    } else if (mimeType.startsWith('video/') || /\.(mp4|mov|avi|mkv|webm|mpeg|3gp)$/i.test(fileName)) {
      detectedType = 'video';
    }

    let transcript = '';
    let analysis;

    if (detectedType === 'text') {
      // Handle text file directly
      transcript = await file.text();
      console.log(`Analyzing text transcript of size: ${transcript.length} chars`);
      analysis = await analyzeTextTranscript(transcript);
    } else {
      // Handle audio/video file via temporary local storage
      const tempDir = path.join(process.cwd(), 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      const tempFilePath = path.join(tempDir, `${Date.now()}-${fileName}`);
      const buffer = Buffer.from(await file.arrayBuffer());
      fs.writeFileSync(tempFilePath, buffer);

      try {
        // Run multimodal transcription + analysis
        console.log(`Processing media file: ${fileName} (${detectedType})`);
        
        // Map common extensions to standard MIMEs if not provided
        let resolvedMime = mimeType;
        if (!resolvedMime || resolvedMime === 'application/octet-stream') {
          if (fileName.endsWith('.mp3')) resolvedMime = 'audio/mp3';
          else if (fileName.endsWith('.m4a')) resolvedMime = 'audio/m4a';
          else if (fileName.endsWith('.wav')) resolvedMime = 'audio/wav';
          else if (fileName.endsWith('.mp4')) resolvedMime = 'video/mp4';
          else if (fileName.endsWith('.mov')) resolvedMime = 'video/quicktime';
          else if (fileName.endsWith('.webm')) resolvedMime = 'video/webm';
          else resolvedMime = detectedType === 'audio' ? 'audio/mpeg' : 'video/mp4';
        }

        const mediaResult = await transcribeAndAnalyzeMedia(tempFilePath, resolvedMime);
        transcript = mediaResult.transcript;
        analysis = mediaResult.analysis;
      } finally {
        // Ensure clean up of local temp file
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
          console.log(`Cleaned up local temp file: ${tempFilePath}`);
        }
      }
    }

    // 2. Create the Meeting entity
    const meeting: Meeting = {
      id: uuidv4(),
      title,
      date: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      fileType: detectedType,
      fileName,
      transcript,
      analysis,
      messages: []
    };

    // 3. Save to Local JSON database
    saveMeeting(meeting);

    return NextResponse.json({ success: true, meeting });
  } catch (error: any) {
    console.error('API Error in /api/analyze POST:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process file and generate analysis.' },
      { status: 500 }
    );
  }
}
