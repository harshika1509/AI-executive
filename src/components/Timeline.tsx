'use client';

import React from 'react';
import { Calendar, User, Clock } from 'lucide-react';
import { Meeting } from '@/utils/db';

interface TimelineProps {
  meeting: Meeting;
}

export default function Timeline({ meeting }: TimelineProps) {
  const { actionItems } = meeting.analysis;

  // Filter out any items that don't have deadlines, or order them.
  // We will display all action items with their deadlines.
  const sortedItems = [...actionItems].sort((a, b) => {
    // Simple sort: try to put items with specific date formats first, or keep order.
    // If one contains "No deadline", put it last
    const aNoDeadline = a.deadline.toLowerCase().includes('no deadline');
    const bNoDeadline = b.deadline.toLowerCase().includes('no deadline');
    if (aNoDeadline && !bNoDeadline) return 1;
    if (!aNoDeadline && bNoDeadline) return -1;
    return 0;
  });

  return (
    <div className="glass-card fade-in">
      <div className="card-title-row">
        <Clock size={18} />
        <h2>Chronological Project Timeline</h2>
      </div>

      {sortedItems.length > 0 ? (
        <div className="timeline-container">
          <div className="timeline-line"></div>
          
          {sortedItems.map((item, index) => (
            <div 
              key={item.id} 
              className={`timeline-node ${item.completed ? 'completed' : ''}`}
            >
              <div className="timeline-dot"></div>
              <div className="timeline-date">{item.deadline}</div>
              
              <div className="timeline-card">
                <div className="timeline-task" style={{ textDecoration: item.completed ? 'line-through' : 'none', opacity: item.completed ? 0.6 : 1 }}>
                  {item.task}
                </div>
                <div className="timeline-meta">
                  <span className="owner-chip" style={{ fontSize: '0.75rem', padding: '2px 8px' }}>
                    <span className="owner-avatar" style={{ width: '14px', height: '14px', fontSize: '0.55rem' }}>
                      {item.owner.charAt(0).toUpperCase()}
                    </span>
                    {item.owner}
                  </span>
                  
                  <span className={`badge badge-priority-${item.priority}`} style={{ fontSize: '0.65rem', padding: '2px 8px' }}>
                    {item.priority}
                  </span>

                  {item.completed && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-teal)', fontWeight: '600' }}>
                      ✓ Completed
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="paragraph-text" style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>
          No action items or deadlines were found in this meeting.
        </p>
      )}
    </div>
  );
}
