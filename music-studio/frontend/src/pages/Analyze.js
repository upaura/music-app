import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../App.css';

function Analyze() {
  const [songs, setSongs] = useState([]);
  const [selectedSong, setSelectedSong] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [comparisonSong, setComparisonSong] = useState('');
  const [comparison, setComparison] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('analyze');

  useEffect(() => {
    fetchSongs();
  }, []);

  const fetchSongs = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/songs');
      setSongs(response.data.songs || []);
    } catch (error) {
      setError('Failed to load songs');
      console.error('Error fetching songs:', error);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedSong) {
      setError('Please select a song to analyze');
      return;
    }

    setLoading(true);
    setError('');
    setAnalysis(null);

    try {
      const response = await axios.get(`http://localhost:5000/api/analyze/${selectedSong}`);
      setAnalysis(response.data);
    } catch (error) {
      setError(
        error.response?.data?.error || 
        error.response?.data?.message || 
        'Analysis failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCompare = async () => {
    if (!selectedSong || !comparisonSong) {
      setError('Please select two songs to compare');
      return;
    }

    if (selectedSong === comparisonSong) {
      setError('Please select two different songs');
      return;
    }

    setLoading(true);
    setError('');
    setComparison(null);

    try {
      const response = await axios.get(
        `http://localhost:5000/api/compare/${selectedSong}/${comparisonSong}`
      );
      setComparison(response.data);
    } catch (error) {
      setError(
        error.response?.data?.error || 
        error.response?.data?.message || 
        'Comparison failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const getSelectedSongTitle = (songId) => {
    const song = songs.find(s => s.id === parseInt(songId));
    return song ? `${song.title} by ${song.artist}` : '';
  };

  const formatDuration = (seconds) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="page-container">
      <h2>🎵 Audio Analysis</h2>
      <p className="page-description">
        Analyze your music's tempo, key, and compare different tracks.
      </p>

      {error && <div className="error-message">{error}</div>}

      {songs.length === 0 ? (
        <div className="empty-state">
          <p>No songs uploaded yet.</p>
          <p>Upload some songs to start analyzing!</p>
        </div>
      ) : (
        <>
          <div className="tabs">
            <button 
              className={`tab ${activeTab === 'analyze' ? 'active' : ''}`}
              onClick={() => setActiveTab('analyze')}
            >
              Analyze
            </button>
            <button 
              className={`tab ${activeTab === 'compare' ? 'active' : ''}`}
              onClick={() => setActiveTab('compare')}
            >
              Compare Songs
            </button>
          </div>

          {activeTab === 'analyze' && (
            <div className="analysis-section">
              <div className="song-select">
                <label htmlFor="song-select">Select a song:</label>
                <select
                  id="song-select"
                  value={selectedSong}
                  onChange={(e) => {
                    setSelectedSong(e.target.value);
                    setAnalysis(null);
                    setError('');
                  }}
                  disabled={loading}
                >
                  <option value="">-- Choose a song --</option>
                  {songs.map(song => (
                    <option key={song.id} value={song.id}>
                      {song.title} by {song.artist}
                    </option>
                  ))}
                </select>
              </div>

              <button 
                className="btn btn-primary" 
                onClick={handleAnalyze}
                disabled={!selectedSong || loading}
              >
                {loading ? 'Analyzing...' : '🔍 Analyze'}
              </button>

              {analysis && analysis.analysis && (
                <div className="analysis-results">
                  <h3>Analysis Results</h3>
                  <div className="analysis-grid">
                    <div className="analysis-card">
                      <span className="analysis-label">Tempo</span>
                      <span className="analysis-value">{analysis.analysis.tempo.toFixed(1)}</span>
                      <span className="analysis-unit">BPM</span>
                    </div>
                    <div className="analysis-card">
                      <span className="analysis-label">Key</span>
                      <span className="analysis-value">{analysis.analysis.key}</span>
                      <span className="analysis-unit">Major</span>
                    </div>
                    <div className="analysis-card">
                      <span className="analysis-label">Duration</span>
                      <span className="analysis-value">{formatDuration(analysis.analysis.duration)}</span>
                      <span className="analysis-unit">min:sec</span>
                    </div>
                    <div className="analysis-card">
                      <span className="analysis-label">Sample Rate</span>
                      <span className="analysis-value">{analysis.analysis.sample_rate}</span>
                      <span className="analysis-unit">Hz</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'compare' && (
            <div className="comparison-section">
              <div className="comparison-selectors">
                <div className="song-select">
                  <label htmlFor="song1-select">Song 1:</label>
                  <select
                    id="song1-select"
                    value={selectedSong}
                    onChange={(e) => {
                      setSelectedSong(e.target.value);
                      setComparison(null);
                      setError('');
                    }}
                    disabled={loading}
                  >
                    <option value="">-- Choose first song --</option>
                    {songs.map(song => (
                      <option key={song.id} value={song.id}>
                        {song.title}
                      </option>
                    ))}
                  </select>
                </div>

                <span className="vs-badge">VS</span>

                <div className="song-select">
                  <label htmlFor="song2-select">Song 2:</label>
                  <select
                    id="song2-select"
                    value={comparisonSong}
                    onChange={(e) => {
                      setComparisonSong(e.target.value);
                      setComparison(null);
                      setError('');
                    }}
                    disabled={loading}
                  >
                    <option value="">-- Choose second song --</option>
                    {songs
                      .filter(s => s.id !== parseInt(selectedSong))
                      .map(song => (
                        <option key={song.id} value={song.id}>
                          {song.title}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <button 
                className="btn btn-primary" 
                onClick={handleCompare}
                disabled={!selectedSong || !comparisonSong || loading}
              >
                {loading ? 'Comparing...' : '⚖️ Compare'}
              </button>

              {comparison && comparison.comparison && (
                <div className="comparison-results">
                  <h3>Comparison Results</h3>
                  
                  <div className="comparison-grid">
                    <div className="song-comparison">
                      <h4>Song 1</h4>
                      <p className="song-title">{comparison.comparison.song1.title}</p>
                      <div className="song-stats">
                        <p>Tempo: {comparison.comparison.song1.tempo.toFixed(1)} BPM</p>
                        <p>Key: {comparison.comparison.song1.key}</p>
                      </div>
                    </div>

                    <div className="song-comparison">
                      <h4>Song 2</h4>
                      <p className="song-title">{comparison.comparison.song2.title}</p>
                      <div className="song-stats">
                        <p>Tempo: {comparison.comparison.song2.tempo.toFixed(1)} BPM</p>
                        <p>Key: {comparison.comparison.song2.key}</p>
                      </div>
                    </div>
                  </div>

                  <div className="similarity-section">
                    <h4>Similarity Score</h4>
                    <div className="similarity-bar-container">
                      <div 
                        className="similarity-bar"
                        style={{ 
                          width: `${Math.abs(comparison.comparison.similarity) * 100}%`,
                          backgroundColor: comparison.comparison.similarity > 0.6 
                            ? '#4caf50' 
                            : comparison.comparison.similarity > 0.3 
                              ? '#ff9800' 
                              : '#f44336'
                        }}
                      />
                    </div>
                    <p className="similarity-text">
                      {comparison.comparison.similarity.toFixed(2)} 
                      <span className="similarity-level">
                        ({comparison.comparison.match_level})
                      </span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Analyze;

