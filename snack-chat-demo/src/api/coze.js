/**
 * 调用本地代理 /api/chat → Coze 对话流 /v1/workflows/chat
 * Token 不出现在前端；conversation_id 用于多轮追问（如补订单号）。
 * 返回 replies 数组：每个输出节点对应一条，前端各渲染为一个气泡。
 */
export async function fetchAiReply(userInput, conversationId) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_input: userInput,
      conversation_id: conversationId || undefined,
    }),
  })

  const data = await res.json().catch(() => ({}))
  const replies = Array.isArray(data.replies)
    ? data.replies.filter((t) => typeof t === 'string' && t.trim())
    : []

  if (!res.ok || replies.length === 0) {
    throw new Error(data.error || '稍后再试')
  }

  return {
    replies,
    conversationId: data.conversation_id || conversationId || null,
  }
}
