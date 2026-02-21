exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { model, userMessage, conciseMode } = JSON.parse(event.body);

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://yoursite.netlify.app',
        'X-Title': 'Conference Chat Demo',
      },
      body: JSON.stringify({
        model,
        messages: [
          { 
            role: 'system', 
            content: conciseMode 
              ? 'You are a helpful assistant. Keep responses concise, 3-5 sentences.' 
              : 'You are a helpful assistant.' 
          },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`API error: ${error}`);
    }

    const data = await res.json();
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};