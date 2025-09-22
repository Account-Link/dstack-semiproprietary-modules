FROM node:18-alpine

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy enclave code
COPY enclave/ ./enclave/

# Copy scripts and test files
COPY scripts/ ./scripts/
COPY test/ ./test/

# Create directories for bulletin board and modules
RUN mkdir -p bulletin_board private_module test_temp

# Create non-root user for security
RUN addgroup -g 1001 -S enclave && \
    adduser -S semiprop -u 1001 -G enclave

# Set proper permissions
RUN chown -R semiprop:enclave /app && chmod 775 /app/bulletin_board && chmod 775 /app/test_temp
USER semiprop

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1))" || exit 1

# Start the enclave service
CMD ["node", "enclave/semiprop-service.js"]