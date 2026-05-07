mod db;

use tauri::{AppHandle, Manager};
use db::{get_db_conn, init_db};
use rusqlite::params;
use serde_json::{Value, json};
use uuid::Uuid;

#[tauri::command]
async fn cgi_call(app: AppHandle, request: String, payload: Value) -> Result<Value, String> {
    let app_dir = app.path().app_data_dir().unwrap();
    let conn = get_db_conn(&app_dir).map_err(|e| e.to_string())?;

    match request.as_str() {
        "ping" => Ok(json!("pong")),
        
        "get-boards" => {
            let mut stmt = conn.prepare("SELECT * FROM boards ORDER BY last_updated DESC").map_err(|e| e.to_string())?;
            let boards_iter = stmt.query_map([], |row| {
                Ok(json!({
                    "id": row.get::<_, String>(0)?,
                    "title": row.get::<_, String>(1)?,
                    "bgGradient": row.get::<_, Option<String>>(2)?,
                    "wallpaperIndex": row.get::<_, Option<i32>>(3)?,
                    "customSettings": row.get::<_, String>(4)?,
                    "lastUpdated": row.get::<_, String>(5)?,
                    "isStarred": row.get::<_, bool>(6)?
                }))
            }).map_err(|e| e.to_string())?;
            
            let mut boards = Vec::new();
            for b in boards_iter { boards.push(b.map_err(|e| e.to_string())?); }
            Ok(json!(boards))
        }

        "get-board" => {
            let board_id = payload.get("boardId").and_then(|v| v.as_str());
            let id = match board_id {
                Some(i) => i.to_string(),
                None => conn.query_row("SELECT id FROM boards LIMIT 1", [], |row| row.get::<_, String>(0)).unwrap_or_default()
            };
            if id.is_empty() { return Ok(json!(null)); }

            let (title, bg, wallpaper, settings): (String, Option<String>, Option<i32>, String) = 
                conn.query_row("SELECT title, bg_gradient, wallpaper_index, custom_settings FROM boards WHERE id = ?", params![id], |row| {
                    Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?))
                }).map_err(|e| e.to_string())?;

            let mut stmt = conn.prepare("SELECT id, title, dot_color FROM columns WHERE board_id = ? ORDER BY position").map_err(|e| e.to_string())?;
            let cols = stmt.query_map(params![id], |row| {
                Ok(json!({ "id": row.get::<_, String>(0)?, "title": row.get::<_, String>(1)?, "dotColor": row.get::<_, Option<String>>(2)?, "taskIds": Vec::<String>::new() }))
            }).map_err(|e| e.to_string())?;

            let mut columns_map = serde_json::Map::new();
            let mut column_order = Vec::new();
            let mut col_ids = Vec::new();
            for c in cols {
                let c_val = c.map_err(|e| e.to_string())?;
                let cid = c_val["id"].as_str().unwrap().to_string();
                col_ids.push(cid.clone());
                column_order.push(json!(cid.clone()));
                columns_map.insert(cid, c_val);
            }

            let mut tasks_map = serde_json::Map::new();
            if !col_ids.is_empty() {
                let placeholders = col_ids.iter().map(|_| "?").collect::<Vec<_>>().join(",");
                let mut stmt = conn.prepare(&format!("SELECT id, column_id, content, priority_color, due_date, task_type, priority, description, tags FROM tasks WHERE column_id IN ({}) ORDER BY position", placeholders)).map_err(|e| e.to_string())?;
                let task_rows = stmt.query_map(rusqlite::params_from_iter(col_ids.iter()), |row| {
                    Ok(json!({
                        "id": row.get::<_, String>(0)?,
                        "columnId": row.get::<_, String>(1)?,
                        "content": row.get::<_, String>(2)?,
                        "priorityColor": row.get::<_, Option<String>>(3)?,
                        "dueDate": row.get::<_, Option<String>>(4)?,
                        "type": row.get::<_, String>(5)?,
                        "priority": row.get::<_, String>(6)?,
                        "description": row.get::<_, String>(7)?,
                        "tags": serde_json::from_str::<Value>(&row.get::<_, String>(8)?).unwrap_or(json!([])),
                        "checklist": json!([])
                    }))
                }).map_err(|e| e.to_string())?;

                for t in task_rows {
                    let t_val = t.map_err(|e| e.to_string())?;
                    let tid = t_val["id"].as_str().unwrap().to_string();
                    let cid = t_val["columnId"].as_str().unwrap().to_string();
                    tasks_map.insert(tid.clone(), t_val);
                    if let Some(col) = columns_map.get_mut(&cid) {
                        col["taskIds"].as_array_mut().unwrap().push(json!(tid));
                    }
                }
            }

            Ok(json!({
                "id": id,
                "title": title,
                "bgGradient": bg,
                "wallpaperIndex": wallpaper,
                "customSettings": serde_json::from_str::<Value>(&settings).unwrap_or(json!({})),
                "tasks": tasks_map,
                "columns": columns_map,
                "columnOrder": column_order
            }))
        }

        "save-setting" => {
            let key = payload.get("key").and_then(|v| v.as_str()).ok_or("Missing key")?;
            let value = payload.get("value").map(|v| v.to_string()).ok_or("Missing value")?;
            conn.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", params![key, value]).map_err(|e| e.to_string())?;
            Ok(json!(true))
        }

        "get-setting" => {
            let key = payload.get("key").and_then(|v| v.as_str()).ok_or("Missing key")?;
            let val: Option<String> = conn.query_row("SELECT value FROM settings WHERE key = ?", params![key], |row| row.get(0)).ok();
            Ok(json!(val))
        }

        "get-home-stats" => {
            let total_boards: i32 = conn.query_row("SELECT COUNT(*) FROM boards", [], |row| row.get(0)).unwrap_or(0);
            let total_tasks: i32 = conn.query_row("SELECT COUNT(*) FROM tasks", [], |row| row.get(0)).unwrap_or(0);
            let completed: i32 = conn.query_row("SELECT COUNT(*) FROM tasks t JOIN columns c ON t.column_id = c.id WHERE c.title LIKE '%Done%'", [], |row| row.get(0)).unwrap_or(0);
            
            let mut stmt = conn.prepare("SELECT t.id, t.content, b.title as board_title, b.id as board_id, t.priority_color FROM tasks t JOIN columns c ON t.column_id = c.id JOIN boards b ON c.board_id = b.id WHERE c.title NOT LIKE '%Done%' ORDER BY t.position ASC LIMIT 4").map_err(|e| e.to_string())?;
            let upcoming = stmt.query_map([], |row| {
                Ok(json!({ "id": row.get::<_, String>(0)?, "content": row.get::<_, String>(1)?, "board_title": row.get::<_, String>(2)?, "board_id": row.get::<_, String>(3)?, "priority_color": row.get::<_, Option<String>>(4)? }))
            }).map_err(|e| e.to_string())?.map(|r| r.unwrap()).collect::<Vec<_>>();

            Ok(json!({ "totalBoards": total_boards, "totalTasks": total_tasks, "completedTasks": completed, "upcomingTasks": upcoming }))
        }

        "create-board" => {
            let title = payload.get("title").and_then(|v| v.as_str()).unwrap_or("Untitled Board");
            let id = format!("board-{}", Uuid::new_v4().to_string().split('-').next().unwrap());
            conn.execute("INSERT INTO boards (id, title, bg_gradient) VALUES (?, ?, ?)", params![id, title, "from-blue-600/40 to-indigo-900/40"]).map_err(|e| e.to_string())?;
            let cols = [("To Do", "bg-blue-500", 0), ("In Progress", "bg-amber-500", 1), ("Done", "bg-emerald-500", 2)];
            for (t, c, p) in cols {
                conn.execute("INSERT INTO columns (id, board_id, title, dot_color, position) VALUES (?, ?, ?, ?, ?)", params![format!("col-{}-{}", id, p), id, t, c, p]).map_err(|e| e.to_string())?;
            }
            Ok(json!({ "id": id, "title": title }))
        }

        "add-task" => {
            conn.execute("INSERT INTO tasks (id, column_id, content, priority_color, position) VALUES (?, ?, ?, ?, ?)", 
                params![payload["id"].as_str().unwrap(), payload["columnId"].as_str().unwrap(), payload["content"].as_str().unwrap(), payload["priorityColor"].as_str().unwrap(), payload["position"].as_i64().unwrap()]).map_err(|e| e.to_string())?;
            Ok(json!(true))
        }

        "update-task" => {
            conn.execute("UPDATE tasks SET content = ?, priority_color = ? WHERE id = ?", params![payload["content"].as_str().unwrap(), payload["priorityColor"].as_str().unwrap(), payload["id"].as_str().unwrap()]).map_err(|e| e.to_string())?;
            Ok(json!(true))
        }

        "delete-task" => {
            conn.execute("DELETE FROM tasks WHERE id = ?", params![payload["taskId"].as_str().unwrap()]).map_err(|e| e.to_string())?;
            Ok(json!(true))
        }

        "update-task-pos" => {
            conn.execute("UPDATE tasks SET column_id = ?, position = ? WHERE id = ?", params![payload["columnId"].as_str().unwrap(), payload["position"].as_i64().unwrap(), payload["taskId"].as_str().unwrap()]).map_err(|e| e.to_string())?;
            Ok(json!(true))
        }

        _ => Err(format!("Unknown request: {}", request))
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let app_dir = app.path().app_data_dir().unwrap();
            init_db(&app_dir).expect("Failed to initialize database");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![cgi_call])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
