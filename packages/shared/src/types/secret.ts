export interface Secret {
  id: string;
  key: string;
  projectId: string;
  environmentId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSecretRequest {
  key: string;
  value: string;
  projectId: string;
  environmentId?: string;
}

export interface UpdateSecretRequest {
  value: string;
}
