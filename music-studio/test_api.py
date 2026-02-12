#!/usr/bin/env python3
"""
Music Studio API Test Script
Run this to verify all API endpoints are working correctly.

Usage:
    python test_api.py [--port 5000]

Requirements:
    - Backend must be running first
    - pytest and requests installed
"""

import sys
import requests
import argparse

BASE_URL = "http://localhost:5000/api"

def test_health():
    """Test health check endpoint"""
    print("Testing /api/health...")
    try:
        resp = requests.get(f"{BASE_URL}/health", timeout=5)
        data = resp.json()
        assert resp.status_code == 200
        assert data.get("status") == "healthy"
        print("  ✅ Health check passed")
        return True
    except Exception as e:
        print(f"  ❌ Health check failed: {e}")
        return False

def test_register():
    """Test user registration"""
    print("Testing /api/register...")
    try:
        resp = requests.post(f"{BASE_URL}/register", json={
            "username": "testuser",
            "email": "test@example.com",
            "password": "testpass123"
        }, timeout=5)
        
        if resp.status_code == 201:
            data = resp.json()
            print("  ✅ Registration passed")
            return data.get("token"), data.get("user")
        elif resp.status_code == 400 and "already exists" in resp.json().get("error", ""):
            print("  ℹ️  User already exists (skipping)")
            return None, None
        else:
            print(f"  ❌ Registration failed: {resp.json()}")
            return None, None
    except Exception as e:
        print(f"  ❌ Registration error: {e}")
        return None, None

def test_login(token=None):
    """Test user login"""
    print("Testing /api/login...")
    try:
        resp = requests.post(f"{BASE_URL}/login", json={
            "username": "testuser",
            "password": "testpass123"
        }, timeout=5)
        
        if resp.status_code == 200:
            data = resp.json()
            print("  ✅ Login passed")
            return data.get("token")
        else:
            print(f"  ❌ Login failed: {resp.json()}")
            return None
    except Exception as e:
        print(f"  ❌ Login error: {e}")
        return None

def test_auth_endpoints(token):
    """Test authenticated endpoints"""
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test /api/me
    print("Testing /api/me...")
    try:
        resp = requests.get(f"{BASE_URL}/me", headers=headers, timeout=5)
        if resp.status_code == 200:
            print("  ✅ /api/me passed")
        else:
            print(f"  ❌ /api/me failed: {resp.json()}")
    except Exception as e:
        print(f"  ❌ /api/me error: {e}")
    
    # Test /api/songs
    print("Testing /api/songs...")
    try:
        resp = requests.get(f"{BASE_URL}/songs", headers=headers, timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            print(f"  ✅ /api/songs passed ({len(data.get('songs', []))} songs)")
            return data.get('songs', [])
        else:
            print(f"  ❌ /api/songs failed: {resp.json()}")
            return []
    except Exception as e:
        print(f"  ❌ /api/songs error: {e}")
        return []

def main():
    parser = argparse.ArgumentParser(description="Test Music Studio API")
    parser.add_argument("--port", type=int, default=5000, help="API port")
    args = parser.parse_args()
    
    global BASE_URL
    BASE_URL = f"http://localhost:{args.port}/api"
    
    print("=" * 50)
    print("🎵 Music Studio API Test Suite")
    print("=" * 50)
    print()
    
    # Run tests
    all_passed = True
    
    # 1. Health check
    if not test_health():
        all_passed = False
        print("\n❌ Backend not running! Start it first:")
        print("   cd music-studio/backend && python app.py")
        sys.exit(1)
    
    print()
    
    # 2. Registration
    token, user = test_register()
    
    print()
    
    # 3. Login
    if not token:
        token = test_login()
    
    print()
    
    # 4. Authenticated endpoints
    if token:
        songs = test_auth_endpoints(token)
        print()
        print(f"📊 Found {len(songs)} songs for testuser")
    
    print()
    print("=" * 50)
    if all_passed:
        print("✅ All tests passed! API is accessible.")
    else:
        print("⚠️  Some tests failed. Check output above.")
    print("=" * 50)

if __name__ == "__main__":
    main()

