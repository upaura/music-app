// Music Studio - Main Application JavaScript
// Production-ready with environment variable support

// ==================== CONFIGURATION ====================
// 
// API URL Configuration (Auto-detects backend type):
// 1. If PHP backend exists at /api/index.php - uses relative path /api
// 2. If Python backend on localhost - uses http://localhost:5000/api
// 3. Production URL can be set via JavaScript variable

// Check for backend type
const isLocalhost = window.location.hostname === 'localhost' || 
                    window.location.hostname === '127.0.0.1';

// Detect if PHP API exists (on same domain)
const apiPath = '/api';
const healthCheckUrl = apiPath + '/health';

// Set API base URL based on detection
let API_BASE;

if (isLocalhost) {
    // Try PHP on localhost first (port 80/8080), then Python
    API_BASE = 'http://localhost:8080/api';
    // Will auto-switch to Python if PHP fails health check
} else {
    // Production: use relative path (PHP API)
    API_BASE = '/api';
}

// Auto-detect backend type and set correct URL
async function detectBackend() {
    try {
        const response = await fetch(API_BASE + '/health'.replace('/api', ''), {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        if (response.ok) {
            // PHP backend detected
            API_BASE = '/api';
            console.log('✅ PHP Backend detected');
            return 'php';
        }
    } catch (e) {
        // Try Python backend
        try {
            const pyResponse = await fetch('http://localhost:5000/api/health', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            if (pyResponse.ok) {
                API_BASE = 'http://localhost:5000/api';
                console.log('✅ Python Backend detected');
                return 'python';
            }
        } catch (e2) {
            console.log('⚠️ No backend detected - using default');
        }
    }
    return null;
}

// Auto-detect on load
detectBackend();

// Debug logging in development
if (isLocalhost) {
    console.log('🔧 Running in DEVELOPMENT mode');
    console.log('📡 API URL:', API_BASE);
} else {
    console.log('🚀 Running in PRODUCTION mode');
    console.log('📡 API URL:', API_BASE);
}

// ==================== STATE MANAGEMENT ====================
let currentUser = null;
let songs = [];
let beatGrid = Array(16).fill(false);
let isPlaying = false;
let audioContext = null;
let savedPatterns = [];

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    createBeatGrid();
    loadSavedPatterns();
    loadUserFromStorage();
    registerServiceWorker();
});

function initializeApp() {
    setupDragAndDrop();
    checkApiConnection();
}

// Check if API is accessible
async function checkApiConnection() {
    try {
        const response = await fetch(`${API_BASE.replace('/api', '')}/api/health`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        if (response.ok) {
            console.log('✅ Backend connection: OK');
        } else {
            console.warn('⚠️ Backend connection: Unhealthy');
        }
    } catch (error) {
        console.warn('⚠️ Backend connection: Failed');
        if (isLocalhost) {
            showLocalhostHint();
        }
    }
}

function showLocalhostHint() {
    const message = document.createElement('div');
    message.className = 'api-hint';
    message.innerHTML = `
        <span class="hint-icon">💡</span>
        <span>Make sure the backend is running on port 5000</span>
        <button onclick="this.parentElement.remove()">×</button>
    `;
    document.body.appendChild(message);
}

// Service Worker Registration (for PWA support)
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(err => {
            console.log('SW registration failed:', err);
        });
    }
}

function setupDragAndDrop() {
    const uploadArea = document.getElementById('uploadArea');
    if (!uploadArea) return;
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, preventDefaults, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        uploadArea.addEventListener(eventName, () => {
            uploadArea.classList.add('dragover');
        });
    });

    ['dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, () => {
            uploadArea.classList.remove('dragover');
        });
    });

    uploadArea.addEventListener('drop', handleDrop);
}

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

// ==================== PAGE NAVIGATION ====================
function showPage(pageName) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Show requested page
    const targetPage = document.getElementById(`page-${pageName}`);
    if (targetPage) {
        targetPage.classList.add('active');
    }
    
    // Page-specific initialization
    switch(pageName) {
        case 'upload':
            break;
        case 'analyze':
            loadSongsForAnalysis();
            break;
        case 'collaborate':
            loadSongsForCollaboration();
            break;
        case 'songs':
            loadMySongs();
            break;
    }
    
    // Close mobile menu
    const navLinks = document.getElementById('navLinks');
    if (navLinks) {
        navLinks.classList.remove('active');
    }
    
    // Update URL hash for deep linking
    window.location.hash = pageName;
}

