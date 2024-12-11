import { GoogleGenerativeAI } from "@google/generative-ai";
import md from "markdown-it";

// Initialize the model
const genAI = new GoogleGenerativeAI(`${import.meta.env.VITE_API_KEY}`);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

let history = [];

// Load personal data (tweets, Facebook posts, biodata, LinkedIn)
async function loadCSV(filePath) {
  const response = await fetch(filePath);
  const text = await response.text();
  const rows = text.split("\n").slice(1); // Skip header row
  const data = rows.map(row => row.split(","));
  return data;
}

async function loadText(filePath) {
  const response = await fetch(filePath);
  const text = await response.text();
  return text.trim();
}

let tweets = await loadCSV('tweets.csv');
let facebookPosts = await loadCSV('facebook.csv');
let biodata = await loadText('biodata.txt');
let linkedin = await loadCSV('linkedin.csv');

// Preprocess the data to reflect your communication style
const userStyle = {
  tweets: tweets.slice(0, 5).map(tweet => tweet[1]).join(" "),
  facebookPosts: facebookPosts.slice(0, 5).map(post => post[1]).join(" "),
  biodata: biodata,
  linkedin: linkedin.slice(0, 5).map(info => info[1]).join(" ")
};

async function getResponse(prompt) {
  const userContext = `The user communicates like this: ${userStyle.tweets} ${userStyle.facebookPosts} ${userStyle.linkedin} ${userStyle.biodata}`;

  const chat = await model.startChat({ history: history });
  const result = await chat.sendMessage(userContext + " " + prompt);
  const response = await result.response;
  const text = response.text();

  console.log(text);
  return text;
}

export const userDiv = (data) => {
  return `
    <div class="flex items-center gap-2 justify-start">
      <img src="user.jpg" alt="user icon" class="w-10 h-10 rounded-full" />
      <p class="bg-gemDeep text-white p-1 rounded-md shadow-md">
        ${data}
      </p>
    </div>
  `;
};

export const aiDiv = (data) => {
  return `
    <div class="flex gap-2 justify-end">
      <pre class="bg-gemRegular/40 text-gemDeep p-1 rounded-md shadow-md whitespace-pre-wrap">
        ${data}
      </pre>
      <img src="chat-bot.jpg" alt="user icon" class="w-10 h-10 rounded-full" />
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
    parts: `${userStyle.tweets} ${userStyle.facebookPosts} ${userStyle.linkedin} ${userStyle.biodata} ${prompt}`,
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
