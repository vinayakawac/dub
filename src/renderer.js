const { ipcRenderer } = require('electron');
const Groq = require('groq-sdk');
const fs = require('fs');

// Configuration
let CONFIG = {
  provider: 'groq',
  groqKey: '',
  currentModel: 'llama-3.3-70b-versatile',
  whisperModel: 'whisper-large-v3'
};

let groqClient = null;
let useBrowserSpeech = true; // Use free browser speech recognition
let resumeContext = '';
let jobContext = '';
let conversationHistory = [];
let isRecording = false;
let isInitialized = false;

// DOM Elements
const answerContainer = document.getElementById('answer-container');
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');
const modelIndicator = document.getElementById('model-indicator');
const recordingIndicator = document.getElementById('recording-indicator');
const recordBtn = document.getElementById('record-btn');
const screenBtn = document.getElementById('screen-btn');
const clearBtn = document.getElementById('clear-btn');
const hideBtn = document.getElementById('hide-btn');
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const closeSettings = document.getElementById('close-settings');
const saveSettingsBtn = document.getElementById('save-settings');
const openaiKeyInput = document.getElementById('openai-key');
const modelSelect = document.getElementById('model-select');
const jobDescriptionInput = document.getElementById('job-description');
const resumeSummaryInput = document.getElementById('resume-summary');

// Initialize application
async function init() {
  try {
    console.log('Initializing dub application...');
    
    // Get configuration from main process
    const config = await ipcRenderer.invoke('get-config');
    console.log('Config received:', { 
      hasApiKeys: !!config.apiKeys, 
      hasGroqKey: !!(config.apiKeys && config.apiKeys.groq),
      groqKeyLength: config.apiKeys?.groq?.length 
    });
    
    // Load API key
    if (config.apiKeys && config.apiKeys.groq && config.apiKeys.groq.length > 10) {
      CONFIG.groqKey = config.apiKeys.groq;
      console.log('Groq API key loaded successfully');
    } else {
      console.error('No valid Groq API key found');
      updateStatus('API Key Required - Open Settings', 'error');
      setTimeout(() => {
        showError('Please add your Groq API key in Settings. Get one free at console.groq.com');
      }, 1000);
      return;
    }
    
    // Initialize Groq client
    try {
      groqClient = new Groq({ 
        apiKey: CONFIG.groqKey,
        dangerouslyAllowBrowser: true 
      });
      console.log('Groq client initialized');
      isInitialized = true;
      updateStatus('Ready - AI Connected', 'ready');
    } catch (error) {
      console.error('Failed to initialize Groq client:', error);
      updateStatus('Client Error - Check Settings', 'error');
      return;
    }
    
    // Load model settings
    if (config.settings && config.settings.model) {
      CONFIG.currentModel = config.settings.model;
      modelIndicator.textContent = 'Llama 3.3 70B';
      modelSelect.value = CONFIG.currentModel;
    } else {
      modelIndicator.textContent = 'Llama 3.3 70B';
    }
    
    // Load resume context
    if (config.resume) {
      resumeContext = config.resume;
      resumeSummaryInput.value = resumeContext;
    }
    
    // Load job description
    if (config.jobDescription) {
      jobContext = config.jobDescription;
      jobDescriptionInput.value = jobContext;
    }
    
    // Populate API key input if available
    if (config.apiKeys && config.apiKeys.groq) {
      openaiKeyInput.value = config.apiKeys.groq;
    }
    
    // Initialize browser speech recognition
    initBrowserSpeechRecognition();
    
    console.log('Initialization complete');
    
  } catch (error) {
    console.error('Initialization error:', error);
    updateStatus('Initialization Failed', 'error');
    showError('Failed to initialize. Check console for details.');
  }
}

// Browser Speech Recognition (FREE - no API needed)
let recognition = null;

