export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: "GEMINI_API_KEY is not set" });
  }

  try {
    const { system, messages } = req.body;
    const userText = messages?.[0]?.content || "";
    const prompt = system ? `${system}\n\n${userText}` : userText;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2 }
        }),
      }
    );

    const text = await response.text();
    if (!text || text.trim() === "") {
      return res.status(500).json({ error: "Empty response from Gemini", status: response.status });
    }

    let data;
    try { data = JSON.parse(text); } catch {
      return res.status(500).json({ error: "Invalid JSON from Gemini", raw: text.slice(0, 300) });
    }

    if (data.error) return res.status(500).json({ error: JSON.stringify(data.error) });

    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    res.status(200).json({ content: [{ type: "text", text: content }] });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
