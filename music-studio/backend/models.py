"""Database models for Music Studio Application"""
from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from datetime import datetime

db = SQLAlchemy()


class User(UserMixin, db.Model):
    """User model for authentication"""
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(150), unique=True, nullable=False, index=True)
    email = db.Column(db.String(150), unique=True, nullable=True)
    password = db.Column(db.String(150), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    songs = db.relationship('Song', backref='owner', lazy=True, cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<User {self.username}>'
    
    def to_dict(self):
        """Return user data as dictionary (without password)"""
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'created_at': self.created_at.isoformat()
        }


class Song(db.Model):
    """Song model for storing uploaded audio files"""
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    artist = db.Column(db.String(200))
    album = db.Column(db.String(200))
    genre = db.Column(db.String(100))
    file_path = db.Column(db.String(500), nullable=False)
    file_name = db.Column(db.String(300))
    file_size = db.Column(db.Integer)  # Size in bytes
    duration = db.Column(db.Float)  # Duration in seconds
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False, index=True)
    
    # Analysis results (stored as JSON string)
    tempo = db.Column(db.Float, nullable=True)
    key = db.Column(db.String(10), nullable=True)
    analysis_data = db.Column(db.Text, nullable=True)  # JSON string for additional analysis
    
    def __repr__(self):
        return f'<Song {self.title} by {self.artist}>'
    
    def to_dict(self):
        """Return song data as dictionary"""
        return {
            'id': self.id,
            'title': self.title,
            'artist': self.artist,
            'album': self.album,
            'genre': self.genre,
            'file_name': self.file_name,
            'file_size': self.file_size,
            'duration': self.duration,
            'created_at': self.created_at.isoformat(),
            'tempo': self.tempo,
            'key': self.key,
            'user_id': self.user_id
        }


class Collaboration(db.Model):
    """Collaboration model for storing verses/lyrics added to songs"""
    id = db.Column(db.Integer, primary_key=True)
    song_id = db.Column(db.Integer, db.ForeignKey('song.id'), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False, index=True)
    content = db.Column(db.Text, nullable=False)
    verse_type = db.Column(db.String(50), default='lyrics')  # lyrics, verse, chorus, bridge
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    song = db.relationship('Song', backref='collaborations')
    user = db.relationship('User', backref='collaborations')
    
    def __repr__(self):
        return f'<Collaboration on song {self.song_id} by user {self.user_id}>'
    
    def to_dict(self):
        """Return collaboration data as dictionary"""
        return {
            'id': self.id,
            'song_id': self.song_id,
            'user_id': self.user_id,
            'content': self.content,
            'verse_type': self.verse_type,
            'created_at': self.created_at.isoformat(),
            'username': self.user.username if self.user else None
        }


class BeatPattern(db.Model):
    """Beat patterns for the music game"""
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False, index=True)
    name = db.Column(db.String(100), nullable=False)
    grid_data = db.Column(db.Text, nullable=False)  # JSON string representing the grid
    tempo = db.Column(db.Integer, default=120)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    user = db.relationship('User', backref='beat_patterns')
    
    def __repr__(self):
        return f'<BeatPattern {self.name}>'
    
    def to_dict(self):
        """Return beat pattern data as dictionary"""
        return {
            'id': self.id,
            'name': self.name,
            'grid_data': self.grid_data,
            'tempo': self.tempo,
            'created_at': self.created_at.isoformat()
        }

