exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    console.error("OPENROUTER_API_KEY not found");
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "OPENROUTER_API_KEY not configured" }),
    };
  }

  const {
    model,
    userMessage,
    conciseMode,
    messageHistory = [],
  } = JSON.parse(event.body);

  // Extract the model name from the API model string for context
  const modelName = model.includes("haiku")
    ? "Claude Haiku"
    : model.includes("gpt")
    ? "GPT-3.5"
    // : model.includes("grok")
    // ? "Grok"
    : model.includes("gemini")
    ? "Gemini"
    : "AI";

  try {
    // Build messages with system prompt that includes current AI identity
    const systemPrompt = conciseMode

        ? `You are ${modelName}, one of three AI voices a multi-agent chat. Each message shows which AI said what. Respond as yourself and please feel free to comment on what other AIs have said. Don't adopt personas—just be ${modelName}. This response should be 2-3 sentences as 'concise mode' has been toggled.`
        : `You are ${modelName}, one of three AI voices a multi-agent chat. Each message shows which AI said what. Respond as yourself and please feel free to comment on what other AIs have said. Don't adopt personas—just be ${modelName}.`
       
    const messages = [
      { role: "system", content: systemPrompt },
      ...messageHistory, // already stripped of [Name]: prefixes
      { role: "user", content: userMessage },
    ];

    console.log("Sending to OpenRouter:", {
      model: modelName,
      messageCount: messages.length,
      hasHistory: messageHistory.length > 0,
    });

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://concise-chat.netlify.app",
        "X-Title": "Conference Chat Demo",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
      }),
    });

    const data = await res.json();

    console.log("OpenRouter Response Status:", res.status);

    if (!res.ok) {
      throw new Error(`API error: ${JSON.stringify(data)}`);
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error("Function error:", error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
