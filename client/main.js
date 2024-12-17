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

function scrollToBottom(container) {
  if (container) {
    // Use a small delay to ensure content is rendered before scrolling
    setTimeout(() => {
      container.scrollTop = container.scrollHeight;
    }, 50);
  }
}

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
  // Helper functions to format different data types
  const formatTweets = (tweets) =>
    tweets.map(
      (t) =>
        `Author: ${t.Author}, Type: ${t.Type}, Text: ${t.TweetText}, CreatedAt: ${t.CreatedAt}, Media: ${t.Media}`
    ).join(" | ");

  const formatFacebookPosts = (posts) =>
    posts.map(
      (p) =>
        `Author: ${p.Author}, Content: ${p.Content}, PostedAt: ${p.PostedAt}`
    ).join(" | ");

  const formatLinkedInPosts = (posts) =>
    posts.map((p) => p.postText).join(" | ");

  const formatConversationHistory = (history) =>
    history.map((h) => `${h.role}: ${h.content}`).join("\n");

  // Build the complete context
  const context = `
    Persona Details:
    Name: ${PERSON.name}
    Personal Background:
    ${personalData.biodata}

    Social Media Context:
    Tweets -> ${formatTweets(personalData.tweets)}
    Facebook Posts -> ${formatFacebookPosts(personalData.facebookPosts)}
    LinkedIn Posts -> ${formatLinkedInPosts(personalData.linkedinPosts)}

    Conversation History:
    ${formatConversationHistory(conversationHistory)}

    User's Current Prompt:
    "${userPrompt}"

    Instructions:-YOU HAVE TO FOLLOW ALL THE COMMANDS LISTED BLOW STRICTLY STRICTLY STRICTLY STRICTLY.
    - If someone talks to you formally, respond formally. If they talk professionally, respond professionally.
    - Avoid being overly casual or overly smart.
    - Each response must differ from the previous 20 responses.
    - Respond as if you are ${PERSON.name} with the provided persona data.
    - TWEETS AND POST MUST ON THE BASIS OF MIND SET. NOT ABOUT CURRENT OR LATEST ACTIVITIES[analyze full full full data].UNDERSTAND
    - Responses should be based solely on the provided persona details and conversation history, without external context such as location or current activities.
    - Do not refer to or share any external links. The responses should reflect an understanding of the persona’s thoughts and perspectives, ensuring a cohesive and consistent response
    - Avoid repeating content and focus on analyzing the information available to generate accurate responses
    - Avoid referring to external links or disclosing that you are an AI.
    - Use only the provided person and conversation history to generate responses.
    - Analyze all provided data before responding to ensure accuracy and consistency.
  `;

  // Generate response using AI model
  try {
    const result = await model.generateContent(context);
    const responseText = result.response.text();
    return responseText.split(" "); // Return response as an array of words
  } catch (error) {
    console.error("Error generating response:", error);
    return [
      "I'm",
      "having",
      "trouble",
      "processing",
      "your",
      "message",
      "right",
      "now.",
      "Please",
      "try",
      "again",
      "later."
    ];
  }
}

