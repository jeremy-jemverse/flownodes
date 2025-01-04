import request from 'supertest';
import express from 'express';
import router from '../routes';
import { processEmbeddings } from '../index';
import { InputData } from '../base';
import * as fs from 'fs';
import * as path from 'path';

jest.mock('../index');

const app = express();
app.use(express.json());
app.use('/', router);

describe('Embeddings Routes', () => {
  let testData: InputData[];

  beforeAll(() => {
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
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /process', () => {
    it('should process embeddings successfully', async () => {
      const testItems = testData.slice(0, 2);
      const mockResult = {
        status: 'success',
        stored_vectors: testItems.map(item => ({
          id: item.id,
          metadata: {
            name: item.name,
            description: item.description
          }
        }))
      };
      (processEmbeddings as jest.Mock).mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/process')
        .send({ data: testItems });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResult);
      expect(processEmbeddings).toHaveBeenCalledWith({ data: testItems });
    });

    it('should handle errors during processing', async () => {
      (processEmbeddings as jest.Mock).mockRejectedValue(new Error('Processing failed'));

      const response = await request(app)
        .post('/process')
        .send({ data: testData.slice(0, 1) });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        status: 'error',
        message: 'Processing failed'
      });
    });
  });
});
