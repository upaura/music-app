"""
Music Studio Flask Application
A web application for music analysis, collaboration, and beat building.
Production-ready with whitenoise for static file serving.
"""
import os
import json
import uuid
import logging
from datetime import datetime, timedelta
from functools import wraps

import numpy as np
import librosa
from flask import Flask, request, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename

# Configure logging
logger = logging.getLogger(__name__)

# Import after logging config
from models import db, User, Song, Collaboration, BeatPattern
from config import Config

# Initialize Flask app
app = Flask(__name__)
app.config.from_object(Config)

# Initialize extensions with app context
CORS(app, resources={
    r"/api/*": {
        "origins": app.config['CORS_ORIGINS'],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

db.init_app(app)

# Initialize Flask-Login
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

@login_manager.user_loader
def load_user(user_id):
    """Load user by ID for Flask-Login"""
    return db.session.get(User, int(user_id))


# ============== JWT TOKEN DECORATOR ==============

def jwt_required(f):
    """Decorator to require valid JWT token OR valid session"""
    @wraps(f)
    def decorated(*args, **kwargs):
        # First try JWT token from header
        auth_header = request.headers.get('Authorization')
        
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
            try:
                import jwt
                payload = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
                user = User.query.get(payload['user_id'])
                if user:
                    kwargs['current_user'] = user
                    return f(*args, **kwargs)
            except jwt.ExpiredSignatureError:
                return jsonify({'error': 'Token has expired'}), 401
            except jwt.InvalidTokenError:
                return jsonify({'error': 'Invalid token'}), 401
        
        # Fall back to session-based auth (Flask-Login)
        if current_user.is_authenticated:
            kwargs['current_user'] = current_user
            return f(*args, **kwargs)
        
        return jsonify({'error': 'Authentication required'}), 401
    return decorated


# ============== AUTHENTICATION ROUTES ==============

@app.route('/api/register', methods=['POST', 'OPTIONS'])
def register():
    """Register a new user"""
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
    
    data = request.get_json()
    
    # Validate input
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'error': 'Username and password are required'}), 400
    
    # Check if user exists
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Username already exists'}), 400
    
    # Create new user
    hashed_password = generate_password_hash(data['password'], method='pbkdf2:sha256')
    new_user = User(
        username=data['username'],
        email=data.get('email'),
        password=hashed_password
    )
    
    try:
        db.session.add(new_user)
        db.session.commit()
        
        # Log in the user
        login_user(new_user)
        
        logger.info(f"New user registered: {new_user.username}")
        
        return jsonify({
            'message': 'User registered successfully',
            'user': new_user.to_dict(),
            'token': generate_token(new_user)
        }), 201
    except Exception as e:
        db.session.rollback()
        logger.error(f"Registration failed: {str(e)}")
        return jsonify({'error': f'Registration failed: {str(e)}'}), 500


@app.route('/api/login', methods=['POST', 'OPTIONS'])
def login():
    """Login user and return JWT token"""
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
    
    data = request.get_json()
    
    # Validate input
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'error': 'Username and password are required'}), 400
    
    # Find user
    user = User.query.filter_by(username=data['username']).first()
    
    if user and check_password_hash(user.password, data['password']):
        login_user(user)
        logger.info(f"User logged in: {user.username}")
        return jsonify({
            'message': 'Login successful',
            'user': user.to_dict(),
            'token': generate_token(user)
        }), 200
    
    return jsonify({'error': 'Invalid credentials'}), 401


@app.route('/api/logout', methods=['POST', 'OPTIONS'])
@jwt_required
def logout(current_user=None):
    """Logout current user"""
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
    
    logout_user()
    return jsonify({'message': 'Logged out successfully'}), 200


@app.route('/api/me', methods=['GET', 'OPTIONS'])
@jwt_required
def get_current_user(current_user=None):
    """Get current user information"""
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
    
    return jsonify({
        'user': current_user.to_dict()
    }), 200


# ============== SONG ROUTES ==============

def generate_token(user, expires_in=None):
    """Generate JWT token for user"""
    if expires_in is None:
        expires_in = app.config.get('JWT_EXPIRATION_HOURS', 24)
    
    payload = {
        'user_id': user.id,
        'username': user.username,
        'exp': datetime.utcnow() + timedelta(hours=expires_in)
    }
    import jwt
    token = jwt.encode(payload, app.config['SECRET_KEY'], algorithm='HS256')
    return token


