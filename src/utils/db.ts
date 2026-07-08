import fs from 'fs';
import path from 'path';

export interface ActionItem {
  id: string;
  task: string;
  owner: string;
  deadline: string;
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
}

export interface MeetingOwner {
  name: string;
  role?: string;
}

export interface MeetingAnalysis {
  summary: {
    title: string;
    oneLiner: string;
    overview: string;
  };
  actionItems: ActionItem[];
  decisions: string[];
  owners: MeetingOwner[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface Meeting {
  id: string;
  title: string;
  date: string;
  duration?: string;
  fileType: 'text' | 'audio' | 'video';
  fileName: string;
  transcript: string;
  analysis: MeetingAnalysis;
  messages: ChatMessage[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'meetings.json');

// Ensure the data directory and file exist
function initDb() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
}

export function getMeetings(): Meeting[] {
  try {
    initDb();
    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(data) as Meeting[];
  } catch (error) {
    console.error('Error reading meetings from db:', error);
    return [];
  }
}

export function getMeetingById(id: string): Meeting | undefined {
  const meetings = getMeetings();
  return meetings.find((m) => m.id === id);
}

export function saveMeeting(meeting: Meeting): void {
  try {
    initDb();
    const meetings = getMeetings();
    const index = meetings.findIndex((m) => m.id === meeting.id);

    if (index !== -1) {
      meetings[index] = meeting;
    } else {
      meetings.push(meeting);
    }

    fs.writeFileSync(DATA_FILE, JSON.stringify(meetings, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving meeting to db:', error);
  }
}

export function deleteMeeting(id: string): boolean {
  try {
    initDb();
    const meetings = getMeetings();
    const filtered = meetings.filter((m) => m.id !== id);
    
    if (filtered.length === meetings.length) {
      return false; // Meeting not found
    }
    
    fs.writeFileSync(DATA_FILE, JSON.stringify(filtered, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('Error deleting meeting from db:', error);
    return false;
  }
}
