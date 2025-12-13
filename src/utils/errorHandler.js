const { dialog } = require('electron');
const logger = require('./logger');

class ErrorHandler {
  constructor() {
    this.setupGlobalHandlers();
  }
  
  setupGlobalHandlers() {
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      this.handleCriticalError('Uncaught Exception', error);
    });
    
    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      this.handleCriticalError('Unhandled Rejection', reason);
    });
  }
  
  handleCriticalError(type, error) {
    logger.error(`${type}:`, {
      message: error.message,
      stack: error.stack,
      type: type
    });
    
    // In development, show the error
    if (process.env.NODE_ENV !== 'production') {
      console.error(`${type}:`, error);
    }
    
    // Show user-friendly error dialog
    dialog.showErrorBox(
      'Application Error',
      `An unexpected error occurred. The application will continue running, but some features may not work properly.\n\nError: ${error.message}\n\nPlease check the logs for more details.`
    );
  }
  
  handleError(context, error, showDialog = false) {
    logger.error(`Error in ${context}:`, {
      message: error.message,
      stack: error.stack,
      context: context
    });
    
    if (showDialog) {
      dialog.showErrorBox(
        'Error',
        `An error occurred: ${error.message}`
      );
    }
    
    return {
      success: false,
      error: error.message
    };
  }
  
  wrapAsync(fn, context = 'AsyncFunction') {
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (error) {
        return this.handleError(context, error);
      }
    };
  }
}

module.exports = new ErrorHandler();
