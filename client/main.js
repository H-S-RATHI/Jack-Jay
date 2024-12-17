import { GoogleGenerativeAI } from "@google/generative-ai";
import Papa from "papaparse";

// Configuration
const API_KEY = "AIzaSyBnxhySXeCui_Q-IvztTyv-AGzN0mql6XU"; // Replace with your actual API key
const model = new GoogleGenerativeAI(API_KEY).getGenerativeModel({ model: "gemini-1.5-flash" });

// Persona Configuration
const PERSON = {
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
    Name: ${PERSON.name}

    Personal Background:
    ${personalData.biodata}

    Recent Social Media Context:
    Tweets: ${personalData.tweets.map(t => `Author: ${t.Author}, Type: ${t.Type}, TweetText: ${t.TweetText}, CreatedAt: ${t.CreatedAt}, Media: ${t.Media}`).join(' | ')}

    Facebook Posts: ${personalData.facebookPosts.map(p => `Author: ${p.Author}, Content: ${p.Content}, PostedAt: ${p.PostedAt}`).join(' | ')}

    LinkedIn Posts: ${personalData.linkedinPosts.map(p => p.postText).join(' | ')}

    Conversation History:
    ${conversationHistory.map(h => h.role + ': ' + h.content).join('\n')}

    User's Current Prompt:
    "${userPrompt}"

    Instructions:
    Respond as ${PERSON.name} would, drawing from all the data above, ensuring that your responses reflect the stored thoughts, views, and knowledge.
    Responses should be based solely on the provided persona details and conversation history, without external context such as location or current activities.
    Do not refer to or share any external links. The responses should reflect an understanding of the persona’s thoughts and perspectives, ensuring a cohesive and consistent response.
    Avoid repeating content and focus on analyzing the information available to generate accurate responses.`;

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
  const introductionMessage = `Hello! I’m Jack Jay. How can I help you?`;

  // Display the introduction message in the chat
  const chatContainer = document.getElementById('chat-container');
  const { container, preElement } = createAIMessageContainer();
  preElement.textContent = introductionMessage;
  chatContainer.appendChild(container);

  // Setup event listeners
  const chatForm = document.getElementById('chat-form');
  chatForm.addEventListener('submit', handleSubmit);
  const promptInput = document.getElementById('prompt');
  promptInput.addEventListener('keydown', function (event) {
    if (event.key === 'Enter') {
      event.preventDefault();  // Prevent default behavior (new line in the input)
      chatForm.dispatchEvent(new Event('submit'));  // Trigger the form submit
    }
  });
}

// Start the application
document.addEventListener('DOMContentLoaded', initApp);

// Function to update API keys
async function updateAPIKeys(appKey, appSecret, accessToken, accessSecret) {
  try {
    const response = await fetch('https://jack-jay.onrender.com', {
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

// Handle Generate and Post Tweet Button Click
document.getElementById('generate-tweet-btn').addEventListener('click', async () => {
  const chatContainer = document.getElementById('chat-container');

  // Create AI message container for loading state
  const { container, preElement } = createAIMessageContainer();
  chatContainer.appendChild(container);
  preElement.textContent = "Generating AI Tweet...";
  chatContainer.scrollTop = chatContainer.scrollHeight;

  try {
    // Validate required data
    if (!PERSON || !PERSON.name || !personalData) {
      throw new Error("Missing required persona or personal data.");
    }

    const aiTweet = await model.generateContent(`
      Persona Details:
      Name: ${PERSON.name}

      Personal Background:
      ${personalData.biodata || "No biodata available."}

      Recent Social Media Context:
      Tweets: ${personalData.tweets?.map(t => `Author: ${t.Author}, Type: ${t.Type}, TweetText: ${t.TweetText}, CreatedAt: ${t.CreatedAt}, Media: ${t.Media}`).join(' | ') || "None"}

      Facebook Posts: ${personalData.facebookPosts?.map(p => `Author: ${p.Author}, Content: ${p.Content}, PostedAt: ${p.PostedAt}`).join(' | ') || "None"}

      LinkedIn Posts: ${personalData.linkedinPosts?.map(p => p.postText).join(' | ') || "None"}

      Conversation History:
      ${conversationHistory?.map(h => h.role + ': ' + h.content).join('\n') || "None"}

      Instructions:
      Generate a tweet for ${PERSON.name} that:
      1. Must be less than 280 characters (including spaces and punctuation).
      2. Captures the persona's unique thoughts, emotions, and perspectives.
      3. Avoids describing current location, activities, or events.
      4. Focuses on meaningful insights, personal reflections, or broader views.
      5. Is emotional and thought-provoking, with no repetition of previous content.
      6. Aligns with the persona's values, experiences, and past social media activity.
    `);

    if (!aiTweet || !aiTweet.response) {
      throw new Error("AI response is invalid.");
    }

    const fullResponse = await aiTweet.response.text();
    if (!fullResponse || fullResponse.length === 0) {
      throw new Error("Generated content is empty.");
    }

    const tweetContent = fullResponse.slice(0, 280);
    preElement.textContent = tweetContent;

    // Post AI Tweet to Backend
    const response = await fetch('https://jack-jay.onrender.com/tweet', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tweetContent }),
    });

    if (response.ok) {
      preElement.textContent += "\n\n(Tweet successfully posted!)";
    } else if (response.status === 429) {
      preElement.textContent += "\n\nDaily limit reached: You can post only 17 tweets per day.";
    } else {
      throw new Error(`Error posting tweet: ${response.statusText}`);
    }
  } catch (error) {
    console.error("Error generating or posting tweet:", error);
    preElement.textContent = "An error occurred: " + error.message;
  } finally {
    chatContainer.scrollTop = chatContainer.scrollHeight; // Ensure UI is updated
  }
});




let tweetTimer = null;

// Start Automatic Tweet Timer
document.getElementById('start-timer-btn').addEventListener('click', () => {
  const isTimerEnabled = document.getElementById('timer-toggle').checked;
  const intervalMinutes = parseInt(document.getElementById('timer-interval').value, 10);

  if (isTimerEnabled && intervalMinutes > 0) {
    // Start a timer that generates and posts tweets automatically
    tweetTimer = setInterval(async () => {
      console.log('Generating tweet...');
      const aiTweet = await generateResponse("Generate a new tweet for me.[strictly given command -> tweet within 280 characters, including spaces and punctuation.]");
      const tweetContent = aiTweet.join(" ");
      await postTweet(tweetContent);
    }, intervalMinutes * 60 * 1000); // Convert minutes to milliseconds
  } else {
    // Stop the timer if it's already running
    if (tweetTimer) {
      clearInterval(tweetTimer);
      tweetTimer = null;
    }
  }
});

// Helper Function to Post Tweet
async function postTweet(content) {
  try {
    const response = await fetch('https://jack-jay.onrender.com/tweet', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tweetContent: content }),
    });

    const result = await response.json();
    if (response.ok) {
      console.log('Tweet posted successfully:', result);
    } else {
      console.error('Error posting tweet:', result);
    }
  } catch (error) {
    console.error('Error posting tweet:', error);
  }
}