@app.route('/api/upload', methods=['POST', 'OPTIONS'])
@jwt_required
def upload(current_user=None):
    """Upload a new song"""
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
    
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    # Secure and save file
    original_filename = secure_filename(file.filename)
    
    if '.' not in original_filename:
        return jsonify({'error': 'Invalid file format'}), 400
    
    file_ext = original_filename.rsplit('.', 1)[1].lower()
    
    if file_ext not in app.config['ALLOWED_EXTENSIONS']:
        return jsonify({'error': f'File type not allowed. Supported formats: {", ".join(app.config["ALLOWED_EXTENSIONS"])}'}), 400
    
    # Generate unique filename
    unique_filename = f"{uuid.uuid4().hex}.{file_ext}"
    upload_path = app.config['UPLOAD_FOLDER']
    
    # Ensure upload directory exists
    os.makedirs(upload_path, exist_ok=True)
    
    file_path = os.path.join(upload_path, unique_filename)
    
    try:
        file.save(file_path)
        file_size = os.path.getsize(file_path)
        
        # Create song record
        new_song = Song(
            title=request.form.get('title', original_filename),
            artist=request.form.get('artist', current_user.username),
            album=request.form.get('album'),
            genre=request.form.get('genre'),
            file_path=file_path,
            file_name=original_filename,
            file_size=file_size,
            user_id=current_user.id
        )
        
        db.session.add(new_song)
        db.session.commit()
        
        logger.info(f"Song uploaded: {new_song.title} by {current_user.username}")
        
        return jsonify({
            'message': 'File uploaded successfully',
            'song': new_song.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Upload failed: {str(e)}")
        return jsonify({'error': f'Upload failed: {str(e)}'}), 500


@app.route('/api/songs', methods=['GET', 'OPTIONS'])
@jwt_required
def get_songs(current_user=None):
    """Get all songs for current user"""
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
    
    songs = Song.query.filter_by(user_id=current_user.id).order_by(Song.created_at.desc()).all()
    return jsonify({
        'songs': [song.to_dict() for song in songs]
    }), 200


@app.route('/api/songs/<int:song_id>', methods=['GET', 'OPTIONS'])
@jwt_required
def get_song(song_id, current_user=None):
    """Get specific song details"""
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
    
    song = Song.query.filter_by(id=song_id, user_id=current_user.id).first()
    
    if not song:
        return jsonify({'error': 'Song not found'}), 404
    
    return jsonify({
        'song': song.to_dict()
    }), 200


@app.route('/api/songs/<int:song_id>', methods=['DELETE', 'OPTIONS'])
@jwt_required
def delete_song(song_id, current_user=None):
    """Delete a song"""
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
    
    song = Song.query.filter_by(id=song_id, user_id=current_user.id).first()
    
    if not song:
        return jsonify({'error': 'Song not found'}), 404
    
    # Remove file
    if os.path.exists(song.file_path):
        os.remove(song.file_path)
    
    try:
        db.session.delete(song)
        db.session.commit()
        logger.info(f"Song deleted: {song.title} by {current_user.username}")
        return jsonify({'message': 'Song deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Delete failed: {str(e)}")
        return jsonify({'error': f'Delete failed: {str(e)}'}), 500


# ============== ANALYSIS ROUTES ==============

@app.route('/api/analyze/<int:song_id>', methods=['GET', 'OPTIONS'])
@jwt_required
def analyze(song_id, current_user=None):
    """Analyze a song's tempo and key"""
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
    
    song = Song.query.filter_by(id=song_id, user_id=current_user.id).first()
    
    if not song:
        return jsonify({'error': 'Song not found'}), 404
    
    if not os.path.exists(song.file_path):
        return jsonify({'error': 'Audio file not found'}), 404
    
    try:
        # Load audio file
        y, sr = librosa.load(song.file_path, sr=None)
        
        # Get duration
        duration = librosa.get_duration(y=y, sr=sr)
        
        # Analyze tempo
        tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr)
        
        # Analyze key using chroma features
        chroma = librosa.feature.chroma_stft(y=y, sr=sr)
        key_idx = np.argmax(np.sum(chroma, axis=1))
        keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
        key_name = keys[key_idx]
        
        # Update song with analysis results
        song.duration = duration
        song.tempo = float(tempo)
        song.key = key_name
        db.session.commit()
        
        logger.info(f"Song analyzed: {song.title} - {key_name}, {float(tempo):.1f} BPM")
        
        return jsonify({
            'message': 'Analysis complete',
            'song_id': song_id,
            'analysis': {
                'tempo': float(tempo),
                'key': key_name,
                'duration': duration,
                'sample_rate': sr,
                'num_beats': len(beat_frames)
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Analysis failed: {str(e)}")
        return jsonify({'error': f'Analysis failed: {str(e)}'}), 500


@app.route('/api/compare/<int:song1_id>/<int:song2_id>', methods=['GET', 'OPTIONS'])
@jwt_required
def compare_songs(song1_id, song2_id, current_user=None):
    """Compare two songs' tempo and key"""
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
    
    song1 = Song.query.filter_by(id=song1_id, user_id=current_user.id).first()
    song2 = Song.query.filter_by(id=song2_id, user_id=current_user.id).first()
    
    if not song1 or not song2:
        return jsonify({'error': 'One or both songs not found'}), 404
    
    try:
        # Analyze both songs
        y1, sr1 = librosa.load(song1.file_path, sr=None)
        y2, sr2 = librosa.load(song2.file_path, sr=None)
        
        tempo1, _ = librosa.beat.beat_track(y=y1, sr=sr1)
        tempo2, _ = librosa.beat.beat_track(y=y2, sr=sr2)
        
        chroma1 = librosa.feature.chroma_stft(y=y1, sr=sr1)
        chroma2 = librosa.feature.chroma_stft(y=y2, sr=sr2)
        
        key_idx1 = np.argmax(np.sum(chroma1, axis=1))
        key_idx2 = np.argmax(np.sum(chroma2, axis=1))
        
        keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
        
        # Calculate similarity
        similarity = float(np.corrcoef(
            np.sum(chroma1, axis=1),
            np.sum(chroma2, axis=1)
        )[0, 1])
        
        return jsonify({
            'comparison': {
                'song1': {
                    'id': song1.id,
                    'title': song1.title,
                    'tempo': float(tempo1),
                    'key': keys[key_idx1]
                },
                'song2': {
                    'id': song2.id,
                    'title': song2.title,
                    'tempo': float(tempo2),
                    'key': keys[key_idx2]
                },
                'similarity': similarity,
                'match_level': get_match_level(similarity)
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Comparison failed: {str(e)}")
        return jsonify({'error': f'Comparison failed: {str(e)}'}), 500


def get_match_level(similarity):
    """Get human-readable match level"""
    if similarity > 0.8:
        return 'Very High'
    elif similarity > 0.6:
        return 'High'
    elif similarity > 0.4:
        return 'Medium'
    elif similarity > 0.2:
        return 'Low'
    else:
        return 'Very Low'


# ============== COLLABORATION ROUTES ==============

@app.route('/api/collaborate/<int:song_id>', methods=['POST', 'OPTIONS'])
@jwt_required
def collaborate(song_id, current_user=None):
    """Add a verse/lyrics to a song"""
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
    
    song = Song.query.filter_by(id=song_id, user_id=current_user.id).first()
    
    if not song:
        return jsonify({'error': 'Song not found'}), 404
    
    data = request.get_json()
    content = data.get('verse', data.get('content', ''))
    verse_type = data.get('verse_type', 'lyrics')
    
    if not content:
        return jsonify({'error': 'Verse content is required'}), 400
    
    collaboration = Collaboration(
        song_id=song_id,
        user_id=current_user.id,
        content=content,
        verse_type=verse_type
    )
    
    try:
        db.session.add(collaboration)
        db.session.commit()
        
        logger.info(f"Collaboration added to {song.title} by {current_user.username}")
        
        return jsonify({
            'message': 'Verse added successfully',
            'collaboration': collaboration.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        logger.error(f"Collaboration failed: {str(e)}")
        return jsonify({'error': f'Collaboration failed: {str(e)}'}), 500


@app.route('/api/collaborate/<int:song_id>', methods=['GET', 'OPTIONS'])
@jwt_required
def get_collaborations(song_id, current_user=None):
    """Get all collaborations for a song"""
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
    
    song = Song.query.filter_by(id=song_id, user_id=current_user.id).first()
    
    if not song:
        return jsonify({'error': 'Song not found'}), 404
    
    collaborations = Collaboration.query.filter_by(song_id=song_id).order_by(
        Collaboration.created_at.desc()
    ).all()
    
    return jsonify({
        'collaborations': [collab.to_dict() for collab in collaborations]
    }), 200


# Alias route for backward compatibility
@app.route('/api/collaborations/<int:song_id>', methods=['GET', 'OPTIONS'])
@jwt_required
def get_collaborations_alias(song_id, current_user=None):
    """Alias for get_collaborations - backward compatibility"""
    return get_collaborations(song_id, current_user)


# ============== BEAT PATTERN ROUTES ==============

@app.route('/api/patterns', methods=['GET', 'POST', 'OPTIONS'])
@jwt_required
def handle_patterns(current_user=None):
    """Get all patterns or create a new one"""
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
    
    if request.method == 'GET':
        patterns = BeatPattern.query.filter_by(user_id=current_user.id).order_by(
            BeatPattern.created_at.desc()
        ).all()
        return jsonify({
            'patterns': [pattern.to_dict() for pattern in patterns]
        }), 200
    
    # POST - Create new pattern
    data = request.get_json()
    name = data.get('name', 'Untitled Beat')
    grid_data = data.get('grid_data', '[]')
    tempo = data.get('tempo', 120)
    
    pattern = BeatPattern(
        user_id=current_user.id,
        name=name,
        grid_data=json.dumps(grid_data) if isinstance(grid_data, (list, dict)) else grid_data,
        tempo=tempo
    )
    
    try:
        db.session.add(pattern)
        db.session.commit()
        
        logger.info(f"Pattern saved: {name} by {current_user.username}")
        
        return jsonify({
            'message': 'Pattern saved successfully',
            'pattern': pattern.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        logger.error(f"Failed to save pattern: {str(e)}")
        return jsonify({'error': f'Failed to save pattern: {str(e)}'}), 500


@app.route('/api/patterns/<int:pattern_id>', methods=['DELETE', 'OPTIONS'])
@jwt_required
def delete_pattern(pattern_id, current_user=None):
    """Delete a beat pattern"""
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
    
    pattern = BeatPattern.query.filter_by(id=pattern_id, user_id=current_user.id).first()
    
    if not pattern:
        return jsonify({'error': 'Pattern not found'}), 404
    
    try:
        db.session.delete(pattern)
        db.session.commit()
        logger.info(f"Pattern deleted: {pattern.name} by {current_user.username}")
        return jsonify({'message': 'Pattern deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Delete failed: {str(e)}")
        return jsonify({'error': f'Delete failed: {str(e)}'}), 500


# ============== HEALTH CHECK ==============

@app.route('/api/health', methods=['GET', 'OPTIONS'])
def health_check():
    """Health check endpoint for deployment"""
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'}), 200
    
    return jsonify({
        'status': 'healthy',
        'service': 'music-studio-backend',
        'version': '1.0.0',
        'timestamp': datetime.utcnow().isoformat()
    }), 200


# ============== STATIC FILES ==============

@app.route('/static/uploads/<path:filename>')
@jwt_required
def serve_upload(filename, current_user=None):
    """Serve uploaded files"""
    upload_folder = app.config['UPLOAD_FOLDER']
    return send_from_directory(upload_folder, filename)


# ============== ERROR HANDLERS ==============

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Resource not found', 'status': 404}), 404


@app.errorhandler(500)
def internal_error(error):
    logger.error(f"Internal server error: {str(error)}")
    return jsonify({'error': 'Internal server error', 'status': 500}), 500


@app.errorhandler(413)
def request_entity_too_large(error):
    return jsonify({'error': 'File too large. Maximum size is 50MB'}), 413


# ============== MAIN ==============

if __name__ == '__main__':
    # Create database tables
    with app.app_context():
        db.create_all()
        # Ensure upload directory exists
        os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    
    # Get port from environment
    port = int(os.environ.get('PORT', 5000))
    debug = app.config.get('DEBUG', True)
    
    logger.info(f"Starting Music Studio on port {port}")
    
    # Run the app
    app.run(
        host='0.0.0.0',
        port=port,
        debug=debug
    )

