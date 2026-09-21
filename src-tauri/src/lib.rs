use std::net::TcpStream;
use std::process::{Child, Command};
use std::sync::Mutex;
use std::time::Duration;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

const CREATE_NO_WINDOW: u32 = 0x08000000;

static SERVER_CHILD: Mutex<Option<Child>> = Mutex::new(None);

fn is_server_running() -> bool {
    if let Ok(addr) = "127.0.0.1:4000".parse() {
        TcpStream::connect_timeout(&addr, Duration::from_millis(300)).is_ok()
    } else {
        false
    }
}

fn strip_unc_prefix(path: &std::path::Path) -> std::path::PathBuf {
    let s = path.to_string_lossy();
    if let Some(stripped) = s.strip_prefix(r"\\?\") {
        std::path::PathBuf::from(stripped)
    } else {
        path.to_path_buf()
    }
}

fn find_server_binary() -> Option<std::path::PathBuf> {
    let mut candidates = Vec::new();

    // 1. Check relative to current executable directory (installed app or portable dist)
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(dir) = exe_path.parent() {
            candidates.push(dir.join("archly-server.exe"));
            candidates.push(dir.join("bin").join("archly-server.exe"));
            candidates.push(dir.join("resources").join("archly-server.exe"));
            candidates.push(dir.join("resources").join("bin").join("archly-server.exe"));
            if let Some(parent) = dir.parent() {
                candidates.push(parent.join("archly-server.exe"));
                candidates.push(parent.join("bin").join("archly-server.exe"));
            }
        }
    }

    // 2. Check relative to working directory
    if let Ok(cwd) = std::env::current_dir() {
        candidates.push(cwd.join("archly-server.exe"));
        candidates.push(cwd.join("bin").join("archly-server.exe"));
        candidates.push(cwd.join("src-tauri").join("bin").join("archly-server.exe"));
        candidates.push(cwd.join("../src-tauri").join("bin").join("archly-server.exe"));
        candidates.push(cwd.join("dist-desktop").join("archly-server.exe"));
    }

    for path in candidates {
        if path.exists() {
            if let Ok(canonical) = path.canonicalize() {
                return Some(strip_unc_prefix(&canonical));
            }
            return Some(path);
        }
    }
    None
}

fn find_server_script() -> Option<(std::path::PathBuf, std::path::PathBuf)> {
    let mut candidates = Vec::new();

    // 1. Check relative to current working directory
    if let Ok(cwd) = std::env::current_dir() {
        candidates.push(cwd.join("apps/server/dist/server.js"));
        candidates.push(cwd.join("../apps/server/dist/server.js"));
        candidates.push(cwd.join("../../apps/server/dist/server.js"));
    }

    // 2. Check relative to current executable directory
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(mut dir) = exe_path.parent() {
            for _ in 0..5 {
                candidates.push(dir.join("apps/server/dist/server.js"));
                candidates.push(dir.join("server/dist/server.js"));
                candidates.push(dir.join("resources/server/dist/server.js"));
                if let Some(parent) = dir.parent() {
                    dir = parent;
                } else {
                    break;
                }
            }
        }
    }

    // 3. Fallbacks
    candidates.push(std::path::PathBuf::from("apps/server/dist/server.js"));
    candidates.push(std::path::PathBuf::from("../apps/server/dist/server.js"));

    for path in candidates {
        if path.exists() {
            if let Ok(canonical) = path.canonicalize() {
                let clean_canonical = strip_unc_prefix(&canonical);
                let server_dir = clean_canonical
                    .parent()
                    .and_then(|p| p.parent())
                    .map(|p| p.to_path_buf())
                    .unwrap_or_else(|| clean_canonical.parent().unwrap_or(&clean_canonical).to_path_buf());

                return Some((clean_canonical, server_dir));
            }
        }
    }
    None
}

fn get_runtime_environment() -> (std::path::PathBuf, std::path::PathBuf) {
    // If running in development repo, use repo storage and db
    if let Ok(cwd) = std::env::current_dir() {
        let repo_db = cwd.join("apps").join("server").join("prisma").join("dev.db");
        if repo_db.exists() {
            let repo_storage = cwd.join("apps").join("server").join("storage");
            let _ = std::fs::create_dir_all(&repo_storage);
            return (repo_db, repo_storage);
        }
    }

    // Otherwise use Windows LocalAppData for installed desktop app
    let app_dir = if let Ok(local) = std::env::var("LOCALAPPDATA") {
        std::path::PathBuf::from(local).join("Archly")
    } else if let Ok(roaming) = std::env::var("APPDATA") {
        std::path::PathBuf::from(roaming).join("Archly")
    } else {
        std::path::PathBuf::from(".").join(".archly")
    };

    let data_dir = app_dir.join("data");
    let storage_dir = app_dir.join("storage");
    let _ = std::fs::create_dir_all(&data_dir);
    let _ = std::fs::create_dir_all(&storage_dir);

    let db_path = data_dir.join("dev.db");
    if !db_path.exists() {
        let mut template_candidates = Vec::new();
        if let Ok(exe_path) = std::env::current_exe() {
            if let Some(dir) = exe_path.parent() {
                template_candidates.push(dir.join("prisma").join("dev.db"));
                template_candidates.push(dir.join("dev.db"));
                template_candidates.push(dir.join("bin").join("dev.db"));
                template_candidates.push(dir.join("resources").join("prisma").join("dev.db"));
                template_candidates.push(dir.join("resources").join("dev.db"));
            }
        }
        if let Ok(cwd) = std::env::current_dir() {
            template_candidates.push(cwd.join("src-tauri").join("bin").join("dev.db"));
            template_candidates.push(cwd.join("apps").join("server").join("prisma").join("dev.db"));
        }

        for t in template_candidates {
            if t.exists() {
                let _ = std::fs::copy(&t, &db_path);
                println!("[Tauri] Initialized database from template: {:?}", t);
                break;
            }
        }
    }

    (db_path, storage_dir)
}

