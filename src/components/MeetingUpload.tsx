'use client';

import React, { useState, useRef } from 'react';
import { Upload, X, FileText, Music, Video, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';

interface MeetingUploadProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (meeting: any) => void;
}

type UploadStep = 'idle' | 'uploading' | 'transcribing' | 'analyzing' | 'complete' | 'error';

export default function MeetingUpload({ isOpen, onClose, onSuccess }: MeetingUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [step, setStep] = useState<UploadStep>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      setFile(droppedFile);
      if (!title) {
        setTitle(droppedFile.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      if (!title) {
        setTitle(selectedFile.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const getFileIcon = () => {
    if (!file) return <Upload className="drag-drop-icon" />;
    
    const name = file.name.toLowerCase();
    if (name.endsWith('.txt') || name.endsWith('.vtt') || name.endsWith('.srt')) {
      return <FileText className="drag-drop-icon" style={{ color: 'var(--color-indigo)' }} />;
    }
    if (/\.(mp3|wav|m4a|ogg|aac|flac)$/i.test(name)) {
      return <Music className="drag-drop-icon" style={{ color: 'var(--color-teal)' }} />;
    }
    if (/\.(mp4|mov|avi|mkv|webm)$/i.test(name)) {
      return <Video className="drag-drop-icon" style={{ color: 'var(--color-pink)' }} />;
    }
    return <Upload className="drag-drop-icon" />;
  };

  const startUploadSimulation = (isText: boolean) => {
    setStep('uploading');
    setProgress(10);

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev < 30) {
          return prev + 5;
        }
        
        // If it's a text file, it is fast. Skip transcribing.
        if (isText) {
          setStep('analyzing');
          if (prev < 80) return prev + 8;
        } else {
          // Audio/video file, spend more time transcribing
          setStep('transcribing');
          if (prev < 70) return prev + 2;
        }
        
        // Analyzing
        if (prev < 95) {
          setStep('analyzing');
          return prev + 1;
        }
        
        clearInterval(interval);
        return 95;
      });
    }, 400);

    return interval;
  };

  const handleUploadSubmit = async () => {
    if (!file) return;

    setErrorMessage('');
    const isText = file.name.endsWith('.txt') || file.name.endsWith('.vtt') || file.name.endsWith('.srt');
    const simulationInterval = startUploadSimulation(isText);

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (title.trim()) {
        formData.append('title', title);
      }

      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      clearInterval(simulationInterval);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process file.');
      }

      setProgress(100);
      setStep('complete');
      setTimeout(() => {
        onSuccess(data.meeting);
        onClose();
        resetState();
      }, 1000);

    } catch (error: any) {
      clearInterval(simulationInterval);
      setStep('error');
      setErrorMessage(error.message || 'An error occurred during analysis.');
    }
  };

  const resetState = () => {
    setFile(null);
    setTitle('');
    setStep('idle');
    setProgress(0);
    setErrorMessage('');
  };

  return (
    <div className="upload-modal-overlay">
      <div className="upload-modal">
        <div className="upload-modal-header">
          <h2 className="upload-modal-title">Upload Meeting Content</h2>
          <button className="close-modal-btn" onClick={onClose} disabled={step !== 'idle' && step !== 'error' && step !== 'complete'}>
            <X size={20} />
          </button>
        </div>

        {step === 'idle' && (
          <>
            <div 
              className={`drag-drop-zone ${dragActive ? 'active' : ''}`}
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input 
                ref={fileInputRef}
                type="file" 
                style={{ display: 'none' }} 
                accept=".txt,.vtt,.srt,.mp3,.wav,.m4a,.mp4,.mov,.webm"
                onChange={handleFileChange}
              />
              
              {getFileIcon()}
              
              <div className="drag-drop-text">
                {file ? file.name : "Drag & drop file here, or click to browse"}
              </div>
              <div className="drag-drop-subtext">
                Supports Transcript (.txt, .vtt, .srt) & Audio/Video (.mp3, .wav, .m4a, .mp4, .mov, .webm)
              </div>
            </div>

            {file && (
              <div className="title-input-field">
                <label htmlFor="meeting-title">Meeting Title</label>
                <input 
                  id="meeting-title"
                  type="text" 
                  className="text-input-field"
                  placeholder="Enter custom title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
            )}

            <button 
              className="upload-btn" 
              disabled={!file}
              onClick={handleUploadSubmit}
              style={{ opacity: file ? 1 : 0.5, cursor: file ? 'pointer' : 'not-allowed' }}
            >
              <Upload size={18} />
              Process & Analyze
            </button>
          </>
        )}

        {(step === 'uploading' || step === 'transcribing' || step === 'analyzing' || step === 'complete') && (
          <div className="progress-card">
            <div className="progress-header">
              <span>
                {step === 'uploading' && 'Uploading file to server...'}
                {step === 'transcribing' && 'Transcribing audio/video with Gemini AI...'}
                {step === 'analyzing' && 'Extracting summary & actions...'}
                {step === 'complete' && 'Analysis completed successfully!'}
              </span>
              <span>{progress}%</span>
            </div>
            
            <div className="progress-bar-track">
              <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
            </div>

            <div className="progress-steps">
              <div className={`progress-step-item ${step === 'uploading' ? 'active' : ''} ${step !== 'uploading' ? 'completed' : ''}`}>
                <CheckCircle2 className="progress-step-icon" style={{ color: step !== 'uploading' ? 'var(--color-teal)' : 'inherit' }} />
                <span>Upload file to workspace</span>
              </div>
              
              {file && !file.name.endsWith('.txt') && !file.name.endsWith('.vtt') && !file.name.endsWith('.srt') && (
                <div className={`progress-step-item ${step === 'transcribing' ? 'active' : ''} ${step === 'analyzing' || step === 'complete' ? 'completed' : ''}`}>
                  {step === 'transcribing' ? (
                    <Loader2 className="progress-step-icon animate-spin" />
                  ) : (
                    <CheckCircle2 className="progress-step-icon" style={{ color: (step === 'analyzing' || step === 'complete') ? 'var(--color-teal)' : 'inherit' }} />
                  )}
                  <span>Transcribe media file via Gemini File API</span>
                </div>
              )}

              <div className={`progress-step-item ${step === 'analyzing' ? 'active' : ''} ${step === 'complete' ? 'completed' : ''}`}>
                {step === 'analyzing' ? (
                  <Loader2 className="progress-step-icon animate-spin" />
                ) : (
                  <CheckCircle2 className="progress-step-icon" style={{ color: step === 'complete' ? 'var(--color-teal)' : 'inherit' }} />
                )}
                <span>Generate structured summary, decisions & actions</span>
              </div>
            </div>
          </div>
        )}

        {step === 'error' && (
          <div className="progress-card">
            <div className="progress-header" style={{ color: 'var(--color-coral)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={20} />
                <span>Analysis Failed</span>
              </div>
            </div>
            <p className="paragraph-text" style={{ color: 'var(--color-coral)', background: 'rgba(244, 63, 94, 0.05)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(244, 63, 94, 0.2)' }}>
              {errorMessage}
            </p>
            <button className="upload-btn" onClick={resetState} style={{ background: 'var(--bg-card)' }}>
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
