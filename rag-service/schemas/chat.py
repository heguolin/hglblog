"""OpenAI 兼容的聊天请求/响应模型。"""

from typing import List, Optional
from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: str = Field(..., description="user | assistant | system")
    content: str = Field(..., description="消息正文")


class ChatRequest(BaseModel):
    messages: List[ChatMessage] = Field(..., min_length=1, description="对话历史")
    temperature: Optional[float] = Field(0.7, ge=0.0, le=2.0)
    max_tokens: Optional[int] = Field(1024, ge=1, le=4096)


class ChatChoice(BaseModel):
    index: int = 0
    message: ChatMessage


class Usage(BaseModel):
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0


class ChatResponse(BaseModel):
    choices: List[ChatChoice]
    usage: Usage = Field(default_factory=Usage)
