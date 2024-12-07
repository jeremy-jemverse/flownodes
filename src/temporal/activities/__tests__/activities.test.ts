import { executeSendGridNode, executePostgresNode, executeWebhookNode } from '../activities';
import { mock } from 'jest-mock-extended';
import axios from 'axios';
import { Client } from 'pg';

// Mock external dependencies
jest.mock('axios');
jest.mock('pg', () => ({
  Client: jest.fn().mockImplementation(() => ({
    connect: jest.fn(),
    query: jest.fn(),
    end: jest.fn(),
    release: jest.fn(),
  })),
}));

describe('Activity Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('SendGrid Activity', () => {
    const mockSendGridData = {
      apiKey: 'test-api-key',
      to: 'test@example.com',
      from: 'sender@example.com',
      subject: 'Test Email',
      type: 'body',
      body: { content: 'Test email content' }
    };

    it('should execute SendGrid node successfully', async () => {
      const mockResponse = { ok: true, json: async () => ({ success: true }) };
      global.fetch = jest.fn().mockResolvedValueOnce(mockResponse);

      const result = await executeSendGridNode(mockSendGridData);
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    }, 10000);

    it('should handle SendGrid API errors', async () => {
      const mockResponse = { ok: false, statusText: 'Bad Request' };
      global.fetch = jest.fn().mockResolvedValueOnce(mockResponse);

      await expect(executeSendGridNode({
        ...mockSendGridData,
        apiKey: 'invalid-key'
      })).rejects.toThrow('SendGrid API error: Bad Request');
    }, 10000);
  });

  describe('Postgres Activity', () => {
    const mockQueryResult = { rows: [{ id: 1 }] };
    const mockClient = {
      connect: jest.fn(),
      query: jest.fn().mockResolvedValue(mockQueryResult),
      end: jest.fn(),
      release: jest.fn(),
    };

    beforeEach(() => {
      (Client as unknown as jest.Mock).mockImplementation(() => mockClient);
    });

    it('should execute Postgres node successfully', async () => {
      const result = await executePostgresNode({
        connectionString: 'postgres://test',
        query: 'SELECT * FROM test'
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockQueryResult.rows);
    }, 10000);

    it('should handle Postgres errors gracefully', async () => {
      mockClient.query.mockRejectedValueOnce(new Error('DB Error'));

      await expect(executePostgresNode({
        connectionString: 'postgres://test',
        query: 'SELECT * FROM test'
      })).rejects.toThrow();
    }, 10000);
  });

  describe('Webhook Activity', () => {
    const mockWebhookData = {
      url: 'https://api.example.com/webhook',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        key: 'value'
      }
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should execute Webhook node successfully', async () => {
      const mockResponse = { data: { success: true } };
      (axios.request as jest.Mock).mockResolvedValueOnce(mockResponse);

      const result = await executeWebhookNode(mockWebhookData);
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse.data);
    }, 10000);

    it('should handle Webhook errors gracefully', async () => {
      (axios.request as jest.Mock).mockRejectedValueOnce(new Error('Network Error'));

      await expect(executeWebhookNode(mockWebhookData)).rejects.toThrow();
    }, 10000);
  });
});
