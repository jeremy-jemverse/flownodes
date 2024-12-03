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

  beforeEach(() => {
    sendGrid = new SendGrid();
    jest.clearAllMocks();
  });

  describe('Body-based emails', () => {
    const validBodyParams: SendGridBodyParameters = {
      type: 'body',
      apiKey: mockApiKey,
      to: 'test@example.com',
      from: 'sender@example.com',
      subject: 'Test Subject',
      text: 'Test content',
      html: '<p>Test HTML content</p>'
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
        to: validBodyParams.to,
        from: validBodyParams.from,
        subject: validBodyParams.subject,
        text: validBodyParams.text,
        html: validBodyParams.html
      });
      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(202);
    });

    it('should handle body-based email with only text content', async () => {
      const textOnlyParams: SendGridBodyParameters = {
        ...validBodyParams,
        html: undefined
      };
      const mockResponse = [{ statusCode: 202, headers: {}, body: {} }];
      (sgMail.send as jest.Mock).mockResolvedValueOnce(mockResponse);

      const result = await sendGrid.execute(textOnlyParams);

      expect(result.success).toBe(true);
      expect(sgMail.send).toHaveBeenCalledWith(expect.not.objectContaining({ html: expect.anything() }));
    });

    it('should fail if neither text nor html is provided', async () => {
      const invalidParams: SendGridBodyParameters = {
        ...validBodyParams,
        text: undefined,
        html: undefined
      };

      const result = await sendGrid.execute(invalidParams);
      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Either text or HTML content is required for body-based emails');
    });
  });

  describe('Template-based emails', () => {
    const validTemplateParams: SendGridTemplateParameters = {
      type: 'template',
      apiKey: mockApiKey,
      to: 'test@example.com',
      from: 'sender@example.com',
      subject: 'Test Subject',
      templateId: 'd-template-id',
      dynamicTemplateData: { name: 'Test User' }
    };

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
        to: validTemplateParams.to,
        from: validTemplateParams.from,
        subject: validTemplateParams.subject,
        templateId: validTemplateParams.templateId,
        dynamicTemplateData: validTemplateParams.dynamicTemplateData
      });
      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(202);
    });

    it('should handle template without dynamic data', async () => {
      const templateWithoutDataParams: SendGridTemplateParameters = {
        ...validTemplateParams,
        dynamicTemplateData: undefined
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
        type: 'template',
        apiKey: mockApiKey,
        to: 'test@example.com',
        from: 'sender@example.com',
        subject: 'Test Subject',
        templateId: ''  
      } as SendGridTemplateParameters;

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
          statusCode: 401,
          body: {
            errors: [{ message: 'Invalid API key' }]
          }
        }
      };
      (sgMail.send as jest.Mock).mockRejectedValueOnce(mockError);

      const result = await sendGrid.execute({
        type: 'body',
        apiKey: 'invalid-key',
        to: 'test@example.com',
        from: 'sender@example.com',
        subject: 'Test',
        text: 'Test'
      });

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(401);
      expect(result.error).toBeDefined();
    });
  });
});
