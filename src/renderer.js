const { ipcRenderer } = require('electron');
const Groq = require('groq-sdk');
const fs = require('fs');

// Configuration
let CONFIG = {
  provider: 'free', // 'free' for Groq, 'openai' if user has key
  groqKey: 'gsk_free', // Will use free tier
  currentModel: 'llama-3.3-70b-versatile',
  whisperModel: 'whisper-large-v3'
};

let groqClient = null;
let useBrowserSpeech = true; // Use free browser speech recognition
let resumeContext = '';
let jobContext = '';
let conversationHistory = [];
let isRecording = false;

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
    // Initialize Groq with free API (or user's key if provided)
    const config = await ipcRenderer.invoke('get-config');
    
    if (config.apiKeys && config.apiKeys.groq) {
      CONFIG.groqKey = config.apiKeys.groq;
    }
    
    // Initialize Groq client (free tier available)
    groqClient = new Groq({ 
      apiKey: CONFIG.groqKey,
      dangerouslyAllowBrowser: true 
    });
    
    if (config.settings && config.settings.model) {
      CONFIG.currentModel = config.settings.model;
      modelIndicator.textContent = 'Llama 3.3 (Free)';
      modelSelect.value = CONFIG.currentModel;
    } else {
      modelIndicator.textContent = 'Llama 3.3 (Free)';
    }
    
    if (config.resume) {
      resumeContext = config.resume;
      resumeSummaryInput.value = resumeContext;
    }
    
    if (config.jobDescription) {
      jobContext = config.jobDescription;
      jobDescriptionInput.value = jobContext;
    }
    
    // Initialize browser speech recognition (completely free!)
    initBrowserSpeechRecognition();
    
    updateStatus('Ready (Free Mode)', 'ready');
  } catch (error) {
    console.error('Initialization error:', error);
    updateStatus('Ready (Free Mode)', 'ready');
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
    
    recognition.onresult = async (event) => {
      const transcript = event.results[0][0].transcript;
      if (transcript.trim()) {
        await generateAnswer(transcript);
      }
    };
    
    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      updateStatus('Speech recognition error', 'error');
    };
    
    recognition.onend = () => {
      isRecording = false;
      recordingIndicator.classList.remove('active');
      recordBtn.classList.remove('active');
      recordBtn.querySelector('.btn-label').textContent = 'Record';
    };
    
    useBrowserSpeech = true;
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
    await ipcRenderer.invoke('delete-audio-file', audioPath);
    
  } catch (error) {
    console.error('Transcription error:', error);
    showError('Transcription failed. Using browser speech instead.');
    updateStatus('Ready', 'ready');
    
    // Clean up audio file
    try {
      await ipcRenderer.invoke('delete-audio-file', audioPath);
    } catch (e) {
      console.error('Failed to delete audio file:', e);
    }
  }
}

// Generate AI answer using FREE Groq API
async function generateAnswer(question) {
  if (!groqClient) {
    showError('AI client not available. Please check internet connection.');
    updateStatus('Ready', 'ready');
    return;
  }

  try {
    updateStatus('Generating answer...', 'processing');
    
    const systemPrompt = buildSystemPrompt();
    
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: question }
    ];
    
    // Use Groq's FREE Llama model
    const response = await groqClient.chat.completions.create({
      model: CONFIG.currentModel, // llama-3.3-70b-versatile is FREE and fast!
      messages: messages,
      max_tokens: 500,
      temperature: 0.7
    });
    
    const answer = response.choices[0].message.content;
    
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
    
    updateStatus('Ready (Free Mode)', 'ready');
    
    // Show notification
    ipcRenderer.send('show-notification', 'dub', 'Answer generated successfully');
    
  } catch (error) {
    console.error('AI generation error:', error);
    
    if (error.message.includes('API key') || error.message.includes('401')) {
      showError('Getting free Groq API key... Visit console.groq.com for instant free key');
    } else if (error.message.includes('rate limit')) {
      showError('Rate limit reached. Free tier: 30 requests/min. Wait a moment and try again.');
    } else {
      showError(`Generation failed: ${error.message}. Check internet connection.`);
    }
    
    updateStatus('Ready (Free Mode)', 'ready');
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
  if (screenReadingActive) {
    // Stop screen reading
    stopScreenReading();
  } else {
    // Start continuous screen reading
    startScreenReading();
  }
});

async function startScreenReading() {
  screenReadingActive = true;
  screenBtn.classList.add('active');
  screenBtn.querySelector('.btn-label').textContent = 'Stop Read';
  updateStatus('Reading screen...', 'processing');
  
  // Show notification
  const card = document.createElement('div');
  card.className = 'answer-card';
  card.id = 'screen-reading-status';
  card.style.borderLeftColor = '#fbbf24';
  card.innerHTML = `
    <div class="question">Screen Reading Active</div>
    <div class="answer">
      <div class="talking-point">Continuously monitoring screen content</div>
      <div class="talking-point">Detecting questions and providing answers</div>
      <div class="talking-point">Click "Stop Read" to end monitoring</div>
    </div>
  `;
  
  const emptyState = answerContainer.querySelector('.empty-state');
  if (emptyState) {
    answerContainer.removeChild(emptyState);
  }
  answerContainer.insertBefore(card, answerContainer.firstChild);
  
  // Capture and analyze screen every 3 seconds
  screenReadingInterval = setInterval(async () => {
    await captureAndAnalyzeScreen();
  }, 3000);
  
  // Initial capture
  await captureAndAnalyzeScreen();
}