function toggleMenu() {
    const navLinks = document.getElementById('navLinks');
    if (navLinks) {
        navLinks.classList.toggle('active');
    }
}

// Handle page load from URL hash
window.addEventListener('hashchange', () => {
    const pageName = window.location.hash.slice(1) || 'home';
    showPage(pageName);
});

// ==================== AUTHENTICATION ====================
function loadUserFromStorage() {
    try {
        const userData = localStorage.getItem('musicStudioUser');
        if (userData) {
            currentUser = JSON.parse(userData);
            updateAuthUI();
        }
    } catch (e) {
        console.error('Error loading user from storage:', e);
    }
}

function updateAuthUI() {
    const authElements = {
        'navLogin': !currentUser,
        'navRegister': !currentUser,
        'navUpload': currentUser,
        'navAnalyze': currentUser,
        'navCollaborate': currentUser,
        'navGame': currentUser,
        'navLogout': currentUser
    };
    
    Object.entries(authElements).forEach(([id, show]) => {
        const element = document.getElementById(id);
        if (element) {
            element.style.display = show ? 'inline-block' : 'none';
        }
    });
}

async function handleRegister(event) {
    event.preventDefault();
    
    const username = document.getElementById('registerUsername')?.value?.trim();
    const email = document.getElementById('registerEmail')?.value?.trim();
    const password = document.getElementById('registerPassword')?.value;
    const confirm = document.getElementById('registerConfirm')?.value;
    
    if (!username || !password) {
        showMessage('collabMessage', 'Username and password are required', 'error');
        return;
    }
    
    if (password !== confirm) {
        showMessage('collabMessage', 'Passwords do not match', 'error');
        return;
    }
    
    if (password.length < 6) {
        showMessage('collabMessage', 'Password must be at least 6 characters', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        
        const data = await response.json().catch(() => ({}));
        
        if (response.ok && data.user) {
            currentUser = data.user;
            localStorage.setItem('musicStudioUser', JSON.stringify(currentUser));
            localStorage.setItem('musicStudioToken', data.token);
            updateAuthUI();
            showMessage('collabMessage', 'Account created successfully!', 'success');
            setTimeout(() => {
                showPage('home');
                window.location.hash = '';
            }, 1500);
        } else {
            showMessage('collabMessage', data.error || data.message || 'Registration failed', 'error');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showMessage('collabMessage', 'Connection error. Please try again.', 'error');
    }
}

async function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('loginUsername')?.value?.trim();
    const password = document.getElementById('loginPassword')?.value;
    
    if (!username || !password) {
        showMessage('loginMessage', 'Username and password are required', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json().catch(() => ({}));
        
        if (response.ok && data.user) {
            currentUser = data.user;
            localStorage.setItem('musicStudioUser', JSON.stringify(currentUser));
            localStorage.setItem('musicStudioToken', data.token);
            updateAuthUI();
            showMessage('loginMessage', 'Login successful!', 'success');
            setTimeout(() => {
                showPage('home');
                window.location.hash = '';
            }, 1500);
        } else {
            showMessage('loginMessage', data.error || data.message || 'Login failed', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showMessage('loginMessage', 'Connection error. Please try again.', 'error');
    }
}

function logout() {
    currentUser = null;
    localStorage.removeItem('musicStudioUser');
    localStorage.removeItem('musicStudioToken');
    updateAuthUI();
    showPage('home');
    window.location.hash = '';
}

function getAuthHeaders() {
    const token = localStorage.getItem('musicStudioToken') || '';
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

function showMessage(elementId, text, type) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = text;
        element.className = `message ${type}`;
        element.style.display = 'block';
        setTimeout(() => {
            element.className = 'message';
            element.style.display = 'none';
        }, 5000);
    }
}

// ==================== FILE UPLOAD ====================
function handleFileSelect(event) {
    const files = event.target.files;
    handleFiles(files);
}

function handleDrop(event) {
    event.preventDefault();
    const files = event.dataTransfer.files;
    handleFiles(files);
}

function handleFiles(files) {
    if (!files || !files.length) return;
    
    const file = files[0];
    const audioTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/flac', 'audio/x-m4a', 'audio/m4a'];
    const isAudio = audioTypes.some(type => file.type.includes(type) || file.name.match(/\.(mp3|wav|ogg|flac|m4a)$/i));
    
    if (!isAudio) {
        showMessage('uploadMessage', 'Please select an audio file (MP3, WAV, OGG, FLAC, M4A)', 'error');
        return;
    }
    
    // Show preview
    const preview = document.getElementById('uploadPreview');
    if (preview) {
        preview.innerHTML = `
            <div class="preview-item">
                <div class="file-icon">🎵</div>
                <div class="file-info">
                    <div class="file-name">${escapeHtml(file.name)}</div>
                    <div class="file-size">${formatFileSize(file.size)}</div>
                </div>
            </div>
        `;
    }
    
    // Store file reference for upload
    window.uploadFile = file;
    const uploadForm = document.getElementById('uploadForm');
    if (uploadForm) {
        uploadForm.style.display = 'block';
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

async function handleUpload(event) {
    event.preventDefault();
    
    if (!currentUser) {
        showMessage('uploadMessage', 'Please login to upload songs', 'error');
        showPage('login');
        return;
    }
    
    const file = window.uploadFile;
    if (!file) {
        showMessage('uploadMessage', 'No file selected', 'error');
        return;
    }
    
    const title = document.getElementById('songTitle')?.value || file.name;
    const artist = document.getElementById('songArtist')?.value || '';
    const genre = document.getElementById('songGenre')?.value || '';
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    formData.append('artist', artist);
    formData.append('genre', genre);
    
    try {
        const token = localStorage.getItem('musicStudioToken');
        const response = await fetch(`${API_BASE}/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        const data = await response.json().catch(() => ({}));
        
        if (response.ok) {
            showMessage('uploadMessage', 'Song uploaded successfully!', 'success');
            // Reset form
            const uploadForm = document.getElementById('uploadForm');
            const preview = document.getElementById('uploadPreview');
            const fileInput = document.getElementById('fileInput');
            if (uploadForm) uploadForm.reset();
            if (preview) preview.innerHTML = '';
            if (fileInput) fileInput.value = '';
            window.uploadFile = null;
            // Refresh songs list
            loadSongs();
        } else {
            showMessage('uploadMessage', data.error || 'Upload failed', 'error');
        }
    } catch (error) {
        console.error('Upload error:', error);
        showMessage('uploadMessage', 'Connection error. Please try again.', 'error');
    }
}

// ==================== SONGS MANAGEMENT ====================
async function loadSongs() {
    if (!currentUser) return;
    
    try {
        const response = await fetch(`${API_BASE}/songs`, {
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            const data = await response.json().catch(() => ({ songs: [] }));
            songs = data.songs || [];
        }
    } catch (error) {
        console.error('Error loading songs:', error);
    }
}

async function loadSongsForAnalysis() {
    await loadSongs();
    const select = document.getElementById('analyzeSongSelect');
    if (!select) return;
    
    select.innerHTML = '<option value="">-- Choose a song --</option>';
    
    songs.forEach(song => {
        const option = document.createElement('option');
        option.value = song.id;
        option.textContent = `${song.title} - ${song.artist || 'Unknown Artist'}`;
        select.appendChild(option);
    });
}

async function loadSongsForCollaboration() {
    await loadSongs();
    const select = document.getElementById('collabSongSelect');
    if (!select) return;
    
    select.innerHTML = '<option value="">-- Choose a song --</option>';
    
    songs.forEach(song => {
        const option = document.createElement('option');
        option.value = song.id;
        option.textContent = `${song.title} - ${song.artist || 'Unknown Artist'}`;
        select.appendChild(option);
    });
}

async function loadMySongs() {
    await loadSongs();
    const container = document.getElementById('songsList');
    if (!container) return;
    
    if (!songs.length) {
        container.innerHTML = '<p class="placeholder-text">No songs uploaded yet</p>';
        return;
    }
    
    container.innerHTML = songs.map(song => `
        <div class="song-card">
            <div class="card-content">
                <div class="song-title">${escapeHtml(song.title)}</div>
                <div class="song-artist">${escapeHtml(song.artist || 'Unknown Artist')}</div>
                <div class="song-meta">
                    <span>${escapeHtml(song.genre || 'Unknown Genre')}</span>
                    <span>${song.created_at ? new Date(song.created_at).toLocaleDateString() : ''}</span>
                </div>
            </div>
        </div>
    `).join('');
}

// ==================== AUDIO ANALYSIS ====================
async function loadSongForAnalysis() {
    const songId = document.getElementById('analyzeSongSelect')?.value;
    const resultsContainer = document.getElementById('analysisResults');
    
    if (!songId) {
        if (resultsContainer) {
            resultsContainer.innerHTML = '<p class="placeholder-text">Select a song to see analysis results</p>';
        }
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/analyze/${songId}`, {
            headers: getAuthHeaders()
        });
        
        const data = await response.json().catch(() => ({}));
        
        if (response.ok && data.analysis) {
            const analysis = data.analysis;
            if (resultsContainer) {
                resultsContainer.innerHTML = `
                    <h3>Analysis Results</h3>
                    <div class="analysis-card">
                        <div class="analysis-item">
                            <div class="value">${analysis.tempo?.toFixed(1) || 'N/A'}</div>
                            <div class="label">Tempo (BPM)</div>
                        </div>
                        <div class="analysis-item">
                            <div class="value">${analysis.key || 'N/A'}</div>
                            <div class="label">Musical Key</div>
                        </div>
                        <div class="analysis-item">
                            <div class="value">${analysis.duration?.toFixed(1) || 'N/A'}s</div>
                            <div class="label">Duration</div>
                        </div>
                        <div class="analysis-item">
                            <div class="value">${(analysis.sample_rate / 1000)?.toFixed(1) || 'N/A'}kHz</div>
                            <div class="label">Sample Rate</div>
                        </div>
                    </div>
                `;
            }
        } else {
            if (resultsContainer) {
                resultsContainer.innerHTML = `<p class="placeholder-text">${data.message || 'Analysis failed. Please try again.'}</p>`;
            }
        }
    } catch (error) {
        console.error('Analysis error:', error);
        if (resultsContainer) {
            resultsContainer.innerHTML = '<p class="placeholder-text">Error loading analysis</p>';
        }
    }
}

// ==================== COLLABORATION ====================
async function loadCollaborations() {
    const songId = document.getElementById('collabSongSelect')?.value;
    const container = document.getElementById('collaborationsList');
    
    if (!songId) {
        if (container) {
            container.innerHTML = '<p class="placeholder-text">Select a song to view collaborations</p>';
        }
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/collaborate/${songId}`, {
            headers: getAuthHeaders()
        });
        
        const data = await response.json().catch(() => ({ collaborations: [] }));
        
        if (response.ok && data.collaborations?.length) {
            container.innerHTML = data.collaborations.map(collab => `
                <div class="collaboration-item">
                    <div class="meta">
                        <span class="verse-type">${escapeHtml(collab.verse_type || 'lyrics')}</span>
                        <span>${escapeHtml(collab.username || 'Anonymous')}</span>
                        <span>${collab.created_at ? new Date(collab.created_at).toLocaleDateString() : ''}</span>
                    </div>
                    <div class="content">${escapeHtml(collab.content)}</div>
                </div>
            `).join('');
        } else {
            if (container) {
                container.innerHTML = '<p class="placeholder-text">No collaborations yet. Start creating!</p>';
            }
        }
    } catch (error) {
        console.error('Error loading collaborations:', error);
        if (container) {
            container.innerHTML = '<p class="placeholder-text">Error loading collaborations</p>';
        }
    }
}

async function addVerse() {
    const songId = document.getElementById('collabSongSelect')?.value;
    const content = document.getElementById('verseInput')?.value;
    const verseType = document.getElementById('verseType')?.value || 'lyrics';
    
    if (!songId) {
        showMessage('collabMessage', 'Please select a song first', 'error');
        return;
    }
    
    if (!content?.trim()) {
        showMessage('collabMessage', 'Please write something', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/collaborate/${songId}`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                verse: content,
                verse_type: verseType
            })
        });
        
        const data = await response.json().catch(() => ({}));
        
        if (response.ok) {
            showMessage('collabMessage', 'Verse added successfully!', 'success');
            const verseInput = document.getElementById('verseInput');
            if (verseInput) verseInput.value = '';
            loadCollaborations();
        } else {
            showMessage('collabMessage', data.message || data.error || 'Failed to add verse', 'error');
        }
    } catch (error) {
        console.error('Collaboration error:', error);
        showMessage('collabMessage', 'Connection error', 'error');
    }
}

// ==================== BEAT GAME ====================
function createBeatGrid() {
    const grid = document.getElementById('beatGrid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    for (let i = 0; i < 16; i++) {
        const cell = document.createElement('div');
        cell.className = 'beat-cell';
        cell.dataset.index = i;
        cell.onclick = () => toggleCell(i);
        grid.appendChild(cell);
    }
}

function toggleCell(index) {
    beatGrid[index] = !beatGrid[index];
    const cells = document.querySelectorAll('.beat-cell');
    if (cells[index]) {
        cells[index].classList.toggle('active', beatGrid[index]);
    }
}

function updateTempo() {
    const tempoValue = document.getElementById('tempoValue');
    const gameTempo = document.getElementById('gameTempo');
    if (tempoValue && gameTempo) {
        tempoValue.textContent = gameTempo.value;
    }
}

function clearGrid() {
    beatGrid = Array(16).fill(false);
    document.querySelectorAll('.beat-cell').forEach(cell => {
        cell.classList.remove('active', 'playing');
    });
    stopBeat();
}

function initAudioContext() {
    if (!audioContext) {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.error('Web Audio API not supported');
        }
    }
}

