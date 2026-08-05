import {readFile, readdir, writeFile} from 'node:fs/promises';
import {join} from 'node:path';

import {format} from 'prettier';

const root = process.cwd();
const prettierOptions = {
  parser: 'typescript',
  singleQuote: true,
  bracketSpacing: false,
  printWidth: 100,
  trailingComma: 'none'
};
const files = await readdir(join(root, 'messages'));
const locales = files
  .filter((file) => file.endsWith('.json'))
  .map((file) => file.slice(0, -5))
  .filter((locale) => /^[a-z]{2}(?:-[A-Z]{2})?$/.test(locale))
  .sort((left, right) => left.localeCompare(right));

if (!locales.includes('en'))
  throw new Error('messages/en.json is required as the fallback locale.');
const source = `// Generated from messages/*.json. Do not edit manually.\nexport const generatedLocales = ${JSON.stringify(locales)} as const;\n`;
await writeFile(
  join(root, 'src', 'i18n', 'generated-locales.ts'),
  await format(source, prettierOptions),
  'utf8'
);

const emailCatalogs = {};
for (const locale of locales) {
  const catalog = JSON.parse(await readFile(join(root, 'messages', `${locale}.json`), 'utf8'));
  if (catalog.AuthEmails) emailCatalogs[locale] = catalog.AuthEmails;
}
const emailSource = `// Generated from messages/* AuthEmails. Do not edit manually.\nexport const authEmailCatalogs = ${JSON.stringify(emailCatalogs, null, 2)} as const;\n`;
await writeFile(
  join(root, 'supabase', 'functions', '_shared', 'generated-auth-email-copy.ts'),
  await format(emailSource, prettierOptions),
  'utf8'
);
