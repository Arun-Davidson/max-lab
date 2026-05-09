import sqlite3
import secrets
import os

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'ats_service.db')

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS api_keys (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            key TEXT UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            is_active INTEGER DEFAULT 1
        )
    ''')
    conn.commit()
    conn.close()

def generate_api_key(name):
    key = secrets.token_urlsafe(32)
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        cursor.execute('INSERT INTO api_keys (name, key) VALUES (?, ?)', (name, key))
        conn.commit()
        return key
    except sqlite3.Error as e:
        print(f"Database error: {e}")
        return None
    finally:
        conn.close()

def verify_api_key(key):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('SELECT 1 FROM api_keys WHERE key = ? AND is_active = 1', (key,))
    result = cursor.fetchone()
    conn.close()
    return result is not None

# Initialize on import
init_db()
