# Music Studio - Upload Feature Documentation

## Overview

The Upload feature allows users to upload audio files to the Music Studio platform. Files are processed, stored securely, and made available for analysis and collaboration.

## Supported Formats

| Format | MIME Type | Extension | Notes |
|--------|-----------|-----------|-------|
| MP3 | audio/mpeg | .mp3 | Most common format |
| WAV | audio/wav | .wav | Uncompressed, high quality |
| OGG | audio/ogg | .ogg | Open format, good compression |
| FLAC | audio/flac | .flac | Lossless compression |
| M4A | audio/m4a | .m4a | AAC format (Apple) |

## File Size Limits

- **Maximum file size**: 50MB (configurable via `MAX_CONTENT_LENGTH`)
- **Recommended maximum**: 25MB for optimal performance

## Upload Process

### 1. File Selection
Users can upload files via:
- **Drag & Drop**: Drag audio files onto the upload zone
- **File Browser**: Click "Browse Files" to select files
- **Multiple files**: Support for batch uploads

### 2. Validation
Files undergo validation for:
- File extension check
- MIME type verification
- File size verification

### 3. Processing
After validation:
1. Unique filename generated (UUID)
2. File saved to server
3. Database record created
4. Song metadata extracted

### 4. Storage Structure

```
backend/
└── static/
    └── uploads/
        ├── abc123.mp3
        ├── def456.wav
        └── ghi789.ogg
```

## Metadata Extraction

When a file is uploaded, the system:

1. **Extracts basic metadata**:
   - Filename
   - File size
   - Duration (via librosa)

2. **Stores user-provided info**:
   - Title
   - Artist
   - Album (optional)
   - Genre (optional)

## Security Measures

### File Validation
```python
# Only allow specific extensions
ALLOWED_EXTENSIONS = {'mp3', 'wav', 'ogg', 'flac', 'm4a'}

# Check extension before processing
if file_ext not in app.config['ALLOWED_EXTENSIONS']:
    return jsonify({'error': 'File type not allowed'}), 400
```

### Secure Filenames
Uses `werkzeug.utils.secure_filename()` to:
- Sanitize filenames
- Prevent path traversal attacks
- Remove dangerous characters

### Size Limits
```python
MAX_CONTENT_LENGTH = 50 * 1024 * 1024  # 50MB
```

## Database Schema

```python
class Song(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    artist = db.Column(db.String(200))
    album = db.Column(db.String(200))
    genre = db.Column(db.String(100))
    file_path = db.Column(db.String(500), nullable=False)
    file_name = db.Column(db.String(300))
    file_size = db.Column(db.Integer)  # bytes
    duration = db.Column(db.Float)  # seconds
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
```

## API Endpoints

### Upload Song
```
POST /api/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

Fields:
- file: (file) Audio file
- title: (string) Song title
- artist: (string) Artist name
- album: (string) Album name
- genre: (string) Genre

Response:
{
    "message": "File uploaded successfully",
    "song": {
        "id": 1,
        "title": "My Song",
        "artist": "Artist Name",
        ...
    }
}
```

### Get User's Songs
```
GET /api/songs
Authorization: Bearer <token>

Response:
{
    "songs": [
        {...},
        {...}
    ]
}
```

### Delete Song
```
DELETE /api/songs/<id>
Authorization: Bearer <token>

Response:
{
    "message": "Song deleted successfully"
}
```

## Frontend Implementation

### Drag and Drop
```javascript
function setupDragAndDrop() {
    const uploadArea = document.getElementById('uploadArea');
    
    ['dragenter', 'dragover'].forEach(event => {
        uploadArea.addEventListener(event, () => {
            uploadArea.classList.add('dragover');
        });
    });
    
    ['dragleave', 'drop'].forEach(event => {
        uploadArea.addEventListener(event, () => {
            uploadArea.classList.remove('dragover');
        });
    });
    
    uploadArea.addEventListener('drop', handleDrop);
}

function handleDrop(e) {
    const files = e.dataTransfer.files;
    handleFiles(files);
}
```

### File Upload
```javascript
async function handleUpload(event) {
    event.preventDefault();
    
    const formData = new FormData();
    formData.append('file', window.uploadFile);
    formData.append('title', document.getElementById('songTitle').value);
    formData.append('artist', document.getElementById('songArtist').value);
    
    const response = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: formData
    });
    
    const data = await response.json();
    // Handle response...
}
```

## Troubleshooting

### "File type not allowed"
- Check file extension (.mp3, .wav, .ogg, .flac, .m4a)
- Ensure MIME type is correct

### "File too large"
- Reduce file size (compress audio)
- Check MAX_CONTENT_LENGTH setting

### "Upload failed"
- Check upload directory permissions
- Verify disk space available
- Check server logs

### "Song not found" after upload
- Refresh the songs list
- Check database connection
- Verify user authentication

## Performance Tips

1. **Compress files before upload** if size > 25MB
2. **Use MP3 format** for best compatibility/size ratio
3. **Avoid very long tracks** (> 30 minutes)
4. **Clear unused songs** periodically

## Future Enhancements

- [ ] Progress bar for uploads
- [ ] Pause/resume upload support
- [ ] Automatic genre detection
- [ ] Waveform preview
- [ ] Cloud storage integration (AWS S3)
- [ ] CDN for audio streaming

