use rusqlite::{params, Connection, Result};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::fs;

#[derive(Serialize, Deserialize, Debug)]
pub struct Board {
    pub id: String,
    pub title: String,
    pub bg_gradient: Option<String>,
    pub wallpaper_index: Option<i32>,
    pub custom_settings: String,
    pub last_updated: String,
    pub is_starred: bool,
}

pub fn init_db(app_dir: &PathBuf) -> Result<()> {
    if !app_dir.exists() {
        fs::create_dir_all(app_dir).unwrap();
    }
    let db_path = app_dir.join("trilo.db");
    let conn = Connection::open(db_path)?;

    // Settings table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        )",
        [],
    )?;

    // Boards table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS boards (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            bg_gradient TEXT,
            wallpaper_index INTEGER DEFAULT NULL,
            custom_settings TEXT DEFAULT '{}',
            last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
            is_starred BOOLEAN DEFAULT 0
        )",
        [],
    )?;

    // Columns table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS columns (
            id TEXT PRIMARY KEY,
            board_id TEXT,
            title TEXT NOT NULL,
            dot_color TEXT,
            position INTEGER,
            FOREIGN KEY(board_id) REFERENCES boards(id)
        )",
        [],
    )?;

    // Tasks table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS tasks (
            id TEXT PRIMARY KEY,
            column_id TEXT,
            content TEXT NOT NULL,
            priority_color TEXT,
            position INTEGER,
            due_date TEXT,
            task_type TEXT DEFAULT 'task',
            priority TEXT DEFAULT 'medium',
            description TEXT DEFAULT '',
            tags TEXT DEFAULT '[]',
            FOREIGN KEY(column_id) REFERENCES columns(id)
        )",
        [],
    )?;

    // Checklists table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS task_checklists (
            id TEXT PRIMARY KEY,
            task_id TEXT,
            content TEXT NOT NULL,
            is_completed BOOLEAN DEFAULT 0,
            position INTEGER,
            FOREIGN KEY(task_id) REFERENCES tasks(id)
        )",
        [],
    )?;

    // Initial data
    let count: i32 = conn.query_row("SELECT COUNT(*) FROM boards", [], |row| row.get(0))?;
    if count == 0 {
        let board_id = "board-default";
        conn.execute(
            "INSERT INTO boards (id, title, bg_gradient) VALUES (?, ?, ?)",
            params![board_id, "Trilo Core Development", "from-blue-600/40 to-indigo-900/40"],
        )?;

        let initial_cols = [
            ("col-1", board_id, "Done", "bg-emerald-500", 0),
            ("col-2", board_id, "Current Task", "bg-amber-500", 1),
            ("col-3", board_id, "Awaiting", "bg-red-500", 2),
            ("col-4", board_id, "Unable To add", "bg-gray-400", 3),
        ];

        for col in initial_cols {
            conn.execute(
                "INSERT INTO columns (id, board_id, title, dot_color, position) VALUES (?, ?, ?, ?, ?)",
                params![col.0, col.1, col.2, col.3, col.4],
            )?;
        }

        let initial_tasks = [
            ("task-1", "col-1", "Project Naming & Branding", "bg-red-500", 0),
            ("task-2", "col-1", "Launch the app Successfully", "bg-green-500", 1),
            ("task-3", "col-1", "Board Architecture", "bg-green-500", 2),
            ("task-4", "col-2", "UI Tuning", "bg-emerald-500", 0),
            ("task-5", "col-3", "Add AI Features", "bg-red-500", 0),
            ("task-6", "col-3", "flexibility", "bg-orange-500", 1),
        ];

        for task in initial_tasks {
            conn.execute(
                "INSERT INTO tasks (id, column_id, content, priority_color, position) VALUES (?, ?, ?, ?, ?)",
                params![task.0, task.1, task.2, task.3, task.4],
            )?;
        }
    }

    Ok(())
}

pub fn get_db_conn(app_dir: &PathBuf) -> Result<Connection> {
    let db_path = app_dir.join("trilo.db");
    Connection::open(db_path)
}
