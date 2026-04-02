// Storage module - comprehensive file and data management
//
// This module is split into sub-modules for maintainability:
//   - recent:             Recently accessed files tracking
//   - bookmarks:          Bookmark/favorites management
//   - tags:               File tags & hierarchical tag categories
//   - notes:              File notes & file annotations
//   - metadata:           Custom metadata fields

mod bookmarks;
mod metadata;
mod notes;
mod recent;
mod tags;

// Re-export everything so downstream code using `crate::storage::*` keeps working.
pub use bookmarks::*;
pub use metadata::*;
pub use notes::*;
pub use recent::*;
pub use tags::*;

use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::sync::{LazyLock, Mutex};

// ─── Password hashing utilities ─────────────────────────────────────────────

const PASSWORD_SALT: &str = "sortila_v1_salt_2026";

/// Hash a password using SHA-256 with a fixed salt.
/// Returns a hex-encoded hash string.
pub fn hash_password(password: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(PASSWORD_SALT.as_bytes());
    hasher.update(password.as_bytes());
    let result = hasher.finalize();
    format!("{:x}", result)
}

/// Verify a plaintext password against a stored hash.
pub fn verify_password(password: &str, stored_hash: &str) -> bool {
    hash_password(password) == stored_hash
}

// ─── Shared helper ───────────────────────────────────────────────────────────

pub(crate) fn generate_id() -> String {
    format!("{}", chrono::Utc::now().timestamp_millis())
}

