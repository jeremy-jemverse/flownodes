import sgMail, { MailDataRequired } from '@sendgrid/mail';
import { SendGridParameters, SendGridResponse } from './types';

export class SendGrid {
  constructor() {
    // Remove constructor initialization since we'll set the API key per request
  }

  public async execute(parameters: SendGridParameters): Promise<SendGridResponse> {
    try {
      // Validate parameters before sending
      this.validateParameters(parameters);

      // Set API key for this request
      try {
        sgMail.setApiKey(parameters.apiKey);
      } catch (error) {
        console.error('Error configuring SendGrid with provided API key:', error);
        return {
          success: false,
          statusCode: 401,
          message: 'Invalid SendGrid API key',
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }

      // Initialize email data
      const msg: Partial<MailDataRequired> = {
        to: parameters.to,
        from: parameters.from,
        subject: parameters.subject,
        content: [{
          type: 'text/plain',
          value: parameters.text || ''
        }]
      };

      // Add optional HTML content
      if (parameters.html) {
        msg.content?.push({
          type: 'text/html',
          value: parameters.html
        });
      }

      // Add optional template
      if (parameters.templateId) {
        msg.templateId = parameters.templateId;
        if (parameters.dynamicTemplateData) {
          msg.dynamicTemplateData = parameters.dynamicTemplateData;
        }
      }

      // Send email
      const [response] = await sgMail.send(msg as MailDataRequired);

      return {
        success: true,
        statusCode: response.statusCode,
        message: 'Email sent successfully',
        response: response
      };

    } catch (error: unknown) {
      console.error('Error sending email:', error);
      return {
        success: false,
        statusCode: (error as any)?.code || 500,
        message: 'Failed to send email',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  public validateParameters(parameters: SendGridParameters): void {
    if (!parameters.apiKey) {
      throw new Error('SendGrid API key is required');
    }
    if (!parameters.to) {
      throw new Error('Recipient (to) is required');
    }
    if (!parameters.from) {
      throw new Error('Sender (from) is required');
    }
    if (!parameters.subject) {
      throw new Error('Subject is required');
    }
    if (!parameters.text && !parameters.html && !parameters.templateId) {
      throw new Error('Either text, HTML content, or template ID is required');
    }
    if (parameters.templateId && !this.isValidTemplateId(parameters.templateId)) {
      throw new Error('Invalid template ID format');
    }
  }

  private isValidTemplateId(templateId: string): boolean {
    // Add any template ID validation logic here
    return typeof templateId === 'string' && templateId.length > 0;
  }
}
