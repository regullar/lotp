# LumenLink (LOTP v1)

**LumenLink** — браузерная система передачи любых файлов с экрана одного устройства на камеру другого устройства без Wi-Fi, Bluetooth, NFC, кабеля, локальной сети и серверной передачи данных.

**Автор & Разработчик**: regullar <darin228228@gmail.com>  
**Репозиторий**: [github.com/regullar/lotp](https://github.com/regullar/lotp)

---

## ⚡ Особенности

- **Zero-Server / Offline PWA**: После первоначальной загрузки всё приложение работает 100% локально в браузере. Данные никогда не передаются на внешние серверы.
- **Оптический протокол LOTP v1**: Каждый бинарный QR-кадр сам описывает поток, а ZXing-WASM сканирует камеру в фоновом worker.
- **Systematic Luby Transform (LT) Fountain Code**: Поддерживает бесконечный потоковый рендеринг символов и автоматическое восстановление файлов при потере отдельных кадров.
- **Многоуровневая коррекция ошибок (QR + Reed-Solomon + Fountain Code)**: Защищает данные от потерь и повреждений отдельных кадров.
- **AES-256-GCM Шифрование**: Поддержка парольного шифрования с KDF PBKDF2/Argon2.

Часть логики robust-soliton и QR-worker адаптирована из MIT-проекта
[`decimen-optical-transfer`](https://github.com/bashalarmistalt/decimen-optical-transfer); лицензия приведена в `THIRD_PARTY_NOTICES.md`.

---

## 🚀 Быстрый запуск

```bash
# Клонирование репозитория
git clone https://github.com/regullar/lotp.git
cd lotp

# Установка зависимостей
npm install

# Запуск локального dev-сервера (без SSL для MacBook)
npm run dev

# На смартфоне открывайте production-развёртывание по HTTPS.
# Chrome не выдаёт доступ к камере для обычного http://<локальный-ip>.
```

---

## 🧪 Запуск тестов

```bash
# Юнит-тесты протокола и симулятор ошибок (Vitest)
npm run test:unit

# Сборка production версии
npm run build
```
