import { PgVectorEmbeddingLoader } from '../pgvector';
import { EmbeddingConfig, InputData } from '../base';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://expert:expertdev@eca-data-dev-aurora.cluster-c3i2wiuyixpk.eu-central-1.rds.amazonaws.com:5432/workflow_dev';

describe('PgVectorEmbeddingLoader', () => {
  let loader: PgVectorEmbeddingLoader;
  let testData: InputData[];
  let pool: Pool;

  const mockConfig: EmbeddingConfig = {
    embedding_model: 'text-embedding-ada-002',
    api_key: process.env.OPENAI_API_KEY || 'test-api-key',
    vector_db: {
      type: 'postgres',
      database_url: DATABASE_URL,
      table_name: 'vector_data_test'
    }
  };

  beforeAll(async () => {
    console.log('\n[Test Setup] Starting test setup...');
    
    // Load test data
    console.log('[Test Setup] Loading test data from json-data.json');
    const jsonPath = path.join(__dirname, '../../../../Files/json-data.json');
    const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
    const jsonData = JSON.parse(jsonContent);
    
    testData = jsonData.data.map((item: any) => {
      const metadata = JSON.parse(item.metadata);
      return {
        id: item.id,
        name: metadata.Country,
        description: metadata.category,
        content: item.content
      };
    });
    console.log(`[Test Setup] Loaded ${testData.length} test data items`);

    // Set up real database connection
    console.log('[Test Setup] Connecting to database...');
    pool = new Pool({
      connectionString: DATABASE_URL
    });

    // Clean up any existing test table
    console.log('[Test Setup] Cleaning up existing test table...');
    const client = await pool.connect();
    try {
      await client.query(`DROP TABLE IF EXISTS ${mockConfig.vector_db.table_name}`);
      console.log('[Test Setup] Successfully dropped existing test table');
    } catch (error) {
      console.error('[Test Setup] Error dropping test table:', error);
      throw error;
    } finally {
      client.release();
    }
    console.log('[Test Setup] Setup complete\n');
  });

  beforeEach(() => {
    console.log('\n[Test] Creating new PgVectorEmbeddingLoader instance');
    loader = new PgVectorEmbeddingLoader(mockConfig);
  });

  afterEach(async () => {
    console.log('\n[Test Cleanup] Cleaning up loader instance');
    if (loader && typeof loader.close === 'function') {
      await loader.close();
    }
  });

  afterAll(async () => {
    console.log('\n[Test Cleanup] Starting final cleanup...');
    // Clean up test table
    const client = await pool.connect();
    try {
      console.log('[Test Cleanup] Dropping test table...');
      await client.query(`DROP TABLE IF EXISTS ${mockConfig.vector_db.table_name}`);
      console.log('[Test Cleanup] Successfully dropped test table');
    } catch (error) {
      console.error('[Test Cleanup] Error dropping test table:', error);
      throw error;
    } finally {
      client.release();
    }
    await pool.end();
    console.log('[Test Cleanup] Cleanup complete\n');
  });

  describe('initializeTable', () => {
    it('should create table and extension if they do not exist', async () => {
      console.log('\n[Test] Testing table initialization...');
      // Initialize table
      await (loader as any).initializeTable();

      // Verify table exists and has correct structure
      const client = await pool.connect();
      try {
        console.log('[Test] Verifying table existence...');
        // Check if table exists
        const tableExists = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = $1
          );
        `, [mockConfig.vector_db.table_name]);
        
        expect(tableExists.rows[0].exists).toBe(true);
        console.log('[Test] Table exists:', tableExists.rows[0].exists);

        console.log('[Test] Checking table structure...');
        // Check table structure
        const tableInfo = await client.query(`
          SELECT column_name, data_type, udt_name 
          FROM information_schema.columns 
          WHERE table_name = $1
          ORDER BY ordinal_position;
        `, [mockConfig.vector_db.table_name]);

        const columns = tableInfo.rows.map(row => ({
          name: row.column_name,
          type: row.udt_name === 'vector' ? 'vector' : row.data_type
        }));

        console.log('[Test] Table structure:', JSON.stringify(columns, null, 2));
        expect(columns).toEqual([
          { name: 'id', type: 'text' },
          { name: 'embedding', type: 'vector' },
          { name: 'metadata', type: 'jsonb' }
        ]);

        console.log('[Test] Checking vector extension...');
        // Check if vector extension is enabled
        const vectorExtension = await client.query(`
          SELECT EXISTS (
            SELECT FROM pg_extension 
            WHERE extname = 'vector'
          );
        `);
        
        expect(vectorExtension.rows[0].exists).toBe(true);
        console.log('[Test] Vector extension exists:', vectorExtension.rows[0].exists);
      } finally {
        client.release();
      }
    });
  });

  describe('process', () => {
    it('should process input data and store vectors', async () => {
      console.log('\n[Test] Testing data processing and storage...');
      // Initialize table first
      await (loader as any).initializeTable();

      console.log('[Test] Processing test data...');
      // Process test data
      const result = await loader.process(testData.slice(0, 2));

      // Verify data was stored
      const client = await pool.connect();
      try {
        console.log('[Test] Verifying stored data...');
        const storedData = await client.query(`
          SELECT id, metadata, array_agg(x) as embedding
          FROM ${mockConfig.vector_db.table_name}, unnest(embedding::real[]) x
          GROUP BY id, metadata
          ORDER BY id;
        `);

        expect(storedData.rows.length).toBe(2);
        console.log('[Test] Found', storedData.rows.length, 'stored rows');

        const expectedIds = new Set([testData[0].id, testData[1].id]);
        const actualIds = new Set(storedData.rows.map(row => row.id));
        console.log('[Test] Expected IDs:', Array.from(expectedIds));
        console.log('[Test] Actual IDs:', Array.from(actualIds));
        expect(actualIds).toEqual(expectedIds);

        // Verify embeddings are stored as arrays
        console.log('[Test] Verifying embedding format...');
        for (const row of storedData.rows) {
          expect(Array.isArray(row.embedding)).toBe(true);
          expect(row.embedding.length).toBe(1536); // OpenAI ada-002 embedding size
          console.log(`[Test] Verified embedding for ID ${row.id}: array length ${row.embedding.length}`);
        }
      } finally {
        client.release();
      }

      expect(result.status).toBe('success');
      expect(result.stored_vectors.length).toBe(2);
      console.log('[Test] Successfully verified process results');
    });

    it('should handle errors during processing', async () => {
      console.log('\n[Test] Testing error handling...');
      // Create an invalid config to force an error
      const invalidConfig = {
        ...mockConfig,
        vector_db: {
          ...mockConfig.vector_db,
          database_url: 'invalid_url'
        }
      };
      console.log('[Test] Created loader with invalid database URL');
      const invalidLoader = new PgVectorEmbeddingLoader(invalidConfig);

      console.log('[Test] Attempting to process data with invalid config...');
      await expect(invalidLoader.process(testData.slice(0, 1))).rejects.toThrow();
      console.log('[Test] Successfully caught expected error');
      
      await invalidLoader.close();
    });
  });

  describe('test', () => {
    it('should run all test steps successfully', async () => {
      console.log('\n[Test] Testing the test functionality...');
      
      const testResponse = await loader.test();
      
      // Overall test success
      expect(testResponse.success).toBe(true);
      
      // Individual test checks
      expect(testResponse.tests.connection.passed).toBe(true);
      expect(testResponse.tests.vectorExtension.passed).toBe(true);
      expect(testResponse.tests.tableCreation.passed).toBe(true);
      expect(testResponse.tests.embedding.passed).toBe(true);
      expect(testResponse.tests.storage.passed).toBe(true);
      
      // Check for required properties
      expect(testResponse.tests.embedding.dimension).toBeDefined();
      expect(testResponse.tests.embedding.sampleVector).toBeDefined();
      expect(testResponse.tests.storage.queryLatency).toBeDefined();
      expect(testResponse.tests.storage.writeLatency).toBeDefined();
      
      // Duration should be present and reasonable
      expect(testResponse.duration).toBeGreaterThan(0);
    });
  });
});
