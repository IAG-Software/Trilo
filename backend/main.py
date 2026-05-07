import sys
import os
import json
import sqlite3
from neutralino_adapter import NeutralinoConnection

# Initialize SQLite Database
DB_PATH = os.path.join(os.path.dirname(__file__), "trilo.db")

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Settings table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
    )
    ''')

    # Boards table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS boards (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        bg_gradient TEXT,
        wallpaper_index INTEGER DEFAULT NULL,
        custom_settings TEXT DEFAULT '{}',
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_starred BOOLEAN DEFAULT 0
    )
    ''')

    # Columns table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS columns (
        id TEXT PRIMARY KEY,
        board_id TEXT,
        title TEXT NOT NULL,
        dot_color TEXT,
        position INTEGER,
        FOREIGN KEY(board_id) REFERENCES boards(id)
    )
    ''')
    
    # Migration: add board_id to columns if it doesn't exist
    cursor.execute("PRAGMA table_info(columns)")
    col_info = cursor.fetchall()
    col_names = [info[1] for info in col_info]
    if 'board_id' not in col_names:
        cursor.execute("ALTER TABLE columns ADD COLUMN board_id TEXT")
    
    # Migration: add wallpaper_index to boards if it doesn't exist
    cursor.execute("PRAGMA table_info(boards)")
    board_col_info = cursor.fetchall()
    board_col_names = [info[1] for info in board_col_info]
    if 'wallpaper_index' not in board_col_names:
        cursor.execute("ALTER TABLE boards ADD COLUMN wallpaper_index INTEGER DEFAULT NULL")
    if 'custom_settings' not in board_col_names:
        cursor.execute("ALTER TABLE boards ADD COLUMN custom_settings TEXT DEFAULT '{}'")
    
    conn.commit()

    # Tasks table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        column_id TEXT,
        content TEXT NOT NULL,
        priority_color TEXT,
        position INTEGER,
        due_date TEXT,
        task_type TEXT DEFAULT 'task',
        priority TEXT DEFAULT 'medium',
        FOREIGN KEY(column_id) REFERENCES columns(id)
    )
    ''')
    
    # Migration: add new columns if they don't exist
    cursor.execute("PRAGMA table_info(tasks)")
    task_col_info = cursor.fetchall()
    task_col_names = [info[1] for info in task_col_info]
    
    if 'due_date' not in task_col_names:
        cursor.execute("ALTER TABLE tasks ADD COLUMN due_date TEXT")
    if 'task_type' not in task_col_names:
        cursor.execute("ALTER TABLE tasks ADD COLUMN task_type TEXT DEFAULT 'task'")
    if 'priority' not in task_col_names:
        cursor.execute("ALTER TABLE tasks ADD COLUMN priority TEXT DEFAULT 'medium'")
    if 'description' not in task_col_names:
        cursor.execute("ALTER TABLE tasks ADD COLUMN description TEXT DEFAULT ''")
    if 'tags' not in task_col_names:
        cursor.execute("ALTER TABLE tasks ADD COLUMN tags TEXT DEFAULT '[]'")
    
    if any(col not in task_col_names for col in ['due_date', 'task_type', 'priority', 'description', 'tags']):
        conn.commit()

    # Checklists table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS task_checklists (
        id TEXT PRIMARY KEY,
        task_id TEXT,
        content TEXT NOT NULL,
        is_completed BOOLEAN DEFAULT 0,
        position INTEGER,
        FOREIGN KEY(task_id) REFERENCES tasks(id)
    )
    ''')
    conn.commit()

    # Check if data exists - Removed demo data initialization for production-ready state
    pass
        
    conn.commit()
    conn.close()

init_db()

connection = NeutralinoConnection()

@connection.on("ping")
def ping(data):
    return "pong"

@connection.on("get-boards")
def get_boards(data):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM boards ORDER BY last_updated DESC")
    boards = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return boards

@connection.on("create-board")
def create_board(data):
    # data: {id, title, bgGradient}
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    board_id = data.get("id", f"board-{os.urandom(4).hex()}")
    title = data.get("title", "Untitled Board")
    bg = data.get("bgGradient", "from-blue-600/40 to-indigo-900/40")
    
    cursor.execute("INSERT INTO boards (id, title, bg_gradient, wallpaper_index, custom_settings) VALUES (?, ?, ?, ?, ?)", 
                   (board_id, title, bg, data.get("wallpaperIndex"), data.get("customSettings", "{}")))
    
    # Add default columns for new board
    initial_cols = [
        (f"col-{board_id}-1", board_id, 'To Do', 'bg-blue-500', 0),
        (f"col-{board_id}-2", board_id, 'In Progress', 'bg-amber-500', 1),
        (f"col-{board_id}-3", board_id, 'Done', 'bg-emerald-500', 2)
    ]
    cursor.executemany("INSERT INTO columns (id, board_id, title, dot_color, position) VALUES (?, ?, ?, ?, ?)", initial_cols)
    
    conn.commit()
    conn.close()
    return {"id": board_id, "title": title}

@connection.on("get-board")
def get_board(data):
    board_id = data.get("boardId")
    if not board_id:
        # Try to get the first board if none specified
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM boards LIMIT 1")
        row = cursor.fetchone()
        conn.close()
        if row:
            board_id = row[0]
        else:
            return None

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Fetch board info
    cursor.execute("SELECT * FROM boards WHERE id = ?", (board_id,))
    board_info = dict(cursor.fetchone()) if cursor.rowcount != 0 else {}
    
    # Fetch columns
    cursor.execute("SELECT * FROM columns WHERE board_id = ? ORDER BY position", (board_id,))
    columns_raw = [dict(row) for row in cursor.fetchall()]
    
    # Fetch tasks
    col_ids = [c["id"] for c in columns_raw]
    if not col_ids:
        board_data = {
            "id": board_id,
            "title": board_info.get("title", "Unknown"),
            "tasks": {},
            "columns": {},
            "columnOrder": []
        }
        conn.close()
        return board_data

    placeholders = ', '.join(['?'] * len(col_ids))
    cursor.execute(f"SELECT * FROM tasks WHERE column_id IN ({placeholders}) ORDER BY position", col_ids)
    tasks_raw = [dict(row) for row in cursor.fetchall()]
    
    # Reconstruct board data structure
    board_data = {
        "id": board_id,
        "title": board_info.get("title", "Unknown"),
        "tasks": {t["id"]: {
            "id": t["id"], 
            "content": t["content"], 
            "priorityColor": t["priority_color"],
            "dueDate": t["due_date"],
            "type": t["task_type"],
            "priority": t["priority"],
            "description": t["description"],
            "tags": json.loads(t["tags"]) if t["tags"] else []
        } for t in tasks_raw},
        "columns": {},
        "columnOrder": [c["id"] for c in columns_raw]
    }
    
    for c in columns_raw:
        board_data["columns"][c["id"]] = {
            "id": c["id"],
            "title": c["title"],
            "dotColor": c["dot_color"],
            "taskIds": [t["id"] for t in tasks_raw if t["column_id"] == c["id"]]
        }
    
    # Fetch checklists for all tasks
    task_ids = list(board_data["tasks"].keys())
    if task_ids:
        placeholders = ', '.join(['?'] * len(task_ids))
        cursor.execute(f"SELECT * FROM task_checklists WHERE task_id IN ({placeholders}) ORDER BY position", task_ids)
        checklists_raw = [dict(row) for row in cursor.fetchall()]
        
        for task_id in task_ids:
            board_data["tasks"][task_id]["checklist"] = [
                {"id": item["id"], "content": item["content"], "isCompleted": bool(item["is_completed"])}
                for item in checklists_raw if item["task_id"] == task_id
            ]
    else:
        for task_id in board_data["tasks"]:
            board_data["tasks"][task_id]["checklist"] = []
    
    board_data["wallpaperIndex"] = board_info.get("wallpaper_index")
    try:
        board_data["customSettings"] = json.loads(board_info.get("custom_settings", "{}"))
    except:
        board_data["customSettings"] = {}
        
    conn.close()
    return board_data

@connection.on("update-task-pos")
def update_task_pos(data):
    # data format: {taskId, columnId, position}
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("UPDATE tasks SET column_id = ?, position = ? WHERE id = ?", 
                   (data["columnId"], data["position"], data["taskId"]))
    conn.commit()
    conn.close()
    return True

@connection.on("update-column-pos")
def update_column_pos(data):
    # data: {columnId, position}
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("UPDATE columns SET position = ? WHERE id = ?", (data["position"], data["columnId"]))
    conn.commit()
    conn.close()
    return True
@connection.on("add-task")
def add_task(data):
    # data: {id, columnId, content, priorityColor, position}
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("INSERT INTO tasks (id, column_id, content, priority_color, position, due_date, task_type, priority, description, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                   (data["id"], data["columnId"], data["content"], data["priorityColor"], data["position"], data.get("dueDate"), data.get("type", "task"), data.get("priority", "medium"), data.get("description", ""), json.dumps(data.get("tags", []))))
    conn.commit()
    conn.close()
    return True

@connection.on("delete-task")
def delete_task(data):
    # data: {taskId}
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM tasks WHERE id = ?", (data["taskId"],))
    conn.commit()
    conn.close()
    return True

@connection.on("update-task")
def update_task(data):
    # data: {id, content, priorityColor}
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("UPDATE tasks SET content = ?, priority_color = ?, due_date = ?, task_type = ?, priority = ?, description = ?, tags = ? WHERE id = ?",
                   (data["content"], data["priorityColor"], data.get("dueDate"), data.get("type"), data.get("priority"), data.get("description"), json.dumps(data.get("tags", [])), data["id"]))
    conn.commit()
    conn.close()
    return True

@connection.on("add-checklist-item")
def add_checklist_item(data):
    # data: {id, taskId, content, position}
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("INSERT INTO task_checklists (id, task_id, content, position) VALUES (?, ?, ?, ?)",
                   (data["id"], data["taskId"], data["content"], data["position"]))
    conn.commit()
    conn.close()
    return True

@connection.on("update-checklist-item")
def update_checklist_item(data):
    # data: {id, content, isCompleted}
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    if "content" in data and "isCompleted" in data:
        cursor.execute("UPDATE task_checklists SET content = ?, is_completed = ? WHERE id = ?", 
                       (data["content"], 1 if data["isCompleted"] else 0, data["id"]))
    elif "content" in data:
        cursor.execute("UPDATE task_checklists SET content = ? WHERE id = ?", (data["content"], data["id"]))
    elif "isCompleted" in data:
        cursor.execute("UPDATE task_checklists SET is_completed = ? WHERE id = ?", (1 if data["isCompleted"] else 0, data["id"]))
    conn.commit()
    conn.close()
    return True

@connection.on("delete-checklist-item")
def delete_checklist_item(data):
    # data: {id}
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM task_checklists WHERE id = ?", (data["id"],))
    conn.commit()
    conn.close()
    return True

@connection.on("add-column")
def add_column(data):
    # data: {id, boardId, title, dotColor, position}
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("INSERT INTO columns (id, board_id, title, dot_color, position) VALUES (?, ?, ?, ?, ?)",
                   (data["id"], data["boardId"], data["title"], data["dotColor"], data["position"]))
    conn.commit()
    conn.close()
    return True

@connection.on("update-column")
def update_column(data):
    # data: {id, title, dotColor}
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    if "dotColor" in data:
        cursor.execute("UPDATE columns SET title = ?, dot_color = ? WHERE id = ?", (data["title"], data["dotColor"], data["id"]))
    else:
        cursor.execute("UPDATE columns SET title = ? WHERE id = ?", (data["title"], data["id"]))
    conn.commit()
    conn.close()
    return True

@connection.on("delete-column")
def delete_column(data):
    # data: {columnId}
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    # Delete tasks in this column first
    cursor.execute("DELETE FROM tasks WHERE column_id = ?", (data["columnId"],))
    # Delete the column
    cursor.execute("DELETE FROM columns WHERE id = ?", (data["columnId"],))
    conn.commit()
    conn.close()
    return True

@connection.on("delete-board")
def delete_board(data):
    # data: {boardId}
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    # Delete tasks first
    cursor.execute("""
        DELETE FROM tasks WHERE column_id IN (
            SELECT id FROM columns WHERE board_id = ?
        )
    """, (data["boardId"],))
    # Delete columns
    cursor.execute("DELETE FROM columns WHERE board_id = ?", (data["boardId"],))
    # Delete board
    cursor.execute("DELETE FROM boards WHERE id = ?", (data["boardId"],))
    conn.commit()
    conn.close()
    return True
@connection.on("update-board-settings")
def update_board_settings(data):
    # data: {boardId, settings}
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # We can update title as well if provided in settings or separately
    if "title" in data:
        cursor.execute("UPDATE boards SET title = ?, custom_settings = ?, last_updated = CURRENT_TIMESTAMP WHERE id = ?", 
                       (data["title"], json.dumps(data["settings"]), data["boardId"]))
    else:
        cursor.execute("UPDATE boards SET custom_settings = ?, last_updated = CURRENT_TIMESTAMP WHERE id = ?", 
                       (json.dumps(data["settings"]), data["boardId"]))
    
    conn.commit()
    conn.close()
    return True

@connection.on("update-board-wallpaper")
def update_board_wallpaper(data):
    # data: {boardId, wallpaperIndex}
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("UPDATE boards SET wallpaper_index = ? WHERE id = ?", (data["wallpaperIndex"], data["boardId"]))
    conn.commit()
    conn.close()
    return True

@connection.on("update-board-starred")
def update_board_starred(data):
    # data: {boardId, isStarred}
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("UPDATE boards SET is_starred = ? WHERE id = ?", (1 if data["isStarred"] else 0, data["boardId"]))
    conn.commit()
    conn.close()
    return True

@connection.on("reset-db")
def reset_db(data):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("DROP TABLE IF EXISTS tasks")
    cursor.execute("DROP TABLE IF EXISTS columns")
    cursor.execute("DROP TABLE IF EXISTS boards")
    cursor.execute("DROP TABLE IF EXISTS settings")
    conn.commit()
    conn.close()
    init_db() # Re-initialize tables
    return True
@connection.on("ai-generate-tasks")
def ai_generate_tasks(data):
    # Mock AI response for specific column
    col_name = data.get("columnName", "Tasks")
    return [
        {"id": f"ai-{os.urandom(4).hex()}", "content": f"AI Suggested: Optimize {col_name} flow", "priorityColor": "bg-blue-500"},
        {"id": f"ai-{os.urandom(4).hex()}", "content": f"AI Suggested: Automated review of {col_name}", "priorityColor": "bg-purple-500"}
    ]

@connection.on("save-setting")
def save_setting(data):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", (data["key"], str(data["value"])))
    conn.commit()
    conn.close()
    return True

@connection.on("get-setting")
def get_setting(data):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT value FROM settings WHERE key = ?", (data["key"],))
    row = cursor.fetchone()
    conn.close()
    return row[0] if row else None

@connection.on("get-home-stats")
def get_home_stats(data):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Total Boards
    cursor.execute("SELECT COUNT(*) FROM boards")
    total_boards = cursor.fetchone()[0]
    
    # Total Tasks
    cursor.execute("SELECT COUNT(*) FROM tasks")
    total_tasks = cursor.fetchone()[0]
    
    # Recently Added Tasks
    cursor.execute("""
        SELECT t.*, b.title as board_title 
        FROM tasks t
        JOIN columns c ON t.column_id = c.id
        JOIN boards b ON c.board_id = b.id
        ORDER BY t.id DESC LIMIT 5
    """)
    recent_tasks = [dict(row) for row in cursor.fetchall()]
    
    # Upcoming/Active Tasks (from columns not named 'Done')
    cursor.execute("""
        SELECT t.*, b.title as board_title, b.id as board_id
        FROM tasks t
        JOIN columns c ON t.column_id = c.id
        JOIN boards b ON c.board_id = b.id
        WHERE c.title NOT LIKE '%Done%'
        ORDER BY t.position ASC LIMIT 4
    """)
    upcoming_tasks = [dict(row) for row in cursor.fetchall()]
    
    # Progress: Completed vs Total
    cursor.execute("""
        SELECT COUNT(*) FROM tasks t
        JOIN columns c ON t.column_id = c.id
        WHERE c.title LIKE '%Done%'
    """)
    completed_tasks = cursor.fetchone()[0]
    
    conn.close()
    return {
        "totalBoards": total_boards,
        "totalTasks": total_tasks,
        "completedTasks": completed_tasks,
        "recentTasks": recent_tasks,
        "upcomingTasks": upcoming_tasks
    }

@connection.on("get-planner-tasks")
def get_planner_tasks(data):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    # Fetch all tasks that have a due date
    cursor.execute("SELECT * FROM tasks WHERE due_date IS NOT NULL ORDER BY due_date ASC")
    tasks = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return tasks

@connection.on("global-search")
def global_search(data):
    query = data.get("query", "").strip()
    if not query:
        return {"boards": [], "tasks": [], "settings": []}
    
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Search Boards
    cursor.execute("SELECT * FROM boards WHERE title LIKE ? LIMIT 5", (f"%{query}%",))
    boards = [dict(row) for row in cursor.fetchall()]

    # Search Columns (return the board they belong to)
    cursor.execute("""
        SELECT b.*, c.title as column_name 
        FROM columns c 
        JOIN boards b ON c.board_id = b.id 
        WHERE c.title LIKE ? LIMIT 5
    """, (f"%{query}%",))
    col_boards = [dict(row) for row in cursor.fetchall()]
    
    # Merge column results into boards if not already there
    existing_board_ids = [b["id"] for b in boards]
    for cb in col_boards:
        if cb["id"] not in existing_board_ids:
            boards.append(cb)
    
    # Search Tasks (including those with due dates for "calendar stuff")
    cursor.execute("""
        SELECT t.*, b.title as board_title, b.id as board_id
        FROM tasks t
        JOIN columns c ON t.column_id = c.id
        JOIN boards b ON c.board_id = b.id
        WHERE t.content LIKE ? OR t.priority LIKE ?
        ORDER BY t.priority DESC, t.due_date ASC
        LIMIT 15
    """, (f"%{query}%", f"%{query}%"))
    tasks = [dict(row) for row in cursor.fetchall()]
    
    conn.close()
    
    # Expanded Command/Action results
    commands = [
        {"id": "nav-planner", "title": "Open Planner / Calendar", "category": "Navigation", "icon": "Calendar"},
        {"id": "nav-inbox", "title": "View Inbox & Activity", "category": "Navigation", "icon": "Bell"},
        {"id": "nav-home", "title": "Go to Home Dashboard", "category": "Navigation", "icon": "Layout"},
        {"id": "nav-gallery", "title": "View Board Gallery", "category": "Navigation", "icon": "Grid"},
        {"id": "act-create-board", "title": "Create New Board", "category": "Action", "icon": "Plus"},
        {"id": "set-profile", "title": "Edit User Profile", "category": "Settings", "icon": "User"},
        {"id": "set-theme", "title": "Change Background & Theme", "category": "Settings", "icon": "Sparkles"},
        {"id": "act-reset", "title": "Reset Application Data", "category": "Danger Zone", "icon": "Trash2"},
    ]
    filtered_commands = [c for c in commands if query.lower() in c["title"].lower() or query.lower() in c["category"].lower()]
    
    return {
        "boards": boards,
        "tasks": tasks,
        "settings": filtered_commands
    }

connection.listen()
