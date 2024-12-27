import sgMail, { MailDataRequired } from '@sendgrid/mail';
import { SendGridParameters, SendGridResponse, SendGridBodyParameters, SendGridTemplateParameters } from './types';

export class SendGrid {
  private validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private formatEmailAddress(email: string, name?: string): string {
    if (!this.validateEmail(email)) {
      throw new Error(`Invalid email address: ${email}`);
    }
    return name ? `${name} <${email}>` : email;
  }

  private formatRecipients(to: string | string[]): string[] {
    const recipients = Array.isArray(to) ? to : [to];
    return recipients.map(recipient => this.formatEmailAddress(recipient));
  }

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
        to: this.formatRecipients(sendGridParams.to),
        from: this.formatEmailAddress(sendGridParams.from),
        subject: sendGridParams.subject?.trim(),
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
      if (error && typeof error === 'object' && 'response' in error) {
        const sgError = error as { 
          code: number; 
          response: { 
            headers: any; 
            body: { 
              errors?: Array<{ message: string; field: string; help?: string }> 
            } 
          } 
        };

        const errorMessage = sgError.response?.body?.errors?.[0]?.message || 'SendGrid API error';
        const errorField = sgError.response?.body?.errors?.[0]?.field;
        const errorHelp = sgError.response?.body?.errors?.[0]?.help;

        return {
          success: false,
          statusCode: sgError.code || 400,
          message: `SendGrid API error: ${errorMessage}${errorField ? ` (${errorField})` : ''}`,
          error: {
            message: errorMessage,
            field: errorField,
            help: errorHelp,
            code: String(sgError.code),
            response: {
              headers: sgError.response?.headers,
              body: sgError.response?.body
            }
          }
        };
      }

      // Handle validation errors
      if (error instanceof Error) {
        return {
          success: false,
          statusCode: 400,
          message: error.message,
          error: {
            message: error.message,
            code: '400'
          }
        };
      }

      // Handle other errors
      return {
        success: false,
        statusCode: 500,
        message: 'Failed to send email',
        error: {
          message: 'Unknown error occurred',
          code: '500'
        }
      };
    }
  }

  private addTemplateContent(msg: MailDataRequired, parameters: SendGridTemplateParameters): void {
    if (!parameters.templateId?.trim()) {
      throw new Error('Template ID is required and cannot be empty');
    }
    msg.templateId = parameters.templateId.trim();
    if (parameters.dynamicTemplateData) {
      msg.dynamicTemplateData = parameters.dynamicTemplateData;
    }
  }

  private addBodyContent(msg: MailDataRequired, parameters: SendGridBodyParameters): void {
    const text = parameters.text?.trim();
    const html = parameters.html?.trim();

    if (!text && !html) {
      throw new Error('Either text or HTML content is required for body-based emails');
    }
    
    if (text) {
      msg.text = text;
    }
    if (html) {
      msg.html = html;
    }
  }

  public validateParameters(parameters: SendGridParameters): void {
    // Validate common parameters
    if (!parameters.apiKey?.trim()) {
      throw new Error('SendGrid API key is required');
    }
    if (!parameters.to) {
      throw new Error('Recipient (to) is required');
    }
    if (!parameters.from) {
      throw new Error('Sender (from) is required');
    }
    if (!parameters.subject?.trim()) {
      throw new Error('Subject is required and cannot be empty');
    }

    // Validate email addresses
    if (Array.isArray(parameters.to)) {
      parameters.to.forEach(email => {
        if (!this.validateEmail(email)) {
          throw new Error(`Invalid recipient email address: ${email}`);
        }
      });
    } else if (!this.validateEmail(parameters.to)) {
      throw new Error(`Invalid recipient email address: ${parameters.to}`);
    }

    if (!this.validateEmail(parameters.from)) {
      throw new Error(`Invalid sender email address: ${parameters.from}`);
    }

    // Type-specific validation
    if (parameters.type === 'template') {
      if (!parameters.templateId?.trim()) {
        throw new Error('Template ID is required for template-based emails');
      }
    } else if (parameters.type === 'body') {
      const text = parameters.text?.trim();
      const html = parameters.html?.trim();
      if (!text && !html) {
        throw new Error('Either text or HTML content is required for body-based emails');
      }
    }
  }
}
