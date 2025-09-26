#!/usr/bin/env node

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 IMPERIA PROMO - Полная Android APK сборка');
console.log('==============================================\n');

class AndroidBuilder {
  constructor() {
    this.projectRoot = process.cwd();
    this.androidPath = path.join(this.projectRoot, 'android');
    this.buildStartTime = Date.now();
  }

  log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = {
      info: '📋',
      success: '✅',
      error: '❌',
      warning: '⚠️',
      progress: '🔄'
    }[type] || '📋';
    
    console.log(`[${timestamp}] ${prefix} ${message}`);
  }

  async exec(command, options = {}) {
    return new Promise((resolve, reject) => {
      const child = spawn('bash', ['-c', command], {
        stdio: ['inherit', 'pipe', 'pipe'],
        cwd: options.cwd || this.projectRoot,
        ...options
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
        if (options.verbose) process.stdout.write(data);
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
        if (options.verbose) process.stderr.write(data);
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr, code });
        } else {
          reject(new Error(`Command failed with code ${code}: ${stderr || stdout}`));
        }
      });
    });
  }

  async checkPrerequisites() {
    this.log('Проверка предварительных условий...', 'progress');
    
    const checks = [
      { name: 'Node.js', command: 'node --version' },
      { name: 'NPM', command: 'npm --version' },
      { name: 'Capacitor CLI', command: 'npx cap --version' }
    ];

    for (const check of checks) {
      try {
        const result = await this.exec(check.command);
        this.log(`${check.name}: ${result.stdout.trim()}`, 'success');
      } catch (error) {
        this.log(`${check.name}: не найден`, 'error');
        throw new Error(`${check.name} is required but not installed`);
      }
    }
  }

  async buildWebAssets() {
    this.log('Сборка веб-ресурсов для production...', 'progress');
    
    try {
      await this.exec('npm run build', { verbose: true });
      this.log('Веб-ресурсы собраны успешно', 'success');
      
      // Проверяем что dist создан
      if (!fs.existsSync(path.join(this.projectRoot, 'dist'))) {
        throw new Error('Папка dist не создана');
      }
      
      const distSize = this.getFolderSize(path.join(this.projectRoot, 'dist'));
      this.log(`Размер сборки: ${(distSize / 1024 / 1024).toFixed(2)} MB`, 'info');
      
    } catch (error) {
      this.log(`Ошибка сборки веб-ресурсов: ${error.message}`, 'error');
      throw error;
    }
  }

  async initializeAndroid() {
    this.log('Инициализация Android платформы...', 'progress');
    
    try {
      // Проверяем есть ли уже Android папка
      if (fs.existsSync(this.androidPath)) {
        this.log('Android платформа уже инициализирована', 'info');
      } else {
        await this.exec('npx cap add android', { verbose: true });
        this.log('Android платформа добавлена', 'success');
      }
      
      // Синхронизируем с веб-ресурсами
      await this.exec('npx cap sync android', { verbose: true });
      this.log('Синхронизация с Android завершена', 'success');
      
    } catch (error) {
      this.log(`Ошибка инициализации Android: ${error.message}`, 'error');
      throw error;
    }
  }

  async optimizeAndroidConfig() {
    this.log('Оптимизация конфигурации Android...', 'progress');
    
    try {
      // Создаем оптимизированный build.gradle
      const buildGradlePath = path.join(this.androidPath, 'app', 'build.gradle');
      
      if (fs.existsSync(buildGradlePath)) {
        let buildGradle = fs.readFileSync(buildGradlePath, 'utf8');
        
        // Добавляем оптимизации
        if (!buildGradle.includes('minifyEnabled')) {
          buildGradle = buildGradle.replace(
            'buildTypes {',
            `buildTypes {
        release {
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }`
          );
        }
        
        // Добавляем архитектуры
        if (!buildGradle.includes('ndk {')) {
          buildGradle = buildGradle.replace(
            'defaultConfig {',
            `defaultConfig {
        ndk {
            abiFilters 'arm64-v8a', 'armeabi-v7a'
        }`
          );
        }
        
        fs.writeFileSync(buildGradlePath, buildGradle);
        this.log('Конфигурация Android оптимизирована', 'success');
      }
      
      // Создаем proguard-rules.pro если нет
      const proguardPath = path.join(this.androidPath, 'app', 'proguard-rules.pro');
      if (!fs.existsSync(proguardPath)) {
        const proguardRules = `
# Keep Capacitor classes
-keep class com.getcapacitor.** { *; }
-keep class com.capacitorjs.** { *; }

# Keep WebView
-keep class android.webkit.** { *; }

# Keep video recording classes
-keep class android.media.** { *; }
-keep class android.hardware.camera2.** { *; }

# Optimization
-optimizationpasses 5
-dontusemixedcaseclassnames
-dontskipnonpubliclibraryclasses
-dontpreverify
-verbose
`;
        fs.writeFileSync(proguardPath, proguardRules);
        this.log('Proguard правила созданы', 'success');
      }
      
    } catch (error) {
      this.log(`Ошибка оптимизации: ${error.message}`, 'warning');
    }
  }

  async buildReleaseAPK() {
    this.log('Сборка release APK...', 'progress');
    
    try {
      const gradlePath = path.join(this.androidPath, 'gradlew');
      
      // Делаем gradlew исполняемым
      if (fs.existsSync(gradlePath)) {
        await this.exec(`chmod +x ${gradlePath}`);
      }
      
      // Собираем release APK
      await this.exec('./gradlew assembleRelease', {
        cwd: this.androidPath,
        verbose: true
      });
      
      this.log('Release APK собран успешно!', 'success');
      
      // Ищем созданный APK
      const apkPaths = [
        path.join(this.androidPath, 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk'),
        path.join(this.androidPath, 'app', 'build', 'outputs', 'apk', 'release', 'app-release-unsigned.apk')
      ];
      
      for (const apkPath of apkPaths) {
        if (fs.existsSync(apkPath)) {
          const apkSize = fs.statSync(apkPath).size;
          this.log(`APK найден: ${apkPath}`, 'success');
          this.log(`Размер APK: ${(apkSize / 1024 / 1024).toFixed(2)} MB`, 'info');
          
          // Копируем в корень проекта
          const targetPath = path.join(this.projectRoot, 'imperia-promo-release.apk');
          fs.copyFileSync(apkPath, targetPath);
          this.log(`APK скопирован в: ${targetPath}`, 'success');
          
          return targetPath;
        }
      }
      
      throw new Error('APK файл не найден после сборки');
      
    } catch (error) {
      this.log(`Ошибка сборки APK: ${error.message}`, 'error');
      
      // Пробуем debug сборку как fallback
      try {
        this.log('Пробуем собрать debug APK...', 'warning');
        await this.exec('./gradlew assembleDebug', {
          cwd: this.androidPath,
          verbose: true
        });
        
        const debugApkPath = path.join(this.androidPath, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
        if (fs.existsSync(debugApkPath)) {
          const targetPath = path.join(this.projectRoot, 'imperia-promo-debug.apk');
          fs.copyFileSync(debugApkPath, targetPath);
          this.log(`Debug APK создан: ${targetPath}`, 'success');
          return targetPath;
        }
      } catch (debugError) {
        this.log(`Debug сборка также не удалась: ${debugError.message}`, 'error');
      }
      
      throw error;
    }
  }

  async generateAPKInfo(apkPath) {
    this.log('Генерация информации о APK...', 'progress');
    
    const apkStats = fs.statSync(apkPath);
    const buildTime = Date.now() - this.buildStartTime;
    
    const apkInfo = {
      app: {
        name: 'IMPERIA PROMO',
        version: '1.0.0',
        packageId: 'com.imperiapromo.videoapp',
        buildDate: new Date().toISOString(),
        buildTime: `${(buildTime / 1000).toFixed(1)} секунд`
      },
      apk: {
        path: path.basename(apkPath),
        size: `${(apkStats.size / 1024 / 1024).toFixed(2)} MB`,
        sizeBytes: apkStats.size,
        type: apkPath.includes('release') ? 'release' : 'debug',
        minAndroid: 'Android 7.0 (API 24)',
        targetAndroid: 'Android 14 (API 34)'
      },
      installation: {
        direct: true,
        playStore: false,
        requirements: [
          'Android 7.0+',
          '100MB свободного места',
          'Разрешение установки из неизвестных источников'
        ]
      },
      features: [
        'Нативная HD/4K видеозапись',
        'Фоновая загрузка файлов',
        'Офлайн сохранение видео',
        'Push уведомления',
        'Интеграция с галереей',
        'Автоматическое сжатие видео'
      ]
    };
    
    fs.writeFileSync('apk-build-info.json', JSON.stringify(apkInfo, null, 2));
    this.log('Информация о APK сохранена в apk-build-info.json', 'success');
    
    return apkInfo;
  }

  async createDownloadPage(apkInfo) {
    this.log('Создание страницы скачивания...', 'progress');
    
    const downloadPage = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>📱 Скачать IMPERIA PROMO APK</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; }
        .container { background: white; padding: 30px; border-radius: 15px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { font-size: 64px; margin-bottom: 10px; }
        .download-btn { display: block; width: 100%; padding: 20px; background: linear-gradient(135deg, #10B981, #059669); color: white; text-decoration: none; border-radius: 12px; text-align: center; font-size: 18px; font-weight: bold; margin: 20px 0; transition: transform 0.3s; }
        .download-btn:hover { transform: translateY(-3px); }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
        .info-item { background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; }
        .features { background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .feature-item { margin: 8px 0; }
        .build-info { background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">📱</div>
            <h1>IMPERIA PROMO</h1>
            <p>Готовое Android приложение</p>
        </div>

        <a href="${apkInfo.apk.path}" class="download-btn" download>
            📥 Скачать APK (${apkInfo.apk.size})
        </a>

        <div class="info-grid">
            <div class="info-item">
                <strong>Версия</strong><br>
                ${apkInfo.app.version}
            </div>
            <div class="info-item">
                <strong>Размер</strong><br>
                ${apkInfo.apk.size}
            </div>
            <div class="info-item">
                <strong>Тип</strong><br>
                ${apkInfo.apk.type}
            </div>
            <div class="info-item">
                <strong>Android</strong><br>
                ${apkInfo.apk.minAndroid}
            </div>
        </div>

        <div class="features">
            <h3>🚀 Возможности приложения:</h3>
            ${apkInfo.features.map(feature => `<div class="feature-item">✅ ${feature}</div>`).join('')}
        </div>

        <div class="build-info">
            <h4>📊 Информация о сборке:</h4>
            <p><strong>Дата сборки:</strong> ${new Date(apkInfo.app.buildDate).toLocaleString()}</p>
            <p><strong>Время сборки:</strong> ${apkInfo.app.buildTime}</p>
            <p><strong>Package ID:</strong> ${apkInfo.app.packageId}</p>
            <p><strong>Целевой Android:</strong> ${apkInfo.apk.targetAndroid}</p>
        </div>

        <div style="text-align: center; margin-top: 30px; color: #666; font-size: 14px;">
            <p>Создано с помощью Capacitor + Android SDK</p>
            <p>© IMPERIA PROMO ${new Date().getFullYear()}</p>
        </div>
    </div>

    <script>
        // Логируем скачивание
        document.querySelector('.download-btn').addEventListener('click', function() {
            console.log('APK download initiated:', '${apkInfo.apk.path}');
            
            // Показываем инструкции
            setTimeout(() => {
                alert('📱 После скачивания:\\n\\n1. Включите "Неизвестные источники"\\n2. Откройте APK файл\\n3. Нажмите "Установить"\\n4. Разрешите доступ к камере');
            }, 1000);
        });
    </script>
</body>
</html>`;

    fs.writeFileSync('download-real-apk.html', downloadPage);
    this.log('Страница скачивания создана: download-real-apk.html', 'success');
  }

  getFolderSize(folderPath) {
    let size = 0;
    if (fs.existsSync(folderPath)) {
      const files = fs.readdirSync(folderPath);
      files.forEach(file => {
        const filePath = path.join(folderPath, file);
        const stats = fs.statSync(filePath);
        if (stats.isFile()) {
          size += stats.size;
        } else if (stats.isDirectory()) {
          size += this.getFolderSize(filePath);
        }
      });
    }
    return size;
  }

  async build() {
    try {
      this.log('Начинаем полную сборку Android APK...', 'progress');
      
      // Этап 1: Проверка предварительных условий
      await this.checkPrerequisites();
      
      // Этап 2: Сборка веб-ресурсов
      await this.buildWebAssets();
      
      // Этап 3: Инициализация Android
      await this.initializeAndroid();
      
      // Этап 4: Оптимизация конфигурации
      await this.optimizeAndroidConfig();
      
      // Этап 5: Сборка APK
      const apkPath = await this.buildReleaseAPK();
      
      // Этап 6: Генерация информации
      const apkInfo = await this.generateAPKInfo(apkPath);
      
      // Этап 7: Создание страницы скачивания
      await this.createDownloadPage(apkInfo);
      
      const totalTime = ((Date.now() - this.buildStartTime) / 1000).toFixed(1);
      
      this.log('', 'success');
      this.log('🎉 APK УСПЕШНО СОБРАН!', 'success');
      this.log('', 'success');
      this.log(`📱 APK файл: ${path.basename(apkPath)}`, 'info');
      this.log(`📊 Размер: ${apkInfo.apk.size}`, 'info');
      this.log(`⏱️ Время сборки: ${totalTime} секунд`, 'info');
      this.log(`🌐 Страница скачивания: download-real-apk.html`, 'info');
      this.log('', 'success');
      this.log('Для установки APK включите "Неизвестные источники" в настройках Android', 'warning');
      
      return apkPath;
      
    } catch (error) {
      this.log(`Сборка не удалась: ${error.message}`, 'error');
      
      // Создаем fallback информацию
      this.log('Создаем информационную страницу о сборке...', 'warning');
      
      const fallbackInfo = {
        status: 'build_failed',
        error: error.message,
        message: 'Для полной сборки APK требуется Android SDK и Java JDK',
        alternative: 'Приложение готово к сборке, все файлы настроены',
        buildDate: new Date().toISOString(),
        instructions: [
          'Установите Android Studio с SDK',
          'Установите Java JDK 11+',
          'Запустите: npm run build',
          'Запустите: npx cap sync android',
          'Запустите: cd android && ./gradlew assembleRelease'
        ]
      };
      
      fs.writeFileSync('build-status.json', JSON.stringify(fallbackInfo, null, 2));
      this.log('Статус сборки сохранен в build-status.json', 'info');
      
      throw error;
    }
  }
}

// Запуск сборки
const builder = new AndroidBuilder();
builder.build().catch(() => process.exit(1));