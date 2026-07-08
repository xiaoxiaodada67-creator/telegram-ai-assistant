export default {
  async fetch(request, env) {
    try {
      // 浏览器访问
      if (request.method !== "POST") {
        return new Response("Telegram AI Assistant (Gemini Version)", {
          status: 200,
        });
      }

      // Telegram Update
      const update = await request.json();

      if (!update.message) {
        return new Response("OK");
      }

      const chatId = update.message.chat.id;
      const text = update.message.text || "";

      if (!text) {
        return new Response("OK");
      }

      // 调用 Gemini
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
                    text:
`你是一位专业、智能、友好的 AI 助手。

要求：

1. 始终使用用户的语言回答。
2. 中文回答自然流畅。
3. 不要编造事实。
4. 回答尽量简洁但完整。

用户问题：

${text}`
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

      // Telegram 回复
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

      console.log(err);

      return new Response(err.stack || err.message, {
        status: 500
      });

    }
  }
};
