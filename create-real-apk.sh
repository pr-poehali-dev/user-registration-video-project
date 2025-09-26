#!/bin/bash

echo "🚀 IMPERIA PROMO - Создание реального Android APK"
echo "=================================================="
echo ""

# Проверяем Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js не найден. Установите Node.js для продолжения."
    exit 1
fi

# Проверяем npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm не найден. Установите npm для продолжения."
    exit 1
fi

echo "✅ Node.js и npm найдены"

# Устанавливаем зависимости если нужно
if [ ! -d "node_modules" ]; then
    echo "📦 Устанавливаем зависимости..."
    npm install
fi

echo "🔧 Запускаем скрипт сборки Android APK..."
echo ""

# Запускаем наш скрипт сборки
node build-android-apk.js

echo ""
echo "✅ Скрипт сборки выполнен!"
echo ""

# Проверяем результат
if [ -f "imperia-promo-release.apk" ] || [ -f "imperia-promo-debug.apk" ]; then
    echo "🎉 APK файл создан успешно!"
    
    if [ -f "imperia-promo-release.apk" ]; then
        APK_FILE="imperia-promo-release.apk"
        echo "📱 Release APK: $APK_FILE"
    else
        APK_FILE="imperia-promo-debug.apk"
        echo "📱 Debug APK: $APK_FILE"
    fi
    
    APK_SIZE=$(du -h "$APK_FILE" | cut -f1)
    echo "📊 Размер APK: $APK_SIZE"
    
    echo ""
    echo "📋 Следующие шаги:"
    echo "1. Скачайте APK файл: $APK_FILE"
    echo "2. Включите 'Неизвестные источники' в настройках Android"
    echo "3. Установите APK на устройство"
    echo "4. Разрешите доступ к камере и хранилищу"
    
elif [ -f "download-real-apk.html" ]; then
    echo "📱 Создана страница скачивания APK"
    echo "🌐 Откройте: download-real-apk.html"
    
elif [ -f "build-status.json" ]; then
    echo "⚠️ Сборка прервана. Проверьте build-status.json для деталей"
    echo "💡 Возможные причины:"
    echo "   - Android SDK не установлен"
    echo "   - Java JDK не найден"
    echo "   - Gradle не настроен"
    
else
    echo "❌ APK не создан. Проверьте логи сборки"
fi

echo ""
echo "🔗 Дополнительные ресурсы:"
echo "   📱 Демо APK: download-apk.html"
echo "   🧪 Тестирование: comprehensive-video-test.html"
echo "   🔧 Интерфейс сборки: build-apk-interface.html"
echo ""
echo "📞 Для полной сборки APK требуется:"
echo "   - Android Studio с SDK"
echo "   - Java JDK 11+"
echo "   - Настроенная переменная ANDROID_HOME"