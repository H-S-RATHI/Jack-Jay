import { GoogleGenerativeAI } from "@google/generative-ai";
import Papa from "papaparse";



// Configuration
const API_KEY = "AIzaSyCAfrJKPuP1GpBEdUl1j0vWAevWBXuTSlA"; // Replace with your actual API key
const model = new GoogleGenerativeAI(API_KEY).getGenerativeModel({ model: "gemini-1.5-flash" });

// Persona Configuration
const PERSONA = {
  name: "Jack Jay",
  background: "",
  communication_style: "Detailed and informative"
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
  } catch (error) {
    console.error("Error loading personal data:", error);
  }
}

// Conversation History
let conversationHistory = [];

// UI Helper Functions
function createUserMessage(message) {
  return `
  <div class="user-message-container">
    <p class="user-message">${message}</p>
    <img src="user.jpg" alt="user icon" class="user-avatar" />
  </div>
  `;
}

function createAIMessageContainer() {
  const container = document.createElement("div");
  container.classList.add("ai-message-container");

  const imgElement = document.createElement("img");
  imgElement.src = "jack.webp";
  imgElement.alt = "jack image";
  imgElement.classList.add("ai-avatar");
  container.appendChild(imgElement);

  const preElement = document.createElement("pre");
  preElement.classList.add("ai-message");
  container.appendChild(preElement);

  return { container, preElement };
}

// AI Response Generation
async function generateResponse(userPrompt) {
  const context = `
  Persona Details:
  Name: ${PERSONA.name}

  Personal Background:
  ${personalData.biodata}

  Recent Social Media Context:
  Tweets: ${personalData.tweets.map(t => `Author: ${t.Author}, Type: ${t.Type}, TweetText: ${t.TweetText}, CreatedAt: ${t.CreatedAt}, Media: ${t.Media}`).join(' | ')}

  Facebook Posts: ${personalData.facebookPosts.map(p => `Author: ${p.Author}, Content: ${p.Content}, PostedAt: ${p.PostedAt}`).join(' | ')}

  LinkedIn Posts: ${personalData.linkedinPosts.map(p => p.postText).join(' | ')}

  Conversation History: ${conversationHistory.map(h => h.role + ': ' + h.content).join('\n')}

  User's Current Prompt: "${userPrompt}"

  Respond as ${PERSONA.name} would, drawing from the context above, and copy the personality and style while tuning using all of the data above.
  `;

  try {
    const result = await model.generateContent(context);
    const fullResponse = result.response.text();
    return fullResponse.split(" "); // Split into words
  } catch (error) {
    console.error("Error generating response:", error);
    return ["I'm", "having", "trouble", "processing", "your", "message", "right", "now.", "As", "API", "can", "process", "only", "two", "requests", "per", "minute."];
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

  // Add loading spinner
  // Add loading spinner
  const loadingSpinner = document.createElement('div');
  loadingSpinner.id = 'loading-spinner';
  loadingSpinner.className = 'loading-spinner';
  loadingSpinner.innerHTML = `
    <span>Generating response...</span>
  `;
  chatContainer.appendChild(loadingSpinner);

  // Scroll to bottom to show loading spinner
  chatContainer.scrollTop = chatContainer.scrollHeight;

  // Generate AI response
  const aiResponseWords = await generateResponse(userMessage); // Now returns an array of words

  // Remove loading spinner
  chatContainer.removeChild(loadingSpinner);

  // Display AI response progressively
  const { container, preElement } = createAIMessageContainer();
  chatContainer.appendChild(container);

  // Display words with a delay
  for (let word of aiResponseWords) {
    preElement.textContent += word + " ";
    await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay between words
  }

  // Update conversation history
  conversationHistory.push({ 
    role: 'user', 
    content: userMessage 
  });
  conversationHistory.push({ 
    role: 'ai', 
    content: aiResponseWords.join(" ") 
  });

  // Scroll to bottom
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Initialize Application
async function initApp() {
  // Load personal data first
  await loadPersonalData();

  // Create an introduction message based on biodata
  const introductionMessage = `Hello! I’m Jack Jay. How can I help you? 
  [If you're getting the message "I'm having trouble processing your message right now," 
  it may be due to the free API experiencing high data loads or temporary unavailability. 
  You can try refreshing the page to ask again or wait one minute.]`;

  // Display the introduction message in the chat
  const chatContainer = document.getElementById('chat-container');
  const { container, preElement } = createAIMessageContainer();
  preElement.textContent = introductionMessage;
  chatContainer.appendChild(container);

  // Setup event listeners
  const chatForm = document.getElementById('chat-form');
  chatForm.addEventListener('submit', handleSubmit);
}

// Start the application
document.addEventListener('DOMContentLoaded', initApp);

// Function to update API keys
async function updateAPIKeys(appKey, appSecret, accessToken, accessSecret) {
  try {
      const response = await fetch('http://localhost:3000', {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify({ appKey, appSecret, accessToken, accessSecret }),
      });

      const result = await response.json();
      if (response.ok) {
          alert(result.message);
      } else {
          alert(`Failed to update credentials: ${result.message}`);
      }
  } catch (error) {
      console.error('Error updating API keys:', error);
      alert('An error occurred while updating credentials.');
  }
}

// Add an event listener to handle form submission
document.getElementById('update-keys-form').addEventListener('submit', (event) => {
  event.preventDefault();

  // Get values from input fields
  const appKey = document.getElementById('appKey').value.trim();
  const appSecret = document.getElementById('appSecret').value.trim();
  const accessToken = document.getElementById('accessToken').value.trim();
  const accessSecret = document.getElementById('accessSecret').value.trim();

  // Call the update function
  updateAPIKeys(appKey, appSecret, accessToken, accessSecret);
});
