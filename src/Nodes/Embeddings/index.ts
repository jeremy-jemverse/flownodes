import { PgVectorEmbeddingLoader } from './pgvector';
import { validateConfig, validateInput } from './utils';

export interface EmbeddingLoaderRequest {
  config: {
    embedding_model: string;
    api_key: string;
    vector_db: {
      type: string;
      database_url: string;
      table_name: string;
    };
  };
  data: Array<{
    id: string;
    name: string;
    description: string;
    [key: string]: any;
  }>;
}

export async function processEmbeddings(request: EmbeddingLoaderRequest) {
  try {
    const config = validateConfig(request.config);
    const data = validateInput(request.data);

    let loader;
    switch (config.vector_db.type) {
      case 'pgvector':
        loader = new PgVectorEmbeddingLoader(config);
        break;
      default:
        throw new Error(`Unsupported vector database type: ${config.vector_db.type}`);
    }

    const result = await loader.process(data);
    await loader.close();
    return result;
  } catch (error: unknown) {
    throw new Error(`Embedding processing failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}