function playBeat() {
    initAudioContext();
    if (!audioContext) return;
    
    if (isPlaying) {
        stopBeat();
        return;
    }
    
    const tempo = parseInt(document.getElementById('gameTempo')?.value || 120);
    const beatDuration = 60 / tempo * 1000 / 4; // 16th notes
    
    isPlaying = true;
    const playBtn = document.getElementById('playBtn');
    if (playBtn) playBtn.innerHTML = '⏹ Stop';
    
    let currentNote = 0;
    
    function playNote() {
        if (!isPlaying) return;
        
        // Play active cells
        beatGrid.forEach((active, index) => {
            if (active) {
                playSound(currentNote === index ? 880 : 440, 0.1);
            }
        });
        
        // Highlight current column
        const cells = document.querySelectorAll('.beat-cell');
        cells.forEach((cell, i) => {
            cell.classList.toggle('playing', i === currentNote);
        });
        
        currentNote = (currentNote + 1) % 16;
        
        setTimeout(playNote, beatDuration);
    }
    
    playNote();
}

function playSound(frequency, duration) {
    if (!audioContext) return;
    
    try {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration);
    } catch (e) {
        console.error('Error playing sound:', e);
    }
}

function stopBeat() {
    isPlaying = false;
    const playBtn = document.getElementById('playBtn');
    if (playBtn) playBtn.innerHTML = '▶ Play Beat';
    document.querySelectorAll('.beat-cell').forEach(cell => {
        cell.classList.remove('playing');
    });
}

