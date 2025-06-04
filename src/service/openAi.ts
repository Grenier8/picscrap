import OpenAI from "openai";

export default class OpenAiService {
  apiKey: string;
  openAi: OpenAI;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || "";
    if (this.apiKey) {
      console.log("[OpenAiService] API key loaded.");
    } else {
      console.warn("[OpenAiService] API key is missing!");
    }
    this.openAi = new OpenAI({
      apiKey: this.apiKey,
      dangerouslyAllowBrowser: true,
    });
  }

  async callAssistant(message: string): Promise<string> {
    const assistantId = process.env.OPENAI_ASSISTANT_ID || "";
    console.log(
      `[OpenAiService] callAssistant invoked. Assistant ID: ${
        assistantId ? assistantId : "NOT FOUND"
      }`
    );

    if (assistantId === "") {
      console.log("[OpenAiService] Assistant ID not found");
      throw new Error("Error: Id asistente no encontrado");
    } else {
      return await this.sendMessage(message, assistantId);
    }
  }

  async sendMessage(message: string, assistantId: string) {
    console.log(
      `[OpenAiService] sendMessage called. Assistant ID: ${assistantId}`
    );
    console.log(
      `[OpenAiService] Message: ${message.slice(0, 120)}${
        message.length > 120 ? "..." : ""
      }`
    );
    // Número máximo de reintentos en caso de timeout
    const MAX_RETRIES = 3;
    // Timeout en milisegundos
    const TIMEOUT = 25000;

    // Helper para fetch con timeout
    async function fetchWithTimeout(
      resource: RequestInfo,
      options: RequestInit = {},
      timeout = TIMEOUT
    ) {
      console.log(
        `[OpenAiService] [fetchWithTimeout] Fetching: ${
          typeof resource === "string" ? resource : "[Request Object]"
        } with timeout ${timeout}ms`
      );
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);
      try {
        const response = await fetch(resource, {
          ...options,
          signal: controller.signal,
        });
        clearTimeout(id);
        console.log(
          `[OpenAiService] [fetchWithTimeout] Response status: ${response.status}`
        );
        return response;
      } catch (error) {
        clearTimeout(id);
        if (error instanceof Error && error.name === "AbortError") {
          console.warn(
            `[OpenAiService] [fetchWithTimeout] Request timed out after ${timeout}ms`
          );
          throw new Error("Request timed out");
        }
        console.error(`[OpenAiService] [fetchWithTimeout] Error:`, error);
        throw error;
      }
    }

    // Función de ayuda para reintentar en caso de timeout
    async function retryFetchWithTimeout(
      resource: RequestInfo,
      options: RequestInit = {},
      timeout = TIMEOUT
    ) {
      let attempt = 0;
      while (attempt < MAX_RETRIES) {
        try {
          if (attempt > 0) {
            console.log(
              `[OpenAiService] [retryFetchWithTimeout] Retry attempt ${
                attempt + 1
              } for: ${
                typeof resource === "string" ? resource : "[Request Object]"
              }`
            );
          }
          return await fetchWithTimeout(resource, options, timeout);
        } catch (error) {
          if (error instanceof Error && error.message === "Request timed out") {
            attempt++;
            if (attempt >= MAX_RETRIES) {
              console.error(
                `[OpenAiService] [retryFetchWithTimeout] Max retries reached for: ${
                  typeof resource === "string" ? resource : "[Request Object]"
                }`
              );
              throw error;
            }
            console.warn(
              `[OpenAiService] [retryFetchWithTimeout] Timeout, retrying (${attempt}/${MAX_RETRIES})...`
            );
          } else {
            throw error;
          }
        }
      }
    }

    // Crear un thread
    let threadRes;
    try {
      console.log("[OpenAiService] Creating thread...");
      threadRes = await retryFetchWithTimeout(
        "https://api.openai.com/v1/threads",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
            "OpenAI-Beta": "assistants=v2",
          },
        }
      );
      console.log("[OpenAiService] Thread created. Status:", threadRes?.status);
    } catch (error) {
      console.error("[OpenAiService] Error creating thread:", error);
      throw error;
    }
    const thread = await threadRes?.json();

    // Añadir un mensaje al thread
    try {
      console.log(`[OpenAiService] Adding message to thread ${thread.id}...`);
      await retryFetchWithTimeout(
        `https://api.openai.com/v1/threads/${thread.id}/messages`,
        {
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
        }
      );
      console.log(`[OpenAiService] Message added to thread ${thread.id}.`);
    } catch (error) {
      console.error(
        `[OpenAiService] Error sending message to thread ${thread.id}:`,
        error
      );
      throw error;
    }

    // Ejecutar el asistente
    console.log(`[OpenAiService] Starting run for thread ${thread.id}...`);
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
    if (!run.id) {
      console.error("[OpenAiService] Error: run response does not contain an id.", run);
      throw new Error(`[OpenAiService] Error starting run: ${JSON.stringify(run)}`);
    }
    console.log(`[OpenAiService] Run started. Run ID: ${run.id}`);

    // Esperar a que termine el run
    let runStatus;
    let maxStatusChecks = 30; // máximo 30 intentos (~30 segundos)
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
      if (!runStatus.status) {
        console.error("[OpenAiService] Error: run status response does not contain a status.", runStatus);
        throw new Error(`[OpenAiService] Error fetching run status: ${JSON.stringify(runStatus)}`);
      }
      console.log(`[OpenAiService] Run status: ${runStatus.status}`);
      maxStatusChecks--;
      if (maxStatusChecks <= 0) {
        throw new Error("[OpenAiService] Max run status checks reached, aborting.");
      }
    } while (runStatus.status !== "completed");

    // Obtener los mensajes de respuesta
    console.log(`[OpenAiService] Fetching messages for thread ${thread.id}...`);
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
    console.log(
      `[OpenAiService] Messages fetched. Count: ${messages.data?.length}`
    );

    const respuesta = messages.data.find((m: any) => m.role === "assistant")
      ?.content[0]?.text?.value;
    console.log(
      `[OpenAiService] Assistant response: ${
        respuesta ? respuesta.slice(0, 120) : "No response"
      }${respuesta && respuesta.length > 120 ? "..." : ""}`
    );
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
