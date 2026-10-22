const questionInput = document.getElementById("question");
const sendButton = document.getElementById("sendBtn");
const chatCard = document.querySelector(".chat-card");
const suggestionButtons = document.querySelectorAll(".suggestions button");
const GEMINI_API_KEY = "";
const GEMINI_MODEL = "gemini-2.5-flash";

const GEMINI_API_URL =
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
let isSending = false;

function addUserMessage(message) {
    const messageElement = document.createElement("div");
    messageElement.className = "user-message";
    messageElement.textContent = message;
    chatCard.insertBefore(messageElement, document.querySelector(".suggestions"));
}

function addAIMessage(message) {
    const answerRow = document.createElement("div");
    answerRow.className = "answer-row";

    const icon = document.createElement("span");
    icon.className = "ai-icon";
    icon.textContent = "✦";

    const answer = document.createElement("div");
    answer.className = "answer";
    answer.setAttribute("aria-live", "polite");
    answer.textContent = message;

    answerRow.append(icon, answer);
    chatCard.insertBefore(answerRow, document.querySelector(".suggestions"));

    return answer;
}

function getApiError(response, data) {
    const detail = data?.error?.message;

    if (response.status === 400) {
        return `Gemini rejected the request or API key.${detail ? ` ${detail}` : ""}`;
    }

    if (response.status === 401 || response.status === 403) {
        return `Gemini rejected the API key or its permissions.${detail ? ` ${detail}` : ""}`;
    }

    if (response.status === 429) {
        return `Gemini quota or rate limit reached.${detail ? ` ${detail}` : ""}`;
    }

    return `Gemini request failed (HTTP ${response.status}).${detail ? ` ${detail}` : ""}`;
}

async function sendQuestion(questionText = questionInput.value) {
    if (isSending) {
        return;
    }

    const question = questionText.trim();

    if (!question) {
        questionInput.setCustomValidity("Please enter a question.");
        questionInput.reportValidity();
        questionInput.focus();
        return;
    }

    questionInput.setCustomValidity("");
    isSending = true;
    addUserMessage(question);
    questionInput.value = "";

    const answerElement = addAIMessage("Generating response...");
    sendButton.disabled = true;
    sendButton.textContent = "Loading...";
    questionInput.disabled = true;
    suggestionButtons.forEach((button) => {
        button.disabled = true;
    });

    try {
        const apiKey = localStorage.getItem(GEMINI_API_KEY)?.trim();

        if (!apiKey) {
            throw new Error(
                "Gemini API key is not configured. For local testing, set " +
                "localStorage.setItem('GEMINI_API_KEY', 'YOUR_NEW_KEY') in the " +
                "browser console. Browser keys are visible to users; use a " +
                "secure backend in production."
            );
        }

        const response = await fetch(GEMINI_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": apiKey
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [{ text: question }]
                    }
                ]
            })
        });

        const responseText = await response.text();
        let data;

        try {
            data = JSON.parse(responseText);
        } catch (error) {
            if (error instanceof SyntaxError) {
                throw new Error("Gemini returned an unreadable response.");
            }
            throw error;
        }

        if (!response.ok) {
            throw new Error(getApiError(response, data));
        }

        const answer = data?.candidates?.[0]?.content?.parts
            ?.filter((part) => typeof part.text === "string" && !part.thought)
            .map((part) => part.text)
            .join("")
            .trim();

        if (!answer) {
            throw new Error("Gemini did not return a text answer. Please try again.");
        }

        answerElement.textContent = answer;
    } catch (error) {
        console.error("Gemini API request failed:", error);
        answerElement.textContent = error instanceof TypeError
            ? "Could not connect to Gemini. Check your network connection and try again."
            : error instanceof Error
                ? error.message
                : "An unexpected error occurred while contacting Gemini.";
    } finally {
        isSending = false;
        sendButton.disabled = false;
        sendButton.textContent = "➤ Send";
        questionInput.disabled = false;
        suggestionButtons.forEach((button) => {
            button.disabled = false;
        });
        questionInput.focus();
    }
}

sendButton.addEventListener("click", () => {
    sendQuestion();
});

questionInput.addEventListener("input", () => {
    questionInput.setCustomValidity("");
});

questionInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.isComposing) {
        event.preventDefault();
        sendQuestion();
    }
});

suggestionButtons.forEach((button) => {
    button.addEventListener("click", () => {
        questionInput.value = button.textContent.trim();
        sendQuestion(button.textContent.trim());
    });
});

const accessButton = document.getElementById("accessBtn");
const settingsPanel = document.querySelector(".settings");

if (accessButton && settingsPanel) {
    accessButton.addEventListener("click", () => {
        settingsPanel.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
    });
}
