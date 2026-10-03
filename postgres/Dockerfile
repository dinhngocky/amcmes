FROM node:22-bookworm-slim
WORKDIR /opt/amcvn
COPY postgres/package*.json ./postgres/
RUN cd postgres && npm ci --omit=dev
COPY apps-script/ ./apps-script/
COPY build-report.json ./
COPY postgres/ ./postgres/
RUN chown -R node:node /opt/amcvn
USER node
WORKDIR /opt/amcvn/postgres
ENV HOST=0.0.0.0 PORT=3000
EXPOSE 3000
CMD ["sh","-c","npm run db:init && exec npm start"]
