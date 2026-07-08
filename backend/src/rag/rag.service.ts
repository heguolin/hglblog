import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);
  private readonly ragUrl = process.env.RAG_SERVICE_URL ?? "http://127.0.0.1:8002";

  /** 触发单条内容重索引（异步，不阻塞主流程）。 */
  reindex(sourceType: "post" | "chatter", sourceId: number): void {
    const url = `${this.ragUrl}/api/rag/reindex`;
    const body = JSON.stringify({ source_type: sourceType, source_id: sourceId });

    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    })
      .then((res) => {
        if (!res.ok) {
          this.logger.warn(`Reindex failed: ${sourceType}#${sourceId} → HTTP ${res.status}`);
        }
      })
      .catch((err) => {
        this.logger.warn(`Reindex unreachable: ${sourceType}#${sourceId} — ${err.message}`);
      });
  }
}
