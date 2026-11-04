const STORAGE_KEY = 'datamind.projects.v1';

export function readProjects() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeProjects(projects) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

export function upsertProject(project) {
  const projects = readProjects();
  const index = projects.findIndex((item) => item.id === project.id);
  const next = index >= 0
    ? projects.map((item) => item.id === project.id ? { ...project, updatedAt: new Date().toISOString() } : item)
    : [{ ...project, createdAt: project.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() }, ...projects];
  writeProjects(next);
  return next;
}

export function removeProject(id) {
  const next = readProjects().filter((item) => item.id !== id);
  writeProjects(next);
  return next;
}
