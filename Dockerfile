FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY sudoku-service.js .
COPY sudoku-solver.js .
COPY module-loader.js .
COPY verifier.js .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S sudoku -u 1001

# Change ownership
RUN chown -R sudoku:nodejs /usr/src/app
USER sudoku

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "http.get('http://localhost:3000/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1))" || exit 1

# Start the application
CMD [ "node", "sudoku-service.js" ]