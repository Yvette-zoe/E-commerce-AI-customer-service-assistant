// 假数据：根据用户输入关键词匹配 AI 回复
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

// 关键词匹配规则
const replyRules = [
  {
    keywords: ['物流', '到哪', '快递', '发货', '配送', '订单状态'],
    reply: '您的订单 86731 已到本地仓,预计明天送达~',
  },
  {
    keywords: ['退货', '换货', '退换', '退款', '无理由'],
    reply: '支持 7 天无理由退货,未拆封商品可全额退款。需要我帮您发起退货申请吗?',
  },
  {
    keywords: ['优惠', '折扣', '券', '活动'],
    reply: '当前满 99 减 15,新用户首单再减 10 元~ 需要我帮您看看可用优惠券吗?',
  },
]

/** 根据用户消息生成假 AI 回复 */
export function getFakeReply(userText) {
  const text = userText.trim()
  for (const rule of replyRules) {
    if (rule.keywords.some((kw) => text.includes(kw))) {
      return rule.reply
    }
  }
  return '您好!我是零食小助手,可以帮您查物流、了解退换货政策。请问有什么可以帮您的?'
}
