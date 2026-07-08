'use client';

import React, { useState } from 'react';
import { Search, FileText } from 'lucide-react';
import { Meeting } from '@/utils/db';

interface TranscriptViewerProps {
  meeting: Meeting;
}

interface ParsedLine {
  speaker: string;
  text: string;
}

export default function TranscriptViewer({ meeting }: TranscriptViewerProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Helper to parse transcript lines
  const parseTranscript = (text: string): ParsedLine[] => {
    if (!text) return [];
    
    const lines = text.split('\n');
    const parsed: ParsedLine[] = [];
    
    // Pattern to match "Speaker Name: text" or "[00:02:15] Speaker Name: text"
    const speakerPattern = /^(?:\[\d{2}:\d{2}(?::\d{2})?\]\s*)?([^:]+?):\s*(.*)$/;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const match = trimmed.match(speakerPattern);
      if (match) {
        parsed.push({
          speaker: match[1].trim(),
          text: match[2].trim()
        });
      } else {
        // If it doesn't match the speaker pattern, append to previous line if exists, 
        // otherwise create a default "Narrator" line.
        if (parsed.length > 0) {
          parsed[parsed.length - 1].text += ' ' + trimmed;
        } else {
          parsed.push({
            speaker: 'Speaker',
            text: trimmed
          });
        }
      }
    }
    
    return parsed;
  };

  const parsedLines = parseTranscript(meeting.transcript);

  // Helper to highlight matching text
  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    const parts = text.split(new RegExp(`(${escapeRegExp(query)})`, 'gi'));
    return (
      <>
        {parts.map((part, index) => 
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={index}>{part}</mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  function escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // Filter lines if there is a search query
  const filteredLines = parsedLines.filter(line => 
    line.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
    line.speaker.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="transcript-tab-container fade-in">
      <div className="transcript-search-row">
        <div className="search-input-wrapper">
          <Search className="search-icon-absolute" size={16} />
          <input
            type="text"
            className="search-input"
            placeholder="Search words in transcript..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="paragraph-text" style={{ fontSize: '0.8rem' }}>
          Showing {filteredLines.length} of {parsedLines.length} blocks
        </div>
      </div>

      <div className="transcript-body">
        {filteredLines.length > 0 ? (
          filteredLines.map((line, idx) => (
            <div key={idx} className="transcript-paragraph">
              <div className="transcript-speaker">
                {line.speaker}
              </div>
              <div className="transcript-text-content">
                {highlightText(line.text, searchQuery)}
              </div>
            </div>
          ))
        ) : (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
            <FileText size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
            <h3>No transcript matches found</h3>
            <p className="paragraph-text">Try adjusting your search criteria or clear the query.</p>
          </div>
        )}
      </div>
    </div>
  );
}
