async function tavilySearch(query, apiKey) {
  const resp = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: "basic",
      include_answer: true,
      max_results: 5
    })
  });

  if (!resp.ok) {
    throw new Error("Tavily Search Failed");
  }

  return await resp.json();
}
async function shouldSearch(question, apiKey) {
  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `请判断下面的问题是否需要联网获取最新信息。

如果需要联网，请只回答：
YES

如果不需要联网，请只回答：
NO

问题：
${question}`
              }
            ]
          }
        ]
      })
    }
  );

  const data = await resp.json();

  const result =
    data.candidates?.[0]?.content?.parts?.[0]?.text?.trim().toUpperCase() || "NO";

  return result === "YES";
}
export default {
  async fetch(request, env) {
    try {
      // 浏览器访问
      if (request.method !== "POST") {
        return new Response("Telegram AI Assistant Online", {
          status: 200
        });
      }

      const update = await request.json();

      if (!update.message) {
        return new Response("OK");
      }

      const chatId = update.message.chat.id;
      const text = update.message.text || "";

      if (!text) {
        return new Response("OK");
      }

      // AI 判断是否需要联网
const needSearch = await shouldSearch(text, env.GEMINI_API_KEY);

      let prompt = text;

      // 如果需要联网
      if (needSearch) {
        const result = await tavilySearch(text, env.TAVILY_API_KEY);

        prompt = `
你是一位专业AI助手。

下面是联网搜索得到的最新信息：

${result.answer || ""}

搜索详情：

${JSON.stringify(result.results, null, 2)}

请根据以上最新信息回答用户。

如果搜索结果不足，就明确说明。

用户问题：

${text}
`;
      } else {
        prompt = `
你是一位专业、智能、友好的 AI 助手。

要求：

1. 始终使用用户语言回答。
2. 中文自然流畅。
3. 不编造事实。
4. 回答简洁准确。

用户问题：

${text}
`;
      }

      // Gemini
      const geminiResp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${env.GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: prompt
                  }
                ]
              }
            ]
          })
        }
      );

      const geminiData = await geminiResp.json();

      let answer = "抱歉，没有获取到回复。";

      if (
        geminiData.candidates &&
        geminiData.candidates.length > 0 &&
        geminiData.candidates[0].content &&
        geminiData.candidates[0].content.parts &&
        geminiData.candidates[0].content.parts.length > 0
      ) {
        answer = geminiData.candidates[0].content.parts[0].text;
      }

      // 回复 Telegram
      await fetch(
        `https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/sendMessage`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            chat_id: chatId,
            text: answer
          })
        }
      );

      return new Response("OK");
    } catch (err) {
      console.error(err);

      return new Response(err.stack || err.message, {
        status: 500
      });
    }
  }
};
