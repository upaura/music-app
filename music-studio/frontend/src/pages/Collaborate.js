import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../App.css';

function Collaborate() {
  const [songs, setSongs] = useState([]);
  const [selectedSong, setSelectedSong] = useState('');
  const [collaborations, setCollaborations] = useState([]);
  const [verse, setVerse] = useState('');
  const [verseType, setVerseType] = useState('lyrics');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('add');

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

  const fetchCollaborations = async (songId) => {
    if (!songId) {
      setCollaborations([]);
      return;
    }

    try {
      const response = await axios.get(`http://localhost:5000/api/collaborate/${songId}`);
      setCollaborations(response.data.collaborations || []);
    } catch (error) {
      console.error('Error fetching collaborations:', error);
    }
  };

  const handleSongSelect = (e) => {
    const songId = e.target.value;
    setSelectedSong(songId);
    setError('');
    setSuccess('');
    setVerse('');
    
    if (songId) {
      fetchCollaborations(songId);
    } else {
      setCollaborations([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedSong) {
      setError('Please select a song to collaborate on');
      return;
    }

    if (!verse.trim()) {
      setError('Please enter some content for your verse');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await axios.post(
        `http://localhost:5000/api/collaborate/${selectedSong}`,
        {
          verse: verse.trim(),
          verse_type: verseType
        }
      );

      setSuccess('✅ ' + response.data.message);
      setVerse('');
      fetchCollaborations(selectedSong);
    } catch (error) {
      setError(
        error.response?.data?.error || 
        error.response?.data?.message || 
        'Failed to add verse. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const getVerseTypeLabel = (type) => {
    const labels = {
      'lyrics': '🎤 Lyrics',
      'verse': '📝 Verse',
      'chorus': '🎵 Chorus',
      'bridge': '🌉 Bridge',
      'hook': '🪝 Hook',
      'comment': '💬 Comment'
    };
    return labels[type] || '📄 Content';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="page-container">
      <h2>🤝 Collaboration</h2>
      <p className="page-description">
        Add verses, lyrics, and creative contributions to your songs.
      </p>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {songs.length === 0 ? (
        <div className="empty-state">
          <p>No songs uploaded yet.</p>
          <p>Upload a song first to start collaborating!</p>
        </div>
      ) : (
        <>
          <div className="song-select-full">
            <label htmlFor="collaborate-song-select">Select a song:</label>
            <select
              id="collaborate-song-select"
              value={selectedSong}
              onChange={handleSongSelect}
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

          {selectedSong && (
            <>
              <div className="tabs">
                <button 
                  className={`tab ${activeTab === 'add' ? 'active' : ''}`}
                  onClick={() => setActiveTab('add')}
                >
                  Add Content
                </button>
                <button 
                  className={`tab ${activeTab === 'view' ? 'active' : ''}`}
                  onClick={() => setActiveTab('view')}
                >
                  View Contributions ({collaborations.length})
                </button>
              </div>

              {activeTab === 'add' && (
                <div className="collaborate-form-section">
                  <form onSubmit={handleSubmit} className="collaborate-form">
                    <div className="form-group">
                      <label htmlFor="verse-type">Content Type</label>
                      <select
                        id="verse-type"
                        value={verseType}
                        onChange={(e) => setVerseType(e.target.value)}
                        disabled={loading}
                      >
                        <option value="lyrics">🎤 Lyrics</option>
                        <option value="verse">📝 Verse</option>
                        <option value="chorus">🎵 Chorus</option>
                        <option value="bridge">🌉 Bridge</option>
                        <option value="hook">🪝 Hook</option>
                        <option value="comment">💬 Comment</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor="verse-content">
                        Your Content <span className="required">*</span>
                      </label>
                      <textarea
                        id="verse-content"
                        value={verse}
                        onChange={(e) => setVerse(e.target.value)}
                        placeholder="Enter your lyrics, verse, or creative contribution here..."
                        rows={8}
                        disabled={loading}
                        required
                      />
                      <small className="help-text">
                        {verseType === 'lyrics' && 'Write lyrics for the song'}
                        {verseType === 'verse' && 'Write a verse passage'}
                        {verseType === 'chorus' && 'Write the chorus section'}
                        {verseType === 'bridge' && 'Write a bridge section'}
                        {verseType === 'hook' && 'Write a catchy hook'}
                        {verseType === 'comment' && 'Add notes or comments'}
                      </small>
                    </div>

                    <button 
                      type="submit" 
                      className="btn btn-primary"
                      disabled={!verse.trim() || loading}
                    >
                      {loading ? 'Adding...' : '➕ Add Content'}
                    </button>
                  </form>

                  <div className="tips-section">
                    <h4>💡 Writing Tips</h4>
                    <ul>
                      <li>Match the rhythm and flow of the existing song</li>
                      <li>Consider the key and tempo when writing</li>
                      <li>Use verses to tell a story or develop a theme</li>
                      <li>Make your chorus memorable and repeatable</li>
                    </ul>
                  </div>
                </div>
              )}

              {activeTab === 'view' && (
                <div className="collaborations-list">
                  {collaborations.length === 0 ? (
                    <div className="empty-state">
                      <p>No contributions yet.</p>
                      <p>Be the first to add content!</p>
                    </div>
                  ) : (
                    collaborations.map(collab => (
                      <div key={collab.id} className="collaboration-card">
                        <div className="collaboration-header">
                          <span className="verse-type-badge">
                            {getVerseTypeLabel(collab.verse_type)}
                          </span>
                          <span className="collaboration-date">
                            {formatDate(collab.created_at)}
                          </span>
                        </div>
                        <div className="collaboration-content">
                          {collab.content}
                        </div>
                        {collab.username && (
                          <div className="collaboration-author">
                            — {collab.username}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

export default Collaborate;

