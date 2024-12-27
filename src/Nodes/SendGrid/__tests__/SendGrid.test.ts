import { SendGrid } from '../SendGrid';
import sgMail from '@sendgrid/mail';
import { SendGridBodyParameters, SendGridTemplateParameters } from '../types';

// Mock @sendgrid/mail
jest.mock('@sendgrid/mail', () => ({
  setApiKey: jest.fn(),
  send: jest.fn(),
}));

describe('SendGrid', () => {
  let sendGrid: SendGrid;
  const mockApiKey = 'test-api-key';
  const validTemplateParams = {
    config: {
      email: {
        type: 'template',
        from: 'sender@example.com',
        to: 'test@example.com',
        subject: 'Test Subject',
        templateId: 'd-template-id',
        dynamicTemplateData: { name: 'Test User' }
      },
      connection: {
        apiKey: mockApiKey
      }
    }
  };

  beforeEach(() => {
    sendGrid = new SendGrid();
    jest.clearAllMocks();
  });

  describe('Body-based emails', () => {
    const validBodyParams = {
      config: {
        email: {
          type: 'body',
          to: 'test@example.com',
          from: 'sender@example.com',
          subject: 'Test Subject',
          body: {
            text: 'Test content',
            html: '<p>Test HTML content</p>'
          }
        },
        connection: {
          apiKey: mockApiKey
        }
      }
    };

    it('should send a body-based email successfully', async () => {
      const mockResponse = [{
        statusCode: 202,
        headers: { 'x-message-id': '123' },
        body: {}
      }];
      (sgMail.send as jest.Mock).mockResolvedValueOnce(mockResponse);

      const result = await sendGrid.execute(validBodyParams);

      expect(sgMail.setApiKey).toHaveBeenCalledWith(mockApiKey);
      expect(sgMail.send).toHaveBeenCalledWith({
        to: validBodyParams.config.email.to,
        from: validBodyParams.config.email.from,
        subject: validBodyParams.config.email.subject,
        text: validBodyParams.config.email.body.text,
        html: validBodyParams.config.email.body.html
      });
      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(202);
    });

    it('should handle body-based email with only text content', async () => {
      const textOnlyParams = {
        config: {
          email: {
            ...validBodyParams.config.email,
            body: {
              text: 'Test content',
              html: undefined
            }
          },
          connection: {
            apiKey: mockApiKey
          }
        }
      };
      const mockResponse = [{ statusCode: 202, headers: {}, body: {} }];
      (sgMail.send as jest.Mock).mockResolvedValueOnce(mockResponse);

      const result = await sendGrid.execute(textOnlyParams);

      expect(result.success).toBe(true);
      expect(sgMail.send).toHaveBeenCalledWith(expect.not.objectContaining({ html: expect.anything() }));
    });

    it('should fail if neither text nor html is provided', async () => {
      const invalidParams = {
        config: {
          email: {
            ...validBodyParams.config.email,
            body: {
              text: undefined,
              html: undefined
            }
          },
          connection: {
            apiKey: mockApiKey
          }
        }
      };

      const result = await sendGrid.execute(invalidParams);
      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Either text or HTML content is required for body-based emails');
    });
  });

  describe('Template-based emails', () => {
    it('should send a template-based email successfully', async () => {
      const mockResponse = [{
        statusCode: 202,
        headers: { 'x-message-id': '123' },
        body: {}
      }];
      (sgMail.send as jest.Mock).mockResolvedValueOnce(mockResponse);

      const result = await sendGrid.execute(validTemplateParams);

      expect(sgMail.setApiKey).toHaveBeenCalledWith(mockApiKey);
      expect(sgMail.send).toHaveBeenCalledWith({
        to: validTemplateParams.config.email.to,
        from: validTemplateParams.config.email.from,
        subject: validTemplateParams.config.email.subject,
        templateId: validTemplateParams.config.email.templateId,
        dynamicTemplateData: validTemplateParams.config.email.dynamicTemplateData
      });
      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(202);
    });

    it('should handle template without dynamic data', async () => {
      const templateWithoutDataParams = {
        config: {
          email: {
            ...validTemplateParams.config.email,
            dynamicTemplateData: undefined
          },
          connection: {
            apiKey: mockApiKey
          }
        }
      };
      const mockResponse = [{ statusCode: 202, headers: {}, body: {} }];
      (sgMail.send as jest.Mock).mockResolvedValueOnce(mockResponse);

      const result = await sendGrid.execute(templateWithoutDataParams);

      expect(result.success).toBe(true);
      expect(sgMail.send).toHaveBeenCalledWith(expect.not.objectContaining({ 
        dynamicTemplateData: expect.anything() 
      }));
    });

    it('should fail if templateId is not provided', async () => {
      const invalidParams = {
        config: {
          email: {
            ...validTemplateParams.config.email,
            templateId: undefined
          },
          connection: {
            apiKey: mockApiKey
          }
        }
      };

      const result = await sendGrid.execute(invalidParams);
      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Template ID is required for template-based emails');
    });
  });

  describe('Error handling', () => {
    it('should handle SendGrid API errors', async () => {
      const mockError = {
        code: 401,
        response: {
          headers: {},
          body: { errors: [{ message: 'Invalid API key' }] }
        }
      };
      (sgMail.send as jest.Mock).mockRejectedValueOnce(mockError);

      const result = await sendGrid.execute(validTemplateParams);

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(401);
      expect(result.error).toBeDefined();
    });
  });
});