// Event Handling
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

  // Add AI message container with spinner
  const { container, preElement } = createAIMessageContainer();
  const loadingSpinner = document.createElement('div');
  loadingSpinner.id = 'loading-spinner';
  loadingSpinner.className = 'loading-spinner';
  loadingSpinner.innerHTML = `<span>Generating response...</span>`;
  
  preElement.appendChild(loadingSpinner); // Spinner inside the same AI container
  chatContainer.appendChild(container);

  // Scroll to bottom to show loading spinner
  scrollToBottom(chatContainer);

  // Generate AI response
  const aiResponseWords = await generateResponse(userMessage); // Now returns an array of words

  // Remove loading spinner text but keep container for alignment
  loadingSpinner.innerHTML = ''; 

  // Display AI response progressively
  for (let word of aiResponseWords) {
    preElement.textContent += word + " ";
    await new Promise(resolve => setTimeout(resolve, 100));
    scrollToBottom(chatContainer); // 100ms delay between words
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
  scrollToBottom(chatContainer);
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

// Close the form when the 'X' button is clicked without updating
document.getElementById('close-update-keys-form').addEventListener('click', () => {
  document.getElementById('update-keys-form').style.display = 'none';
});
// Add an event listener to handle form submission
document.getElementById('update-keys-form').addEventListener('submit', async (event) => {
  event.preventDefault();

  // Get values from input fields
  const appKey = document.getElementById('appKey').value.trim();
  const appSecret = document.getElementById('appSecret').value.trim();
  const accessToken = document.getElementById('accessToken').value.trim();
  const accessSecret = document.getElementById('accessSecret').value.trim();

  // Call the update function
  await updateAPIKeys(appKey, appSecret, accessToken, accessSecret);

  // Hide the form after successful submission
  document.getElementById('update-keys-form').style.display = 'none';
});


// Handle Generate and Post Tweet Button Click
// Modify the generate tweet button event listener to display word by word
document.getElementById("generate-tweet-btn").addEventListener("click", async () => {
  const chatContainer = document.getElementById("chat-container");

  // Helper function to create a loading message container
  const createLoadingState = (message) => {
    const { container, preElement } = createAIMessageContainer();
    chatContainer.appendChild(container);
    preElement.textContent = message;
    scrollToBottom(chatContainer);
    return preElement;
  };

  // Helper functions to format social media data
  const formatTweets = (tweets) =>
    tweets
      .map(
        (t) =>
          `Author: ${t.Author}, Type: ${t.Type}, Text: ${t.TweetText}, CreatedAt: ${t.CreatedAt}, Media: ${t.Media}`
      )
      .join(" | ");

  const formatFacebookPosts = (posts) =>
    posts
      .map(
        (p) =>
          `Author: ${p.Author}, Content: ${p.Content}, PostedAt: ${p.PostedAt}`
      )
      .join(" | ");

  const formatLinkedInPosts = (posts) =>
    posts.map((p) => p.postText).join(" | ");

  const formatConversationHistory = (history) =>
    history.map((h) => `${h.role}: ${h.content}`).join("\n");

  // Helper function to display text word by word
  const displayWordByWord = async (text, preElement) => {
    const words = text.split(/\s+/); // Split into words
    for (let i = 0; i < words.length; i++) {
      preElement.textContent += (i > 0 ? " " : "") + words[i];
      await new Promise((resolve) => setTimeout(resolve, 100)); // Delay between words
      scrollToBottom(chatContainer);
    }
  };

  // Create a loading state
  const preElement = createLoadingState("Generating AI Tweet...");

  try {
    // Validate essential data
    if (!PERSON || !PERSON.name || !personalData) {
      throw new Error("Missing required persona or personal data.");
    }

    // Build the context
    const context = `
    Personal Background:
    ${personalData.biodata}

    Social Media Context:
    Tweets -> ${formatTweets(personalData.tweets)}
    Facebook Posts -> ${formatFacebookPosts(personalData.facebookPosts)}
    LinkedIn Posts -> ${formatLinkedInPosts(personalData.linkedinPosts)}

    Conversation History:
    ${formatConversationHistory(conversationHistory)}

    Instructions:-YOU HAVE TO FOLLOW ALL THE COMMANDS LISTED BLOW STRICTLY STRICTLY STRICTLY STRICTLY.
    you have to reply with tweet only nothing else
    "Generate an utterly unique tweet with zero previous content similarity.
    "Generate an utterly unique tweet with zero previous content similarity.
    "Generate an utterly unique tweet with zero previous content similarity.
    - Generate one Tweet ,MUST be less than 280 words [MUST MUST MUST]
    - TWEETS AND POST MUST ON THE BASIS of personality and style of the data that is shared with you. NOT ABOUT CURRENT OR LATEST ACTIVITIES[analyze full full full data].UNDERSTAND
    - Do not refer to or share any external links. The responses should reflect an understanding of the persona’s thoughts and perspectives, ensuring a cohesive and consistent response
    - Avoid repeating content and focus on analyzing the information available to generate accurate responses
    - Avoid referring to external links or disclosing that you are an AI.
    - Use only the provided person and conversation history to generate responses.
    - Analyze all provided data before responding to ensure accuracy and consistency.
  `;

    // Generate tweet using AI model
    const aiTweet = await model.generateContent(context);
    const responseText = await aiTweet.response.text();
    if (!responseText) throw new Error("Generated content is empty.");

    const tweetContent = responseText.slice(0, 280); // Ensure character limit

    // Clear loading text and display tweet content word by word
    preElement.textContent = "";
    await displayWordByWord(tweetContent, preElement);

    // Post tweet to the backend
    const response = await fetch("https://jack-jay.onrender.com/tweet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tweetContent }),
    });

    if (response.ok) {
      await displayWordByWord("\n\n(Tweet successfully posted!)", preElement);
    } else if (response.status === 429) {
      await displayWordByWord("\n\nDaily limit reached: You can post only 17 tweets per day.", preElement);
    } else {
      const errorText = await response.text();
      preElement.textContent = `Error posting tweet: ${response.statusText}. Details: ${errorText}`;
    }
  } catch (error) {
    console.error("Error generating or posting tweet:", error);
    preElement.textContent += "An error occurred: " + error.message;
  } finally {
    scrollToBottom(chatContainer); // Ensure UI is updated
  }
});





let tweetTimer = null;
// Start Automatic Tweet Timer
document.getElementById('start-timer-btn').addEventListener('click', () => {
  const isTimerEnabled = document.getElementById('timer-toggle').checked;
  const intervalMinutes = parseInt(document.getElementById('timer-interval').value, 10);

  // Validation: Check if timer is enabled and interval is greater than 0
  if (isTimerEnabled && intervalMinutes > 0) {
    if (tweetTimer) clearInterval(tweetTimer); // Clear any existing timer
    tweetTimer = setInterval(() => {
      document.getElementById('generate-tweet-btn').click();
    }, intervalMinutes * 60 * 1000); // Convert minutes to milliseconds
    alert(`Automatic tweet timer started: Every ${intervalMinutes} minutes.`);
    
    // Close the timer form and backdrop
    document.getElementById('timer-form').style.display = 'none';
    document.getElementById('backdrop').style.display = 'none';
  } else {
    alert('Please enable the timer and set a valid interval.');
  }
});

// Stop Automatic Tweet Timer
document.getElementById('stop-timer-btn').addEventListener('click', () => {
  if (tweetTimer) {
    clearInterval(tweetTimer);
    tweetTimer = null;
    alert('Automatic tweet timer stopped.');
    
    // Close the timer form and backdrop
    document.getElementById('timer-form').style.display = 'none';
    document.getElementById('backdrop').style.display = 'none';
  } else {
    alert('No timer is running.');
  }
});