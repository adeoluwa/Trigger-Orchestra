export interface Secret {
  id: string
  environmentId: string
  key: string
  encryptedValue: string
  createdAt: Date
  updatedAt: Date
}