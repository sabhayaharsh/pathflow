// responseHelper.js
const crypto = require('crypto'); // For generating random tokens
const nodemailer = require('nodemailer'); // For sending emails
const fs = require('fs');
const path = require('path');
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const algorithm = 'aes-256-cbc';
const key = process.env.ENCRYPTION_KEY;

const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

const validatePhoneNumber = (phoneNumber) => {
    const phoneRegex = /^\d{10}$/;
    return phoneRegex.test(phoneNumber);
};

class ResponseHelper {
    static respond(status, success, data, message, res) {
        const response = { success };

        if (data) {
            response.data = data;
        }

        if (message) {
            response.message = message;
        }

        return res.status(status).json(response);
    }

    static validateAndRespond(validationErrors, data, res) {
        if (Object.keys(validationErrors).length > 0) {
            return this.respond(400, false, { error: validationErrors }, null, res);
        }

        return this.respond(200, true, data, null, res);
    }

    static validateEmail(email) {
        return validateEmail(email);
    }

    static validatePhoneNumber(phoneNumber) {
        return validatePhoneNumber(phoneNumber);
    }

    static generateVerificationToken() {
        // Generate a unique verification token
        return crypto.randomBytes(20).toString('hex');
    }

    static getRandomString(prefix = '', length = 8) {
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = prefix;
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    // static getRandomAmount() {
    //     return (Math.random() * 100).toFixed(2); // Example: Generates values like 12.34
    // }
    

    static generateRandomPassword(length) {
        const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
        let password = '';
        for (let i = 0; i < length; i++) {
            const randomIndex = Math.floor(Math.random() * charset.length);
            password += charset[randomIndex];
        }
        return password;
    }

    static calculateTokenExpiration() {
        // Calculate the expiration time for the verification token (e.g., 30 minutes from now)
        const expirationTime = new Date();
        expirationTime.setMinutes(expirationTime.getMinutes() + 30);
        return expirationTime;
    }

    static generateOTP() {
        return Math.floor(10000 + Math.random() * 9000).toString();
    }

    static async sendEmail(to, subject, templateName, replacements) {
        // Read the HTML template file
    if (process.env.PUSH_ENV === 'prod') {
        const templatePath = path.join(__dirname, '../public/templates', `${templateName}.html`);
        console.log(templatePath);
        let html = fs.readFileSync(templatePath, 'utf8');

        // Replace placeholders with actual values
        for (const key in replacements) {
            const placeholder = new RegExp(`{{${key}}}`, 'g');
            html = html.replace(placeholder, replacements[key]);
        }

        const msg = {
            to: to,
            from: 'thepathmakerapp@gmail.com', // Use the email address or domain you verified with SendGrid
            subject: subject,
            html: html,
        };

        try {
            const response = await sgMail.send(msg);
        } catch (error) {
            console.error('Error sending email: ', error);
            throw error;
        }
    }
    }

    static encrypt(text) {
        // Check if key is set and has the correct length
        if (!key) {
            throw new Error('ENCRYPTION_KEY environment variable is not set');
        }
        if (key.length !== 32) {
            throw new Error('ENCRYPTION_KEY must be exactly 32 bytes long');
        }

        const iv = crypto.randomBytes(16);

        let cipher = crypto.createCipheriv(algorithm, Buffer.from(key, 'utf-8'), iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        return iv.toString('hex') + ':' + encrypted;
    }

    static decrypt(text) {
        let textParts = text?.split(':');
        let iv = Buffer.from(textParts.shift(), 'hex');
        let encryptedText = Buffer.from(textParts.join(':'), 'hex');

        let decipher = crypto.createDecipheriv(algorithm, Buffer.from(key, 'utf-8'), iv);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    }
}

module.exports = ResponseHelper;
