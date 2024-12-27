import { SendGrid } from '../SendGrid';
import sgMail from '@sendgrid/mail';

jest.mock('@sendgrid/mail', () => ({
  setApiKey: jest.fn(),
  send: jest.fn()
}));

describe('SendGrid', () => {
  let sendGrid: SendGrid;

  beforeEach(() => {
    sendGrid = new SendGrid();
    jest.clearAllMocks();
  });

  const validParams = {
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

  describe('execute', () => {
    it('should send email successfully', async () => {
      (sgMail.send as jest.Mock).mockResolvedValueOnce([{ statusCode: 202 }]);

      const result = await sendGrid.execute(validParams);

      expect(sgMail.setApiKey).toHaveBeenCalledWith('test-api-key');
      expect(sgMail.send).toHaveBeenCalledWith({
        to: ['test@example.com'],
        from: 'sender@example.com',
        subject: 'Test Email',
        text: 'Test email content'
      });
      expect(result).toEqual({
        success: true,
        message: 'Email sent successfully'
      });
    });

    it('should send template email successfully', async () => {
      const templateParams = {
        config: {
          connection: {
            apiKey: 'test-api-key'
          },
          email: {
            type: 'template',
            to: 'test@example.com',
            from: 'sender@example.com',
            subject: 'Test Email',
            templateId: 'template-123',
            dynamicTemplateData: {
              name: 'Test User'
            }
          }
        }
      };

      (sgMail.send as jest.Mock).mockResolvedValueOnce([{ statusCode: 202 }]);

      const result = await sendGrid.execute(templateParams);

      expect(sgMail.setApiKey).toHaveBeenCalledWith('test-api-key');
      expect(sgMail.send).toHaveBeenCalledWith({
        to: ['test@example.com'],
        from: 'sender@example.com',
        subject: 'Test Email',
        templateId: 'template-123',
        dynamicTemplateData: {
          name: 'Test User'
        }
      });
      expect(result).toEqual({
        success: true,
        message: 'Email sent successfully'
      });
    });

    it('should handle multiple recipients', async () => {
      const multiRecipientParams = {
        ...validParams,
        config: {
          ...validParams.config,
          email: {
            ...validParams.config.email,
            to: ['test1@example.com', 'test2@example.com']
          }
        }
      };

      (sgMail.send as jest.Mock).mockResolvedValueOnce([{ statusCode: 202 }]);

      const result = await sendGrid.execute(multiRecipientParams);

      expect(sgMail.send).toHaveBeenCalledWith(expect.objectContaining({
        to: ['test1@example.com', 'test2@example.com']
      }));
      expect(result.success).toBe(true);
    });

    it('should validate required parameters', async () => {
      const invalidParams = {
        config: {
          connection: {},
          email: {
            type: 'body'
          }
        }
      };

      await expect(sendGrid.execute(invalidParams))
        .rejects
        .toThrow('SendGrid API key is required');
    });

    it('should validate email addresses', async () => {
      const invalidEmailParams = {
        ...validParams,
        config: {
          ...validParams.config,
          email: {
            ...validParams.config.email,
            to: 'invalid-email'
          }
        }
      };

      await expect(sendGrid.execute(invalidEmailParams))
        .rejects
        .toThrow('Invalid email address: invalid-email');
    });

    it('should require template ID for template emails', async () => {
      const invalidTemplateParams = {
        ...validParams,
        config: {
          ...validParams.config,
          email: {
            ...validParams.config.email,
            type: 'template'
          }
        }
      };

      await expect(sendGrid.execute(invalidTemplateParams))
        .rejects
        .toThrow('Template ID is required for template emails');
    });

    it('should handle SendGrid API errors', async () => {
      (sgMail.send as jest.Mock).mockRejectedValueOnce(new Error('API error'));

      await expect(sendGrid.execute(validParams))
        .rejects
        .toThrow('API error');
    });
  });
});
