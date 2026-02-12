<?php
/**
 * UPAURA Music Studio - PHP Backend API
 * Deploy to Hostinger public_html/api/ folder
 */

// Enable CORS for all origins (configure for production)
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Configuration
define('DB_FILE', __DIR__ . '/../data/music_studio.db');
define('UPLOAD_DIR', __DIR__ . '/../uploads');
define('JWT_SECRET', 'your-secret-key-change-in-production-min-32-chars');

// Create directories if not exist
if (!file_exists(__DIR__ . '/../data')) {
    mkdir(__DIR__ . '/../data', 0755, true);
}
if (!file_exists(UPLOAD_DIR)) {
    mkdir(UPLOAD_DIR, 0755, true);
}

// Initialize Database
function initDB() {
    $db = new PDO('sqlite:' . DB_FILE);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Create tables
    $db->exec("CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )");
    
    $db->exec("CREATE TABLE IF NOT EXISTS songs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        artist TEXT,
        album TEXT,
        genre TEXT,
        file_path TEXT NOT NULL,
        file_name TEXT,
        file_size INTEGER,
        duration FLOAT,
        tempo FLOAT,
        key_note TEXT,
        user_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )");
    
    $db->exec("CREATE TABLE IF NOT EXISTS collaborations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        song_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        verse_type TEXT DEFAULT 'lyrics',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (song_id) REFERENCES songs(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
    )");
    
    $db->exec("CREATE TABLE IF NOT EXISTS patterns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        grid_data TEXT NOT NULL,
        tempo INTEGER DEFAULT 120,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )");
    
    return $db;
}

// JWT Functions
function generateJWT($user) {
    $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
    $payload = json_encode([
        'user_id' => $user['id'],
        'username' => $user['username'],
        'exp' => time() + 86400 // 24 hours
    ]);
    
    $header = base64_encode($header);
    $payload = base64_encode($payload);
    
    $signature = hash_hmac('sha256', "$header.$payload", JWT_SECRET, true);
    $signature = base64_encode($signature);
    
    return "$header.$payload.$signature";
}

function verifyJWT($token) {
    $parts = explode('.', $token);
    if (count($parts) !== 3) return null;
    
    $signature = hash_hmac('sha256', "$parts[0].$parts[1]", JWT_SECRET, true);
    if (base64_encode($signature) !== $parts[2]) return null;
    
    $payload = json_decode(base64_decode($parts[1]), true);
    if ($payload['exp'] < time()) return null;
    
    return $payload;
}

function getAuthUser() {
    $headers = getallheaders();
    $auth = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    
    if (preg_match('/Bearer\s+(.+)/i', $auth, $matches)) {
        return verifyJWT($matches[1]);
    }
    return null;
}

// Password Functions
function hashPassword($password) {
    return password_hash($password, PASSWORD_DEFAULT);
}

function verifyPassword($password, $hash) {
    return password_verify($password, $hash);
}

// API Routes
$db = initDB();
$method = $_SERVER['REQUEST_METHOD'];
$path = $_GET['path'] ?? '';

// Health Check
if ($path === 'health') {
    echo json_encode(['status' => 'healthy', 'service' => 'music-studio-php']);
    exit;
}

