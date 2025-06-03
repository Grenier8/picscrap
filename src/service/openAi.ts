import OpenAI from "openai";

export default class OpenAiService {
  apiKey: string;
  openAi: OpenAI;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || "";
    this.openAi = new OpenAI({
      apiKey: this.apiKey,
      dangerouslyAllowBrowser: true,
    });
  }

  async callAssistant(message: string): Promise<string> {
    const assistantId = process.env.OPENAI_ASSISTANT_ID || "";

    if (assistantId === "") {
      console.log("Id asistente no encontrado");
      throw new Error("Error: Id asistente no encontrado");
    } else {
      return await this.sendMessage(message, assistantId);
    }
  }

  async sendMessage(message: string, assistantId: string) {
    // Crear un thread
    const threadRes = await fetch("https://api.openai.com/v1/threads", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "assistants=v2",
      },
    });
    const thread = await threadRes.json();

    // Añadir un mensaje al thread
    await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "assistants=v2",
      },
      body: JSON.stringify({
        role: "user",
        content: message,
      }),
    });

    // Ejecutar el asistente
    const runRes = await fetch(
      `https://api.openai.com/v1/threads/${thread.id}/runs`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "OpenAI-Beta": "assistants=v2",
        },
        body: JSON.stringify({
          assistant_id: assistantId,
        }),
      }
    );
    const run = await runRes.json();

    // Esperar a que termine el run
    let runStatus;
    do {
      await new Promise((res) => setTimeout(res, 1000)); // esperar 1 segundo
      const statusRes = await fetch(
        `https://api.openai.com/v1/threads/${thread.id}/runs/${run.id}`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "OpenAI-Beta": "assistants=v2",
          },
        }
      );
      runStatus = await statusRes.json();
    } while (runStatus.status !== "completed");

    // Obtener los mensajes de respuesta
    const messagesRes = await fetch(
      `https://api.openai.com/v1/threads/${thread.id}/messages`,
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "OpenAI-Beta": "assistants=v2",
        },
      }
    );
    const messages = await messagesRes.json();

    const respuesta = messages.data.find((m: any) => m.role === "assistant")
      ?.content[0]?.text?.value;
    return respuesta;
  }

  async getResponse(prompt: string) {
    try {
      const response = await this.openAi.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
      });
      return response.choices[0].message.content;
    } catch (error) {
      console.error("Error fetching OpenAI response:", error);
      return "Error al obtener respuesta de OpenAI";
    }
  }
}
