import { Pool } from 'pg';
import { BaseEmbeddingLoader, EmbeddingConfig, InputData, VectorData, TestResponse } from './base';

export class PgVectorEmbeddingLoader extends BaseEmbeddingLoader {
  private pool: Pool;

  constructor(config: EmbeddingConfig) {
    super(config);
    console.log(`[PgVector] Initializing loader with table: ${config.vector_db.table_name}`);
    this.pool = new Pool({
      connectionString: config.vector_db.database_url,
    });
  }

  private async initializeTable(): Promise<void> {
    console.log(`[PgVector] Attempting to initialize table: ${this.config.vector_db.table_name}`);
    const client = await this.pool.connect();
    try {
      // Enable pgvector extension if not exists
      console.log('[PgVector] Enabling pgvector extension...');
      await client.query('CREATE EXTENSION IF NOT EXISTS vector;');

      // Create table if not exists
      console.log('[PgVector] Creating table if not exists...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${this.config.vector_db.table_name} (
          id TEXT PRIMARY KEY,
          embedding vector(1536),
          metadata JSONB
        );
      `);

      // Verify table exists
      const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = $1
        );
      `, [this.config.vector_db.table_name]);
      
      console.log(`[PgVector] Table exists: ${tableCheck.rows[0].exists}`);

      // Log table structure
      const tableInfo = await client.query(`
        SELECT column_name, data_type, udt_name 
        FROM information_schema.columns 
        WHERE table_name = $1
        ORDER BY ordinal_position;
      `, [this.config.vector_db.table_name]);
      
      console.log('[PgVector] Table structure:', JSON.stringify(tableInfo.rows, null, 2));
    } catch (error) {
      console.error('[PgVector] Error initializing table:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  private formatVector(vector: number[]): string {
    return `[${vector.join(',')}]`;
  }

  private async storeVectors(vectors: VectorData[]): Promise<void> {
    console.log(`[PgVector] Storing ${vectors.length} vectors...`);
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      for (const vector of vectors) {
        console.log(`[PgVector] Storing vector for id: ${vector.id}`);
        await client.query(
          `INSERT INTO ${this.config.vector_db.table_name} (id, embedding, metadata)
           VALUES ($1, $2::vector, $3)
           ON CONFLICT (id) DO UPDATE
           SET embedding = $2::vector, metadata = $3;`,
          [vector.id, this.formatVector(vector.vector), vector.metadata]
        );
      }

      await client.query('COMMIT');
      console.log('[PgVector] Successfully stored all vectors');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[PgVector] Error storing vectors:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  public async process(data: InputData[]): Promise<{ status: string; stored_vectors: any[] }> {
    try {
      console.log(`[PgVector] Processing ${data.length} input items...`);
      await this.validateConfig();
      await this.initializeTable();

      const processedData = this.preprocessData(data);
      console.log('[PgVector] Generated preprocessed data');
      
      const vectors = await this.generateEmbeddings(processedData);
      console.log(`[PgVector] Generated ${vectors.length} embeddings`);
      
      await this.storeVectors(vectors);

      return {
        status: 'success',
        stored_vectors: vectors.map(({ id, metadata }) => ({ id, metadata })),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[PgVector] Error in process:', errorMessage);
      throw new Error(`Failed to process embeddings: ${errorMessage}`);
    }
  }

  public async test(): Promise<TestResponse> {
    const startTime = Date.now();
    const testResults: TestResponse = {
      success: true,
      tests: {
        connection: { passed: false, details: '', duration: 0 },
        vectorExtension: { passed: false, details: '' },
        tableCreation: { passed: false, details: '' },
        embedding: { passed: false, details: '' },
        storage: { passed: false, details: '' }
      },
      duration: 0,
      sampleResults: undefined
    };

    try {
      // Test 1: Database Connection
      const connectionStart = Date.now();
      const client = await this.pool.connect();
      testResults.tests.connection = {
        passed: true,
        details: 'Successfully connected to database',
        duration: Date.now() - connectionStart
      };

      try {
        // Test 2: Vector Extension
        const extResult = await client.query('SELECT * FROM pg_extension WHERE extname = $1', ['vector']);
        testResults.tests.vectorExtension = {
          passed: extResult.rows.length > 0,
          details: extResult.rows.length > 0 
            ? 'pgvector extension is installed'
            : 'pgvector extension is not installed'
        };

        // Test 3: Table Creation
        await this.initializeTable();
        const tableInfo = await client.query(`
          SELECT column_name, data_type, udt_name 
          FROM information_schema.columns 
          WHERE table_name = $1
        `, [this.config.vector_db.table_name]);
        
        const hasRequiredColumns = tableInfo.rows.some(row => row.column_name === 'embedding' && row.udt_name === 'vector');
        testResults.tests.tableCreation = {
          passed: hasRequiredColumns,
          details: hasRequiredColumns 
            ? 'Table structure is valid'
            : 'Table is missing required columns'
        };

        // Test 4: Embedding Generation
        const sampleData: InputData[] = [{
          id: 'test_item',
          name: 'Test Item',
          description: 'A test item for embedding generation',
          content: 'This is a test content to verify embedding generation works correctly.'
        }];

        const embedStart = Date.now();
        const embeddings = await this.generateEmbeddingsForTest(sampleData);
        const embedDuration = Date.now() - embedStart;

        testResults.tests.embedding = {
          passed: embeddings.length > 0 && embeddings[0].vector.length === 1536,
          details: 'Successfully generated embeddings',
          sampleInput: sampleData[0].content,
          sampleVector: embeddings[0].vector.slice(0, 5),
          dimension: embeddings[0].vector.length,
          duration: embedDuration
        };

        // Test 5: Storage Operations
        const storageStart = Date.now();
        await this.storeVectors(embeddings);
        const writeLatency = Date.now() - storageStart;

        const queryStart = Date.now();
        const queryResult = await client.query(
          `SELECT * FROM ${this.config.vector_db.table_name} WHERE id = $1`,
          ['test_item']
        );
        const queryLatency = Date.now() - queryStart;

        testResults.tests.storage = {
          passed: queryResult.rows.length > 0,
          details: 'Successfully stored and retrieved vectors',
          writeLatency,
          queryLatency
        };

        // Clean up test data
        await client.query(
          `DELETE FROM ${this.config.vector_db.table_name} WHERE id = $1`,
          ['test_item']
        );

        // Set sample results
        testResults.sampleResults = {
          input: sampleData[0].content,
          metadata: { name: sampleData[0].name, description: sampleData[0].description },
          vectorPreview: embeddings[0].vector.slice(0, 5)
        };

      } finally {
        client.release();
      }
    } catch (error) {
      console.error('[PgVector] Error during test:', error);
      testResults.success = false;
      
      // Update the first failed test with error details
      for (const test of Object.values(testResults.tests)) {
        if (!test.passed) {
          test.details = error instanceof Error ? error.message : String(error);
          break;
        }
      }
    }

    testResults.duration = Date.now() - startTime;
    testResults.success = Object.values(testResults.tests).every(test => test.passed);

    return testResults;
  }

  public async generateEmbeddingsForTest(data: InputData[]): Promise<VectorData[]> {
    const preprocessedData = this.preprocessDataForTest(data);
    const processedData = this.preprocessData(preprocessedData);
    return this.generateEmbeddings(processedData);
  }

  public async close(): Promise<void> {
    console.log('[PgVector] Closing database connection');
    await this.pool.end();
  }
}