function initBrowserSpeechRecognition() {
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    
    recognition.onstart = () => {
      console.log('Speech recognition started');
      updateStatus('Listening... Speak now!', 'recording');
    };
    
    recognition.onresult = async (event) => {
      const transcript = event.results[0][0].transcript;
      console.log('Transcript:', transcript);
      updateStatus('Processing speech...', 'processing');
      if (transcript.trim()) {
        await generateAnswer(transcript);
      } else {
        updateStatus('No speech detected', 'ready');
      }
    };
    
    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      let errorMessage = '';
      let showInputFallback = false;
      
      switch(event.error) {
        case 'no-speech':
          errorMessage = 'No speech detected - Try again or type your question below';
          showInputFallback = true;
          break;
        case 'audio-capture':
          errorMessage = 'Microphone not accessible - Check permissions in browser settings';
          break;
        case 'not-allowed':
          errorMessage = 'Microphone blocked - Allow microphone access in browser';
          break;
        case 'network':
          errorMessage = 'Network Error - Internet required for speech recognition. Type your question below instead.';
          showInputFallback = true;
          break;
        case 'service-not-allowed':
          errorMessage = 'Speech service unavailable - Check internet connection or type question below';
          showInputFallback = true;
          break;
        default:
          errorMessage = 'Speech error: ' + event.error + ' - Try typing your question instead';
          showInputFallback = true;
      }
      
      updateStatus(errorMessage, 'error');
      
      // Show manual input option for network errors
      if (showInputFallback) {
        setTimeout(() => {
          showManualInputPrompt();
        }, 100);
      }
      
      isRecording = false;
      recordingIndicator.classList.remove('active');
      recordBtn.classList.remove('active');
      recordBtn.querySelector('.btn-label').textContent = 'Record';
    };
    
    recognition.onend = () => {
      console.log('Speech recognition ended');
      isRecording = false;
      recordingIndicator.classList.remove('active');
      recordBtn.classList.remove('active');
      recordBtn.querySelector('.btn-label').textContent = 'Record';
      if (statusText.textContent.includes('Listening')) {
        updateStatus('Ready (Free Mode)', 'ready');
      }
    };
    
    useBrowserSpeech = true;
    console.log('Browser speech recognition initialized');
  } else {
    console.warn('Speech recognition not supported in this browser');
    showError('Speech recognition not supported. Please use Chrome or Edge browser.');
    useBrowserSpeech = false;
  }
}

// Mouse events no longer needed - window is now fully interactive

// Recording event handlers
ipcRenderer.on('recording-started', () => {
  isRecording = true;
  updateStatus('Recording...', 'recording');
  recordingIndicator.classList.add('active');
  recordBtn.classList.add('active');
  recordBtn.querySelector('.btn-label').textContent = 'Stop';
});

ipcRenderer.on('recording-stopped', async (event, audioPath) => {
  isRecording = false;
  updateStatus('Processing...', 'processing');
  recordingIndicator.classList.remove('active');
  recordBtn.classList.remove('active');
  recordBtn.querySelector('.btn-label').textContent = 'Record';
  
  await processAudio(audioPath);
});

ipcRenderer.on('recording-error', (event, error) => {
  updateStatus(`Error: ${error}`, 'error');
  isRecording = false;
  recordingIndicator.classList.remove('active');
  recordBtn.classList.remove('active');
});

ipcRenderer.on('open-settings', () => {
  settingsModal.classList.add('active');
});

// Process audio with Groq Whisper (FREE!)
async function processAudio(audioPath) {
  if (!groqClient) {
    showError('Groq client not initialized. Using browser speech recognition instead.');
    updateStatus('Ready', 'ready');
    return;
  }

  try {
    // Read audio file
    const audioBuffer = fs.readFileSync(audioPath);
    const audioBlob = new Blob([audioBuffer], { type: 'audio/wav' });
    const audioFile = new File([audioBlob], 'audio.wav', { type: 'audio/wav' });
    
    // Transcribe with Groq's Whisper (FREE!)
    const transcription = await groqClient.audio.transcriptions.create({
      file: audioFile,
      model: CONFIG.whisperModel,
      language: 'en',
      response_format: 'json'
    });

    const question = transcription.text;
    
    if (question.trim()) {
      await generateAnswer(question);
    } else {
      updateStatus('No speech detected', 'ready');
    }
    
    // Clean up audio file
    if (fs.existsSync(audioPath)) {
      fs.unlinkSync(audioPath);
    }
  } catch (error) {
    console.error('Audio processing error:', error);
    showError('Failed to process audio: ' + error.message);
    updateStatus('Ready', 'ready');
  }
}

