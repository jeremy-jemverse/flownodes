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

  describe('Email Validation', () => {
    it('should validate email addresses', async () => {
      const invalidEmailParams = {
        config: {
          email: {
            ...validTemplateParams.config.email,
            to: 'test@example.com',
            from: 'invalid-email'
          },
          connection: {
            apiKey: mockApiKey
          }
        }
      };

      const result = await sendGrid.execute(invalidEmailParams);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid sender email address');
    });

    it('should handle multiple recipients', async () => {
      const multiRecipientParams = {
        config: {
          email: {
            ...validTemplateParams.config.email,
            to: ['test1@example.com', 'test2@example.com']
          },
          connection: {
            apiKey: mockApiKey
          }
        }
      };

      const mockResponse = [{
        statusCode: 202,
        headers: { 'x-message-id': '123' },
        body: {}
      }];
      (sgMail.send as jest.Mock).mockResolvedValueOnce(mockResponse);

      const result = await sendGrid.execute(multiRecipientParams);
      expect(result.success).toBe(true);
      expect(sgMail.send).toHaveBeenCalledWith(expect.objectContaining({
        to: multiRecipientParams.config.email.to
      }));
    });

    it('should validate all recipients in an array', async () => {
      const invalidRecipientParams = {
        config: {
          email: {
            ...validTemplateParams.config.email,
            to: ['test1@example.com', 'invalid-email']
          },
          connection: {
            apiKey: mockApiKey
          }
        }
      };

      const result = await sendGrid.execute(invalidRecipientParams);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid recipient email address');
    });
  });

  describe('Content Validation', () => {
    it('should trim whitespace from content', async () => {
      const whitespaceParams = {
        config: {
          email: {
            type: 'body',
            from: 'sender@example.com',
            to: 'test@example.com',
            subject: '  Test Subject  ',
            body: {
              text: '  Test content  ',
              html: '  <p>Test content</p>  '
            }
          },
          connection: {
            apiKey: mockApiKey
          }
        }
      };

      const mockResponse = [{
        statusCode: 202,
        headers: {},
        body: {}
      }];
      (sgMail.send as jest.Mock).mockResolvedValueOnce(mockResponse);

      const result = await sendGrid.execute(whitespaceParams);
      expect(result.success).toBe(true);
      expect(sgMail.send).toHaveBeenCalledWith(expect.objectContaining({
        subject: 'Test Subject',
        text: 'Test content',
        html: '<p>Test content</p>'
      }));
    });

    it('should reject empty content after trimming', async () => {
      const emptyContentParams = {
        config: {
          email: {
            type: 'body',
            from: 'sender@example.com',
            to: 'test@example.com',
            subject: 'Test Subject',
            body: {
              text: '   ',
              html: '   '
            }
          },
          connection: {
            apiKey: mockApiKey
          }
        }
      };

      const result = await sendGrid.execute(emptyContentParams);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Either text or HTML content is required');
    });
  });

  describe('Error Handling', () => {
    it('should handle SendGrid validation errors', async () => {
      const mockError = {
        code: 400,
        response: {
          headers: {},
          body: {
            errors: [{
              message: 'Invalid sender email',
              field: 'from',
              help: 'Please verify your sender identity'
            }]
          }
        }
      };
      (sgMail.send as jest.Mock).mockRejectedValueOnce(mockError);

      const result = await sendGrid.execute(validTemplateParams);
      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(400);
      expect(result.message).toContain('Invalid sender email');
      expect(result.error?.message).toContain('Invalid sender email');
      expect(result.error?.field).toBe('from');
      expect(result.error?.help).toBeDefined();
    });
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
        to: [validBodyParams.config.email.to],
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
        to: [validTemplateParams.config.email.to],
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
