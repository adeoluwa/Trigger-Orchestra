import yaml from 'js-yaml'

export function parseYaml<T = unknown>(content: string): T {
  return yaml.load(content) as T
}

export function stringifyYaml(data: unknown): string {
  return yaml.dump(data, { indent: 2, lineWidth: 120 })
}