// Generate AI answer
async function generateAnswer(question) {
  if (!groqClient || !isInitialized) {
    showError('AI not initialized. Please open Settings and add your Groq API key.');
    updateStatus('Setup Required', 'error');
    return;
  }

  if (!CONFIG.groqKey || CONFIG.groqKey.length < 10) {
    showError('Invalid API key. Please check Settings and add a valid Groq API key.');
    updateStatus('API Key Required', 'error');
    return;
  }

  try {
    updateStatus('Generating answer...', 'processing');
    console.log('Generating answer for:', question.substring(0, 50) + '...');
    
    const systemPrompt = buildSystemPrompt();
    
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: question }
    ];
    
    // Use Groq's Llama model
    const response = await groqClient.chat.completions.create({
      model: CONFIG.currentModel,
      messages: messages,
      max_tokens: 500,
      temperature: 0.7
    });
    
    const answer = response.choices[0].message.content;
    console.log('Answer generated successfully');
    
    displayAnswer(question, answer);
    
    // Update conversation history
    conversationHistory.push(
      { role: 'user', content: question },
      { role: 'assistant', content: answer }
    );
    
    // Keep only last 10 exchanges
    if (conversationHistory.length > 20) {
      conversationHistory = conversationHistory.slice(-20);
    }
    
    updateStatus('Ready - AI Connected', 'ready');
    
    // Show notification
    ipcRenderer.send('show-notification', 'dub', 'Answer generated successfully');
    
  } catch (error) {
    console.error('AI generation error:', error);
    console.error('Error details:', error.message);
    
    if (error.message.includes('API key') || error.message.includes('401') || error.message.includes('Unauthorized') || error.message.includes('invalid_api_key')) {
      if (!CONFIG.groqKey || CONFIG.groqKey.length < 10) {
        showError('API Key Required - Click Settings and add your free Groq API key from console.groq.com');
      } else {
        showError('Invalid API Key - Your key may be incorrect or expired. Get a new free key from console.groq.com');
      }
      updateStatus('Authentication Failed', 'error');
    } else if (error.message.includes('rate limit') || error.message.includes('429')) {
      showError('Rate limit reached. Free tier: 30 requests/min. Wait a moment and try again.');
      updateStatus('Rate Limited', 'error');
    } else if (error.message.includes('network') || error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
      showError('Network error - Check your internet connection and try again.');
      updateStatus('Network Error', 'error');
    } else {
      showError(`Error: ${error.message}. Try again or check Settings.`);
      updateStatus('Error Occurred', 'error');
    }
  }
}

// Build context-aware system prompt
function buildSystemPrompt() {
  let prompt = `You are an expert interview coach helping a candidate answer questions concisely and effectively during a live interview.

CRITICAL INSTRUCTIONS:
- Provide 3-4 concise talking points that can be spoken naturally
- Keep each point under 30 words
- Use the STAR method (Situation, Task, Action, Result) for behavioral questions
- For technical questions, provide clear, accurate explanations with examples
- Match the tone to the question type (professional, technical, conversational)
- Be conversational and natural - avoid bullet points in your response
- Focus on actionable, memorable points the candidate can easily remember

`;

  if (resumeContext && resumeContext.trim()) {
    prompt += `\nCANDIDATE BACKGROUND:\n${resumeContext}\n\nUse this background to personalize answers with relevant experience.\n`;
  }

  if (jobContext && jobContext.trim()) {
    prompt += `\nJOB CONTEXT:\n${jobContext}\n\nTailor responses to align with this role's requirements.\n`;
  }

  return prompt;
}

