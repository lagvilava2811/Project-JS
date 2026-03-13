const chatMessages = document.getElementById("chatMessages");
const userInput = document.getElementById("userInput");
const sendButton = document.getElementById("sendBtn");

// Cute Lamp Shop-ის პროდუქტის ასისტენტის პრომპტი
const SHOP_SYSTEM_PROMPT = `შენ ხარ Cute Lamp Shop-ის პროდუქტის ექსპერტი. შენი მიზანია დაეხმარო მომხმარებლებს აირჩიონ სწორი პროდუქტი მათი საჭიროებების მიხედვით.

📋 პროდუქტების მონაცემთა ბაზა:

ლეპტოპები:
• Apple MacBook Pro 16.2" - $5299 | ⭐ 3.667 (პროფესიონალებისთვის)
• Apple MacBook Air M1 - 2799 GEL | ⭐ 5.0 (სტუდენტებისთვის)
• Samsung Galaxy Book3 Pro 16" - $1385 | ⭐ 5.0 (პრემიუმ)
• Samsung Galaxy Book3 15.6" - $860 | ⭐ 4.286 (საშუალო)
• ASUS ROG Strix G18 - 7200 GEL | ⭐ 4.667 (გეიმინგი)
• ASUS TUF Gaming F15 - 1899 GEL | ⭐ 4.667 (იაფი გეიმინგი)
• HP Victus 15.6" - $780 | ⭐ 4.75 (იაფი გეიმინგი)
• HP Envy x360 - $1100 | ⭐ 4.5 (2-in-1)
• Dell Inspiron 16 Plus - $1300 | ⭐ 3.571 (დიდი ეკრანი)
• MSI Katana 15 - $1200 | ⭐ 2.667 (გეიმინგი)
• LG gram 16" - $900 | ⭐ 4.0 (უმსუბუქესი)

ტელეფონები:
• Apple iPhone 14 Pro - 4999 GEL | ⭐ 3.5 (ფლაგმანი)
• Apple iPhone 12 Mini - $300 | ⭐ 4.429 (კომპაქტური)
• Samsung Galaxy Z Fold 5 - $1500 | ⭐ 5.0 (დასაკეცი)
• Samsung Galaxy A54 - 799 GEL | ⭐ 4.109 (საშუალო)
• Xiaomi 12 Lite - 1099 GEL | ⭐ 4.375
• Honor 70 - 1399 GEL | ⭐ 4.125
• OnePlus 10T 5G - 2199 GEL | ⭐ 3.0

რეკომენდაციები:
👨‍🎓 სტუდენტი: MacBook Air, ASUS Vivobook
👨‍💼 ბიზნესმენი: LG gram, Samsung Galaxy Book3 Pro
🎮 გეიმერი: HP Victus, ASUS TUF, ASUS ROG Strix`;

async function sendMessage() {
    const apiKey = "AIzaSyAU3R5eMlvOdnkiNtwQ1UH7e_k0lpEnDlg";
    const message = userInput.value.trim();

    if (!message) {
        showError("შეიყვანე ტექსტი");
        return;
    }
    
    addMessage(message, "user");
    userInput.value = "";
    sendButton.disabled = true;

    const typing = showTyping();

    try {
        const MODEL = "gemini-2.5-flash";
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;

        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                contents: [
                    {
                        role: "user",
                        parts: [
                            {
                                text: SHOP_SYSTEM_PROMPT + "\n\nმომხმარებლის შეკითხვა: " + message,
                            },
                        ],
                    },
                ],
            }),
        });

        const data = await response.json();
        typing.remove();

        if (!response.ok) {
            const errorMsg = data.error?.message || "დაფიქსირდა შეცდომა!";
            showError(errorMsg);
            return;
        } else {
            const botReply = data.candidates[0]?.content?.parts[0]?.text || "მაპატიეთ, პასუხი ვერ მივიღე.";
            addMessage(botReply, "bot");
        }
    } catch (error) {
        typing.remove();
        showError("დაფიქსირდა შეცდომა!");
    }
    sendButton.disabled = false;
    userInput.focus();
}

function addMessage(text, type) {
    const welcome = chatMessages.querySelector(".welcome");
    if (welcome) {
        welcome.remove();
    }
    const div = document.createElement("div");
    div.className = `message ${type}`;
    if (type === "bot") {
        div.innerHTML = `<div class="label"><i class="fas fa-robot"></i> techno life</div>${formatText(text)}`;
    } else {
        div.textContent = text;
    }
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function showError(text) {
    const div = document.createElement("div");
    div.className = "message error";
    div.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${text}`;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function showTyping() {
    const div = document.createElement("div");
    div.className = "message bot";
    div.innerHTML = `
        <div class="label"><i class="fas fa-robot"></i> techno life</div>
        <div class="typing-indicator">
            <span></span>
            <span></span>
            <span></span>
        </div>
    `;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return div;
}

function formatText(text) {
    return text
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.+?)\*/g, "<em>$1</em>")
        .replace(/```([\s\S]*?)```/g, "<pre><code>$1</code></pre>")
        .replace(/`(.*?)`/g, "<code>$1</code>")
        .replace(/\n/g, "<br>");
}

// Enter ღილაკის მხარდაჭერა
userInput.addEventListener("keypress", function(e) {
    if (e.key === "Enter") {
        sendMessage();
    }
});

// სუგესთიებზე დაჭერა
document.addEventListener('DOMContentLoaded', function() {
    const suggestionItems = document.querySelectorAll('.suggestion-item');
    suggestionItems.forEach(item => {
        item.addEventListener('click', function() {
            const text = this.querySelector('span').textContent;
            userInput.value = `მაინტერესებს ${text.toLowerCase()}ები`;
            sendMessage();
        });
    });
    
    // მინი ლამპის ფუნქციონალი
    const chatMiniLamp = document.getElementById('chatMiniLamp');
    if (chatMiniLamp) {
        chatMiniLamp.addEventListener('click', function() {
            const body = document.body;
            const isOn = body.getAttribute('data-lamp') === 'on';
            body.setAttribute('data-lamp', isOn ? 'off' : 'on');
            document.documentElement.style.setProperty('--on', isOn ? '0' : '1');
        });
    }
});