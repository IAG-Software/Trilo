import sqlite3
import os

DB_PATH = "backend/trilo.db"
if os.path.exists(DB_PATH):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Fix columns table
    cursor.execute("PRAGMA table_info(columns)")
    cols = [c[1] for c in cursor.fetchall()]
    if 'board_id' not in cols:
        print("Adding board_id to columns...")
        cursor.execute("ALTER TABLE columns ADD COLUMN board_id TEXT")
    
    # Fix tasks table
    cursor.execute("PRAGMA table_info(tasks)")
    tasks_cols = [c[1] for c in cursor.fetchall()]
    if 'priority_color' not in tasks_cols:
        print("Adding priority_color to tasks...")
        cursor.execute("ALTER TABLE tasks ADD COLUMN priority_color TEXT")
    
    conn.commit()
    conn.close()
    print("Database schema fixed.")
else:
    print("Database file not found.")