// Display answer in UI
function displayAnswer(question, answer) {
  const card = document.createElement('div');
  card.className = 'answer-card';
  
  const questionDiv = document.createElement('div');
  questionDiv.className = 'question';
  questionDiv.textContent = `Q: ${question}`;
  
  const answerDiv = document.createElement('div');
  answerDiv.className = 'answer';
  
  // Split answer into talking points
  const lines = answer.split('\n').filter(line => line.trim());
  
  lines.forEach(line => {
    const pointDiv = document.createElement('div');
    pointDiv.className = 'talking-point';
    pointDiv.textContent = line.replace(/^[-•*]\s*/, '').replace(/^\d+\.\s*/, '');
    answerDiv.appendChild(pointDiv);
  });
  
  card.appendChild(questionDiv);
  card.appendChild(answerDiv);
  
  // Clear empty state
  const emptyState = answerContainer.querySelector('.empty-state');
  if (emptyState) {
    answerContainer.removeChild(emptyState);
  }
  
  // Add to top
  answerContainer.insertBefore(card, answerContainer.firstChild);
  answerContainer.scrollTop = 0;
}

// Show error message
function showError(message) {
  const card = document.createElement('div');
  card.className = 'answer-card';
  card.style.borderLeftColor = '#ef4444';
  
  const errorDiv = document.createElement('div');
  errorDiv.className = 'answer';
  errorDiv.style.color = '#fca5a5';
  errorDiv.textContent = `Warning: ${message}`;
  
  card.appendChild(errorDiv);
  
  const emptyState = answerContainer.querySelector('.empty-state');
  if (emptyState) {
    answerContainer.removeChild(emptyState);
  }
  
  answerContainer.insertBefore(card, answerContainer.firstChild);
  answerContainer.scrollTop = 0;
}

// Button handlers
recordBtn.addEventListener('click', () => {
  if (isRecording) {
    // Stop recording
    if (useBrowserSpeech && recognition) {
      recognition.stop();
    } else {
      ipcRenderer.send('manual-record-stop');
    }
  } else {
    // Start recording with FREE browser speech recognition
    if (useBrowserSpeech && recognition) {
      try {
        isRecording = true;
        recordingIndicator.classList.add('active');
        recordBtn.classList.add('active');
        recordBtn.querySelector('.btn-label').textContent = 'Stop';
        updateStatus('Listening (Free)...', 'recording');
        recognition.start();
      } catch (error) {
        console.error('Speech recognition error:', error);
        showError('Browser speech not available. Check microphone permissions.');
        isRecording = false;
      }
    } else {
      ipcRenderer.send('manual-record-start');
    }
  }
});

let screenReadingActive = false;
let screenReadingInterval = null;

screenBtn.addEventListener('click', async () => {
  showError('Screen Capture: Under Development - Coming Soon!');
  updateStatus('Feature in development', 'ready');
});

clearBtn.addEventListener('click', () => {
  answerContainer.innerHTML = `
    <div class="empty-state">
      <div class="empty-title">Cleared! Ready for next question</div>
      <div class="empty-subtitle">Press Ctrl+Shift+R to start recording</div>
    </div>
  `;
  conversationHistory = [];
  ipcRenderer.send('show-notification', 'dub', 'Chat cleared');
});

hideBtn.addEventListener('click', () => {
  window.close();
});

// Settings modal handlers
settingsBtn.addEventListener('click', () => {
  settingsModal.classList.add('active');
  loadSettings();
});

closeSettings.addEventListener('click', () => {
  settingsModal.classList.remove('active');
});

settingsModal.addEventListener('click', (e) => {
  if (e.target === settingsModal) {
    settingsModal.classList.remove('active');
  }
});

