'use client';

import React, { useState, useEffect } from 'react';
import { 
  Sparkles, Plus, Trash2, Calendar, FileText, 
  CheckSquare, Clock, Users, MessageSquare, AlertTriangle 
} from 'lucide-react';

import MeetingUpload from '@/components/MeetingUpload';
import Dashboard from '@/components/Dashboard';
import ActionItems from '@/components/ActionItems';
import Timeline from '@/components/Timeline';
import OwnersList from '@/components/OwnersList';
import ChatInterface from '@/components/ChatInterface';
import TranscriptViewer from '@/components/TranscriptViewer';
import { Meeting } from '@/utils/db';

type TabType = 'overview' | 'actions' | 'timeline' | 'owners' | 'chat' | 'transcript';

interface MeetingMetadata {
  id: string;
  title: string;
  date: string;
  duration?: string;
  fileType: 'text' | 'audio' | 'video';
  fileName: string;
  summary: {
    title: string;
    oneLiner: string;
    overview: string;
  };
}

export default function Home() {
  const [meetings, setMeetings] = useState<MeetingMetadata[]>([]);
  const [activeMeetingId, setActiveMeetingId] = useState<string | null>(null);
  const [activeMeeting, setActiveMeeting] = useState<Meeting | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isApiKeySet, setIsApiKeySet] = useState(true);
  const [isLoadingMeeting, setIsLoadingMeeting] = useState(false);

  // Fetch all meetings on mount
  useEffect(() => {
    fetchMeetings();
  }, []);

  // Fetch full meeting details when active ID changes
  useEffect(() => {
    if (activeMeetingId) {
      fetchMeetingDetails(activeMeetingId);
    } else {
      setActiveMeeting(null);
    }
  }, [activeMeetingId]);

  const fetchMeetings = async () => {
    try {
      const response = await fetch('/api/meetings');
      const data = await response.json();
      if (response.ok) {
        setMeetings(data.meetings || []);
        setIsApiKeySet(data.isApiKeySet);
      }
    } catch (error) {
      console.error('Error fetching meetings list:', error);
    }
  };

  const fetchMeetingDetails = async (id: string) => {
    setIsLoadingMeeting(true);
    try {
      const response = await fetch(`/api/meetings/${id}`);
      const data = await response.json();
      if (response.ok) {
        setActiveMeeting(data);
      } else {
        console.error('Failed to fetch meeting details:', data.error);
      }
    } catch (error) {
      console.error('Error fetching meeting details:', error);
    } finally {
      setIsLoadingMeeting(false);
    }
  };

  const handleUploadSuccess = (newMeeting: Meeting) => {
    // Refresh the sidebar list
    fetchMeetings();
    // Select the new meeting
    setActiveMeetingId(newMeeting.id);
    setActiveTab('overview');
  };

  const handleUpdateMeetingState = (updatedMeeting: Meeting) => {
    // Update local detailed active meeting state
    setActiveMeeting(updatedMeeting);
    
    // Also update metadata in sidebar list if title/summary changed
    setMeetings(prev => prev.map(m => {
      if (m.id === updatedMeeting.id) {
        return {
          ...m,
          title: updatedMeeting.title,
          summary: updatedMeeting.analysis.summary
        };
      }
      return m;
    }));
  };

  const handleDeleteMeeting = async () => {
    if (!activeMeetingId || !confirm('Are you sure you want to delete this meeting?')) return;

    try {
      const response = await fetch(`/api/meetings/${activeMeetingId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        setActiveMeetingId(null);
        setActiveMeeting(null);
        fetchMeetings();
      } else {
        alert('Failed to delete meeting');
      }
    } catch (error) {
      console.error('Error deleting meeting:', error);
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar Panel */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo-icon">⭐</div>
          <span className="logo-text">AI Executive Assistant</span>
        </div>

        <div className="sidebar-content">
          {/* API Key Missing Alert */}
          {!isApiKeySet && (
            <div className="config-banner">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}>
                <AlertTriangle size={14} />
                <span>API Key Missing</span>
              </div>
              <p>Please configure <code>GEMINI_API_KEY</code> or <code>OPENROUTER_API_KEY</code> in your <code>.env</code> file to enable AI processing.</p>
            </div>
          )}

          <button className="upload-btn" onClick={() => setIsUploadOpen(true)}>
            <Plus size={16} />
            New Meeting / Video
          </button>

          {/* List of Meetings */}
          <div className="meeting-list-container">
            <span className="section-label">Meetings ({meetings.length})</span>
            {meetings.length > 0 ? (
              <div className="meeting-list">
                {meetings.map((m) => (
                  <button
                    key={m.id}
                    className={`meeting-item ${activeMeetingId === m.id ? 'active' : ''}`}
                    onClick={() => setActiveMeetingId(m.id)}
                  >
                    <span className="meeting-item-title">{m.title}</span>
                    <div className="meeting-item-details">
                      <span>{m.date.split(',')[0]}</span>
                      <span className="meeting-type-badge">
                        {m.fileType === 'video' && '📹 Video'}
                        {m.fileType === 'audio' && '🔊 Audio'}
                        {m.fileType === 'text' && '📄 Text'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="paragraph-text" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '1rem 0' }}>
                No meetings uploaded yet.
              </p>
            )}
          </div>
        </div>
      </aside>

      {/* Main Panel */}
      <main className="main-content">
        {!activeMeeting ? (
          <div className="empty-state">
            <Sparkles className="empty-state-icon" />
            <h2 className="empty-state-title">Select a Meeting to Begin</h2>
            <p className="empty-state-text">
              Upload a `.txt` transcript or a video/audio file. Our system will transcribe and extract key summaries, milestones, action items, and more.
            </p>
            <button className="upload-btn" style={{ width: 'auto', padding: '0.85rem 2rem' }} onClick={() => setIsUploadOpen(true)}>
              <Plus size={16} />
              Upload Meeting Content
            </button>
          </div>
        ) : (
          <>
            {/* Header Meta */}
            <div className="workspace-header">
              <div className="meeting-meta">
                <h1 className="meeting-title-h1">{activeMeeting.title}</h1>
                <div className="meeting-info-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={14} />
                    <span>{activeMeeting.date}</span>
                  </div>
                  <span>•</span>
                  <span>{activeMeeting.fileName}</span>
                  <span>•</span>
                  <span className="meeting-type-badge">
                    {activeMeeting.fileType.toUpperCase()}
                  </span>
                </div>
              </div>

              <button className="delete-btn" onClick={handleDeleteMeeting}>
                <Trash2 size={15} />
                Delete
              </button>
            </div>

            {/* Navigation Tabs */}
            <nav className="tab-navigation">
              <button 
                className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => setActiveTab('overview')}
              >
                <FileText size={16} />
                Overview
              </button>
              <button 
                className={`tab-btn ${activeTab === 'actions' ? 'active' : ''}`}
                onClick={() => setActiveTab('actions')}
              >
                <CheckSquare size={16} />
                Action Items
              </button>
              <button 
                className={`tab-btn ${activeTab === 'timeline' ? 'active' : ''}`}
                onClick={() => setActiveTab('timeline')}
              >
                <Clock size={16} />
                Timeline
              </button>
              <button 
                className={`tab-btn ${activeTab === 'owners' ? 'active' : ''}`}
                onClick={() => setActiveTab('owners')}
              >
                <Users size={16} />
                Owners & Team
              </button>
              <button 
                className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
                onClick={() => setActiveTab('chat')}
              >
                <MessageSquare size={16} />
                Chat Assistant
              </button>
              <button 
                className={`tab-btn ${activeTab === 'transcript' ? 'active' : ''}`}
                onClick={() => setActiveTab('transcript')}
              >
                <FileText size={16} />
                Transcript
              </button>
            </nav>

            {/* Active Content Window */}
            <div className="tab-content">
              {isLoadingMeeting ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  <p className="paragraph-text">Loading meeting details...</p>
                </div>
              ) : (
                <>
                  {activeTab === 'overview' && <Dashboard meeting={activeMeeting} />}
                  {activeTab === 'actions' && (
                    <ActionItems 
                      meeting={activeMeeting} 
                      onUpdateMeeting={handleUpdateMeetingState} 
                    />
                  )}
                  {activeTab === 'timeline' && <Timeline meeting={activeMeeting} />}
                  {activeTab === 'owners' && <OwnersList meeting={activeMeeting} />}
                  {activeTab === 'chat' && (
                    <ChatInterface 
                      meeting={activeMeeting} 
                      onUpdateMeeting={handleUpdateMeetingState} 
                    />
                  )}
                  {activeTab === 'transcript' && <TranscriptViewer meeting={activeMeeting} />}
                </>
              )}
            </div>
          </>
        )}
      </main>

      {/* Upload Modal Overlay */}
      <MeetingUpload
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={handleUploadSuccess}
      />
    </div>
  );
}
