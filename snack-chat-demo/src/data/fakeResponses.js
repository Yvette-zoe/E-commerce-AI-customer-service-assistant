// 打开页面时展示的示例对话（静态，不经过 API）
export const initialMessages = [
  { id: 1, role: 'user', text: '我买的沙发到哪了?' },
  { id: 2, role: 'ai', text: '您的订单 86731 已到本地仓,预计明天送达~' },
  { id: 3, role: 'user', text: '怎么退货?' },
  { id: 4, role: 'ai', text: '支持 7 天无理由,我帮您发起~' },
]

// 常见问题快捷按钮
export const quickQuestions = [
  { label: '查物流', text: '我的订单到哪了?' },
  { label: '退换货政策', text: '怎么退货?' },
  { label: '订单状态', text: '帮我查一下订单状态' },
]