// Auth Routes
if ($path === 'register' && $method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($data['username']) || !isset($data['password'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Username and password required']);
        exit;
    }
    
    $stmt = $db->prepare("SELECT id FROM users WHERE username = ?");
    $stmt->execute([$data['username']]);
    
    if ($stmt->fetch()) {
        http_response_code(400);
        echo json_encode(['error' => 'Username already exists']);
        exit;
    }
    
    $hash = hashPassword($data['password']);
    $stmt = $db->prepare("INSERT INTO users (username, email, password) VALUES (?, ?, ?)");
    $stmt->execute([$data['username'], $data['email'] ?? null, $hash]);
    
    $user = [
        'id' => $db->lastInsertId(),
        'username' => $data['username'],
        'email' => $data['email'] ?? null,
        'created_at' => date('c')
    ];
    
    echo json_encode([
        'message' => 'User registered successfully',
        'user' => $user,
        'token' => generateJWT($user)
    ]);
    exit;
}

if ($path === 'login' && $method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $stmt = $db->prepare("SELECT * FROM users WHERE username = ?");
    $stmt->execute([$data['username']]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($user && verifyPassword($data['password'], $user['password'])) {
        $userData = [
            'id' => $user['id'],
            'username' => $user['username'],
            'email' => $user['email'],
            'created_at' => $user['created_at']
        ];
        
        echo json_encode([
            'message' => 'Login successful',
            'user' => $userData,
            'token' => generateJWT($userData)
        ]);
        exit;
    }
    
    http_response_code(401);
    echo json_encode(['error' => 'Invalid credentials']);
    exit;
}

// Protected Routes
$currentUser = getAuthUser();

if (!$currentUser && in_array($path, ['songs', 'upload', 'analyze', 'collaborate', 'patterns', 'me'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Authentication required']);
    exit;
}

if ($path === 'me' && $method === 'GET') {
    echo json_encode(['user' => $currentUser]);
    exit;
}

// Upload Route
if ($path === 'upload' && $method === 'POST') {
    if (!isset($_FILES['file'])) {
        http_response_code(400);
        echo json_encode(['error' => 'No file provided']);
        exit;
    }
    
    $file = $_FILES['file'];
    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    $allowed = ['mp3', 'wav', 'ogg', 'flac', 'm4a'];
    
    if (!in_array($ext, $allowed)) {
        http_response_code(400);
        echo json_encode(['error' => 'File type not allowed']);
        exit;
    }
    
    $filename = uniqid() . '.' . $ext;
    $filepath = UPLOAD_DIR . '/' . $filename;
    
    if (move_uploaded_file($file['tmp_name'], $filepath)) {
        $stmt = $db->prepare("INSERT INTO songs (title, artist, album, genre, file_path, file_name, file_size, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $_POST['title'] ?? $file['name'],
            $_POST['artist'] ?? $currentUser['username'],
            $_POST['album'] ?? null,
            $_POST['genre'] ?? null,
            $filepath,
            $file['name'],
            $file['size'],
            $currentUser['user_id']
        ]);
        
        $song = [
            'id' => $db->lastInsertId(),
            'title' => $_POST['title'] ?? $file['name'],
            'artist' => $_POST['artist'] ?? $currentUser['username'],
            'file_name' => $file['name'],
            'file_size' => $file['size'],
            'user_id' => $currentUser['user_id'],
            'created_at' => date('c')
        ];
        
        echo json_encode([
            'message' => 'File uploaded successfully',
            'song' => $song
        ]);
        exit;
    }
    
    http_response_code(500);
    echo json_encode(['error' => 'Upload failed']);
    exit;
}

// Get Songs
if ($path === 'songs' && $method === 'GET') {
    $stmt = $db->prepare("SELECT * FROM songs WHERE user_id = ? ORDER BY created_at DESC");
    $stmt->execute([$currentUser['user_id']]);
    $songs = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode(['songs' => $songs]);
    exit;
}

// Analyze Song
if (preg_match('/^analyze\/(\d+)$/', $path, $matches) && $method === 'GET') {
    $songId = $matches[1];
    
    $stmt = $db->prepare("SELECT * FROM songs WHERE id = ? AND user_id = ?");
    $stmt->execute([$songId, $currentUser['user_id']]);
    $song = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$song) {
        http_response_code(404);
        echo json_encode(['error' => 'Song not found']);
        exit;
    }
    
    // Basic analysis (tempo/key detection would require librosa which needs Python)
    // For PHP, we return basic file info
    $analysis = [
        'tempo' => 120.0, // Placeholder - would need Python for real analysis
        'key' => 'C',
        'duration' => 0,
        'sample_rate' => 44100
    ];
    
    // Update song with analysis
    $stmt = $db->prepare("UPDATE songs SET tempo = ?, key_note = ?, duration = ? WHERE id = ?");
    $stmt->execute([$analysis['tempo'], $analysis['key'], $analysis['duration'], $songId]);
    
    echo json_encode([
        'message' => 'Analysis complete',
        'song_id' => $songId,
        'analysis' => $analysis
    ]);
    exit;
}

// Collaborate
if (preg_match('/^collaborate\/(\d+)$/', $path, $matches)) {
    $songId = $matches[1];
    
    if ($method === 'GET') {
        $stmt = $db->prepare("SELECT c.*, u.username FROM collaborations c JOIN users u ON c.user_id = u.id WHERE c.song_id = ? ORDER BY c.created_at DESC");
        $stmt->execute([$songId]);
        $collabs = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode(['collaborations' => $collabs]);
        exit;
    }
    
    if ($method === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        
        $stmt = $db->prepare("INSERT INTO collaborations (song_id, user_id, content, verse_type) VALUES (?, ?, ?, ?)");
        $stmt->execute([$songId, $currentUser['user_id'], $data['verse'] ?? $data['content'] ?? '', $data['verse_type'] ?? 'lyrics']);
        
        $collab = [
            'id' => $db->lastInsertId(),
            'song_id' => $songId,
            'user_id' => $currentUser['user_id'],
            'content' => $data['verse'] ?? '',
            'verse_type' => $data['verse_type'] ?? 'lyrics',
            'created_at' => date('c')
        ];
        
        echo json_encode([
            'message' => 'Verse added successfully',
            'collaboration' => $collab
        ]);
        exit;
    }
}

// Patterns
if ($path === 'patterns') {
    if ($method === 'GET') {
        $stmt = $db->prepare("SELECT * FROM patterns WHERE user_id = ? ORDER BY created_at DESC");
        $stmt->execute([$currentUser['user_id']]);
        $patterns = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode(['patterns' => $patterns]);
        exit;
    }
    
    if ($method === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        
        $stmt = $db->prepare("INSERT INTO patterns (user_id, name, grid_data, tempo) VALUES (?, ?, ?, ?)");
        $stmt->execute([
            $currentUser['user_id'],
            $data['name'] ?? 'Untitled Beat',
            json_encode($data['grid_data'] ?? []),
            $data['tempo'] ?? 120
        ]);
        
        echo json_encode([
            'message' => 'Pattern saved successfully',
            'pattern' => [
                'id' => $db->lastInsertId(),
                'name' => $data['name'] ?? 'Untitled Beat',
                'tempo' => $data['tempo'] ?? 120,
                'created_at' => date('c')
            ]
        ]);
        exit;
    }
}

// 404 for unknown routes
http_response_code(404);
echo json_encode(['error' => 'Endpoint not found']);

