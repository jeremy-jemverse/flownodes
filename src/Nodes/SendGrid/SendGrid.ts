import sgMail, { MailDataRequired } from '@sendgrid/mail';
import { SendGridParameters, SendGridResponse, SendGridBodyParameters, SendGridTemplateParameters } from './types';

export class SendGrid {
  public async execute(parameters: SendGridParameters): Promise<SendGridResponse> {
    try {
      // Validate parameters before sending
      this.validateParameters(parameters);

      // Set API key for this request
      sgMail.setApiKey(parameters.apiKey);
      

      // Construct the base email message
      const msg = {
        to: parameters.to,
        from: parameters.from,
        subject: parameters.subject,
      } as MailDataRequired;

      // Add content based on email type
      if (parameters.type === 'template') {
        this.addTemplateContent(msg, parameters);
      } else {
        this.addBodyContent(msg, parameters);
      }

      // Send email using SendGrid
      const [response] = await sgMail.send(msg);

      return {
        success: true,
        statusCode: response.statusCode,
        message: 'Email sent successfully',
        response: {
          headers: response.headers,
          body: response.body
        }
      };

    } catch (error) {
      // Handle SendGrid specific errors
      if (error && typeof error === 'object' && 'response' in error) {
        const sgError = error as { code: string; response: { statusCode: number; body: any } };
        return {
          success: false,
          statusCode: sgError.response?.statusCode || 500,
          message: 'Failed to send email',
          error: {
            message: sgError.response?.body?.message || 'SendGrid API error',
            code: sgError.code,
            response: {
              body: sgError.response?.body
            }
          }
        };
      }

      // Handle other errors
      return {
        success: false,
        statusCode: 500,
        message: 'Failed to send email',
        error: {
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  private addTemplateContent(msg: MailDataRequired, parameters: SendGridTemplateParameters): void {
    msg.templateId = parameters.templateId;
    if (parameters.dynamicTemplateData) {
      msg.dynamicTemplateData = parameters.dynamicTemplateData;
    }
  }

  private addBodyContent(msg: MailDataRequired, parameters: SendGridBodyParameters): void {
    if (!parameters.text && !parameters.html) {
      throw new Error('Either text or HTML content is required for body-based emails');
    }
    
    if (parameters.text) {
      msg.text = parameters.text;
    }
    if (parameters.html) {
      msg.html = parameters.html;
    }
  }

  public validateParameters(parameters: SendGridParameters): void {
    // Validate common parameters
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

    // Type-specific validation
    if (parameters.type === 'template') {
      if (!parameters.templateId) {
        throw new Error('Template ID is required for template-based emails');
      }
    } else if (parameters.type === 'body') {
      if (!parameters.text && !parameters.html) {
        throw new Error('Either text or HTML content is required for body-based emails');
      }
    }
  }
}
