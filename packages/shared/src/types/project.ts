export interface Project {
  id: string;
  name: string;
  repoUrl: string;
  configPath: string;
  userId: string;
  environments: Environment[];
  createdAt: string;
  updatedAt: string;
}

export interface Environment {
  id: string;
  name: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectRequest {
  name: string;
  repoUrl: string;
  configPath?: string;
}
