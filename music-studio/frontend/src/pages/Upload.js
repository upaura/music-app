import React, { useState } from 'react';
import axios from 'axios';
import '../App.css';

function Upload() {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [album, setAlbum] = useState('');
  const [genre, setGenre] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Validate file type
      const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/flac', 'audio/mp3', 'audio/x-m4a'];
      if (!allowedTypes.includes(selectedFile.type)) {
        setError('Invalid file type. Please upload MP3, WAV, OGG, FLAC, or M4A files.');
        setFile(null);
        return;
      }
      
      // Validate file size (max 50MB)
      if (selectedFile.size > 50 * 1024 * 1024) {
        setError('File is too large. Maximum size is 50MB.');
        setFile(null);
        return;
      }
      
      setFile(selectedFile);
      setError('');
      
      // Auto-fill title from filename
      if (!title) {
        setTitle(selectedFile.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!file) {
      setError('Please select a file to upload');
      return;
    }

    setLoading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title || file.name);
    formData.append('artist', artist);
    formData.append('album', album);
    formData.append('genre', genre);

    try {
      const response = await axios.post('http://localhost:5000/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(progress);
        }
      });

      setSuccess(`✅ ${response.data.message}`);
      setFile(null);
      setTitle('');
      setArtist('');
      setAlbum('');
      setGenre('');
      setUploadProgress(0);
      
      // Reset file input
      document.getElementById('file-input').value = '';
      
    } catch (error) {
      setError(
        error.response?.data?.error || 
        error.response?.data?.message || 
        'Upload failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <h2>📤 Upload Your Music</h2>
      <p className="page-description">
        Upload your audio files to analyze, collaborate, and create beats.
      </p>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <form onSubmit={handleSubmit} className="upload-form">
        <div className="form-group">
          <label htmlFor="file-input">Audio File *</label>
          <div className="file-upload-area">
            <input
              type="file"
              id="file-input"
              accept=".mp3,.wav,.ogg,.flac,.m4a"
              onChange={handleFileChange}
              disabled={loading}
            />
            {file && (
              <div className="file-info">
                <span className="file-name">📄 {file.name}</span>
                <span className="file-size">
                  ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                </span>
              </div>
            )}
          </div>
          <small className="help-text">Supported formats: MP3, WAV, OGG, FLAC, M4A (max 50MB)</small>
        </div>

        <div className="form-group">
          <label htmlFor="title">Title</label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Song title"
            disabled={loading}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="artist">Artist</label>
            <input
              type="text"
              id="artist"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              placeholder="Artist name"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="genre">Genre</label>
            <select
              id="genre"
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              disabled={loading}
            >
              <option value="">Select genre</option>
              <option value="pop">Pop</option>
              <option value="rock">Rock</option>
              <option value="hip-hop">Hip Hop</option>
              <option value="electronic">Electronic</option>
              <option value="jazz">Jazz</option>
              <option value="classical">Classical</option>
              <option value="country">Country</option>
              <option value="r-and-b">R&B</option>
              <option value="latin">Latin</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="album">Album</label>
          <input
            type="text"
            id="album"
            value={album}
            onChange={(e) => setAlbum(e.target.value)}
            placeholder="Album name (optional)"
            disabled={loading}
          />
        </div>

        {loading && (
          <div className="upload-progress">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <span className="progress-text">Uploading... {uploadProgress}%</span>
          </div>
        )}

        <button 
          type="submit" 
          className="btn btn-primary" 
          disabled={!file || loading}
        >
          {loading ? 'Uploading...' : '📤 Upload Song'}
        </button>
      </form>

      <div className="tips-section">
        <h3>💡 Tips</h3>
        <ul>
          <li>Higher quality audio files produce better analysis results</li>
          <li>WAV and FLAC files provide the most accurate tempo and key detection</li>
          <li>After uploading, head to the Analyze page to get detailed insights</li>
        </ul>
      </div>
    </div>
  );
}

export default Upload;

