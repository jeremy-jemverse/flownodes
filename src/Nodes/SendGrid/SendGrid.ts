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

  public validate(params: SendGridParameters): void {
    this.validateParameters(params);
  }

  private validateParameters(params: SendGridParameters): void {
    console.log('[SendGrid] Validating parameters:', JSON.stringify(params, null, 2));
    
    // Default to "body" type if undefined or empty
    if (!params.type) {
      (params as SendGridBodyParameters).type = 'body';
    }
    
    if (!params.apiKey) {
      throw new Error('SendGrid API key is required');
    }

    if (!params.from) {
      throw new Error('From email is required');
    }

    if (!params.to) {
      throw new Error('To email is required');
    }

    if (params.type === 'template' && !params.templateId) {
      throw new Error('Template ID is required for template emails');
    }

    if (params.type === 'body' && !params.html && !params.text) {
      throw new Error('Either HTML or text body is required for body emails');
    }
  }

  private formatRequestBody(params: any): any {
    console.log('[SendGrid] Formatting request body');
    const msg = {
      to: this.formatRecipients(params.to),
      from: this.formatEmailAddress(params.from),
      subject: params.subject?.trim(),
    };

    if (params.type === 'template') {
      console.log('[SendGrid] Processing template email');
      return {
        ...msg,
        templateId: params.templateId,
        dynamicTemplateData: params.dynamicTemplateData
      };
    } else {
      console.log('[SendGrid] Processing body email');
      return {
        ...msg,
        text: params.text,
        html: params.html
      };
    }
  }

  public async execute(params: any): Promise<any> {
    try {
      console.log('[SendGrid] Starting execution');
      
      // Validate all parameters
      this.validateParameters(params);
      
      // Format the request body
      const requestBody = this.formatRequestBody(params);
      console.log('[SendGrid] Request body prepared:', JSON.stringify(requestBody, null, 2));

      // Set API key
      sgMail.setApiKey(params.apiKey);
      console.log('[SendGrid] API key set');

      // Send email
      console.log('[SendGrid] Sending email');
      const [response] = await sgMail.send(requestBody);
      console.log('[SendGrid] Email sent successfully');

      return {
        success: true,
        statusCode: response.statusCode,
        message: 'Email sent successfully'
      };

    } catch (error) {
      console.error('[SendGrid] Error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(message);
    }
  }
}
