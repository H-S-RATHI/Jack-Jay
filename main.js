import { GoogleGenerativeAI } from "@google/generative-ai";
import md from "markdown-it";
import Papa from "papaparse";  // Make sure to install the papaparse library to parse CSV files

// Initialize the model
const genAI = new GoogleGenerativeAI(`${import.meta.env.VITE_API_KEY}`);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

let history = [];

// Function to load CSV files (parse CSV into an array of objects)
async function loadCSV(filePath) {
  const response = await fetch(filePath);
  const text = await response.text();
  return new Promise((resolve, reject) => {
    Papa.parse(text, {
      header: true,
      dynamicTyping: true,
      complete: (result) => resolve(result.data),
      error: (error) => reject(error),
    });
  });
}

// Function to load text files (plain text)
async function loadText(filePath) {
  const response = await fetch(filePath);
  return await response.text();
}

// Variables to store the data from files
let tweets = [];
let facebookPosts = [];
let biodata = "";
let linkedin = [];

// Function to load data asynchronously
async function loadData() {
  try {
    // Update paths to refer to the 'public' folder
    tweets = await loadCSV('/tweets.csv');
    facebookPosts = await loadCSV('/facebook.csv');
    biodata = await loadText('/biodata.txt');
    linkedin = await loadCSV('/linkedin.csv');

    console.log("Tweets:", tweets);
    console.log("Facebook Posts:", facebookPosts);
    console.log("Biodata:", biodata);
    console.log("LinkedIn Data:", linkedin);
  } catch (error) {
    console.error("Error loading data:", error);
  }
}

// Call loadData to fetch the files
loadData();

// Function to get AI response
async function getResponse(prompt) {
  let enrichedPrompt = prompt;

  // Check for specific keywords and enhance the prompt accordingly
  if (prompt.toLowerCase().includes("tweet")) {
    enrichedPrompt += ` Here are some tweets I posted: ${tweets.map(t => t.text).join(", ")}`;
  }
  if (prompt.toLowerCase().includes("facebook")) {
    enrichedPrompt += ` Here are some of my Facebook posts: ${facebookPosts.map(f => f.post).join(", ")}`;
  }
  if (prompt.toLowerCase().includes("bio")) {
    enrichedPrompt += ` Here is my biodata: ${biodata}`;
  }
  if (prompt.toLowerCase().includes("linkedin")) {
    enrichedPrompt += ` Here is my LinkedIn info: ${linkedin.map(l => l.job).join(", ")}`;
  }

  // Send the enriched prompt to the AI model
  const chat = await model.startChat({ history: history });
  const result = await chat.sendMessage(enrichedPrompt);
  
  // Handle potential errors in response
  if (!result || !result.response) {
    console.error("No response from AI model.");
    return "I'm having trouble finding an answer right now.";
  }

  const response = await result.response;
  const text = response.text();

  console.log(text);
  return text;
}

// user chat div
export const userDiv = (data) => {
  return `
  <!-- User Chat -->
  <div class="flex items-center gap-2 justify-start">
    <img src="user.jpg" alt="user icon" class="w-10 h-10 rounded-full" />
    <p class="bg-gemDeep text-white p-1 rounded-md shadow-md">${data}</p>
  </div>
  `;
};

// AI chat div
export const aiDiv = (data) => {
  return `
  <!-- AI Chat -->
  <div class="flex gap-2 justify-end">
    <pre class="bg-gemRegular/40 text-gemDeep p-1 rounded-md shadow-md whitespace-pre-wrap">
      ${data}
    </pre>
    <img src="chat-bot.jpg" alt="chat-bot icon" class="w-10 h-10 rounded-full" />
  </div>
  `;
};

async function handleSubmit(event) {
  event.preventDefault();

  let userMessage = document.getElementById("prompt");
  const chatArea = document.getElementById("chat-container");

  var prompt = userMessage.value.trim();
  if (prompt === "") {
    return;
  }

  console.log("user message", prompt);

  chatArea.innerHTML += userDiv(prompt);
  userMessage.value = "";
  const aiResponse = await getResponse(prompt);
  let md_text = md().render(aiResponse);
  chatArea.innerHTML += aiDiv(md_text);

  let newUserRole = {
    role: "user",
    parts: prompt,
  };
  let newAIRole = {
    role: "model",
    parts: aiResponse,
  };

  history.push(newUserRole);
  history.push(newAIRole);

  console.log(history);
}

const chatForm = document.getElementById("chat-form");
chatForm.addEventListener("submit", handleSubmit);

chatForm.addEventListener("keyup", (event) => {
  if (event.keyCode === 13) handleSubmit(event);
});
