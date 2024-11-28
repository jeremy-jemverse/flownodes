import sgMail, { MailDataRequired } from '@sendgrid/mail';
import { SendGridParameters, SendGridResponse } from './types';

export class SendGrid {
  constructor() {
    if (!process.env.SENDGRID_API_KEY) {
      throw new Error('SendGrid API key not found in environment variables');
    }
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  }

  public async execute(parameters: SendGridParameters): Promise<SendGridResponse> {
    try {
      // Validate parameters before sending
      this.validateParameters(parameters);

      // Initialize with required empty content
      const msg: MailDataRequired = {
        to: parameters.to,
        from: parameters.from,
        subject: parameters.subject,
        content: [{
          type: 'text/plain',
          value: parameters.text || '',
        }],
      };

      // Add HTML content if provided
      if (parameters.html) {
        msg.content.push({
          type: 'text/html',
          value: parameters.html,
        });
      }

      // Add template if provided
      if (parameters.templateId) {
        msg.templateId = parameters.templateId;
        if (parameters.dynamicTemplateData) {
          msg.dynamicTemplateData = parameters.dynamicTemplateData;
        }
      }

      const [response] = await sgMail.send(msg);

      return {
        success: true,
        statusCode: response.statusCode,
        message: 'Email sent successfully',
        response: response,
      };
    } catch (error: any) {
      console.error('Error sending email:', error);
      return {
        success: false,
        statusCode: error.code || 500,
        message: error.message || 'Failed to send email',
        response: error.response?.body,
      };
    }
  }

  public validateParameters(parameters: SendGridParameters): void {
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

    if (parameters.templateId && !parameters.dynamicTemplateData) {
      console.warn('Template ID provided without dynamic template data');
    }
  }
}
