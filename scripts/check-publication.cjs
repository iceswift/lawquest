const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

// Inspect staged blobs, so a local ignored file cannot leak into this report.
const root = path.resolve(__dirname, '..');
const files = execFileSync('git', ['ls-files', '-z'], { cwd: root }).toString().split('\0').filter(Boolean);
const findings = [];
const secretPatterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bgh[pousr]_[A-Za-z0-9]{30,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{40,}\b/,
  /\bsk-(?:proj-)?[A-Za-z0-9_-]{24,}\b/,
  /\bAIza[0-9A-Za-z_-]{30,}\b/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/,
];
for (const file of files) {
  if (/(^|\/)(?:\.env(?:\..*)?|\.dev\.vars(?:\..*)?)$/.test(file) && file !== '.env.example') findings.push(file + ': environment file');
  if (file.startsWith('data/') && file !== 'data/legal-v3/packages/manifest.json') findings.push(file + ': full content dataset');
  const blob = execFileSync('git', ['show', ':' + file], { cwd: root, maxBuffer: 25 * 1024 * 1024 });
  if (blob.length > 20 * 1024 * 1024) findings.push(file + ': oversized file');
  if (blob.includes(0)) continue;
  if (secretPatterns.some(pattern => pattern.test(blob.toString('utf8')))) findings.push(file + ': possible credential');
}
if (findings.length) {
  console.error(findings.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Publication checks passed for ' + files.length + ' staged files.');
}
