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
// Function to load data asynchronously
async function loadData() {
  try {
    // Update paths to refer to the 'public' folder
    tweets = await loadCSV('/tweets.csv');
    facebookPosts = await loadCSV('/facebook.csv');
    biodata = await loadText('/biodata.txt');
    linkedin = await loadCSV('/linkedin.csv');

    // Debugging: Log the loaded data
    console.log("Loaded Tweets:", tweets);
    console.log("Loaded Facebook Posts:", facebookPosts);
    console.log("Loaded Biodata:", biodata);
    console.log("Loaded LinkedIn Data:", linkedin);
  } catch (error) {
    console.error("Error loading data:", error);
  }
}
loadData();

// Function to get AI response
async function getResponse(prompt) {
  // Debugging: Check if the data has been loaded before building the enrichedPrompt
  console.log("Data before creating enrichedPrompt:");
  console.log("Tweets:", tweets);
  console.log("Facebook Posts:", facebookPosts);
  console.log("Biodata:", biodata);
  console.log("LinkedIn:", linkedin);

  let enrichedPrompt = `You are jack jay, a person whose biodata, social media posts, and background details are as follows:\n`;

  // Add personal biodata
  enrichedPrompt += `Biodata: ${biodata}\n\n`;

  // Log enrichedPrompt after adding biodata
  console.log("Enriched Prompt after adding biodata:", enrichedPrompt);

  // Add tweets if relevant
  if (prompt.toLowerCase().includes("tweet")) {
    enrichedPrompt += `\nHere are some tweets I posted:\n${tweets.map(t => 
      `Author: ${t.Author}, Type: ${t.Type}, Tweet: "${t.TweetText}", Created At: ${t.CreatedAt}, Media: ${t.Media}`
    ).join("\n")}`;

    // Log enrichedPrompt after adding tweets
    console.log("Enriched Prompt after adding tweets:", enrichedPrompt);
  }

  // Add Facebook posts if relevant
  if (prompt.toLowerCase().includes("facebook")) {
    enrichedPrompt += `\nHere are some of my Facebook posts:\n${facebookPosts.map(f => 
      `Author: ${f.Author}, Content: "${f.Content}", Posted At: ${f["Posted At"]}`
    ).join("\n")}`;

    // Log enrichedPrompt after adding Facebook posts
    console.log("Enriched Prompt after adding Facebook posts:", enrichedPrompt);
  }

  // Add LinkedIn posts if relevant
  if (prompt.toLowerCase().includes("linkedin")) {
    enrichedPrompt += `\nHere is my LinkedIn info:\n${linkedin.map(l => `Post: ${l.postText}`).join("\n")}`;

    // Log enrichedPrompt after adding LinkedIn info
    console.log("Enriched Prompt after adding LinkedIn info:", enrichedPrompt);
  }

  // Customize response based on the prompt
  enrichedPrompt += `Someone asked me: "${prompt}". Based on the above details, my response is:`;

  // Log enrichedPrompt just before sending it to the model
  console.log("Enriched Prompt before sending to AI:", enrichedPrompt);

  // Send enriched prompt to the AI model
  const chat = await model.startChat({ history: history });
  const result = await chat.sendMessage(enrichedPrompt);

  if (!result || !result.response) {
    console.error("No response from AI model.");
    return "I'm having trouble finding an answer right now.";
  }

  return result.response.text();
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
