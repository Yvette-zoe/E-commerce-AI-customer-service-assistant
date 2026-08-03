import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * 开发/预览服务端代理：前端只请求 /api/chat，
 * Token 与 workflow_id 留在服务端环境变量，不暴露到浏览器。
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

      const cozeRes = await fetch('https://api.coze.cn/v1/workflow/run', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workflow_id: workflowId,
          parameters: { user_input: userInput },
        }),
      })

      const result = await cozeRes.json()

      if (!cozeRes.ok || result.code !== 0) {
        res.statusCode = 502
        res.setHeader('Content-Type', 'application/json')
        res.end(
          JSON.stringify({
            error: result.msg || 'Coze API 调用失败',
            code: result.code,
          }),
        )
        return
      }

      // Coze 返回的 data 通常是 JSON 字符串，需再解析一次
      let data = result.data
      if (typeof data === 'string') {
        data = JSON.parse(data)
      }

      const reply = data?.reply
      if (!reply) {
        res.statusCode = 502
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: '响应中缺少 data.reply' }))
        return
      }

      res.statusCode = 200
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ reply }))
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
