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

// Load All Personal Data from MongoDB
async function loadPersonalData() {
  try {
    // Fetch tweets from the backend API that retrieves data from MongoDB
    const tweetsResponse = await fetch("http://127.0.0.1:3000/get_tweets");
    if (!tweetsResponse.ok) {
      console.error("Failed to fetch tweets from MongoDB");
      return;
    }
    const tweetsData = await tweetsResponse.json();
    personalData.tweets = tweetsData;  // Store tweets data in personalData

    // You can also load other data (facebook.csv, linkedin.csv, biodata.txt) here if needed
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
  // --- Helper Functions ---
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

  const formatLinkedInPosts = (posts) => posts.map((p) => p.postText).join(" | ");

  const formatConversationHistory = (history) =>
    history.map((h) => `${h.role}: ${h.content}`).join("\n");

  // --- Response Templates ---
  const responseTemplates = {
    greetings: [
      "Hey there! How can I help you today?",
      "Great to hear from you again! What's on your mind?",
      "Glad you reached out! What would you like to talk about?",
      "Hi! It's good to connect. How are you doing?",
    ],
    followUps: [
      "Interesting! Tell me more about that.",
      "That's a great point. What do you think about [related topic]?",
      "I can see why you feel that way. Have you considered [alternative perspective]?",
      "I'm curious to hear more about your thoughts on that.",
    ],
    specificTopics: {
      "AI": [
        "I'm fascinated by the potential of AI to [positive impact].",
        "It's important to ensure AI is developed responsibly and aligns with human values.",
        "What are your thoughts on the future of AI?",
        "I believe AI has the potential to [benefit 1] while also presenting challenges like [challenge 1].",
      ],
      "travel": [
        "I love to travel! What's your favorite place you've ever visited?",
        "I'm dreaming of a trip to [suggest a destination based on persona data].",
        "Traveling always broadens my horizons. What about you?",
      ],
      // Add more specific topics based on persona data
    },
  };

  // --- Context Building ---
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

    Instructions:
    - Respond as if you are ${PERSON.name} with the provided persona data.
    - Consider the persona's personality, values, and past statements.
    - Avoid being overly formal or overly casual.
    - Strive for a natural and conversational tone.
    - **Do NOT refer to any current activities, location, or recent events.** 
    - **Focus on the persona's internal thoughts, reflections, and opinions.**
    - Focus on providing insightful and relevant responses.
    - Use emojis sparingly to enhance the conversational feel.
    - Maintain a consistent voice and personality throughout the conversation. 
  `;

  // --- Response Generation ---
  try {
    const result = await model.generateContent(context, {
      // Adjust temperature for more creativity (values between 0 and 1)
      temperature: 1,
      // Consider using top-k sampling for more diverse outputs
      top_k: 50,
    });
    const rawResponse = result.response.text();

    // --- Post-Processing ---
    let response = rawResponse;

    // 1. Basic Clean-up
    response = response.trim();

    // 2. Apply Response Templates (Example)
    if (userPrompt.toLowerCase().includes("hello")) {
      response =
        responseTemplates.greetings[
          Math.floor(Math.random() * responseTemplates.greetings.length)
        ];
    } else if (userPrompt.toLowerCase().includes("how are you")) {
      // Generate a personalized response based on persona's mood (if available)
      response = `I'm doing well, thanks for asking! ${response}`;
    } else if (userPrompt.toLowerCase().includes("ai")) {
      response =
        responseTemplates.specificTopics.AI[
          Math.floor(Math.random() * responseTemplates.specificTopics.AI.length)
        ];
    }

    // 3. Sentiment Analysis (Optional)
    // Analyze the sentiment of the conversation and adjust response accordingly

    // 4. Return Response
    return response.split(" "); // Return response as an array of words
  } catch (error) {
    console.error("Error generating response:", error);
    return [
      "I'm",
      "having",
      "a",
      "bit",
      "of",
      "trouble",
      "understanding",
      "right",
      "now.",
      "Could",
      "you",
      "please",
      "try",
      "phrasing",
      "that",
      "differently?",
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
document.getElementById('generate-tweet-btn').addEventListener('click', async () => {
  const chatContainer = document.getElementById('chat-container');

  // Create AI message container for loading state
  const { container, preElement } = createAIMessageContainer();
  chatContainer.appendChild(container);
  preElement.textContent = "Generating AI Tweet...";
  scrollToBottom(chatContainer);

  try {
    // Validate required data
    if (!PERSON || !PERSON.name || !personalData) {
      throw new Error("Missing required persona or personal data.");
    }

    // Define random word and phrase lists
    const words = [
      "Relentless", "Pursuit", "Progress", "Flourishing", "Technology", "Power",
      "Uplift", "Exploit", "Architects", "Reality", "Beliefs", "Future", "Narratives",
      "Destiny", "Scarcity", "Prison", "Abundance", "Innovation", "Common good",
      "Wealth", "Impact", "Lives", "Karma", "Currency", "Knowledge", "Journey",
      "Wisdom", "Compassion", "Fear", "Courage", "Transformation", "Spirit", "Resilience",
      "Challenges", "Legacy", "Death", "Transition", "Values", "Universe", "Symphony",
      "Interconnectedness", "Ripple", "Reality", "Enlightenment", "Destiny", "Mastery",
      "Self-awareness", "Potential", "Purpose", "Division", "Culture", "Understanding",
      "Empathy", "Belief", "Optimism", "Narratives", "Innovation", "Disruption",
      "Systems", "Frameworks", "Human experience", "Growth", "Evolution", "Simulation",
      "Choices", "Free will", "Scarcity", "Time", "Legacy", "Consciousness", "Love",
      "Harmony", "Co-creation", "Efforts"
    ];

    const shortPhrases = [
      "Positive timeline shifts", "Eternal currency", "Human flourishing",
      "Shared belief systems", "Effective altruism", "Systemic empowerment",
      "The infinite game", "The power of belief", "Mastering oneself",
      "Expanding consciousness", "Accelerating altruism", "Disrupting outdated systems",
      "Cultivating compassion", "Embracing the unknown", "Leaving a legacy",
      "Building resilience", "Unlocking potential", "Aligning AI"
    ];

    // Select random word and phrase
    const randomWord = words[Math.floor(Math.random() * words.length)];
    const randomPhrase = shortPhrases[Math.floor(Math.random() * shortPhrases.length)];

    // Generate tweet content using AI
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
      - Uses the word "${randomWord}" or phrase "${randomPhrase}" as inspiration.
      - Must be less than 280 characters (including spaces and punctuation).
      - Captures the persona's unique thoughts, emotions, and perspectives.
      - Avoids describing current location, activities, or events.
      - Focuses on meaningful insights, personal reflections, or broader views.
      - Is emotional and thought-provoking, with no repetition of previous content.
      - Aligns with the persona's values, experiences, and past social media activity.
    `);

    if (!aiTweet || !aiTweet.response) {
      throw new Error("AI response is invalid.");
    }

    const fullResponse = await aiTweet.response.text();
    if (!fullResponse || fullResponse.length === 0) {
      throw new Error("Generated content is empty.");
    }

    const tweetContent = fullResponse.slice(0, 280);

    // Clear previous text
    preElement.textContent = '';

    // Word-by-word display
    async function displayWordByWord(text) {
      const words = text.split(/(\s+|\n)/); // Split by spaces and newlines
      for (let i = 0; i < words.length; i++) {
        preElement.textContent += words[i]; 
        await new Promise(resolve => setTimeout(resolve, 50));
        scrollToBottom(chatContainer);
      }
    }

    // Start word-by-word display
    await displayWordByWord(tweetContent);

    // Post AI Tweet to Backend
    const response = await fetch('http://127.0.0.1:3000/tweet', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tweetContent }),
    });

    if (response.ok) {
      await displayWordByWord("\n(Tweet successfully posted!)");
    } else if (response.status === 429) {
      await displayWordByWord("\nDaily limit reached: You can post only 17 tweets per day.");
    } else {
      const errorText = await response.text();
      await displayWordByWord("\nAn 70 error occurred: " + errorText);
    }
  } catch (error) {
    console.error("Error generating or posting tweet:", error);
    preElement.textContent = "An error occurred: " + error.message;
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






// Function to fetch new tweets from the backend
async function fetchNewTweets(lastDate) {
  const username = "jackjayio"; // Replace with the desired username

  if (!lastDate) {
    console.warn('No valid lastDate provided, fetching all tweets.');
    return; // Handle no `lastDate` case if needed
  }

  try {
    const response = await fetch('http://127.0.0.1:3000/fetch_and_append_tweet', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, last_date: lastDate }),
    });

    const data = await response.json();
    console.log('Backend response:', data);

    // Check if data is an array and contains tweets
    if (Array.isArray(data) && data.length > 0) {
      alert('Tweets.csv is updated with new tweets!'); // Notify the user
    } else {
      alert('No new tweets received.'); // Notify the user if no tweets are found
    }
  } catch (error) {
    console.error('Error fetching tweets:', error);
    alert('An error occurred while fetching tweets. Please try again.');
  }
}

// Event listener for the "Update Tweets" button
document.getElementById('update-tweets').addEventListener('click', async () => {
  try {
    // Load personal data (tweets from MongoDB and other data like Facebook posts, LinkedIn posts, etc.)
    await loadPersonalData();

    // Check if tweets are loaded from MongoDB
    if (personalData.tweets.length === 0) {
      console.error("No tweets found in MongoDB.");
      return;
    }

    // Get the last tweet's creation date from the MongoDB data
    const lastTweet = personalData.tweets[personalData.tweets.length - 1]; // Last tweet from the MongoDB data
    const lastDate = lastTweet ? lastTweet.CreatedAt : null;

    if (lastDate) {
      console.log('Last date from MongoDB:', lastDate);
      await fetchNewTweets(lastDate); // Fetch new tweets after the last date
    } else {
      console.error("No 'CreatedAt' field found in MongoDB tweets.");
    }
  } catch (error) {
    console.error('Error in loading personal data or fetching new tweets:', error);
  }
});
