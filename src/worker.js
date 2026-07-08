export default {
  async fetch(request, env) {
    try {
      if (request.method !== "POST") {
        return new Response("Telegram AI Assistant", {
          status: 200,
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

      const aiResponse = await env.AI.run(
        "@cf/meta/llama-3.1-8b-instruct-fp8",
        {
          messages: [
            {
              role: "system",
              content:
                "你是一位专业、智能、友好的 AI 助手，请始终使用用户的语言回答问题。"
            },
            {
              role: "user",
              content: text
            }
          ]
        }
      );

      let answer = "抱歉，没有获取到回复。";

      if (aiResponse.response) {
        answer = aiResponse.response;
      } else if (aiResponse.result?.response) {
        answer = aiResponse.result.response;
      } else if (typeof aiResponse === "string") {
        answer = aiResponse;
      }

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
      return new Response(err.stack || err.message, {
        status: 500
      });
    }
  }
};
