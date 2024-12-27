import { PaymentError, executeSendGridNode, executePostgresNode, executeWebhookNode } from '../activities';
import { SendGrid } from '../../../Nodes/SendGrid/SendGrid';
import sgMail from '@sendgrid/mail';
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

// Mock SendGrid mail client
jest.mock('@sendgrid/mail', () => ({
  setApiKey: jest.fn(),
  send: jest.fn()
}));

describe('Activity Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('SendGrid Activity', () => {
    const mockSendGridData = {
      config: {
        connection: {
          apiKey: 'test-api-key'
        },
        email: {
          type: 'body',
          to: 'test@example.com',
          from: 'sender@example.com',
          subject: 'Test Email',
          body: {
            text: 'Test email content'
          }
        }
      }
    };

    it('should execute SendGrid node successfully', async () => {
      (sgMail.send as jest.Mock).mockResolvedValueOnce([{ statusCode: 202 }]);

      const result = await executeSendGridNode(mockSendGridData);
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data.message).toBe('Email sent successfully');
    });

    it('should handle SendGrid errors', async () => {
      (sgMail.send as jest.Mock).mockRejectedValueOnce(new Error('SendGrid API key is required'));

      await expect(executeSendGridNode(mockSendGridData))
        .rejects.toThrow('SendGrid API key is required');
    });
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
