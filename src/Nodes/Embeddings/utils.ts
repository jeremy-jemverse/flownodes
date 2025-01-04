import { EmbeddingConfig, InputData } from './base';

export function validateInput(data: any): InputData[] {
  if (!Array.isArray(data)) {
    throw new Error('Input data must be an array');
  }

  return data.map((item, index) => {
    if (!item.id) {
      throw new Error(`Item at index ${index} is missing an id`);
    }
    if (!item.name) {
      throw new Error(`Item at index ${index} is missing a name`);
    }
    if (!item.description) {
      throw new Error(`Item at index ${index} is missing a description`);
    }

    return {
      id: item.id,
      name: item.name,
      description: item.description,
      ...item,
    };
  });
}

export function validateConfig(config: any): EmbeddingConfig {
  if (!config) {
    throw new Error('Configuration is required');
  }

  if (!config.embedding_model) {
    throw new Error('Embedding model is required in configuration');
  }

  if (!config.api_key) {
    throw new Error('API key is required in configuration');
  }

  if (!config.vector_db) {
    throw new Error('Vector database configuration is required');
  }

  if (config.vector_db.type !== 'pgvector') {
    throw new Error('Currently only pgvector is supported as vector database');
  }

  if (!config.vector_db.database_url) {
    throw new Error('Database URL is required in vector database configuration');
  }

  if (!config.vector_db.table_name) {
    throw new Error('Table name is required in vector database configuration');
  }

  return config as EmbeddingConfig;
}

export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}
