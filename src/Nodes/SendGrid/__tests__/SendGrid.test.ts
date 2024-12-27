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

  const validBodyParams = {
    apiKey: 'test-api-key',
    to: 'test@example.com',
    from: 'sender@example.com',
    subject: 'Test Email',
    type: 'body',
    text: 'Test email content'
  };

  const validTemplateParams = {
    apiKey: 'test-api-key',
    to: 'test@example.com',
    from: 'sender@example.com',
    subject: 'Test Email',
    type: 'template',
    templateId: 'test-template-id',
    dynamicTemplateData: { name: 'Test' }
  };

  describe('execute', () => {
    it('should send body email successfully', async () => {
      (sgMail.send as jest.Mock).mockResolvedValueOnce([{ statusCode: 202 }]);

      const result = await sendGrid.execute(validBodyParams);

      expect(sgMail.setApiKey).toHaveBeenCalledWith('test-api-key');
      expect(sgMail.send).toHaveBeenCalledWith({
        to: ['test@example.com'],
        from: 'sender@example.com',
        subject: 'Test Email',
        text: 'Test email content'
      });
      expect(result).toEqual({
        success: true,
        statusCode: 202,
        message: 'Email sent successfully'
      });
    });

    it('should send template email successfully', async () => {
      (sgMail.send as jest.Mock).mockResolvedValueOnce([{ statusCode: 202 }]);

      const result = await sendGrid.execute(validTemplateParams);

      expect(sgMail.setApiKey).toHaveBeenCalledWith('test-api-key');
      expect(sgMail.send).toHaveBeenCalledWith({
        to: ['test@example.com'],
        from: 'sender@example.com',
        subject: 'Test Email',
        templateId: 'test-template-id',
        dynamicTemplateData: { name: 'Test' }
      });
      expect(result).toEqual({
        success: true,
        statusCode: 202,
        message: 'Email sent successfully'
      });
    });

    it('should default to body type when type is not specified', async () => {
      (sgMail.send as jest.Mock).mockResolvedValueOnce([{ statusCode: 202 }]);

      const paramsWithoutType = {
        apiKey: 'test-api-key',
        to: 'test@example.com',
        from: 'sender@example.com',
        subject: 'Test Email',
        text: 'Test email content'
      };

      const result = await sendGrid.execute(paramsWithoutType);

      expect(sgMail.send).toHaveBeenCalledWith({
        to: ['test@example.com'],
        from: 'sender@example.com',
        subject: 'Test Email',
        text: 'Test email content'
      });
      expect(result).toEqual({
        success: true,
        statusCode: 202,
        message: 'Email sent successfully'
      });
    });

    it('should throw error when required fields are missing', async () => {
      const invalidParams = {
        apiKey: 'test-api-key',
        // missing 'to' and 'from'
        subject: 'Test Email',
        text: 'Test email content'
      };

      await expect(sendGrid.execute(invalidParams)).rejects.toThrow('From email is required');
    });

    it('should throw error when template email is missing templateId', async () => {
      const invalidTemplateParams = {
        ...validBodyParams,
        type: 'template'
        // missing templateId
      };

      await expect(sendGrid.execute(invalidTemplateParams)).rejects.toThrow('Template ID is required for template emails');
    });

    it('should throw error when body email is missing both text and html', async () => {
      const invalidBodyParams = {
        ...validBodyParams,
        text: undefined,
        html: undefined
      };

      await expect(sendGrid.execute(invalidBodyParams)).rejects.toThrow('Either HTML or text body is required for body emails');
    });

    it('should handle SendGrid API errors', async () => {
      (sgMail.send as jest.Mock).mockRejectedValueOnce(new Error('API error'));

      await expect(sendGrid.execute(validBodyParams))
        .rejects
        .toThrow('API error');
    });
  });
});
