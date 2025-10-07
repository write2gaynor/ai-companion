const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys')
const express = require('express')
const cors = require('cors')
const axios = require('axios')
const fs = require('fs')
const path = require('path')
const QRCode = require('qrcode')

const app = express()
app.use(cors())
app.use(express.json())

// Configuration
const FASTAPI_URL = process.env.FASTAPI_URL || 'https://adapt-friend.preview.emergentagent.com'
const PORT = process.env.PORT || 3001

let sock = null
let qrCode = null
let qrCodeImage = null
let connectionState = 'disconnected'

// Ensure auth directory exists
const authDir = path.join(__dirname, 'auth_info')
if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true })
}

async function initWhatsApp() {
    try {
        const { state, saveCreds } = await useMultiFileAuthState('auth_info')

        sock = makeWASocket({
            auth: state,
            printQRInTerminal: true,
            browser: ['AI Companion', 'Chrome', '1.0.0'],
            defaultQueryTimeoutMs: 60000,
        })

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update

            if (qr) {
                qrCode = qr
                connectionState = 'qr'
                console.log('QR Code generated - scan with WhatsApp')
                
                // Generate Base64 QR code image
                try {
                    qrCodeImage = await QRCode.toDataURL(qr, {
                        width: 256,
                        margin: 2,
                        color: {
                            dark: '#000000',
                            light: '#FFFFFF'
                        }
                    })
                    console.log('QR Code image generated successfully')
                } catch (error) {
                    console.error('Failed to generate QR code image:', error)
                    qrCodeImage = null
                }
            }

            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut
                
                console.log('Connection closed:', {
                    reason: lastDisconnect?.error?.output?.payload?.message || 'Unknown',
                    statusCode,
                    shouldReconnect
                })
                
                connectionState = 'disconnected'
                qrCode = null
                qrCodeImage = null

                if (shouldReconnect) {
                    // Add exponential backoff for reconnection
                    const delay = statusCode === 408 ? 15000 : 5000 // Longer delay for QR timeout
                    console.log(`Reconnecting in ${delay/1000} seconds...`)
                    setTimeout(() => {
                        try {
                            initWhatsApp()
                        } catch (error) {
                            console.error('Reconnection failed:', error)
                        }
                    }, delay)
                }
            } else if (connection === 'open') {
                console.log('WhatsApp connected successfully')
                connectionState = 'connected'
                qrCode = null
                qrCodeImage = null
                
                console.log('WhatsApp Bot is ready for AI Companion integration!')
            } else if (connection === 'connecting') {
                console.log('Connecting to WhatsApp...')
                connectionState = 'connecting'
            }
        })

        sock.ev.on('messages.upsert', async ({ messages, type }) => {
            if (type === 'notify') {
                for (const message of messages) {
                    if (!message.key.fromMe && message.message) {
                        await handleIncomingMessage(message)
                    }
                }
            }
        })

        sock.ev.on('creds.update', saveCreds)

    } catch (error) {
        console.error('WhatsApp initialization error:', error)
        connectionState = 'error'
        qrCode = null
        qrCodeImage = null
        
        // Retry with exponential backoff
        setTimeout(() => {
            console.log('Retrying WhatsApp initialization...')
            initWhatsApp()
        }, 15000)
    }
}

async function handleIncomingMessage(message) {
    try {
        const phoneNumber = message.key.remoteJid.replace('@s.whatsapp.net', '')
        const messageText = message.message.conversation ||
                           message.message.extendedTextMessage?.text || ''

        console.log(`Received from ${phoneNumber}: ${messageText}`)

        // Forward message to FastAPI AI Companion for processing
        const response = await axios.post(`${FASTAPI_URL}/api/whatsapp/process`, {
            phone_number: phoneNumber,
            message: messageText,
            message_id: message.key.id,
            timestamp: message.messageTimestamp
        }, {
            timeout: 30000 // 30 second timeout for AI processing
        })

        // Send AI response back to WhatsApp
        if (response.data.reply) {
            await sendMessage(phoneNumber, response.data.reply)
        }

    } catch (error) {
        console.error('Error handling incoming message:', error)
        
        // Send error message to user
        try {
            const phoneNumber = message.key.remoteJid.replace('@s.whatsapp.net', '')
            await sendMessage(phoneNumber, "Sorry, I'm having trouble processing your message right now. Please try again in a moment! 🤖")
        } catch (sendError) {
            console.error('Failed to send error message:', sendError)
        }
    }
}

async function sendMessage(phoneNumber, text) {
    try {
        if (!sock || connectionState !== 'connected') {
            throw new Error('WhatsApp not connected')
        }

        const jid = phoneNumber.includes('@') ? phoneNumber : `${phoneNumber}@s.whatsapp.net`
        await sock.sendMessage(jid, { text })
        
        console.log(`Sent to ${phoneNumber}: ${text}`)
        return { success: true }

    } catch (error) {
        console.error('Error sending message:', error)
        return { success: false, error: error.message }
    }
}

// REST API endpoints for integration
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', connection: connectionState })
})

app.get('/qr', (req, res) => {
    res.json({ 
        qr: qrCodeImage, // Send the Base64 image instead of raw QR string
        qr_raw: qrCode,   // Keep raw QR for debugging
        connection_state: connectionState 
    })
})

app.post('/send', async (req, res) => {
    try {
        const { phone_number, message } = req.body
        
        if (!phone_number || !message) {
            return res.status(400).json({ 
                success: false, 
                error: 'phone_number and message are required' 
            })
        }
        
        const result = await sendMessage(phone_number, message)
        res.json(result)
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        })
    }
})

app.get('/status', (req, res) => {
    res.json({
        connected: connectionState === 'connected',
        connection_state: connectionState,
        user: sock?.user || null,
        qr_available: !!qrCode
    })
})

// Endpoint for sending scheduled messages (welfare checks, reminders)
app.post('/schedule', async (req, res) => {
    try {
        const { phone_number, message, type = 'reminder' } = req.body
        
        if (!phone_number || !message) {
            return res.status(400).json({ 
                success: false, 
                error: 'phone_number and message are required' 
            })
        }
        
        // Add emoji based on message type
        let formattedMessage = message
        if (type === 'welfare_check') {
            formattedMessage = `🌅 ${message}`
        } else if (type === 'reminder') {
            formattedMessage = `⏰ ${message}`
        } else if (type === 'good_morning') {
            formattedMessage = `☀️ ${message}`
        }
        
        const result = await sendMessage(phone_number, formattedMessage)
        res.json(result)
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        })
    }
})

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('Shutting down WhatsApp service...')
    if (sock) {
        sock.end()
    }
    process.exit(0)
})

// Start server
app.listen(PORT, () => {
    console.log(`WhatsApp AI Companion service running on port ${PORT}`)
    console.log('Initializing WhatsApp connection...')
    initWhatsApp()
})