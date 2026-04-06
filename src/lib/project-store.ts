/**
 * IndexedDB-backed store for imported projects and their files.
 * Persists across page reloads with no size limits (unlike localStorage).
 */

import type { StoredProject, StoredProjectFile } from "./types";

const DB_NAME = "planhub-projects";
const DB_VERSION = 1;
const PROJECTS_STORE = "projects";
const FILES_STORE = "projectFiles";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PROJECTS_STORE)) {
        db.createObjectStore(PROJECTS_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(FILES_STORE)) {
        const fileStore = db.createObjectStore(FILES_STORE, {
          autoIncrement: true,
        });
        fileStore.createIndex("projectId", "projectId", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ---- Projects ----

export async function saveProject(project: StoredProject): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PROJECTS_STORE, "readwrite");
    tx.objectStore(PROJECTS_STORE).put(project);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAllProjects(): Promise<StoredProject[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PROJECTS_STORE, "readonly");
    const req = tx.objectStore(PROJECTS_STORE).getAll();
    req.onsuccess = () => resolve(req.result as StoredProject[]);
    req.onerror = () => reject(req.error);
  });
}

export async function getProject(id: string): Promise<StoredProject | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(PROJECTS_STORE, "readonly");
    const req = tx.objectStore(PROJECTS_STORE).get(id);
    req.onsuccess = () => resolve(req.result as StoredProject | undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteProject(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([PROJECTS_STORE, FILES_STORE], "readwrite");
    tx.objectStore(PROJECTS_STORE).delete(id);
    // Also delete associated files
    const fileStore = tx.objectStore(FILES_STORE);
    const idx = fileStore.index("projectId");
    const cursor = idx.openCursor(IDBKeyRange.only(id));
    cursor.onsuccess = () => {
      const c = cursor.result;
      if (c) {
        c.delete();
        c.continue();
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ---- Project Files ----

export async function saveProjectFiles(files: StoredProjectFile[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FILES_STORE, "readwrite");
    const store = tx.objectStore(FILES_STORE);
    for (const file of files) {
      store.add(file);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getProjectFiles(projectId: string): Promise<StoredProjectFile[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FILES_STORE, "readonly");
    const idx = tx.objectStore(FILES_STORE).index("projectId");
    const req = idx.getAll(IDBKeyRange.only(projectId));
    req.onsuccess = () => resolve(req.result as StoredProjectFile[]);
    req.onerror = () => reject(req.error);
  });
}
