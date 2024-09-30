// genai.js

export async function processQueryWithGenAI(query, accessToken) {
  const response = await fetch('https://api-inference.huggingface.co/models/EleutherAI/gpt-j-6B', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer $877ngugfG7987-86ngvfx` // Replace with your actual Hugging Face API key
    },
    body: JSON.stringify({
      inputs: query,
      parameters: {
        max_new_tokens: 50 // Adjust this value as needed
      }
    })
  });

  const result = await response.json();
  return result.generated_text || "I'm sorry, I couldn't generate a response.";
}
