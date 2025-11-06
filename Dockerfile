# Use an Ubuntu base image
FROM ubuntu:22.04

# Prevent interactive prompts during package install
ENV DEBIAN_FRONTEND=noninteractive
ENV NVM_DIR=/root/.nvm
WORKDIR /15441-project3

# ----------------------------
# Install system dependencies
# ----------------------------
RUN apt-get update && \
    apt-get install -y \
        curl wget git nginx iproute2 iperf3 net-tools iftop \
        ca-certificates gnupg apt-transport-https \
        software-properties-common && \
    rm -rf /var/lib/apt/lists/*

# ----------------------------
# Install Node.js (via NVM)
# ----------------------------
RUN mkdir -p "$NVM_DIR" && \
    curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/master/install.sh | bash && \
    bash -c ". $NVM_DIR/nvm.sh && nvm install 20 && nvm alias default 20 && npm install -g npm@latest"

# Make NVM available in all shells
ENV NODE_VERSION=20
RUN echo 'export NVM_DIR="$HOME/.nvm"' >> /root/.bashrc && \
    echo '[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"' >> /root/.bashrc && \
    echo "nvm use ${NODE_VERSION}" >> /root/.bashrc

# ----------------------------
# Clone cmu-tube repo and install dependencies
# ----------------------------
RUN bash -c ". $NVM_DIR/nvm.sh && \
    git clone https://github.com/A-Dying-Pig/cmu-tube.git /tmp/cmu-tube && \
    cd /tmp/cmu-tube && \
    nvm install 20 && nvm use 20 && \
    node -v && npm -v && \
    npm install && \
    npx puppeteer browsers install chrome && \
    rm -rf /tmp/cmu-tube"

# ----------------------------
# Install Google Chrome
# ----------------------------
RUN wget -q https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb && \
    apt-get update && \
    apt-get install -y ./google-chrome-stable_current_amd64.deb && \
    rm google-chrome-stable_current_amd64.deb && \
    google-chrome --version

# ----------------------------
# Install Toxiproxy binaries
# ----------------------------
RUN wget https://github.com/Shopify/toxiproxy/releases/download/v2.12.0/toxiproxy-server-linux-amd64 -O /usr/local/bin/toxiproxy-server && \
    wget https://github.com/Shopify/toxiproxy/releases/download/v2.12.0/toxiproxy-cli-linux-amd64 -O /usr/local/bin/toxiproxy-cli && \
    chmod +x /usr/local/bin/toxiproxy-server /usr/local/bin/toxiproxy-cli

# ----------------------------
# Expose port and startup
# ----------------------------
EXPOSE 15441

COPY ./scripts/start_nginx.sh /usr/local/bin/start_nginx.sh
RUN chmod +x /usr/local/bin/start_nginx.sh

ENTRYPOINT ["/usr/local/bin/start_nginx.sh"]
