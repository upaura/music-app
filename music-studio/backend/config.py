"""Configuration for Music Studio Flask Application"""
import os
import logging
from datetime import timedelta

# Database URL - supports PostgreSQL and SQLite
def get_database_url():
    database_url = os.environ.get('DATABASE_URL', '')
    if database_url:
        # Use PostgreSQL if DATABASE_URL is provided
        return database_url
    # Default to SQLite in development
    return 'sqlite:///music_studio.db'

# CORS origins - supports environment variable
def get_cors_origins():
    cors_origins = os.environ.get('CORS_ORIGINS', '')
    if cors_origins:
        return cors_origins
    # Development origins
    return 'http://localhost:3000,http://localhost:5000,http://127.0.0.1:5000,http://127.0.0.1:3000'

# Logging configuration
def setup_logging():
    """Configure application logging"""
    log_level = os.environ.get('LOG_LEVEL', 'INFO')
    log_format = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    
    # Configure root logger
    logging.basicConfig(
        level=getattr(logging, log_level.upper(), logging.INFO),
        format=log_format
    )
    
    # Create file handler for production
    log_file = os.environ.get('LOG_FILE', 'music_studio.log')
    if log_file:
        file_handler = logging.FileHandler(log_file)
        file_handler.setLevel(getattr(logging, log_level.upper(), logging.INFO))
        file_handler.setFormatter(logging.Formatter(log_format))
        logging.getLogger().addHandler(file_handler)
    
    return logging.getLogger(__name__)


class Config:
    """Base configuration class"""
    
    # Secret key for session management - MUST be set in production!
    SECRET_KEY = os.environ.get('SECRET_KEY', 'your-secret-key-change-in-production-min-32-chars')
    
    # Ensure secret key is secure in production
    if os.environ.get('FLASK_ENV') == 'production':
        assert len(SECRET_KEY) >= 32, "SECRET_KEY must be at least 32 characters in production"
    
    # Database configuration
    SQLALCHEMY_DATABASE_URI = get_database_url()
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # File upload configuration
    UPLOAD_FOLDER = os.path.join(os.getcwd(), 'static', 'uploads')
    MAX_CONTENT_LENGTH = int(os.environ.get('MAX_CONTENT_LENGTH', 50 * 1024 * 1024))  # 50MB default
    
    # Allowed audio file extensions
    ALLOWED_EXTENSIONS = {'mp3', 'wav', 'ogg', 'flac', 'm4a'}
    
    # JWT configuration
    JWT_EXPIRATION_HOURS = int(os.environ.get('JWT_EXPIRATION_HOURS', 24))
    JWT_TOKEN_LOCATION = 'headers'
    
    # CORS configuration
    CORS_ORIGINS = get_cors_origins()
    CORS_SUPPORTS_CREDENTIALS = True
    
    # Environment
    ENV = os.environ.get('FLASK_ENV', 'development')
    
    # Session configuration
    SESSION_COOKIE_SECURE = os.environ.get('FLASK_ENV') == 'production'
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    
    # Permanent session lifetime
    PERMANENT_SESSION_LIFETIME = timedelta(hours=JWT_EXPIRATION_HOURS)


class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    DEVELOPMENT = True


class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    DEVELOPMENT = False
    
    # Additional security for production
    SESSION_COOKIE_SECURE = True


class TestingConfig(Config):
    """Testing configuration"""
    TESTING = True
    DEBUG = True


# Configuration dictionary for easy switching
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}

