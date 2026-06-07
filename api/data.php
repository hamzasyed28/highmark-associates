<?php
/**
 * Highmark Associates - Server-Side Data API
 *
 * Handles read/write for all site data: listings, agents, blogs, config, ceo
 * - GET  ?key=listings  → returns JSON data (public)
 * - POST { key, data, token } → saves JSON data (requires admin token)
 *
 * Data is stored as JSON files in ./data/ directory on the server.
 */

// ── Headers ─────────────────────────────────────────────────────────────────
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle CORS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// ── Config ───────────────────────────────────────────────────────────────────
$dataDir   = __DIR__ . '/data/';
$validKeys = ['listings', 'agents', 'blogs', 'config', 'ceo'];

// Create data directory if it doesn't exist yet
if (!is_dir($dataDir)) {
    mkdir($dataDir, 0755, true);
}

// ── Helper: get stored admin token ───────────────────────────────────────────
function getToken($dataDir) {
    $tokenFile = $dataDir . 'token.txt';
    return file_exists($tokenFile) ? trim(file_get_contents($tokenFile)) : 'admin123';
}

// ══════════════════════════════════════════════════════════════════════════════
// GET: Read data (public)
// ══════════════════════════════════════════════════════════════════════════════
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $key = isset($_GET['key']) ? trim($_GET['key']) : '';

    if (!in_array($key, $validKeys)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid key.']);
        exit;
    }

    $file = $dataDir . $key . '.json';

    if (file_exists($file)) {
        // Return the stored data
        header('Cache-Control: no-store, no-cache, must-revalidate');
        echo file_get_contents($file);
    } else {
        // null = "no data on server yet, use static JS file default"
        echo 'null';
    }
    exit;
}

// ══════════════════════════════════════════════════════════════════════════════
// POST: Write data (requires token)
// ══════════════════════════════════════════════════════════════════════════════
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = file_get_contents('php://input');
    $body  = json_decode($input, true);

    // Validate request body
    if (!$body || !array_key_exists('key', $body) || !array_key_exists('data', $body) || !array_key_exists('token', $body)) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing required fields: key, data, token.']);
        exit;
    }

    $providedToken = (string)$body['token'];
    $storedToken   = getToken($dataDir);

    // Verify token / password
    if ($providedToken !== $storedToken) {
        http_response_code(403);
        echo json_encode(['error' => 'Unauthorized: Incorrect admin password.']);
        exit;
    }

    $key  = (string)$body['key'];
    $data = $body['data'];

    // ── Special case: verify admin password/token ──────────────────────────
    if ($key === 'verify') {
        echo json_encode(['success' => true, 'message' => 'Password verified.']);
        exit;
    }

    // ── Special case: update admin password/token ──────────────────────────
    if ($key === 'admin_token') {
        if (!is_string($data) || strlen($data) < 6) {
            http_response_code(400);
            echo json_encode(['error' => 'Password must be at least 6 characters.']);
            exit;
        }
        file_put_contents($dataDir . 'token.txt', $data);
        echo json_encode(['success' => true, 'message' => 'Password updated on server.']);
        exit;
    }

    // ── Validate data key ──────────────────────────────────────────────────
    if (!in_array($key, $validKeys)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid data key: ' . htmlspecialchars($key)]);
        exit;
    }

    // ── Save JSON to file ──────────────────────────────────────────────────
    $file   = $dataDir . $key . '.json';
    $result = file_put_contents($file, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));

    if ($result === false) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to write data. Check server file permissions on /api/data/ directory.']);
        exit;
    }

    echo json_encode(['success' => true, 'message' => $key . ' saved successfully.']);
    exit;
}

// ── Method not allowed ────────────────────────────────────────────────────────
http_response_code(405);
echo json_encode(['error' => 'Method not allowed.']);
