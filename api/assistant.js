// Optional future OpenAI backend endpoint.
// Keep OPENAI_API_KEY on the server only; never expose it in the browser.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!process.env.OPENAI_API_KEY) return res.status(503).json({ error: "OpenAI API key is not configured." });

  const { message, plan, language } = req.body || {};
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: [
          {
            role: "system",
            content: "You are Disaster Buddy, a concise emergency preparedness assistant. Prioritize life safety, tell users to call 911 for immediate danger, and tailor guidance to the user's emergency plan and Southern California context."
          },
          {
            role: "user",
            content: JSON.stringify({ message, plan, language })
          }
        ]
      })
    });
    const data = await response.json();
    return res.status(200).json({ text: data.output_text || "I can help with emergency planning and safety steps." });
  } catch (error) {
    return res.status(500).json({ error: "Assistant request failed." });
  }
}
