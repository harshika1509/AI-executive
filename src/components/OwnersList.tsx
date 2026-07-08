'use client';

import React from 'react';
import { Users, CheckCircle, Circle } from 'lucide-react';
import { Meeting } from '@/utils/db';

interface OwnersListProps {
  meeting: Meeting;
}

export default function OwnersList({ meeting }: OwnersListProps) {
  const { analysis } = meeting;

  // 1. Gather all unique owner names from action items and listed owners
  const itemOwners = analysis.actionItems.map(item => item.owner);
  const metadataOwners = analysis.owners.map(o => o.name);
  const allOwnerNames = Array.from(new Set([...itemOwners, ...metadataOwners])).filter(Boolean);

  // If there are no owners, fallback
  if (allOwnerNames.length === 0) {
    return (
      <div className="glass-card fade-in" style={{ textAlign: 'center', padding: '3rem' }}>
        <Users size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
        <h2>No participants identified</h2>
        <p className="paragraph-text">We couldn't identify any specific task owners or participants in this meeting transcript.</p>
      </div>
    );
  }

  return (
    <div className="owners-grid fade-in">
      {allOwnerNames.map((ownerName) => {
        // Find if this owner has a listed role in metadata
        const metadataInfo = analysis.owners.find(
          o => o.name.toLowerCase() === ownerName.toLowerCase()
        );
        const role = metadataInfo?.role || 'Team Member';

        // Get action items assigned to this owner
        const ownerTasks = analysis.actionItems.filter(
          item => item.owner.toLowerCase() === ownerName.toLowerCase()
        );

        return (
          <div key={ownerName} className="glass-card owner-card">
            <div className="owner-card-header">
              <div className="owner-large-avatar">
                {ownerName.charAt(0).toUpperCase()}
              </div>
              <div className="owner-card-info">
                <span className="owner-card-name">{ownerName}</span>
                <span className="owner-card-role">{role}</span>
              </div>
            </div>

            <div className="owner-tasks-section">
              <span className="section-label" style={{ fontSize: '0.7rem' }}>
                Assigned Tasks ({ownerTasks.length})
              </span>
              
              {ownerTasks.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {ownerTasks.map((task) => (
                    <div 
                      key={task.id} 
                      className={`owner-task-item ${task.completed ? 'completed' : ''}`}
                    >
                      {task.completed ? (
                        <CheckCircle size={14} className="owner-task-bullet" />
                      ) : (
                        <Circle size={14} className="owner-task-bullet" />
                      )}
                      <span>{task.task}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  No active tasks assigned in this meeting.
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
