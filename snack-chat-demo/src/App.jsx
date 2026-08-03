import { useState, useRef, useEffect, useCallback } from 'react'
import { initialMessages, quickQuestions } from './data/fakeResponses'
import { fetchAiReply } from './api/coze'
import './App.css'

let messageId = initialMessages.length + 1

function App() {
  const [messages, setMessages] = useState(initialMessages)
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // 自动滚到底部
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, isTyping, scrollToBottom])

  // 发送消息并请求 Coze 工作流回复
  const sendMessage = useCallback(
    async (text) => {
      const trimmed = text.trim()
      if (!trimmed || isTyping) return

      const userMsg = { id: messageId++, role: 'user', text: trimmed }
      setMessages((prev) => [...prev, userMsg])
      setInput('')
      setIsTyping(true)

      try {
        const reply = await fetchAiReply(trimmed)
        const aiMsg = { id: messageId++, role: 'ai', text: reply }
        setMessages((prev) => [...prev, aiMsg])
      } catch {
        // 调用失败时展示友好提示
        const errMsg = { id: messageId++, role: 'ai', text: '稍后再试' }
        setMessages((prev) => [...prev, errMsg])
      } finally {
        setIsTyping(false)
      }
    },
    [isTyping],
  )

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const handleQuickQuestion = (text) => {
    sendMessage(text)
    inputRef.current?.focus()
  }

  return (
    <div className="chat-page">
      {/* 顶部标题栏 */}
      <header className="chat-header">
        <h1 className="chat-title">零食小助手</h1>
        <span className="online-status">
          <span className="status-dot" />
          在线
        </span>
      </header>

      {/* 中间消息区 */}
      <main className="chat-messages">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`message-row ${msg.role === 'user' ? 'message-row--user' : 'message-row--ai'}`}
          >
            <div
              className={`message-bubble ${msg.role === 'user' ? 'message-bubble--user' : 'message-bubble--ai'}`}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="message-row message-row--ai">
            <div className="message-bubble message-bubble--ai typing-indicator">
              正在输入…
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      {/* 底部输入区 */}
      <footer className="chat-footer">
        <div className="quick-questions">
          {quickQuestions.map((q) => (
            <button
              key={q.label}
              type="button"
              className="quick-btn"
              onClick={() => handleQuickQuestion(q.text)}
              disabled={isTyping}
            >
              {q.label}
            </button>
          ))}
        </div>

        <div className="input-row">
          <input
            ref={inputRef}
            type="text"
            className="chat-input"
            placeholder="输入您的问题…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isTyping}
          />
          <button
            type="button"
            className="send-btn"
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isTyping}
            aria-label="发送"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </button>
        </div>
      </footer>
    </div>
  )
}

export default App
