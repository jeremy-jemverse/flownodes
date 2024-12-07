import express from 'express';
import request from 'supertest';
import nock from 'nock';
import router from '../routes';

describe('HttpRequest Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/nodes/http-request', router);
    nock.cleanAll();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  it('should handle successful request', async () => {
    const mockResponse = { data: 'test data' };
    nock('http://api.example.com')
      .get('/test')
      .reply(200, mockResponse);

    const response = await request(app)
      .post('/api/nodes/http-request/execute')
      .send({
        url: 'http://api.example.com/test',
        method: 'GET'
      });

    expect(response.status).toBe(200);
    expect(response.body.statusCode).toBe(200);
    expect(response.body.data).toEqual(mockResponse);
  });

  it('should validate required parameters', async () => {
    const response = await request(app)
      .post('/api/nodes/http-request/execute')
      .send({
        url: 'http://api.example.com/test'
        // missing method
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('HTTP method is required');
  });

  it('should handle request with complete parameters', async () => {
    const mockResponse = { success: true };
    nock('http://api.example.com')
      .get('/test')
      .query({ page: '1' })
      .matchHeader('Authorization', 'Bearer token123')
      .reply(200, mockResponse);

    const response = await request(app)
      .post('/api/nodes/http-request/execute')
      .send({
        url: 'http://api.example.com/test',
        method: 'GET',
        headers: {
          'Authorization': 'Bearer token123'
        },
        queryParams: {
          page: '1'
        }
      });

    expect(response.status).toBe(200);
    expect(response.body.statusCode).toBe(200);
    expect(response.body.data).toEqual(mockResponse);
  });

  it('should handle external API errors', async () => {
    nock('http://api.example.com')
      .get('/error')
      .replyWithError({ message: 'Network error' });

    const response = await request(app)
      .post('/api/nodes/http-request/execute')
      .send({
        url: 'http://api.example.com/error',
        method: 'GET'
      });

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('Network error');
  });

  it('should handle POST request with body', async () => {
    const mockResponse = { message: 'Success' };
    nock('http://api.example.com')
      .post('/test', { data: 'test' })
      .reply(201, mockResponse);

    const response = await request(app)
      .post('/api/nodes/http-request/execute')
      .send({
        url: 'http://api.example.com/test',
        method: 'POST',
        body: { data: 'test' }
      });

    expect(response.status).toBe(201);
    expect(response.body.data).toEqual(mockResponse);
  });
});
