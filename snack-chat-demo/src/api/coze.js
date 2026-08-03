/**
 * 调用本地代理 /api/chat，由服务端转发至 Coze 工作流。
 * Token 不出现在前端代码中。
 */
export async function fetchAiReply(userInput) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_input: userInput }),
  })

  const data = await res.json().catch(() => ({}))

  if (!res.ok || !data.reply) {
    throw new Error(data.error || '稍后再试')
  }

  return data.reply
}
