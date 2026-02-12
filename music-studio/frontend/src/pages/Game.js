import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import '../App.css';

function Game() {
  // 16-step beat grid (4x4 pattern)
  const [grid, setGrid] = useState(() => Array(16).fill(false).map(() => Array(4).fill(false)));
  const [tempo, setTempo] = useState(120);
  const [playing, setPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [patternName, setPatternName] = useState('');
  const [savedPatterns, setSavedPatterns] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const audioContextRef = useRef(null);
  const timerRef = useRef(null);
  const stepRef = useRef(0);

  // Audio context for sound generation
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  // Generate a simple drum sound
  const playSound = useCallback((step, row) => {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    // Different sounds for different rows
    if (row === 0) {
      // Kick drum - low frequency sine
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(150, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    } else if (row === 1) {
      // Snare - noise-like
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(200, ctx.currentTime);
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    } else if (row === 2) {
      // Hi-hat - high frequency
      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(800, ctx.currentTime);
      gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    } else {
      // Clap - short burst
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(250, ctx.currentTime);
      gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    }
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.5);
  }, [getAudioContext]);

  // Play the beat
  const playBeat = useCallback(() => {
    if (playing) return;
    
    setPlaying(true);
    stepRef.current = 0;
    setCurrentStep(0);
    
    const interval = (60 / tempo) * 1000 / 4; // 16th notes
    
    timerRef.current = setInterval(() => {
      const currentRow = stepRef.current % 4;
      
      // Check if any cell is active in this column
      for (let row = 0; row < 4; row++) {
        if (grid[currentRow][row]) {
          playSound(currentRow, row);
        }
      }
      
      setCurrentStep(currentRow);
      stepRef.current = (stepRef.current + 1) % 16;
    }, interval);
  }, [playing, tempo, grid, playSound]);

  // Stop the beat
  const stopBeat = useCallback(() => {
    setPlaying(false);
    setCurrentStep(-1);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Toggle a cell in the grid
  const toggleCell = (row, col) => {
    if (playing) return;
    
    const newGrid = grid.map((r, rowIndex) => {
      if (rowIndex === row) {
        return r.map((cell, colIndex) => colIndex === col ? !cell : cell);
      }
      return r;
    });
    setGrid(newGrid);
  };

  // Clear the grid
  const clearGrid = () => {
    if (playing) stopBeat();
    setGrid(Array(16).fill(false).map(() => Array(4).fill(false)));
    setPatternName('');
    setSuccess('');
    setError('');
  };

  // Load a preset pattern
  const loadPreset = (preset) => {
    if (playing) stopBeat();
    setGrid(preset.pattern);
    setTempo(preset.tempo);
    setPatternName(preset.name);
  };

  // Save current pattern
  const savePattern = async () => {
    if (!patternName.trim()) {
      setError('Please enter a pattern name');
      return;
    }

    try {
      const patternData = {
        name: patternName,
        grid_data: grid,
        tempo: tempo
      };

      const response = await axios.post('http://localhost:5000/api/patterns', patternData);
      
      setSuccess('✅ Pattern saved successfully!');
      fetchPatterns();
      setError('');
    } catch (error) {
      setError(
        error.response?.data?.error || 
        error.response?.data?.message || 
        'Failed to save pattern'
      );
    }
  };

  // Load saved patterns
  const fetchPatterns = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/patterns');
      setSavedPatterns(response.data.patterns || []);
    } catch (error) {
      console.error('Failed to load patterns:', error);
    }
  };

  // Delete a pattern
  const deletePattern = async (patternId) => {
    try {
      await axios.delete(`http://localhost:5000/api/patterns/${patternId}`);
      fetchPatterns();
      setSuccess('✅ Pattern deleted');
      setError('');
    } catch (error) {
      setError('Failed to delete pattern');
    }
  };

  // Load a saved pattern
  const loadSavedPattern = (pattern) => {
    if (playing) stopBeat();
    try {
      const gridData = typeof pattern.grid_data === 'string' 
        ? JSON.parse(pattern.grid_data) 
        : pattern.grid_data;
      setGrid(gridData);
      setTempo(pattern.tempo);
      setPatternName(pattern.name);
      setSuccess(`Loaded: ${pattern.name}`);
      setError('');
    } catch (error) {
      setError('Failed to load pattern');
    }
  };

  useEffect(() => {
    fetchPatterns();
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (playing) {
      stopBeat();
      playBeat();
    }
  }, [tempo, stopBeat, playBeat]);

  // Preset patterns
  const presets = [
    {
      name: 'Basic Beat',
      tempo: 120,
      pattern: [
        [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false],
        [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false],
        [false, false, false, false, false, false, false, false, false, false, false, false, false, false, true, false],
        [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false]
      ]
    },
    {
      name: 'Hip Hop',
      tempo: 90,
      pattern: [
        [true, false, false, true, false, false, true, false, true, false, false, true, false, false, false, false],
        [false, false, false, false, false, false, true, false, false, false, false, false, false, false, true, false],
        [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false],
        [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false]
      ]
    },
    {
      name: 'Fast Break',
      tempo: 140,
      pattern: [
        [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false],
        [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false],
        [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false],
        [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false]
      ]
    }
  ];

  const rowLabels = ['Kick', 'Snare', 'Hi-Hat', 'Clap'];
  const colLabels = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16'];

  return (
    <div className="page-container">
      <h2>🎮 Beat Builder</h2>
      <p className="page-description">
        Create your own drum patterns and save them to your library.
      </p>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="game-controls">
        <div className="tempo-control">
          <label htmlFor="tempo">Tempo (BPM):</label>
          <input
            type="number"
            id="tempo"
            value={tempo}
            onChange={(e) => setTempo(Math.max(60, Math.min(200, parseInt(e.target.value) || 120)))}
            min="60"
            max="200"
            disabled={playing}
          />
          <span className="tempo-display">{tempo} BPM</span>
        </div>

        <div className="transport-controls">
          {playing ? (
            <button className="btn btn-stop" onClick={stopBeat}>
              ⏹️ Stop
            </button>
          ) : (
            <button className="btn btn-play" onClick={playBeat}>
              ▶️ Play
            </button>
          )}
          <button className="btn btn-clear" onClick={clearGrid}>
            🗑️ Clear
          </button>
        </div>
      </div>

      <div className="beat-grid-container">
        <div className="beat-grid">
          {/* Header row with column numbers */}
          <div className="grid-header">
            <div className="row-label-header"></div>
            {colLabels.map((label, i) => (
              <div 
                key={i} 
                className={`col-header ${currentStep === i ? 'active-step' : ''}`}
              >
                {label}
              </div>
            ))}
          </div>

          {/* Drum rows */}
          {grid.map((row, rowIndex) => (
            <div key={rowIndex} className="grid-row">
              <div className="row-label">{rowLabels[rowIndex]}</div>
              {row.map((cell, colIndex) => (
                <button
                  key={colIndex}
                  className={`grid-cell ${cell ? 'active' : ''} ${currentStep === colIndex ? 'playing' : ''}`}
                  onClick={() => toggleCell(rowIndex, colIndex)}
                  disabled={playing}
                  title={`${rowLabels[rowIndex]} - Step ${colIndex + 1}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="pattern-controls">
        <div className="form-group">
          <label htmlFor="pattern-name">Pattern Name:</label>
          <input
            type="text"
            id="pattern-name"
            value={patternName}
            onChange={(e) => setPatternName(e.target.value)}
            placeholder="Enter pattern name"
            disabled={playing}
          />
        </div>
        <button 
          className="btn btn-save" 
          onClick={savePattern}
          disabled={playing || !patternName.trim()}
        >
          💾 Save Pattern
        </button>
      </div>

      <div className="presets-section">
        <h3>🎵 Preset Patterns</h3>
        <div className="preset-buttons">
          {presets.map((preset, index) => (
            <button 
              key={index} 
              className="preset-btn"
              onClick={() => loadPreset(preset)}
              disabled={playing}
            >
              {preset.name} ({preset.tempo} BPM)
            </button>
          ))}
        </div>
      </div>

      {savedPatterns.length > 0 && (
        <div className="saved-patterns-section">
          <h3>💾 Your Saved Patterns</h3>
          <div className="saved-patterns">
            {savedPatterns.map(pattern => (
              <div key={pattern.id} className="saved-pattern-card">
                <div className="pattern-info">
                  <span className="pattern-name">{pattern.name}</span>
                  <span className="pattern-tempo">{pattern.tempo} BPM</span>
                </div>
                <div className="pattern-actions">
                  <button 
                    className="btn-load"
                    onClick={() => loadSavedPattern(pattern)}
                  >
                    Load
                  </button>
                  <button 
                    className="btn-delete"
                    onClick={() => deletePattern(pattern.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Game;