function savePattern() {
    const name = prompt('Enter pattern name:');
    if (!name?.trim()) return;
    
    const pattern = {
        id: Date.now(),
        name: name.trim(),
        tempo: document.getElementById('gameTempo')?.value || 120,
        grid: [...beatGrid]
    };
    
    savedPatterns.push(pattern);
    try {
        localStorage.setItem('musicStudioPatterns', JSON.stringify(savedPatterns));
    } catch (e) {
        console.error('Error saving pattern:', e);
    }
    loadSavedPatterns();
}

function loadSavedPatterns() {
    try {
        const stored = localStorage.getItem('musicStudioPatterns');
        if (stored) {
            savedPatterns = JSON.parse(stored);
        }
    } catch (e) {
        console.error('Error loading patterns:', e);
        savedPatterns = [];
    }
    renderPatterns();
}

function renderPatterns() {
    const container = document.getElementById('patternsList');
    if (!container) return;
    
    if (!savedPatterns.length) {
        container.innerHTML = '<p class="placeholder-text">No saved patterns yet</p>';
        return;
    }
    
    container.innerHTML = savedPatterns.map(pattern => `
        <div class="pattern-item" onclick="loadPattern(${pattern.id})">
            <div class="name">${escapeHtml(pattern.name)}</div>
            <div class="tempo">${pattern.tempo} BPM</div>
        </div>
    `).join('');
}

function loadPattern(id) {
    const pattern = savedPatterns.find(p => p.id === id);
    if (!pattern) return;
    
    beatGrid = pattern.grid?.length === 16 ? [...pattern.grid] : Array(16).fill(false);
    
    const gameTempo = document.getElementById('gameTempo');
    const tempoValue = document.getElementById('tempoValue');
    
    if (gameTempo) gameTempo.value = pattern.tempo || 120;
    if (tempoValue) tempoValue.textContent = pattern.tempo || 120;
    
    document.querySelectorAll('.beat-cell').forEach((cell, i) => {
        cell.classList.toggle('active', beatGrid[i]);
    });
}

// ==================== UTILITY FUNCTIONS ====================

// Debounce function for performance
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Format date helper
function formatDate(dateString) {
    if (!dateString) return '';
    try {
        return new Date(dateString).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch (e) {
        return dateString;
    }
}

// ==================== EXPORT FOR HOSTINGER ====================
// This version works as a standalone HTML/CSS/JS site
// For Hostinger, upload the entire 'website' folder contents to public_html

