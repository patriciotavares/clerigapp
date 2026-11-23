# Gera o APK da TV dentro do próprio servidor (opcional).
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
RUN cd android && gradle --no-daemon assembleRelease
CMD ["sh", "-c", "cp /src/android/app/build/outputs/apk/release/app-release.apk /saida/sons-magicos.apk && echo 'APK pronto em dados/apk/sons-magicos.apk'"]
