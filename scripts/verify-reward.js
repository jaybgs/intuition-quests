import axios from 'axios';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), 'backend', '.env') });

const API_URL = 'http://localhost:3001/api/quests/ecosystem-reward';
const JWT_SECRET = process.env.JWT_SECRET;
const WALLET_ADDRESS = '0x1234567890123456789012345678901234567890'; // Test wallet

if (!JWT_SECRET) {
    console.error('No JWT_SECRET found in backend/.env');
    process.exit(1);
}

// Generate test token
// Matching auth.ts structure: address (string), wallet (string)
const token = jwt.sign(
    {
        address: WALLET_ADDRESS,
        wallet: WALLET_ADDRESS.toLowerCase(),
        role: 'authenticated'
    },
    JWT_SECRET,
    { expiresIn: '1h' }
);

async function testReward() {
    try {
        console.log('Testing ecosystem reward for:', WALLET_ADDRESS);
        console.log('DApp ID: intuition-portal');

        const response = await axios.post(
            API_URL,
            {
                walletAddress: WALLET_ADDRESS,
                dappId: 'intuition-portal'
            },
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('Response Status:', response.status);
        console.log('Response Data:', response.data);

        if (response.data.success) {
            console.log('✅ Success! Reward awarded (or handled).');
        } else {
            console.log('❌ Failed:', response.data.message || response.data.error);
        }

    } catch (error) {
        if (error.response) {
            console.error('❌ Request failed:', error.response.status, error.response.data);
        } else {
            console.error('❌ Error:', error.message);
        }
    }
}

testReward();
