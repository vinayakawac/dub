const crypto = require('crypto');

class SecurityManager {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32;
  }
  
  // Generate a secure encryption key
  generateKey() {
    return crypto.randomBytes(this.keyLength).toString('hex');
  }
  
  // Encrypt sensitive data
  encrypt(text, key) {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(
        this.algorithm, 
        Buffer.from(key, 'hex'), 
        iv
      );
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      return {
        encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex')
      };
    } catch (error) {
      throw new Error('Encryption failed: ' + error.message);
    }
  }
  
  // Decrypt sensitive data
  decrypt(encryptedData, key) {
    try {
      const decipher = crypto.createDecipheriv(
        this.algorithm,
        Buffer.from(key, 'hex'),
        Buffer.from(encryptedData.iv, 'hex')
      );
      
      decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
      
      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      throw new Error('Decryption failed: ' + error.message);
    }
  }
  
  // Sanitize user input
  sanitizeInput(input) {
    if (typeof input !== 'string') {
      return input;
    }
    
    // Remove potentially dangerous characters
    return input
      .replace(/[<>]/g, '')
      .trim();
  }
  
  // Validate API key format
  validateApiKey(key, provider) {
    if (!key || typeof key !== 'string') {
      return { valid: false, error: 'API key is required' };
    }
    
    const patterns = {
      groq: /^gsk_[a-zA-Z0-9]{32,}$/,
      openai: /^sk-[a-zA-Z0-9]{32,}$/,
      anthropic: /^sk-ant-[a-zA-Z0-9-]{32,}$/
    };
    
    const pattern = patterns[provider];
    if (!pattern) {
      return { valid: true }; // Unknown provider, skip validation
    }
    
    if (!pattern.test(key)) {
      return { 
        valid: false, 
        error: `Invalid ${provider} API key format` 
      };
    }
    
    return { valid: true };
  }
  
  // Mask sensitive data for logging
  maskSensitiveData(data) {
    if (typeof data !== 'string') {
      return data;
    }
    
    // Mask API keys
    const apiKeyPattern = /(sk-[a-zA-Z0-9]{8})[a-zA-Z0-9]*/g;
    const groqKeyPattern = /(gsk_[a-zA-Z0-9]{8})[a-zA-Z0-9]*/g;
    
    return data
      .replace(apiKeyPattern, '$1****')
      .replace(groqKeyPattern, '$1****');
  }
}

module.exports = new SecurityManager();
