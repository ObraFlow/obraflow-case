FROM eclipse-temurin:21-jdk AS build

WORKDIR /workspace
COPY mvnw .
COPY .mvn .mvn
COPY backend backend
RUN chmod +x mvnw && ./mvnw -f backend/pom.xml -DskipTests package

FROM eclipse-temurin:21-jre

WORKDIR /app
COPY --from=build /workspace/backend/target/obraflow-api-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
