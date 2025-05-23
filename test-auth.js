#!/usr/bin/env node

const https = require('https');
const http = require('http');

const data = JSON.stringify({
    username: 'admin',
    password: 'admin'
});

const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

console.log('Testing authentication...');

const req = http.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Headers:`, res.headers);
    
    let body = '';
    res.on('data', (chunk) => {
        body += chunk;
    });
    
    res.on('end', () => {
        console.log('Response body:', body);
        try {
            const response = JSON.parse(body);
            console.log('Parsed response:', response);
        } catch (error) {
            console.log('Failed to parse JSON response');
        }
    });
});

req.on('error', (error) => {
    console.error('Request error:', error);
});

req.write(data);
req.end();