fn wait_for_server_ready() {
    for _ in 0..50 {
        if is_server_running() {
            println!("[Tauri] Backend API server confirmed ready on port 4000.");
            return;
        }
        std::thread::sleep(Duration::from_millis(100));
    }
    eprintln!("[Tauri] Warning: Backend server did not respond on port 4000 within 5 seconds.");
}

fn ensure_backend_server() {
    if is_server_running() {
        println!("[Tauri] Backend API server is already running on port 4000.");
        return;
    }

    let (db_path, storage_dir) = get_runtime_environment();
    println!("[Tauri] Using SQLite DB: {:?}", db_path);
    println!("[Tauri] Using Storage: {:?}", storage_dir);

    // 1. Try standalone server binary first
    if let Some(bin_path) = find_server_binary() {
        println!("[Tauri] Spawning standalone backend server binary: {:?}", bin_path);
        let parent_dir = bin_path.parent().unwrap_or(&bin_path);

        let mut cmd = Command::new(&bin_path);
        #[cfg(target_os = "windows")]
        cmd.creation_flags(CREATE_NO_WINDOW);

        cmd.current_dir(parent_dir)
            .env("PORT", "4000")
            .env("STORAGE_DIR", storage_dir.to_string_lossy().to_string())
            .env(
                "DATABASE_URL",
                format!("file:{}", db_path.to_string_lossy().replace('\\', "/")),
            );

        match cmd.spawn() {
            Ok(c) => {
                let mut lock = SERVER_CHILD.lock().unwrap();
                *lock = Some(c);
                wait_for_server_ready();
                return;
            }
            Err(e) => {
                eprintln!("[Tauri] Failed to spawn standalone backend binary: {:?}", e);
            }
        }
    }

    // 2. Fallback to Node.js server script (dev mode)
    if let Some((script_path, server_dir)) = find_server_script() {
        println!(
            "[Tauri] Spawning Node.js backend server: {:?}, dir: {:?}",
            script_path, server_dir
        );

        let mut cmd = Command::new("node");
        #[cfg(target_os = "windows")]
        cmd.creation_flags(CREATE_NO_WINDOW);

        cmd.current_dir(&server_dir)
            .arg(&script_path)
            .env("PORT", "4000")
            .env("STORAGE_DIR", storage_dir.to_string_lossy().to_string())
            .env(
                "DATABASE_URL",
                format!("file:{}", db_path.to_string_lossy().replace('\\', "/")),
            );

        match cmd.spawn() {
            Ok(c) => {
                let mut lock = SERVER_CHILD.lock().unwrap();
                *lock = Some(c);
                wait_for_server_ready();
                return;
            }
            Err(e) => {
                eprintln!("[Tauri] Failed to spawn Node backend server: {:?}", e);
            }
        }
    }

    eprintln!("[Tauri] Neither standalone server binary nor Node server script was found.");
}

fn cleanup_backend_server() {
    let mut lock = SERVER_CHILD.lock().unwrap();
    if let Some(mut child) = lock.take() {
        println!("[Tauri] Terminating internal backend server...");
        #[cfg(target_os = "windows")]
        {
            let mut kill_cmd = Command::new("taskkill");
            kill_cmd.args(["/F", "/T", "/PID", &child.id().to_string()]);
            kill_cmd.creation_flags(CREATE_NO_WINDOW);
            let _ = kill_cmd.output();
        }
        let _ = child.kill();
    }
}

#[tauri::command]
async fn save_file_with_dialog(
    default_filename: String,
    bytes: Vec<u8>,
) -> Result<Option<String>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let ext = std::path::Path::new(&default_filename)
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("")
            .to_string();

        let mut dialog = rfd::FileDialog::new().set_file_name(&default_filename);
        if !ext.is_empty() {
            let label = format!("{} Files (*.{})", ext.to_uppercase(), ext);
            dialog = dialog.add_filter(&label, &[&ext]);
        }
        dialog = dialog.add_filter("All Files (*.*)", &["*"]);

        if let Some(dest_path) = dialog.save_file() {
            if let Err(e) = std::fs::write(&dest_path, &bytes) {
                return Err(format!("Failed to write file to {:?}: {}", dest_path, e));
            }
            return Ok(Some(dest_path.to_string_lossy().to_string()));
        }
        Ok(None)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn save_text_file_with_dialog(
    default_filename: String,
    content: String,
) -> Result<Option<String>, String> {
    save_file_with_dialog(default_filename, content.into_bytes()).await
}

#[tauri::command]
fn open_external_url(url: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        let mut cmd = Command::new("cmd");
        cmd.creation_flags(CREATE_NO_WINDOW);
        cmd.args(["/C", "start", "", &url]);
        cmd.spawn().map_err(|e| e.to_string())?;
        Ok(())
    }
    #[cfg(target_os = "macos")]
    {
        Command::new("open").arg(&url).spawn().map_err(|e| e.to_string())?;
        Ok(())
    }
    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open").arg(&url).spawn().map_err(|e| e.to_string())?;
        Ok(())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    ensure_backend_server();

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            save_file_with_dialog,
            save_text_file_with_dialog,
            open_external_url
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .on_window_event(|_window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                cleanup_backend_server();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