async function loadSettings() {
  try {
    const config = await ipcRenderer.invoke('get-config');
    
    if (config.apiKeys && config.apiKeys.groq) {
      openaiKeyInput.value = config.apiKeys.groq;
    }
    
    if (config.settings && config.settings.model) {
      modelSelect.value = config.settings.model;
    }
    
    if (config.jobDescription) {
      jobDescriptionInput.value = config.jobDescription;
    }
    
    if (config.resume) {
      resumeSummaryInput.value = config.resume;
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

saveSettingsBtn.addEventListener('click', async () => {
  try {
    const newApiKey = openaiKeyInput.value.trim();
    const newModel = modelSelect.value;
    const newJobDesc = jobDescriptionInput.value.trim();
    const newResume = resumeSummaryInput.value.trim();
    
    // Save API key (optional for Groq - can use free tier)
    if (newApiKey) {
      await ipcRenderer.invoke('save-api-keys', {
        groq: newApiKey
      });
      CONFIG.groqKey = newApiKey;
      groqClient = new Groq({ apiKey: CONFIG.groqKey, dangerouslyAllowBrowser: true });
    }
    
    // Save model
    await ipcRenderer.invoke('save-config', {
      'settings.model': newModel
    });
    CONFIG.currentModel = newModel;
    modelIndicator.textContent = 'Llama 3.3 (Free)';
    
    // Save job description
    if (newJobDesc) {
      await ipcRenderer.invoke('save-job-description', newJobDesc);
      jobContext = newJobDesc;
    }
    
    // Save resume
    if (newResume) {
      await ipcRenderer.invoke('save-resume', newResume);
      resumeContext = newResume;
    }
    
    settingsModal.classList.remove('active');
    ipcRenderer.send('show-notification', 'dub', 'Settings saved successfully');
    
  } catch (error) {
    console.error('Failed to save settings:', error);
    showError('Failed to save settings');
  }
});

// Update status display
function updateStatus(text, type = 'ready') {
  statusText.textContent = text;
  statusDot.className = 'status-dot';
  
  if (type === 'recording') {
    statusDot.classList.add('recording');
  } else if (type === 'processing') {
    statusDot.classList.add('processing');
  } else if (type === 'error') {
    statusDot.classList.add('error');
  }
}

// Show manual input prompt when speech recognition fails
function showManualInputPrompt() {
  const card = document.createElement('div');
  card.className = 'answer-card';
  card.id = 'manual-input-card';
  card.style.borderLeftColor = '#3c4043';
  card.innerHTML = `
    <div class="question">Type Your Question Instead</div>
    <div class="answer">
      <textarea id="manual-question-input" 
                placeholder="Type your interview question here..." 
                style="width: 100%; min-height: 100px; padding: 12px; 
                       background: #202124; color: #e8eaed; border: 1px solid #3c4043; 
                       border-radius: 6px; font-family: 'Segoe UI', sans-serif; font-size: 14px; line-height: 1.5;
                       resize: vertical; margin: 10px 0; box-sizing: border-box;">
      </textarea>
      <button id="submit-manual-question" 
              style="width: 100%; padding: 12px; background: #8ab4f8; color: #202124; 
                     border: none; border-radius: 6px; cursor: pointer; font-weight: 600;
                     font-size: 14px;">
        Generate Answer
      </button>
    </div>
  `;
  
  const emptyState = answerContainer.querySelector('.empty-state');
  if (emptyState) {
    answerContainer.removeChild(emptyState);
  }
  
  // Remove any existing manual input card
  const existing = document.getElementById('manual-input-card');
  if (existing) {
    existing.remove();
  }
  
  answerContainer.insertBefore(card, answerContainer.firstChild);
  
  // Add event listener for submit button
  const submitBtn = document.getElementById('submit-manual-question');
  const textarea = document.getElementById('manual-question-input');
  
  if (submitBtn && textarea) {
    submitBtn.addEventListener('click', async () => {
      const question = textarea.value.trim();
      if (question) {
        updateStatus('Generating answer...', 'processing');
        card.remove();
        await generateAnswer(question);
      }
    });
    
    // Allow Enter key to submit (Ctrl+Enter for new line)
    textarea.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter' && !e.ctrlKey) {
        e.preventDefault();
        const question = textarea.value.trim();
        if (question) {
          updateStatus('Generating answer...', 'processing');
          card.remove();
          await generateAnswer(question);
        }
      }
    });
    
    // Focus the textarea
    textarea.focus();
  }
}

// Keyboard shortcuts info
document.addEventListener('keydown', (e) => {
  // Escape to close settings
  if (e.key === 'Escape' && settingsModal.classList.contains('active')) {
    settingsModal.classList.remove('active');
  }
});

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  init();
});
