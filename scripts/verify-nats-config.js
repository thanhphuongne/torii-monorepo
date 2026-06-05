#!/usr/bin/env node
/**
 * NATS Configuration Verification Script
 * 
 * Verifies that all required NATS configuration is correct
 */

require('dotenv').config({ path: '.env' });
const nkeys = require('nkeys.js');

console.log('🔍 NATS Configuration Verification\n');
console.log('='.repeat(60));

let errors = 0;
let warnings = 0;

// Helper functions
function checkEnv(key, required = true) {
    const value = process.env[key];
    if (!value) {
        if (required) {
            console.log(`❌ MISSING: ${key}`);
            errors++;
        } else {
            console.log(`⚠️  OPTIONAL MISSING: ${key}`);
            warnings++;
        }
        return null;
    }
    console.log(`✅ ${key}: ${value.substring(0, 20)}...`);
    return value;
}

function getPublicKey(seed, type) {
    try {
        const kp = nkeys.fromSeed(Buffer.from(seed));
        const publicKey = kp.getPublicKey();
        console.log(`   → ${type} Public Key: ${publicKey}`);
        return publicKey;
    } catch (error) {
        console.log(`   ❌ Invalid ${type} seed: ${error.message}`);
        errors++;
        return null;
    }
}

// Check required env vars
console.log('\n📋 Environment Variables:\n');

console.log('NATS Connection:');
checkEnv('NATS_URL');
checkEnv('NATS_WS_URLS');

console.log('\nNATS Auth Keys:');
const accountSeed = checkEnv('NATS_ACCOUNT_SEED');
const xkeySeed = checkEnv('NATS_XKEY_SEED', false);
const nkeySeed = checkEnv('NATS_NKEY_SEED');

console.log('\nNATS Account:');
checkEnv('NATS_ACCOUNT_NAME');

console.log('\nNATS Subjects:');
checkEnv('NATS_SUBJECT_SYSTEM_JS_WORKER');
checkEnv('NATS_SUBJECT_SYSTEM_PUBLIC');
checkEnv('NATS_SUBJECT_SYSTEM_PRIVATE');
checkEnv('NATS_SUBJECT_CHAT');
checkEnv('NATS_SUBJECT_WHITEBOARD');
checkEnv('NATS_SUBJECT_DATA_CHANNEL');

console.log('\nLiveKit:');
checkEnv('LIVEKIT_APIKEY');
checkEnv('LIVEKIT_API_SECRET');

// Generate and display public keys
console.log('\n🔑 Public Keys (for nats_server.conf):\n');

if (accountSeed) {
    console.log('Account Seed → issuer:');
    const publicKey = getPublicKey(accountSeed, 'Account');
    if (publicKey) {
        console.log(`   Copy to nats_server.conf: issuer: ${publicKey}`);
    }
}

if (nkeySeed) {
    console.log('\nNKey Seed → auth_users & nkey:');
    const publicKey = getPublicKey(nkeySeed, 'NKey');
    if (publicKey) {
        console.log(`   Copy to nats_server.conf:`);
        console.log(`     users: [{ nkey: ${publicKey} }]`);
        console.log(`     auth_users: [ ${publicKey} ]`);
    }
}

if (xkeySeed) {
    console.log('\nXKey Seed → xkey:');
    const publicKey = getPublicKey(xkeySeed, 'XKey');
    if (publicKey) {
        console.log(`   Copy to nats_server.conf: xkey: ${publicKey}`);
    }
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('\n📊 Summary:\n');

if (errors === 0 && warnings === 0) {
    console.log('✅ All required configuration is present and valid!');
    console.log('✅ Ready to start NATS services');
} else {
    if (errors > 0) {
        console.log(`❌ ${errors} ERROR(S) found - fix these before starting`);
    }
    if (warnings > 0) {
        console.log(`⚠️  ${warnings} WARNING(S) - optional but recommended`);
    }
}

console.log('\n💡 Next Steps:\n');
console.log('1. Fix any errors above');
console.log('2. Copy public keys to nats_server.conf');
console.log('3. Start NATS: nats-server -c nats_server.conf');
console.log('4. Start Room Service: pnpm --filter room-service start:dev');
console.log('\n');

process.exit(errors > 0 ? 1 : 0);
