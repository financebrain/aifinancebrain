import Groq from 'groq-sdk'

const groq = new Groq({
apiKey: process.env.GROQ_API_KEY
})

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

export async function callGemini(prompt) {
await delay(1000)
try {
const completion = await groq.chat.completions.create({
messages: [{ role: 'user', content: prompt }],
model: 'llama-3.3-70b-versatile',
temperature: 0.7,
max_tokens: 1024,
})
return completion.choices[0]?.message?.content || ''
} catch (error) {
if (error.status === 429) {
await delay(5000)
const retry = await groq.chat.completions.create({
messages: [{ role: 'user', content: prompt }],
model: 'llama-3.1-8b-instant',
temperature: 0.7,
max_tokens: 1024,
})
return retry.choices[0]?.message?.content || ''
}
throw error
}
}
