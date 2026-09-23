// Simple test of getEnv logic
function getEnv(context, key) {
  try {
    const ctx = context;
    if (ctx?.env?.[key]) return ctx.env[key];
    if (typeof process !== 'undefined' && process.env?.[key]) return process.env[key];
  } catch {}
  return '';
}

// Test with env var set
const context1 = { env: { GROQ_API_KEY: 'gsk_test123' } };
console.log('Test 1 (env set):', getEnv(context1, 'GROQ_API_KEY'));

// Test with env var not set
const context2 = { env: {} };
console.log('Test 2 (env empty):', JSON.stringify(getEnv(context2, 'GROQ_API_KEY')));

// Test with env undefined
const context3 = {};
console.log('Test 3 (env undefined):', JSON.stringify(getEnv(context3, 'GROQ_API_KEY')));

// Test with process.env
const context4 = {};
process.env.GROQ_API_KEY = 'from-process';
console.log('Test 4 (process.env):', getEnv(context4, 'GROQ_API_KEY'));
delete process.env.GROQ_API_KEY;