function stopScreenReading() {
  screenReadingActive = false;
  screenBtn.classList.remove('active');
  screenBtn.querySelector('.btn-label').textContent = 'Capture';
  updateStatus('Ready (Free Mode)', 'ready');
  
  if (screenReadingInterval) {
    clearInterval(screenReadingInterval);
    screenReadingInterval = null;
  }
  
  // Remove status card
  const statusCard = document.getElementById('screen-reading-status');
  if (statusCard) {
    statusCard.remove();
  }
  
  ipcRenderer.send('show-notification', 'dub', 'Screen reading stopped');
}

async function captureAndAnalyzeScreen() {
  if (!groqClient) {
    showError('AI client not available');
    stopScreenReading();
    return;
  }
  
  try {
    // Capture screen
    const screenshot = await ipcRenderer.invoke('capture-screen');
    
    if (!screenshot) {
      return;
    }
    
    // Use Groq's vision model to analyze screen
    const response = await groqClient.chat.completions.create({
      model: 'llama-3.2-90b-vision-preview',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this screen capture and identify any interview questions, coding problems, or important information. If you detect a question:
1. Extract the exact question text
2. Provide 3-4 concise talking points to answer it
3. Format as: QUESTION: [question] | ANSWER: [talking points]

If no clear question is visible, respond with: NO_QUESTION`
            },
            {
              type: 'image_url',
              image_url: {
                url: screenshot
              }
            }
          ]
        }
      ],
      max_tokens: 500,
      temperature: 0.7
    });
    
    const analysis = response.choices[0].message.content;
    
    if (analysis && !analysis.includes('NO_QUESTION')) {
      // Parse and display the detected question and answer
      displayScreenAnalysis(analysis);
    }
    
  } catch (error) {
    console.error('Screen analysis error:', error);
    // Don't stop reading on single error, just skip this iteration
    if (error.message && error.message.includes('vision')) {
      showError('Vision model not available. Using text extraction instead.');
      await captureAndAnalyzeScreenWithOCR();
    }
  }
}

async function captureAndAnalyzeScreenWithOCR() {
  // Fallback: Try to extract text and analyze
  try {
    const screenshot = await ipcRenderer.invoke('capture-screen');
    if (!screenshot) return;
    
    // Simple analysis without OCR - just notify user to use manual questions
    const now = Date.now();
    const lastNotification = window.lastScreenNotification || 0;
    
    // Notify every 30 seconds
    if (now - lastNotification > 30000) {
      updateStatus('Monitoring... Press Record for questions', 'processing');
      window.lastScreenNotification = now;
    }
  } catch (error) {
    console.error('Screen OCR error:', error);
  }
}

function displayScreenAnalysis(analysis) {
  // Parse the analysis
  let question = '';
  let answer = '';
  
  if (analysis.includes('QUESTION:') && analysis.includes('ANSWER:')) {
    const parts = analysis.split('|');
    question = parts[0].replace('QUESTION:', '').trim();
    answer = parts[1].replace('ANSWER:', '').trim();
  } else {
    // Just show the analysis as-is
    question = 'Screen Analysis';
    answer = analysis;
  }
  
  // Check if this question was already shown recently
  const lastQuestion = window.lastDetectedQuestion || '';
  if (question === lastQuestion) {
    return; // Don't show duplicate
  }
  
  window.lastDetectedQuestion = question;
  
  const card = document.createElement('div');
  card.className = 'answer-card';
  card.style.borderLeftColor = '#10b981';
  
  const questionDiv = document.createElement('div');
  questionDiv.className = 'question';
  questionDiv.textContent = `Detected: ${question}`;
  
  const answerDiv = document.createElement('div');
  answerDiv.className = 'answer';
  
  const lines = answer.split('\n').filter(line => line.trim());
  lines.forEach(line => {
    const pointDiv = document.createElement('div');
    pointDiv.className = 'talking-point';
    pointDiv.textContent = line.replace(/^[-•*\d+\.\s]+/, '');
    answerDiv.appendChild(pointDiv);
  });
  
  card.appendChild(questionDiv);
  card.appendChild(answerDiv);
  
  // Remove status card if exists
  const statusCard = document.getElementById('screen-reading-status');
  if (statusCard) {
    answerContainer.insertBefore(card, statusCard.nextSibling);
  } else {
    answerContainer.insertBefore(card, answerContainer.firstChild);
  }
  
  answerContainer.scrollTop = 0;
  
  // Show notification
  ipcRenderer.send('show-notification', 'Question Detected!', question.substring(0, 50));
}

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

// Initialize immediately
init();
