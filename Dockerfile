# Use Amazon Linux 2023 as base image for better Node.js compatibility
FROM amazonlinux:2023

# Install system dependencies
RUN dnf update -y && \
    dnf install -y --allowerasing \
    curl \
    git \
    openssh-server \
    openssh-clients \
    tar \
    wget \
    unzip \
    bash \
    python3 \
    python3-pip \
    && dnf clean all

# Install Node.js 20.x
RUN curl -fsSL https://rpm.nodesource.com/setup_20.x | bash - && \
    dnf install -y nodejs && \
    dnf clean all

# Install AWS CLI v2
RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" \
    && unzip awscliv2.zip \
    && ./aws/install \
    && rm -rf aws awscliv2.zip

# Update npm to latest
RUN npm install -g npm@latest

# Install global npm packages
RUN npm install -g @aws-amplify/cli@latest @aws-amplify/backend-cli typescript vite

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application
COPY . .

# Expose ports for Vite dev server and Amplify sandbox
EXPOSE 3000
EXPOSE 5173
EXPOSE 20002

# Set environment variables
ENV NODE_ENV=development
ENV VITE_AMPLIFY_ENV=sandbox

# Start command (can be overridden)
CMD ["sh", "-c", "npx ampx sandbox & npm run dev -- --host 0.0.0.0"] 