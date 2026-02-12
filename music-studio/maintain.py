#!/usr/bin/env python3
"""
Music Studio Maintenance Script
Run this to maintain and manage the Music Studio application.

Usage:
    python maintain.py --start      # Start all services
    python maintain.py --stop       # Stop all services
    python maintain.py --restart    # Restart all services
    python maintain.py --status     # Check service status
    python maintain.py --test       # Run API tests
    python maintain.py --logs       # View backend logs
    python maintain.py --reset-db   # Reset database (WARNING: deletes all data)
"""

import os
import sys
import signal
import subprocess
import time
import argparse

PROJECT_DIR = "/Users/upaura/Desktop/code/TEST PROJECT OCT 2025/music-studio"
BACKEND_PORT = 5000
FRONTEND_PORT = 8080

def get_backend_pid():
    """Get backend server PID"""
    try:
        result = subprocess.run(
            ["lsof", "-ti", f":{BACKEND_PORT}"],
            capture_output=True, text=True
        )
        return result.stdout.strip()
    except:
        return None

def get_frontend_pid():
    """Get frontend server PID"""
    try:
        result = subprocess.run(
            ["lsof", "-ti", f":{FRONTEND_PORT}"],
            capture_output=True, text=True
        )
        return result.stdout.strip()
    except:
        return None

def start_backend():
    """Start the backend server"""
    pid = get_backend_pid()
    if pid:
        print(f"⚠️  Backend already running on port {BACKEND_PORT} (PID: {pid})")
        return True
    
    print(f"🚀 Starting backend on port {BACKEND_PORT}...")
    try:
        os.chdir(os.path.join(PROJECT_DIR, "backend"))
        proc = subprocess.Popen(
            ["python", "app.py"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )
        time.sleep(2)
        
        # Check if started
        if get_backend_pid():
            print(f"✅ Backend started (PID: {proc.pid})")
            return True
        else:
            print("❌ Backend failed to start")
            return False
    except Exception as e:
        print(f"❌ Error starting backend: {e}")
        return False

def start_frontend():
    """Start the frontend server"""
    pid = get_frontend_pid()
    if pid:
        print(f"⚠️  Frontend already running on port {FRONTEND_PORT} (PID: {pid})")
        return True
    
    print(f"🚀 Starting frontend on port {FRONTEND_PORT}...")
    try:
        os.chdir(os.path.join(PROJECT_DIR, "website"))
        proc = subprocess.Popen(
            ["python", "-m", "http.server", str(FRONTEND_PORT)],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )
        time.sleep(1)
        
        # Check if started
        if get_frontend_pid():
            print(f"✅ Frontend started (PID: {proc.pid})")
            return True
        else:
            print("❌ Frontend failed to start")
            return False
    except Exception as e:
        print(f"❌ Error starting frontend: {e}")
        return False

def stop_services():
    """Stop all services"""
    print("🛑 Stopping services...")
    
    backend_pid = get_backend_pid()
    frontend_pid = get_frontend_pid()
    
    if backend_pid:
        os.kill(int(backend_pid), signal.SIGTERM)
        print(f"✅ Backend stopped")
    
    if frontend_pid:
        os.kill(int(frontend_pid), signal.SIGTERM)
        print(f"✅ Frontend stopped")
    
    if not backend_pid and not frontend_pid:
        print("ℹ️  No services running")

def check_status():
    """Check service status"""
    print("📊 Service Status:")
    print("-" * 30)
    
    backend_pid = get_backend_pid()
    frontend_pid = get_frontend_pid()
    
    if backend_pid:
        print(f"✅ Backend:  Running on port {BACKEND_PORT} (PID: {backend_pid})")
        # Test health
        try:
            resp = requests.get(f"http://localhost:{BACKEND_PORT}/api/health", timeout=3)
            if resp.status_code == 200:
                print("   Health: ✅ Healthy")
            else:
                print("   Health: ❌ Unhealthy")
        except:
            print("   Health: ❌ Unreachable")
    else:
        print(f"❌ Backend: Not running (port {BACKEND_PORT})")
    
    if frontend_pid:
        print(f"✅ Frontend: Running on port {FRONTEND_PORT} (PID: {frontend_pid})")
    else:
        print(f"❌ Frontend: Not running (port {FRONTEND_PORT})")
    
    print("-" * 30)

def run_tests():
    """Run API tests"""
    print("🧪 Running API tests...")
    os.chdir(PROJECT_DIR)
    subprocess.run([sys.executable, "test_api.py"])

def view_logs():
    """View backend logs"""
    print("📋 Backend logs (last 20 lines):")
    print("-" * 30)
    try:
        with open("/tmp/backend.log", "r") as f:
            lines = f.readlines()[-20:]
            for line in lines:
                print(line.rstrip())
    except FileNotFoundError:
        print("No logs found. Backend may not have been started yet.")
    print("-" * 30)

def reset_database():
    """Reset database (WARNING)"""
    print("⚠️  WARNING: This will delete all data!")
    confirm = input("Type 'yes' to continue: ")
    if confirm.lower() != "yes":
        print("Cancelled.")
        return
    
    print("🔄 Resetting database...")
    
    # Stop services
    stop_services()
    
    # Remove database
    db_path = os.path.join(PROJECT_DIR, "backend", "music_studio.db")
    if os.path.exists(db_path):
        os.remove(db_path)
        print("✅ Database removed")
    else:
        print("ℹ️  No database found")
    
    # Clear uploads
    upload_dir = os.path.join(PROJECT_DIR, "backend", "static", "uploads")
    if os.path.exists(upload_dir):
        for f in os.listdir(upload_dir):
            if f.endswith(".wav"):
                os.remove(os.path.join(upload_dir, f))
        print("✅ Uploaded files cleared")
    
    print("✅ Database reset complete")

def main():
    parser = argparse.ArgumentParser(description="Music Studio Maintenance")
    parser.add_argument("--start", action="store_true", help="Start all services")
    parser.add_argument("--stop", action="store_true", help="Stop all services")
    parser.add_argument("--restart", action="store_true", help="Restart all services")
    parser.add_argument("--status", action="store_true", help="Check service status")
    parser.add_argument("--test", action="store_true", help="Run API tests")
    parser.add_argument("--logs", action="store_true", help="View backend logs")
    parser.add_argument("--reset-db", action="store_true", help="Reset database")
    
    args = parser.parse_args()
    
    if not any([args.start, args.stop, args.restart, args.status, args.test, args.logs, args.reset_db]):
        parser.print_help()
        return
    
    if args.restart:
        stop_services()
        time.sleep(1)
        start_backend()
        start_frontend()
    elif args.start:
        start_backend()
        start_frontend()
    elif args.stop:
        stop_services()
    elif args.status:
        check_status()
    elif args.test:
        run_tests()
    elif args.logs:
        view_logs()
    elif args.reset_db:
        reset_database()

if __name__ == "__main__":
    main()

