FROM node:18-alpine

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy enclave code
COPY enclave/ ./enclave/

# Create directories for bulletin board and modules
RUN mkdir -p bulletin_board private_module

# Create non-root user for security
RUN addgroup -g 1001 -S enclave && \
    adduser -S semiprop -u 1001 -G enclave

# Set proper permissions
RUN chown -R semiprop:enclave /app
USER semiprop

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1))" || exit 1

# Start the semi-proprietary service
CMD ["node", "enclave/semiprop-service.js"]