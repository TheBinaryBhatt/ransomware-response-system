FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Set environment variables for build
ENV VITE_API_URL=http://localhost:8000
ENV VITE_WS_URL=ws://localhost:8000

# Build the application
RUN npm run build

# Install serve to run the built application
RUN npm install -g serve

# Expose the port
EXPOSE 3000

# Start the application - Vite outputs to 'dist' not 'build'
CMD ["serve", "-s", "dist", "-l", "3000"]