import sgMail, { MailDataRequired } from '@sendgrid/mail';
import { SendGridParameters, SendGridResponse, SendGridBodyParameters, SendGridTemplateParameters } from './types';

export class SendGrid {
  public async execute(parameters: any): Promise<SendGridResponse> {
    try {
      // Transform incoming data to SendGrid parameters
      const sendGridParams = {
        type: parameters.config.email.type,
        apiKey: parameters.config.connection.apiKey,
        from: parameters.config.email.from,
        to: parameters.config.email.to,
        subject: parameters.config.email.subject,
        text: parameters.config.email.body?.text,
        html: parameters.config.email.body?.html,
        ...(parameters.config.email.type === 'template' && {
          templateId: parameters.config.email.templateId,
          dynamicTemplateData: parameters.config.email.dynamicTemplateData
        })
      };

      // Validate parameters before sending
      this.validateParameters(sendGridParams);

      // Set API key for this request
      sgMail.setApiKey(sendGridParams.apiKey);

      // Construct the base email message
      const msg = {
        to: sendGridParams.to,
        from: sendGridParams.from,
        subject: sendGridParams.subject,
      } as MailDataRequired;

      // Add content based on email type
      if (sendGridParams.type === 'template') {
        this.addTemplateContent(msg, sendGridParams as SendGridTemplateParameters);
      } else {
        this.addBodyContent(msg, sendGridParams as SendGridBodyParameters);
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
      if (error && typeof error === 'object' && 'code' in error) {
        const sgError = error as { code: number; response: { headers: any; body: any } };
        return {
          success: false,
          statusCode: sgError.code,
          message: 'Failed to send email',
          error: {
            message: sgError.response?.body?.errors?.[0]?.message || 'SendGrid API error',
            code: String(sgError.code),
            response: {
              headers: sgError.response?.headers,
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
