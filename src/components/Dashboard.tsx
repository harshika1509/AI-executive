'use client';

import React from 'react';
import { Award, Briefcase, FileText, CheckCircle2, Milestone } from 'lucide-react';
import { Meeting } from '@/utils/db';

interface DashboardProps {
  meeting: Meeting;
}

export default function Dashboard({ meeting }: DashboardProps) {
  const { analysis } = meeting;
  const actionItemsCount = analysis.actionItems.length;
  const completedCount = analysis.actionItems.filter(item => item.completed).length;
  const decisionsCount = analysis.decisions.length;

  return (
    <div className="dashboard-grid fade-in">
      <div className="overview-main">
        {/* Statistics Widgets */}
        <div className="stats-grid">
          <div className="stat-box">
            <span className="stat-value">{decisionsCount}</span>
            <span className="stat-label">Key Decisions</span>
          </div>
          <div className="stat-box">
            <span className="stat-value">{completedCount} / {actionItemsCount}</span>
            <span className="stat-label">Action Items Done</span>
          </div>
          <div className="stat-box">
            <span className="stat-value" style={{ color: 'var(--color-indigo)' }}>
              {meeting.fileType.toUpperCase()}
            </span>
            <span className="stat-label">Source Format</span>
          </div>
        </div>

        {/* Executive Summary Card */}
        <div className="glass-card">
          <div className="card-title-row">
            <FileText size={18} />
            <h2>Executive Summary</h2>
          </div>
          <p className="paragraph-text" style={{ fontStyle: 'italic', marginBottom: '1.25rem', color: '#fff', fontSize: '1.05rem', fontWeight: '500' }}>
            "{analysis.summary.oneLiner}"
          </p>
          <p className="paragraph-text">
            {analysis.summary.overview}
          </p>
        </div>

        {/* Key Decisions Card */}
        <div className="glass-card">
          <div className="card-title-row">
            <Milestone size={18} />
            <h2>Key Decisions Made</h2>
          </div>
          {analysis.decisions.length > 0 ? (
            <ul className="decision-list">
              {analysis.decisions.map((decision, index) => (
                <li key={index} className="decision-item">
                  {decision}
                </li>
              ))}
            </ul>
          ) : (
            <p className="paragraph-text" style={{ color: 'var(--text-muted)' }}>
              No explicit decisions were identified in this meeting.
            </p>
          )}
        </div>
      </div>

      <div className="overview-sidebar">
        {/* Meeting Metadata Card */}
        <div className="glass-card">
          <div className="card-title-row">
            <Briefcase size={18} />
            <h2>Meeting Context</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.9rem' }}>
            <div>
              <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.8rem', textTransform: 'uppercase' }}>Analyzed On</span>
              <strong style={{ color: '#fff' }}>{meeting.date}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.8rem', textTransform: 'uppercase' }}>Source Filename</span>
              <strong style={{ color: '#fff', wordBreak: 'break-all' }}>{meeting.fileName}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.8rem', textTransform: 'uppercase' }}>Identified Participants</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.5rem' }}>
                {analysis.owners.length > 0 ? (
                  analysis.owners.map((owner, index) => (
                    <span key={index} className="owner-chip" style={{ fontSize: '0.75rem', padding: '3px 8px' }}>
                      <span className="owner-avatar" style={{ width: '14px', height: '14px', fontSize: '0.55rem' }}>
                        {owner.name.charAt(0).toUpperCase()}
                      </span>
                      {owner.name}
                    </span>
                  ))
                ) : (
                  <span style={{ color: 'var(--text-muted)' }}>None identified</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
