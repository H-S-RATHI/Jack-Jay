import { GoogleGenerativeAI } from "@google/generative-ai";
import md from "markdown-it";
import Papa from "papaparse";

// Configuration
const API_KEY = "AIzaSyCAfrJKPuP1GpBEdUl1j0vWAevWBXuTSlA"; // Replace with your actual API key
const model = new GoogleGenerativeAI(API_KEY).getGenerativeModel({ model: "gemini-pro" });

// Persona Configuration
const PERSONA = {
  name: "Jack Jay",
  background: "",
  communication_style: "Direct and informative"
};

// Utility Functions for Data Loading
async function loadCSV(filePath) {
  try {
    const response = await fetch(filePath);
    const text = await response.text();
    return new Promise((resolve, reject) => {
      Papa.parse(text, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (result) => resolve(result.data),
        error: (error) => reject(error)
      });
    });
  } catch (error) {
    console.error(`Error loading ${filePath}:`, error);
    return [];
  }
}

async function loadText(filePath) {
  try {
    const response = await fetch(filePath);
    return await response.text();
  } catch (error) {
    console.error(`Error loading ${filePath}:`, error);
    return "";
  }
}

// Data Storage
let personalData = {
  tweets: [],
  facebookPosts: [],
  linkedinPosts: [],
  biodata: ""
};

// Load All Personal Data
async function loadPersonalData() {
  try {
    personalData.tweets = await loadCSV('/tweets.csv');
    personalData.facebookPosts = await loadCSV('/facebook.csv');
    personalData.linkedinPosts = await loadCSV('/linkedin.csv');
    personalData.biodata = await loadText('/biodata.txt');

    console.log("Personal data loaded successfully");
  } catch (error) {
    console.error("Error loading personal data:", error);
  }
}

// Conversation History
let conversationHistory = [];

// UI Helper Functions
function createUserMessage(message) {
  return `
  <div class="flex items-center gap-2 justify-start">
    <img src="user.jpg" alt="user icon" class="w-10 h-10 rounded-full" />
    <p class="bg-gemDeep text-white p-2 rounded-md shadow-md">${message}</p>
  </div>
  `;
}

function createAIMessage(message) {
  return `
  <div class="flex gap-2 justify-end items-start">
    <pre class="bg-gemRegular/40 text-gemDeep p-2 rounded-md shadow-md whitespace-pre-wrap max-w-[80%]">
      ${message}
    </pre>
    <img src="chat-bot.jpg" alt="chatbot icon" class="w-10 h-10 rounded-full" />
  </div>
  `;
}

// AI Response Generation
async function generateResponse(userPrompt) {
  // Construct context from personal data
  const context = `
Persona Details:
Name: ${PERSONA.name}
Communication Style: ${PERSONA.communication_style}

Personal Background:
${personalData.biodata}

Recent Social Media Context:
Tweets: ${personalData.tweets.slice(0, 100).map(t => t.TweetText).join(' | ')}
Tweets2: ${personalData.tweets.slice(100, 200).map(t => t.TweetText).join(' | ')}
Facebook Posts: ${personalData.facebookPosts.map(p => p.Content).join(' | ')}
LinkedIn Posts: ${personalData.linkedinPosts.map(p => p.postText).join(' | ')}

Conversation History: ${conversationHistory.map(h => h.role + ': ' + h.content).join('\n')}

User's Current Prompt: "${userPrompt}"

Respond as ${PERSONA.name} would, drawing from the context above.
`;

  try {
    const result = await model.generateContent(context);
    return result.response.text();
  } catch (error) {
    console.error("Error generating response:", error);
    return "I'm having trouble processing your message right now.";
  }
}

// Event Handling
async function handleSubmit(event) {
  event.preventDefault();
  
  const promptInput = document.getElementById('prompt');
  const chatContainer = document.getElementById('chat-container');
  
  const userMessage = promptInput.value.trim();
  if (!userMessage) return;

  // Display user message
  chatContainer.innerHTML += createUserMessage(userMessage);
  
  // Clear input
  promptInput.value = '';

  // Generate AI response
  const aiResponse = await generateResponse(userMessage);
  
  // Display AI response
  const markdownResponse = md().render(aiResponse);
  chatContainer.innerHTML += createAIMessage(markdownResponse);

  // Update conversation history
  conversationHistory.push({ 
    role: 'user', 
    content: userMessage 
  });
  conversationHistory.push({ 
    role: 'ai', 
    content: aiResponse 
  });

  // Scroll to bottom
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Initialize Application
async function initApp() {
  // Load personal data first
  await loadPersonalData();

  // Setup event listeners
  const chatForm = document.getElementById('chat-form');
  chatForm.addEventListener('submit', handleSubmit);
}

// Start the application
document.addEventListener('DOMContentLoaded', initApp);