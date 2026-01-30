import axios from 'axios'

const WEBHOOK_URL = 'https://n8n.srv954870.hstgr.cloud/webhook/e012ebe8-18a3-401b-a72a-e4fdeba3395d'

export const sendToWebhook = async (payload: any) => {
  try {
    console.log('📤 Sending to n8n webhook:', WEBHOOK_URL)
    console.log('📦 Payload:', JSON.stringify(payload, null, 2))
    
    const response = await axios.post(WEBHOOK_URL, payload, {
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    console.log('✅ Webhook response:', response.data)
    return { success: true, data: response.data }
  } catch (error) {
    console.error('❌ Webhook error:', error)
    if (axios.isAxiosError(error)) {
      console.error('Error details:', error.response?.data)
    }
    return { success: false, error: 'Failed to send webhook' }
  }
}
