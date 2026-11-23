# Gera o APK da TV dentro do próprio servidor (opcional).
# A chave de assinatura é criada uma única vez e guardada em dados/chave/,
# assim as próximas versões do APK instalam por cima da anterior.
FROM eclipse-temurin:17-jdk
RUN apt-get update && apt-get install -y --no-install-recommends unzip wget && rm -rf /var/lib/apt/lists/*
ENV ANDROID_HOME=/opt/android-sdk
RUN mkdir -p $ANDROID_HOME/cmdline-tools && cd /tmp \
 && wget -q https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip -O tools.zip \
 && unzip -q tools.zip -d $ANDROID_HOME/cmdline-tools && mv $ANDROID_HOME/cmdline-tools/cmdline-tools $ANDROID_HOME/cmdline-tools/latest && rm tools.zip \
 && yes | $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --licenses >/dev/null \
 && $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager "platforms;android-34" "build-tools;34.0.0" >/dev/null
RUN cd /tmp && wget -q https://services.gradle.org/distributions/gradle-8.14.3-bin.zip && unzip -q gradle-8.14.3-bin.zip -d /opt && rm gradle-8.14.3-bin.zip
ENV PATH=/opt/gradle-8.14.3/bin:$PATH
WORKDIR /src
COPY web/ ./web/
COPY android/ ./android/
ENV SONS_KEYSTORE=/dados/chave/sons-magicos.keystore
CMD ["sh", "-c", "set -e; mkdir -p /dados/chave /dados/apk; \
  [ -f $SONS_KEYSTORE ] || keytool -genkeypair -keystore $SONS_KEYSTORE -storepass sonsmagicos -keypass sonsmagicos -alias sonsmagicos -keyalg RSA -keysize 2048 -validity 36500 -dname 'CN=Sons Magicos, C=BR'; \
  cd android && gradle --no-daemon -q assembleRelease; \
  cp app/build/outputs/apk/release/app-release.apk /dados/apk/sons-magicos.apk; \
  echo 'APK pronto: dados/apk/sons-magicos.apk  ->  na TV, Downloader: http://IP-DO-SERVIDOR:8080/apk'"]
