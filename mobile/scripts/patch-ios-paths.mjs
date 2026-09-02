#!/usr/bin/env node
/**
 * Fix Expo iOS build scripts when the project path contains spaces.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const constantsSh = path.join(
  root,
  'node_modules/expo-constants/scripts/get-app-config-ios.sh',
);
if (fs.existsSync(constantsSh)) {
  const src = fs.readFileSync(constantsSh, 'utf8');
  const next = src.replace(
    'PROJECT_DIR_BASENAME=$(basename $PROJECT_DIR)',
    'PROJECT_DIR_BASENAME=$(basename "$PROJECT_DIR")',
  );
  if (next !== src) fs.writeFileSync(constantsSh, next);
}

const constantsPodspec = path.join(root, 'node_modules/expo-constants/ios/EXConstants.podspec');
if (fs.existsSync(constantsPodspec)) {
  const src = fs.readFileSync(constantsPodspec, 'utf8');
  const next = src.replace(
    /:script => "bash -l -c \\"#\{env_vars\}\$PODS_TARGET_SRCROOT\/\.\.\/scripts\/get-app-config-ios\.sh\\"",/,
    ':script => \'bash -l "$PODS_TARGET_SRCROOT/../scripts/get-app-config-ios.sh"\',',
  );
  if (next !== src) fs.writeFileSync(constantsPodspec, next);
}

const pbxproj = path.join(root, 'ios/BachatCoach.xcodeproj/project.pbxproj');
if (fs.existsSync(pbxproj)) {
  const src = fs.readFileSync(pbxproj, 'utf8');
  const next = src
    .replace('export PROJECT_ROOT="$PROJECT_DIR"/..', 'export PROJECT_ROOT="$PROJECT_DIR/.."')
    .replace(
      '`"$NODE_BINARY" --print "require(\'path\').dirname(require.resolve(\'react-native/package.json\')) + \'/scripts/react-native-xcode.sh\'"`',
      'RN_XCODE="$("$NODE_BINARY" --print "require(\'path\').dirname(require.resolve(\'react-native/package.json\')) + \'/scripts/react-native-xcode.sh\'")"\n. "$RN_XCODE"',
    );
  if (next !== src) fs.writeFileSync(pbxproj, next);
}
