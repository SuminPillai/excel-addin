ROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --only=production

# Copy application code and service account key
COPY . .

# Expose port
EXPOSE 8080

# Start the application
CMD ["node", "server.js"]
