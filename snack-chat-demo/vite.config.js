import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * 从 Coze 对话流 SSE 响应中提取可读回复。
 * 结束节点会额外吐出一段 JSON 变量，需要过滤掉。
 */
function extractReplyFromSse(sseText) {
  let conversationId = null
  const answers = []
  let failedMsg = null

  for (const block of sseText.split('\n\n')) {
    const lines = block.trim().split('\n')
    let event = null
    let data = null
    for (const line of lines) {
      if (line.startsWith('event:')) event = line.slice(6).trim()
      if (line.startsWith('data:')) data = line.slice(5).trim()
    }
    if (!data) continue

    let obj
    try {
      obj = JSON.parse(data)
    } catch {
      continue
    }

    if (obj.conversation_id) {
      conversationId = obj.conversation_id
    }

    if (event === 'conversation.chat.failed' || event === 'error') {
      failedMsg = obj.last_error?.msg || obj.msg || obj.message || '对话失败'
    }

    if (
      event === 'conversation.message.completed' &&
      obj.type === 'answer' &&
      typeof obj.content === 'string'
    ) {
      answers.push(obj.content)
    }
  }

  // 过滤结束节点吐出的 JSON 变量包；每个输出节点对应一条独立回复
  const replies = answers
    .map((text) => text.trim())
    .filter((t) => {
      if (!t) return false
      if (t.startsWith('{') && t.endsWith('}')) {
        try {
          JSON.parse(t)
          return false
        } catch {
          return true
        }
      }
      return true
    })

  return { conversationId, replies, failedMsg, answers }
}

/**
 * 开发/预览服务端代理：前端只请求 /api/chat。
 * 对话流应走 /v1/workflows/chat（不是 /v1/workflow/run）。
 */
function cozeChatProxy() {
  async function handleChat(req, res, env) {
    if (req.method !== 'POST') {
      res.statusCode = 405
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: 'Method Not Allowed' }))
      return
    }

    try {
      const chunks = []
      for await (const chunk of req) {
        chunks.push(chunk)
      }
      const body = JSON.parse(Buffer.concat(chunks).toString() || '{}')
      const userInput = (body.user_input || '').trim()
      const conversationId = body.conversation_id || undefined

      if (!userInput) {
        res.statusCode = 400
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: 'user_input is required' }))
        return
      }

      const token = env.COZE_API_TOKEN
      const workflowId = env.COZE_WORKFLOW_ID

      if (!token || !workflowId) {
        res.statusCode = 500
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: '缺少 COZE_API_TOKEN 或 COZE_WORKFLOW_ID' }))
        return
      }

      // 对话流：USER_INPUT 必须放在 additional_messages，parameters 里无效
      const payload = {
        workflow_id: workflowId,
        additional_messages: [
          {
            role: 'user',
            content: userInput,
            content_type: 'text',
          },
        ],
        parameters: {},
      }
      if (conversationId) {
        payload.conversation_id = conversationId
      }

      const cozeRes = await fetch('https://api.coze.cn/v1/workflows/chat', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify(payload),
      })

      const sseText = await cozeRes.text()

      // 非 SSE / 明确错误 JSON
      if (!cozeRes.ok) {
        let errMsg = 'Coze API 调用失败'
        try {
          const errJson = JSON.parse(sseText)
          errMsg = errJson.msg || errMsg
        } catch {
          /* ignore */
        }
        res.statusCode = 502
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: errMsg }))
        return
      }

      const { conversationId: nextConversationId, replies, failedMsg } =
        extractReplyFromSse(sseText)

      if (failedMsg) {
        res.statusCode = 502
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: failedMsg }))
        return
      }

      if (!replies.length) {
        res.statusCode = 502
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: '未解析到有效回复' }))
        return
      }

      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json')
      res.end(
        JSON.stringify({
          // replies：每个输出节点一条，前端各渲染为一个气泡
          replies,
          conversation_id: nextConversationId,
        }),
      )
    } catch (err) {
      console.error('[coze proxy]', err)
      res.statusCode = 500
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: '稍后再试' }))
    }
  }

  return {
    name: 'coze-chat-proxy',
    configureServer(server) {
      const env = loadEnv(server.config.mode, server.config.envDir || process.cwd(), '')
      server.middlewares.use('/api/chat', (req, res) => {
        handleChat(req, res, env)
      })
    },
    configurePreviewServer(server) {
      const env = loadEnv(server.config.mode, process.cwd(), '')
      server.middlewares.use('/api/chat', (req, res) => {
        handleChat(req, res, env)
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), cozeChatProxy()],
})
