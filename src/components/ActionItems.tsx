'use client';

import React, { useState } from 'react';
import { Search, Calendar, User, CheckSquare, Square, Filter } from 'lucide-react';
import { Meeting, ActionItem } from '@/utils/db';

interface ActionItemsProps {
  meeting: Meeting;
  onUpdateMeeting: (updatedMeeting: Meeting) => void;
}

export default function ActionItems({ meeting, onUpdateMeeting }: ActionItemsProps) {
  const { analysis } = meeting;
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [ownerFilter, setOwnerFilter] = useState('all');

  const handleToggleComplete = async (itemId: string) => {
    // 1. Compute updated action items list
    const updatedActionItems = analysis.actionItems.map((item) => {
      if (item.id === itemId) {
        return { ...item, completed: !item.completed };
      }
      return item;
    });

    const updatedMeeting: Meeting = {
      ...meeting,
      analysis: {
        ...analysis,
        actionItems: updatedActionItems,
      },
    };

    // 2. Optimistic UI update
    onUpdateMeeting(updatedMeeting);

    // 3. Persist change back to database
    try {
      const response = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedMeeting),
      });
      if (!response.ok) {
        throw new Error('Failed to save updated action item state');
      }
    } catch (err) {
      console.error('Error saving updated meeting:', err);
    }
  };

  // Get list of unique owners for filtering
  const uniqueOwners = Array.from(
    new Set(analysis.actionItems.map((item) => item.owner).filter(Boolean))
  );

  // Apply filters
  const filteredItems = analysis.actionItems.filter((item) => {
    const matchesSearch = item.task.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = priorityFilter === 'all' || item.priority === priorityFilter;
    const matchesOwner = ownerFilter === 'all' || item.owner === ownerFilter;
    return matchesSearch && matchesPriority && matchesOwner;
  });

  return (
    <div className="fade-in">
      <div className="action-items-header">
        <div className="search-input-wrapper">
          <Search className="search-icon-absolute" size={16} />
          <input
            type="text"
            className="search-input"
            placeholder="Search action items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filters-row">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Filter size={14} style={{ color: 'var(--text-secondary)' }} />
            <select
              className="filter-select"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              <option value="all">All Priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <select
            className="filter-select"
            value={ownerFilter}
            onChange={(e) => setOwnerFilter(e.target.value)}
          >
            <option value="all">All Owners</option>
            {uniqueOwners.map((ownerName, idx) => (
              <option key={idx} value={ownerName}>
                {ownerName}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="glass-card">
        {filteredItems.length > 0 ? (
          <div className="action-items-list">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className={`action-item-row ${item.completed ? 'completed' : ''}`}
              >
                <div className="custom-checkbox">
                  <input
                    type="checkbox"
                    className="checkbox-element"
                    checked={item.completed}
                    onChange={() => handleToggleComplete(item.id)}
                  />
                </div>
                
                <div className="action-item-text">{item.task}</div>
                
                <div>
                  <span className={`badge badge-priority-${item.priority}`}>
                    {item.priority}
                  </span>
                </div>
                
                <div>
                  <span className="owner-chip">
                    <span className="owner-avatar">
                      {item.owner.charAt(0).toUpperCase()}
                    </span>
                    {item.owner}
                  </span>
                </div>
                
                <div className="deadline-chip">
                  <Calendar size={14} />
                  <span>{item.deadline}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="paragraph-text" style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>
            No action items matched the selected filters.
          </p>
        )}
      </div>
    </div>
  );
}
