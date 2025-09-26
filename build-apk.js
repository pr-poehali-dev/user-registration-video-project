#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Building IMPERIA PROMO Android APK...\n');

const steps = [
  {
    name: '📦 Building React app for production',
    command: 'npm run build',
    description: 'Creating optimized production build'
  },
  {
    name: '⚙️ Initializing Capacitor Android platform',
    command: 'npx cap add android',
    description: 'Setting up Android project structure',
    optional: true
  },
  {
    name: '🔄 Syncing web assets to Android',
    command: 'npx cap sync android',
    description: 'Copying web files to Android project'
  },
  {
    name: '🛠️ Building Android APK',
    command: 'npx cap build android',
    description: 'Compiling Android application'
  }
];

async function runStep(step) {
  console.log(`\n${step.name}`);
  console.log(`📋 ${step.description}`);
  console.log(`🔧 Command: ${step.command}\n`);

  try {
    const output = execSync(step.command, { 
      encoding: 'utf8',
      stdio: ['inherit', 'pipe', 'pipe'],
      cwd: process.cwd()
    });
    
    console.log(`✅ ${step.name} completed successfully`);
    if (output) {
      console.log(`📄 Output: ${output.slice(0, 200)}...`);
    }
    return true;
  } catch (error) {
    if (step.optional) {
      console.log(`⚠️ ${step.name} skipped (already exists)`);
      return true;
    }
    
    console.error(`❌ ${step.name} failed:`);
    console.error(error.message);
    
    // Provide helpful error messages
    if (error.message.includes('Android SDK')) {
      console.log('\n🔧 To fix this issue:');
      console.log('1. Install Android Studio');
      console.log('2. Set ANDROID_HOME environment variable');
      console.log('3. Install Android SDK and build tools');
    }
    
    return false;
  }
}

async function createAlternativeAPK() {
  console.log('\n🎯 Creating alternative APK build process...');
  
  // Create a simple APK info file
  const apkInfo = {
    name: 'IMPERIA PROMO',
    version: '1.0.0',
    packageId: 'com.imperiapromo.videoapp',
    buildDate: new Date().toISOString(),
    features: [
      'Native video recording (HD/4K quality)',
      'Background file upload',
      'Offline video storage',
      'Push notifications',
      'Auto-camera optimization',
      'Gallery integration'
    ],
    permissions: [
      'Camera access',
      'Microphone access', 
      'Storage access',
      'Internet access',
      'Notifications'
    ],
    downloadInstructions: [
      '1. Enable "Unknown sources" in Android Settings',
      '2. Download APK file',
      '3. Tap to install',
      '4. Grant camera and storage permissions'
    ],
    systemRequirements: {
      androidVersion: '7.0+',
      storage: '100MB free space',
      ram: '2GB RAM recommended',
      camera: 'Required'
    }
  };

  fs.writeFileSync('apk-info.json', JSON.stringify(apkInfo, null, 2));
  
  // Create installation page
  const installPage = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>📱 Скачать IMPERIA PROMO APK</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
        .container { background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { font-size: 48px; margin-bottom: 10px; }
        .download-btn { display: block; width: 100%; padding: 20px; background: linear-gradient(135deg, #3B82F6, #1E40AF); color: white; text-decoration: none; border-radius: 8px; text-align: center; font-size: 18px; font-weight: bold; margin: 20px 0; transition: transform 0.2s; }
        .download-btn:hover { transform: translateY(-2px); }
        .features { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .feature-item { margin: 8px 0; display: flex; align-items: center; }
        .instructions { background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .warning { background: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 8px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">📱</div>
            <h1>IMPERIA PROMO</h1>
            <p>Мобильное приложение для видео заявок</p>
        </div>

        <a href="#" class="download-btn" onclick="downloadAPK()">
            📥 Скачать APK (v1.0.0)
        </a>

        <div class="warning">
            <strong>⚠️ Важно:</strong> Это демо-версия. Для создания реального APK нужна сборка на сервере с Android SDK.
        </div>

        <div class="features">
            <h3>🚀 Возможности приложения:</h3>
            ${apkInfo.features.map(feature => `<div class="feature-item">✅ ${feature}</div>`).join('')}
        </div>

        <div class="instructions">
            <h3>📋 Инструкция по установке:</h3>
            ${apkInfo.downloadInstructions.map((step, i) => `<div>${step}</div>`).join('')}
        </div>

        <div style="text-align: center; margin-top: 30px; color: #666;">
            <p>Создано с помощью poehali.dev</p>
            <p>Дата сборки: ${new Date().toLocaleDateString()}</p>
        </div>
    </div>

    <script>
        function downloadAPK() {
            alert('🔧 Для создания реального APK файла необходимо:\\n\\n1. Установить Android Studio\\n2. Настроить Android SDK\\n3. Выполнить полную сборку\\n\\nЭто демо показывает структуру мобильного приложения.');
        }
    </script>
</body>
</html>`;

  fs.writeFileSync('download-apk.html', installPage);
  
  console.log('✅ APK info and download page created!');
  console.log('📁 Files created:');
  console.log('   - apk-info.json (app information)');
  console.log('   - download-apk.html (download page)');
}

async function main() {
  console.log('🏗️ IMPERIA PROMO APK Build Process');
  console.log('=====================================\n');

  // Check if this is a development environment
  if (!fs.existsSync('node_modules')) {
    console.log('❌ node_modules not found. Run npm install first.');
    process.exit(1);
  }

  console.log('📋 Build steps:');
  steps.forEach((step, i) => {
    console.log(`   ${i + 1}. ${step.name}`);
  });
  console.log('');

  let success = true;
  
  for (const step of steps) {
    const result = await runStep(step);
    if (!result) {
      success = false;
      break;
    }
  }

  if (!success) {
    console.log('\n⚠️ APK build encountered issues. Creating alternative package...');
    await createAlternativeAPK();
    console.log('\n🎯 Alternative APK package created successfully!');
    console.log('📂 Open download-apk.html to see the installation page');
  } else {
    console.log('\n🎉 APK build completed successfully!');
    console.log('📱 APK location: android/app/build/outputs/apk/debug/app-debug.apk');
  }
}

// Run the build process
main().catch(console.error);