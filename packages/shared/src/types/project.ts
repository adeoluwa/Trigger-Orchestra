export interface Project {
  id: string;
  name: string;
  description?: string;
  repositoryUrl?: string;
  repositoryOwner?: string;
  repositoryName?: string;
  defaultBranch?: string;
  yamlConfig?: string;
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
  description?: string;
  repositoryUrl?: string;
  repositoryOwner?: string;
  repositoryName?: string;
  defaultBranch?: string;
  yamlConfig?: string;
}

export interface UpdateProjectRequest extends Partial<CreateProjectRequest> {}
