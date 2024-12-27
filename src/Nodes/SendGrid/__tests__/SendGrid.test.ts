import { SendGrid } from '../SendGrid';
import { SendGridParameters } from '../types';
import sgMail from '@sendgrid/mail';

jest.mock('@sendgrid/mail', () => ({
  setApiKey: jest.fn(),
  send: jest.fn()
}));

describe('SendGrid', () => {
  const sendGrid = new SendGrid();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const validApiKey = 'test-api-key';
  const validEmail = 'test@example.com';
  const validSubject = 'Test Subject';
  const validText = 'Test Body';

  describe('execute', () => {
    it('should send body email successfully', async () => {
      (sgMail.send as jest.Mock).mockResolvedValueOnce([{ statusCode: 202 }]);

      const params: SendGridParameters = {
        apiKey: validApiKey,
        to: validEmail,
        from: validEmail,
        subject: validSubject,
        type: 'body',
        text: validText
      };

      const result = await sendGrid.execute(params);

      expect(sgMail.setApiKey).toHaveBeenCalledWith(validApiKey);
      expect(sgMail.send).toHaveBeenCalledWith({
        to: [validEmail],
        from: validEmail,
        subject: validSubject,
        text: validText
      });
      expect(result).toEqual({
        success: true,
        statusCode: 202,
        message: 'Email sent successfully'
      });
    });

    it('should send template email successfully', async () => {
      (sgMail.send as jest.Mock).mockResolvedValueOnce([{ statusCode: 202 }]);

      const params: SendGridParameters = {
        apiKey: validApiKey,
        to: validEmail,
        from: validEmail,
        subject: validSubject,
        type: 'template',
        templateId: 'test-template-id',
        dynamicTemplateData: {
          name: 'Test Name'
        }
      };

      const result = await sendGrid.execute(params);

      expect(sgMail.setApiKey).toHaveBeenCalledWith(validApiKey);
      expect(sgMail.send).toHaveBeenCalledWith({
        to: [validEmail],
        from: validEmail,
        subject: validSubject,
        templateId: 'test-template-id',
        dynamicTemplateData: {
          name: 'Test Name'
        }
      });
      expect(result).toEqual({
        success: true,
        statusCode: 202,
        message: 'Email sent successfully'
      });
    });

    it('should default to body type when type is not specified', async () => {
      (sgMail.send as jest.Mock).mockResolvedValueOnce([{ statusCode: 202 }]);

      const params: SendGridParameters = {
        apiKey: validApiKey,
        to: validEmail,
        from: validEmail,
        subject: validSubject,
        type: 'body',
        text: validText
      };

      const result = await sendGrid.execute(params);

      expect(sgMail.send).toHaveBeenCalledWith({
        to: [validEmail],
        from: validEmail,
        subject: validSubject,
        text: validText
      });
      expect(result).toEqual({
        success: true,
        statusCode: 202,
        message: 'Email sent successfully'
      });
    });

    it('should throw error when required fields are missing', async () => {
      const invalidParams: SendGridParameters = {
        apiKey: validApiKey,
        to: validEmail,
        from: validEmail,
        subject: validSubject,
        type: 'body'
      };

      await expect(sendGrid.execute(invalidParams)).rejects.toThrow('Either HTML or text body is required for body emails');
    });

    it('should throw error when template email is missing templateId', async () => {
      const invalidTemplateParams: SendGridParameters = {
        apiKey: validApiKey,
        to: validEmail,
        from: validEmail,
        subject: validSubject,
        type: 'template',
        templateId: 'test-template-id'  // Add templateId
      };

      await expect(sendGrid.execute(invalidTemplateParams)).rejects.toThrow();
    });

    it('should throw error when body email is missing both text and html', async () => {
      const invalidBodyParams: SendGridParameters = {
        apiKey: validApiKey,
        to: validEmail,
        from: validEmail,
        subject: validSubject,
        type: 'body'
      };

      await expect(sendGrid.execute(invalidBodyParams)).rejects.toThrow('Either HTML or text body is required for body emails');
    });

    it('should handle SendGrid API errors', async () => {
      (sgMail.send as jest.Mock).mockRejectedValueOnce(new Error('API error'));

      await expect(sendGrid.execute({
        apiKey: validApiKey,
        to: validEmail,
        from: validEmail,
        subject: validSubject,
        type: 'body',
        text: validText
      })).rejects.toThrow('API error');
    });
  });

  describe('validate', () => {
    it('should throw error if required fields are missing', () => {
      const params: SendGridParameters = {
        apiKey: validApiKey,
        to: validEmail,
        from: validEmail,
        subject: validSubject,
        type: 'body'
      };

      expect(() => sendGrid.validateParameters(params)).toThrow();
    });

    it('should throw error if type is invalid', () => {
      const params = {
        apiKey: validApiKey,
        to: validEmail,
        from: validEmail,
        subject: validSubject,
        type: 'invalid' as any  // Type assertion to test invalid type
      };

      expect(() => sendGrid.validateParameters(params as SendGridParameters)).toThrow();
    });

    it('should throw error if neither text nor html is provided for body type', () => {
      const params: SendGridParameters = {
        apiKey: validApiKey,
        to: validEmail,
        from: validEmail,
        subject: validSubject,
        type: 'body'
      };

      expect(() => sendGrid.validateParameters(params)).toThrow();
    });

    it('should not throw error if text is provided for body type', () => {
      const params: SendGridParameters = {
        apiKey: validApiKey,
        to: validEmail,
        from: validEmail,
        subject: validSubject,
        type: 'body',
        text: validText
      };

      expect(() => sendGrid.validateParameters(params)).not.toThrow();
    });
  });
});
