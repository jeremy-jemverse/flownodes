import { OpenAIEmbeddings } from "@langchain/openai";

export interface InputData {
  id: string;
  name: string;
  description: string;
  content: string;
  [key: string]: any;
}

export interface ProcessedData {
  id: string;
  text: string;
  metadata: {
    name: string;
    description: string;
    [key: string]: any;
  };
}

export interface VectorData {
  id: string;
  vector: number[];
  metadata: any;
}

export interface TestResult {
  passed: boolean;
  details: string;
  duration?: number;
}

export interface EmbeddingTestResult extends TestResult {
  sampleInput?: string;
  sampleVector?: number[];
  dimension?: number;
}

export interface StorageTestResult extends TestResult {
  queryLatency?: number;
  writeLatency?: number;
}

export interface TestResponse {
  success: boolean;
  tests: {
    connection: TestResult;
    vectorExtension: TestResult;
    tableCreation: TestResult;
    embedding: EmbeddingTestResult;
    storage: StorageTestResult;
  };
  duration: number;
  sampleResults?: {
    input: string;
    metadata: any;
    vectorPreview: number[];  // First few dimensions
  };
}

export interface EmbeddingConfig {
  embedding_model: string;
  api_key: string;
  vector_db: {
    type: string;
    database_url: string;
    table_name: string;
  };
}

export abstract class BaseEmbeddingLoader {
  protected config: EmbeddingConfig;

  constructor(config: EmbeddingConfig) {
    this.config = config;
  }

  protected async validateConfig(): Promise<void> {
    if (!this.config.embedding_model) {
      throw new Error('Embedding model must be specified');
    }
    if (!this.config.api_key) {
      throw new Error('API key must be specified');
    }
    if (!this.config.vector_db?.database_url) {
      throw new Error('Database URL must be specified');
    }
    if (!this.config.vector_db?.table_name) {
      throw new Error('Table name must be specified');
    }
  }

  protected preprocessData(data: InputData[]): ProcessedData[] {
    return data.map((record) => ({
      id: record.id,
      text: `${record.name}. ${record.description}`,
      metadata: {
        name: record.name,
        description: record.description,
      },
    }));
  }

  protected async generateEmbeddings(processedData: ProcessedData[]): Promise<VectorData[]> {
    const embeddings = new OpenAIEmbeddings({
      modelName: this.config.embedding_model,
      openAIApiKey: this.config.api_key,
    });

    const textArray = processedData.map((item) => item.text);
    const vectors = await embeddings.embedDocuments(textArray);

    return vectors.map((vector, index) => ({
      id: processedData[index].id,
      vector,
      metadata: processedData[index].metadata,
    }));
  }

  protected preprocessDataForTest(data: InputData[]): InputData[] {
    return data.map(item => ({
      ...item,
      content: item.content.trim()
    }));
  }

  protected abstract generateEmbeddingsForTest(data: InputData[]): Promise<VectorData[]>;

  public abstract process(data: InputData[]): Promise<{ status: string; stored_vectors: any[] }>;

  public abstract close(): Promise<void>;

  // New test method that implementations must provide
  public abstract test(): Promise<TestResponse>;
}
