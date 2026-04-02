import { transport } from '../transport';
import type {
  BookmarkEntry,
  FileTag,
  FileNote,
  NoteSearchResult,
  FileAnnotation,
  TagCategory,
  CustomMetadataField,
  StorageAnalytics,
  DiagnosisResult,
  SqliteTableInfo,
  SqliteColumnInfo,
  SqliteQueryResult,
} from '../tauri-api-types';

// ── Bookmark operations ─────────────────────────────────────────────────────

export const getBookmarks = async (): Promise<BookmarkEntry[]> => await transport('get_bookmarks');

export const addBookmark = async (path: string, name: string): Promise<BookmarkEntry> =>
  await transport('add_bookmark', { path, name });

export const removeBookmark = async (path: string): Promise<void> =>
  await transport('remove_bookmark', { path });

export const updateBookmarkName = async (path: string, name: string): Promise<void> =>
  await transport('update_bookmark_name', { path, name });

// ── Storage Analytics ───────────────────────────────────────────────────────

export const analyzeStorage = async (path: string): Promise<StorageAnalytics> =>
  await transport('analyze_storage', { path });

// ── Directory Diagnostics ───────────────────────────────────────────────────

export const diagnoseDirectory = async (
  path: string,
  skipHidden = true,
  skipGitignored = true,
): Promise<DiagnosisResult> =>
  await transport('diagnose_directory', { path, skipHidden, skipGitignored });

// ── File Tags operations ────────────────────────────────────────────────────

export const getFileTags = async (path: string): Promise<FileTag[]> =>
  await transport('get_file_tags', { path });

export const setFileTags = async (path: string, tags: FileTag[]): Promise<void> =>
  await transport('set_file_tags', { path, tags });

export const getAllFileTags = async (): Promise<FileTag[]> => await transport('get_all_file_tags');

export const getFileTagsBatch = async (paths: string[]): Promise<Record<string, FileTag[]>> =>
  await transport('get_file_tags_batch', { paths });

export const removeAllTagsFromFile = async (path: string): Promise<void> =>
  await transport('remove_all_tags_from_file', { path });

export const removeTagGlobally = async (tagName: string): Promise<void> =>
  await transport('remove_tag_globally', { tagName });

// ── Batch tag operations ────────────────────────────────────────────────────

export const batchAddTags = async (paths: string[], tags: FileTag[]): Promise<void> =>
  await transport('batch_add_tags', { paths, tags });

export const batchRemoveTags = async (paths: string[], tagNames: string[]): Promise<void> =>
  await transport('batch_remove_tags', { paths, tagNames });

// ── File Notes operations ───────────────────────────────────────────────────

export const getFileNotes = async (path: string): Promise<FileNote[]> =>
  await transport('get_file_notes', { path });

export const addFileNote = async (
  path: string,
  title: string,
  content: string,
): Promise<FileNote> => await transport('add_file_note', { path, title, content });

export const updateFileNote = async (
  path: string,
  noteId: string,
  title: string,
  content: string,
): Promise<void> => await transport('update_file_note', { path, noteId, title, content });

export const deleteFileNote = async (path: string, noteId: string): Promise<void> =>
  await transport('delete_file_note', { path, noteId });

export const getAllNotes = async (): Promise<Record<string, FileNote[]>> =>
  await transport('get_all_notes');

export const searchNotes = async (query: string): Promise<NoteSearchResult[]> =>
  await transport('search_notes', { query });

// ── Batch notes operations ──────────────────────────────────────────────────

export const batchSetNotes = async (
  paths: string[],
  title: string,
  content: string,
  mode: 'replace' | 'append',
): Promise<void> => await transport('batch_set_notes', { paths, title, content, mode });

// ── File Annotations operations ─────────────────────────────────────────────

export const getFileAnnotations = async (path: string): Promise<FileAnnotation[]> =>
  await transport('get_file_annotations', { path });

export const addFileAnnotation = async (path: string, text: string): Promise<FileAnnotation> =>
  await transport('add_file_annotation', { path, text });

export const toggleAnnotationResolved = async (path: string, annotationId: string): Promise<void> =>
  await transport('toggle_annotation_resolved', { path, annotationId });

export const deleteFileAnnotation = async (path: string, annotationId: string): Promise<void> =>
  await transport('delete_file_annotation', { path, annotationId });

export const getAllAnnotations = async (): Promise<Record<string, FileAnnotation[]>> =>
  await transport('get_all_annotations');

// ── Tag Categories operations ───────────────────────────────────────────────

export const getTagCategories = async (): Promise<TagCategory[]> =>
  await transport('get_tag_categories');

export const addTagCategory = async (
  name: string,
  color: string,
  parentId?: string,
): Promise<TagCategory> =>
  await transport('add_tag_category', { name, color, parentId: parentId ?? null });

export const updateTagCategory = async (
  id: string,
  name?: string,
  color?: string,
  parentId?: string,
): Promise<void> =>
  await transport('update_tag_category', {
    id,
    name: name ?? null,
    color: color ?? null,
    parentId: parentId ?? null,
  });

export const deleteTagCategory = async (id: string): Promise<void> =>
  await transport('delete_tag_category', { id });

// ── Custom Metadata operations ──────────────────────────────────────────────

export const getFileMetadata = async (path: string): Promise<CustomMetadataField[]> =>
  await transport('get_file_metadata', { path });

export const setFileMetadata = async (path: string, fields: CustomMetadataField[]): Promise<void> =>
  await transport('set_file_metadata', { path, fields });

export const getAllMetadataKeys = async (): Promise<string[]> =>
  await transport('get_all_metadata_keys');

// ── SQLite database operations ──────────────────────────────────────────────

export const listSqliteTables = async (path: string): Promise<SqliteTableInfo[]> =>
  await transport('list_sqlite_tables', { path });

export const getSqliteTableColumns = async (
  path: string,
  table: string,
): Promise<SqliteColumnInfo[]> => await transport('get_sqlite_table_columns', { path, table });

export const querySqliteTable = async (
  path: string,
  table: string,
  limit: number,
  offset: number,
): Promise<SqliteQueryResult> =>
  await transport('query_sqlite_table', { path, table, limit, offset });

export const executeSqliteQuery = async (path: string, query: string): Promise<SqliteQueryResult> =>
  await transport('execute_sqlite_query', { path, query });
