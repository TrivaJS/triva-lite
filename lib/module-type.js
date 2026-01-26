/*!
 * Triva
 * Copyright (c) 2026 Kris Powers
 * License MIT
 */


import fs from 'fs';
import path from 'path';

const pkgPath = path.resolve(process.cwd(), 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

if (pkg.type !== 'module') {
  pkg.type = 'module';
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
  return 'Module set';
} else {
  return 'Module Failed';
}
