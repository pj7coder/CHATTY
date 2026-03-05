// DOM Elements
const sidebar = document.getElementById("sidebar");
const toggleSidebarBtn = document.getElementById("toggle-sidebar");
const closeSidebarBtn = document.getElementById("close-sidebar");
const newChatBtn = document.getElementById("new-chat-btn");
const historyList = document.getElementById("history-list");
const chatArea = document.getElementById("chat-area");
const msgInput = document.getElementById("msg-input");
const sendBtn = document.getElementById("send-btn");
const welcomeScreen = document.getElementById("welcome-screen");

// --- State Management (Local Storage) ---
// Load chats from browser storage, or start with an empty array
let chats = JSON.parse(localStorage.getItem('chatty_history')) || []; 
let currentChatId = null;

// Initialize the UI on page load
updateHistoryUI();
lucide.createIcons();

// --- Sidebar Toggling ---
toggleSidebarBtn.addEventListener("click", () => sidebar.classList.toggle("closed"));
closeSidebarBtn.addEventListener("click", () => sidebar.classList.add("closed"));

// --- Input Auto-Resize & Validation ---
msgInput.addEventListener("input", function() {
    this.style.height = "auto";
    this.style.height = (this.scrollHeight) + "px";
    sendBtn.disabled = this.value.trim() === "";
});

msgInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (!sendBtn.disabled) send();
    }
});

sendBtn.addEventListener("click", send);

// --- Core Chat Functions ---
async function send() {
    const text = msgInput.value.trim();
    if (!text) return;

    if (!currentChatId) createNewChat(text);
    if (welcomeScreen) welcomeScreen.style.display = 'none';

    // 1. Render User Message
    renderMessage(text, 'user');
    saveMessageToCurrentChat(text, 'user');
    
    // Reset Input
    msgInput.value = "";
    msgInput.style.height = "auto";
    sendBtn.disabled = true;

    // 2. Render AI "Thinking" Placeholder
    const aiMessageDiv = renderMessage("...", 'ai');

    // 3. API Call
    try {
        const response = await fetch("http://localhost:3000/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: text })
        });

        const data = await response.json();
        
        // Update UI and Save State
        aiMessageDiv.querySelector('.ai-text').innerText = data.reply;
        saveMessageToCurrentChat(data.reply, 'ai');

    } catch (err) {
        aiMessageDiv.querySelector('.ai-text').innerText = "Network Error: Could not connect to local server.";
        aiMessageDiv.querySelector('.ai-text').style.color = "#ef4444";
    }
}

function renderMessage(text, sender) {
    const row = document.createElement("div");
    row.className = `message-row ${sender}`;

    let contentHTML = "";
    if (sender === 'user') {
        contentHTML = `<div class="user-bubble">${text}</div>`;
    } else {
        contentHTML = `
            <div class="ai-bubble">
                <div class="ai-icon"><i data-lucide="sparkles" class="icon-sm" style="color: white; width: 16px;"></i></div>
                <div class="ai-text">${text}</div>
            </div>
        `;
    }

    row.innerHTML = `<div class="message-content">${contentHTML}</div>`;
    chatArea.appendChild(row);
    lucide.createIcons(); // Re-initialize icons
    chatArea.scrollTop = chatArea.scrollHeight;
    
    return row;
}

// --- History & State Management ---
newChatBtn.addEventListener("click", () => {
    currentChatId = null;
    chatArea.innerHTML = `<div id="welcome-screen" class="welcome-screen"><h2>How can I help you today?</h2></div>`;
    updateHistoryUI();
});

function createNewChat(firstMessage) {
    currentChatId = Date.now().toString();
    const title = firstMessage.length > 20 ? firstMessage.substring(0, 20) + "..." : firstMessage;
    
    chats.unshift({ id: currentChatId, title: title, messages: [] }); // Add to beginning of array
    saveToStorage();
    updateHistoryUI();
}

function saveMessageToCurrentChat(text, sender) {
    const chat = chats.find(c => c.id === currentChatId);
    if (chat) {
        chat.messages.push({ text, sender });
        saveToStorage();
    }
}

function saveToStorage() {
    localStorage.setItem('chatty_history', JSON.stringify(chats));
}

function updateHistoryUI() {
    historyList.innerHTML = "";
    chats.forEach(chat => {
        const li = document.createElement("li");
        li.className = `history-item ${chat.id === currentChatId ? 'active' : ''}`;
        
        // Setup the title click to load the chat
        const titleSpan = document.createElement("span");
        titleSpan.className = "history-title";
        titleSpan.innerText = chat.title;
        titleSpan.onclick = () => loadChat(chat.id);

        // Setup the delete button
        const deleteBtn = document.createElement("button");
        deleteBtn.className = "delete-chat-btn";
        deleteBtn.innerHTML = `<i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>`;
        deleteBtn.onclick = (e) => deleteChat(chat.id, e);

        li.appendChild(titleSpan);
        li.appendChild(deleteBtn);
        historyList.appendChild(li);
    });
    lucide.createIcons(); // Render the new trash icons
}

function loadChat(id) {
    currentChatId = id;
    const chat = chats.find(c => c.id === id);
    
    chatArea.innerHTML = ""; 
    chat.messages.forEach(msg => renderMessage(msg.text, msg.sender)); 
    updateHistoryUI(); 
    
    if (window.innerWidth <= 768) {
        sidebar.classList.add("closed");
    }
}

function deleteChat(id, event) {
    event.stopPropagation(); // Prevents the click from triggering loadChat()
    
    // Remove from array
    chats = chats.filter(chat => chat.id !== id);
    saveToStorage();

    // If we deleted the chat we are currently looking at, reset to new chat screen
    if (currentChatId === id) {
        currentChatId = null;
        chatArea.innerHTML = `<div id="welcome-screen" class="welcome-screen"><h2>How can I help you today?</h2></div>`;
    }
    
    updateHistoryUI();
}