// ─── Core types ──────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct User {
    pub id: i32,
    pub username: String,
    /// Stored as a salted SHA-256 hex digest. Use `hash_password()` / `verify_password()`.
    pub password_hash: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileRecord {
    pub id: i32,
    pub name: String,
    pub path: String,
    pub file_type: String,
    pub size: Option<u64>,
    pub mime_type: Option<String>,
    pub parent_id: Option<i32>,
    pub user_id: i32,
    pub tags: Vec<String>,
    pub color: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub is_hidden: bool,
    pub permissions: String,
    pub content: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UserSettings {
    pub id: i32,
    pub user_id: i32,
    pub theme: String,
    pub view_mode: String,
    pub show_hidden_files: bool,
    pub auto_save: bool,
    pub language: String,
    pub created_at: String,
    pub updated_at: String,
}

// ─── Storage struct & impl ───────────────────────────────────────────────────

pub struct Storage {
    users: HashMap<i32, User>,
    files: HashMap<i32, FileRecord>,
    user_settings: HashMap<i32, UserSettings>,

    current_file_id: i32,
}

impl Default for Storage {
    fn default() -> Self {
        Self::new()
    }
}

impl Storage {
    pub fn new() -> Self {
        let mut storage = Self {
            users: HashMap::new(),
            files: HashMap::new(),
            user_settings: HashMap::new(),
            current_file_id: 1,
        };
        storage.seed_data();
        storage
    }

    fn seed_data(&mut self) {
        // Create default user with properly hashed password
        let default_user = User {
            id: 1,
            username: "user".to_string(),
            password_hash: hash_password("password"),
        };
        self.users.insert(1, default_user);

        // Create default user settings
        let default_settings = UserSettings {
            id: 1,
            user_id: 1,
            theme: "dark".to_string(),
            view_mode: "grid".to_string(),
            show_hidden_files: false,
            auto_save: true,
            language: "en".to_string(),
            created_at: chrono::Utc::now().to_rfc3339(),
            updated_at: chrono::Utc::now().to_rfc3339(),
        };
        self.user_settings.insert(1, default_settings);
    }

    // File methods
    pub fn get_files(&self, parent_id: Option<i32>) -> Vec<&FileRecord> {
        self.files
            .values()
            .filter(|f| f.parent_id == parent_id)
            .collect()
    }

    pub fn get_file(&self, id: i32) -> Option<&FileRecord> {
        self.files.get(&id)
    }

    pub fn create_file(
        &mut self,
        name: String,
        path: String,
        file_type: String,
        parent_id: Option<i32>,
    ) -> FileRecord {
        let file = FileRecord {
            id: self.current_file_id,
            name,
            path,
            file_type,
            size: None,
            mime_type: None,
            parent_id,
            user_id: 1,
            tags: Vec::new(),
            color: None,
            created_at: chrono::Utc::now().to_rfc3339(),
            updated_at: chrono::Utc::now().to_rfc3339(),
            is_hidden: false,
            permissions: "rwxr-xr-x".to_string(),
            content: None,
        };

        self.files.insert(self.current_file_id, file.clone());
        self.current_file_id += 1;
        file
    }

    pub fn update_file_tags(&mut self, id: i32, tags: Vec<String>) -> Option<&FileRecord> {
        if let Some(file) = self.files.get_mut(&id) {
            file.tags = tags;
            file.updated_at = chrono::Utc::now().to_rfc3339();
            Some(file)
        } else {
            None
        }
    }

    pub fn update_file_color(&mut self, id: i32, color: String) -> Option<&FileRecord> {
        if let Some(file) = self.files.get_mut(&id) {
            file.color = Some(color);
            file.updated_at = chrono::Utc::now().to_rfc3339();
            Some(file)
        } else {
            None
        }
    }

    pub fn delete_file(&mut self, id: i32) -> bool {
        self.files.remove(&id).is_some()
    }

    pub fn get_files_by_tag(&self, tag: &str) -> Vec<&FileRecord> {
        self.files
            .values()
            .filter(|f| f.tags.contains(&tag.to_string()))
            .collect()
    }

    pub fn get_all_tags(&self) -> Vec<String> {
        let mut tags = std::collections::HashSet::new();
        for file in self.files.values() {
            for tag in &file.tags {
                tags.insert(tag.clone());
            }
        }
        tags.into_iter().collect()
    }

    // User settings methods
    pub fn get_user_settings(&self, user_id: i32) -> Option<&UserSettings> {
        self.user_settings.values().find(|s| s.user_id == user_id)
    }

    pub fn update_user_settings(
        &mut self,
        user_id: i32,
        theme: Option<String>,
        view_mode: Option<String>,
        show_hidden_files: Option<bool>,
    ) -> Option<&UserSettings> {
        let settings_id = self
            .user_settings
            .values()
            .find(|s| s.user_id == user_id)
            .map(|s| s.id);

        if let Some(id) = settings_id {
            if let Some(settings) = self.user_settings.get_mut(&id) {
                if let Some(theme) = theme {
                    settings.theme = theme;
                }
                if let Some(view_mode) = view_mode {
                    settings.view_mode = view_mode;
                }
                if let Some(show_hidden) = show_hidden_files {
                    settings.show_hidden_files = show_hidden;
                }
                settings.updated_at = chrono::Utc::now().to_rfc3339();
                Some(settings)
            } else {
                None
            }
        } else {
            None
        }
    }
}

// Global storage instance
pub static STORAGE: LazyLock<Mutex<Storage>> = LazyLock::new(|| Mutex::new(Storage::new()));

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_user_creation() {
        let user = User {
            id: 1,
            username: "testuser".to_string(),
            password_hash: hash_password("password123"),
        };

        assert_eq!(user.id, 1);
        assert_eq!(user.username, "testuser");
        assert!(verify_password("password123", &user.password_hash));
        assert!(!verify_password("wrong_password", &user.password_hash));
    }

    #[test]
    fn test_storage_initialization() {
        let storage = Storage::new();
        assert!(!storage.users.is_empty());
        assert_eq!(storage.current_file_id, 1);
    }

    #[test]
    fn test_file_operations() {
        let mut storage = Storage::new();

        let file = storage.create_file(
            "test.txt".to_string(),
            "/test.txt".to_string(),
            "text".to_string(),
            None,
        );

        assert_eq!(file.name, "test.txt");
        assert_eq!(file.path, "/test.txt");
        assert_eq!(file.file_type, "text");

        // Test file retrieval
        let retrieved = storage.get_file(file.id);
        assert!(retrieved.is_some());
        assert_eq!(retrieved.unwrap().name, "test.txt");
    }

    // ─── User settings tests ────────────────────────────────────────────

    #[test]
    fn test_file_creation_increments_id() {
        let mut storage = Storage::new();
        let f1 = storage.create_file("a.txt".into(), "/a.txt".into(), "text".into(), None);
        let f2 = storage.create_file("b.txt".into(), "/b.txt".into(), "text".into(), None);
        assert_ne!(f1.id, f2.id, "each file should get a unique ID");
        assert_eq!(f2.id, f1.id + 1, "IDs should be sequential");
    }

    #[test]
    fn test_file_deletion() {
        let mut storage = Storage::new();
        let file = storage.create_file("del.txt".into(), "/del.txt".into(), "text".into(), None);
        let id = file.id;
        assert!(storage.get_file(id).is_some());

        let deleted = storage.delete_file(id);
        assert!(deleted, "delete_file should return true for existing file");
        assert!(
            storage.get_file(id).is_none(),
            "file should be gone after deletion"
        );
    }

    #[test]
    fn test_delete_nonexistent_file_returns_false() {
        let mut storage = Storage::new();
        assert!(
            !storage.delete_file(9999),
            "deleting nonexistent ID should return false"
        );
    }

    #[test]
    fn test_file_tag_update() {
        let mut storage = Storage::new();
        let file = storage.create_file(
            "tagged.txt".into(),
            "/tagged.txt".into(),
            "text".into(),
            None,
        );
        let id = file.id;

        let updated = storage.update_file_tags(id, vec!["important".into(), "work".into()]);
        assert!(updated.is_some());
        let tags = &updated.unwrap().tags;
        assert_eq!(tags.len(), 2);
        assert!(tags.contains(&"important".to_string()));
        assert!(tags.contains(&"work".to_string()));
    }

    #[test]
    fn test_update_file_tags_nonexistent_returns_none() {
        let mut storage = Storage::new();
        assert!(storage.update_file_tags(9999, vec!["tag".into()]).is_none());
    }

    #[test]
    fn test_file_color_update() {
        let mut storage = Storage::new();
        let file = storage.create_file(
            "colored.txt".into(),
            "/colored.txt".into(),
            "text".into(),
            None,
        );
        let id = file.id;

        let updated = storage.update_file_color(id, "#ff0000".to_string());
        assert!(updated.is_some());
        assert_eq!(updated.unwrap().color.as_deref(), Some("#ff0000"));
    }

    #[test]
    fn test_update_file_color_nonexistent_returns_none() {
        let mut storage = Storage::new();
        assert!(storage.update_file_color(9999, "#000".into()).is_none());
    }

    #[test]
    fn test_get_files_by_tag() {
        let mut storage = Storage::new();
        let f1 = storage.create_file("a.txt".into(), "/a.txt".into(), "text".into(), None);
        let f2 = storage.create_file("b.txt".into(), "/b.txt".into(), "text".into(), None);
        let _f3 = storage.create_file("c.txt".into(), "/c.txt".into(), "text".into(), None);

        storage.update_file_tags(f1.id, vec!["urgent".into()]);
        storage.update_file_tags(f2.id, vec!["urgent".into(), "review".into()]);
        // f3 has no tags

        let urgent_files = storage.get_files_by_tag("urgent");
        assert_eq!(urgent_files.len(), 2);

        let review_files = storage.get_files_by_tag("review");
        assert_eq!(review_files.len(), 1);

        let none_files = storage.get_files_by_tag("nonexistent");
        assert!(none_files.is_empty());
    }

    #[test]
    fn test_get_all_tags() {
        let mut storage = Storage::new();
        let f1 = storage.create_file("x.txt".into(), "/x.txt".into(), "text".into(), None);
        let f2 = storage.create_file("y.txt".into(), "/y.txt".into(), "text".into(), None);

        storage.update_file_tags(f1.id, vec!["alpha".into(), "beta".into()]);
        storage.update_file_tags(f2.id, vec!["beta".into(), "gamma".into()]);

        let all_tags = storage.get_all_tags();
        assert_eq!(all_tags.len(), 3, "should have 3 unique tags");
        assert!(all_tags.contains(&"alpha".to_string()));
        assert!(all_tags.contains(&"beta".to_string()));
        assert!(all_tags.contains(&"gamma".to_string()));
    }

    #[test]
    fn test_get_files_by_parent_id() {
        let mut storage = Storage::new();
        let root = storage.create_file("root.txt".into(), "/root.txt".into(), "text".into(), None);
        let _child = storage.create_file(
            "child.txt".into(),
            "/dir/child.txt".into(),
            "text".into(),
            Some(root.id),
        );

        let root_files = storage.get_files(None);
        assert_eq!(root_files.len(), 1);
        assert_eq!(root_files[0].name, "root.txt");

        let children = storage.get_files(Some(root.id));
        assert_eq!(children.len(), 1);
        assert_eq!(children[0].name, "child.txt");
    }

    // ─── Struct serialization round-trip tests ──────────────────────────

    #[test]
    fn test_bookmark_entry_serialization() {
        let bookmark = BookmarkEntry {
            path: "/home/user/docs".to_string(),
            name: "Documents".to_string(),
            added_at: "2026-03-01T00:00:00Z".to_string(),
            is_dir: true,
        };
        let json = serde_json::to_string(&bookmark).unwrap();
        let deserialized: BookmarkEntry = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.path, bookmark.path);
        assert_eq!(deserialized.name, bookmark.name);
        assert_eq!(deserialized.is_dir, bookmark.is_dir);
    }

    #[test]
    fn test_file_tag_serialization() {
        let tag = FileTag {
            name: "important".to_string(),
            color: "#ff5555".to_string(),
        };
        let json = serde_json::to_string(&tag).unwrap();
        let deserialized: FileTag = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.name, "important");
        assert_eq!(deserialized.color, "#ff5555");
    }

    #[test]
    fn test_file_note_serialization() {
        let note = FileNote {
            id: "12345".to_string(),
            title: "My Note".to_string(),
            content: "Some content here".to_string(),
            created_at: "2026-03-01T00:00:00Z".to_string(),
            updated_at: "2026-03-01T00:00:00Z".to_string(),
        };
        let json = serde_json::to_string(&note).unwrap();
        let deserialized: FileNote = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.id, "12345");
        assert_eq!(deserialized.title, "My Note");
        assert_eq!(deserialized.content, "Some content here");
    }

    #[test]
    fn test_recent_file_serialization() {
        let recent = RecentFile {
            path: "/home/user/file.txt".to_string(),
            name: "file.txt".to_string(),
            accessed_at: 1709251200000,
            file_type: "txt".to_string(),
            size: 1024,
        };
        let json = serde_json::to_string(&recent).unwrap();
        let deserialized: RecentFile = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.path, recent.path);
        assert_eq!(deserialized.accessed_at, recent.accessed_at);
        assert_eq!(deserialized.size, 1024);
    }

    #[test]
    fn test_file_record_default_values() {
        let mut storage = Storage::new();
        let file = storage.create_file("new.txt".into(), "/new.txt".into(), "text".into(), None);

        assert!(file.tags.is_empty(), "new file should have no tags");
        assert!(file.color.is_none(), "new file should have no color");
        assert!(!file.is_hidden, "new file should not be hidden");
        assert!(file.size.is_none(), "new file should have no size");
        assert!(
            file.mime_type.is_none(),
            "new file should have no mime type"
        );
        assert!(file.content.is_none(), "new file should have no content");
        assert_eq!(file.user_id, 1, "new file should belong to default user");
    }

    // ─── Password hashing tests ──────────────────────────────────────────

    #[test]
    fn test_hash_password_returns_hex_string() {
        let hash = hash_password("test");
        // SHA-256 produces a 64-character hex string
        assert_eq!(hash.len(), 64, "hash should be 64 hex characters");
        assert!(
            hash.chars().all(|c| c.is_ascii_hexdigit()),
            "hash should only contain hex digits"
        );
    }

    #[test]
    fn test_hash_password_is_deterministic() {
        let h1 = hash_password("hello");
        let h2 = hash_password("hello");
        assert_eq!(h1, h2, "same input should produce same hash");
    }

    #[test]
    fn test_hash_password_differs_for_different_inputs() {
        let h1 = hash_password("password1");
        let h2 = hash_password("password2");
        assert_ne!(h1, h2, "different inputs should produce different hashes");
    }

    #[test]
    fn test_hash_password_is_not_plaintext() {
        let hash = hash_password("password");
        assert_ne!(
            hash, "password",
            "hash should not equal the plaintext password"
        );
    }

    #[test]
    fn test_verify_password_correct() {
        let hash = hash_password("mysecret");
        assert!(
            verify_password("mysecret", &hash),
            "correct password should verify"
        );
    }

    #[test]
    fn test_verify_password_incorrect() {
        let hash = hash_password("mysecret");
        assert!(
            !verify_password("wrongpassword", &hash),
            "wrong password should not verify"
        );
    }

    #[test]
    fn test_seed_data_password_is_hashed() {
        let storage = Storage::new();
        let user = storage.users.get(&1).expect("default user should exist");
        assert_ne!(
            user.password_hash, "password",
            "seed password should not be stored in plaintext"
        );
        assert!(
            verify_password("password", &user.password_hash),
            "seed password should verify with 'password'"
        );
    }
}
