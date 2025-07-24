# Zeeky Mobile App (Placeholder)

This directory will house the cross-platform mobile application for Zeeky.
Our current plan is to use [Flutter](https://flutter.dev/) so we can ship to
both iOS and Android from a single codebase.

## Planned Tech Stack

* Flutter 3.22 with Dart 3
* State management – Riverpod or Bloc
* Networking – `dio` + generated REST clients
* UI – Material 3 + Cupertino widgets
* Secure storage – `flutter_secure_storage` for tokens

## Quickstart (not yet implemented)

```bash
# Install Flutter (see flutter.dev)
flutter pub get
flutter run
```

---
_For now, use the CLI (`python main.py`) or the web chat (`apps/web/index.html`)._