FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# JSON fayllar xavfsiz va tahrirlanadigan bo'lishi uchun data papkasiga ruxsat beramiz
RUN mkdir -p data && chmod -R 777 data

CMD ["node", "src/index.js"]
