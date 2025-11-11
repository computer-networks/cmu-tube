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
    git clone https://github.com/computer-networks/cmu-tube.git /tmp/cmu-tube && \
    cd /tmp/cmu-tube && \
    nvm install 20 && nvm use 20 && \
    node -v && npm -v && \
    npm install && \
    npx puppeteer browsers install chrome"

# ----------------------------
# Detect architecture and conditionally install Chrome + Toxiproxy
# ----------------------------
RUN ARCH=$(uname -m) && echo "Detected architecture: $ARCH" && \
    if [ "$ARCH" = "x86_64" ]; then \
        echo "Installing Google Chrome (x86_64)..." && \
        wget -q https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb && \
        apt-get update && apt-get install -y ./google-chrome-stable_current_amd64.deb && \
        rm google-chrome-stable_current_amd64.deb && \
        google-chrome --version && \
        echo "Installing Toxiproxy (x86_64)..." && \
        wget -q https://github.com/Shopify/toxiproxy/releases/download/v2.12.0/toxiproxy-server-linux-amd64 -O /usr/local/bin/toxiproxy-server && \
        wget -q https://github.com/Shopify/toxiproxy/releases/download/v2.12.0/toxiproxy-cli-linux-amd64 -O /usr/local/bin/toxiproxy-cli && \
        chmod +x /usr/local/bin/toxiproxy-server /usr/local/bin/toxiproxy-cli; \
    elif [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then \
        echo "Skipping Chrome installation for ARM. Use Chromium for ARM processors." && \
        add-apt-repository ppa:xtradeb/apps -y && \
        apt update && \
        apt install chromium -y && \
        echo "Installing Toxiproxy (ARM64)..." && \
        wget -q https://github.com/Shopify/toxiproxy/releases/download/v2.12.0/toxiproxy-server-linux-arm64 -O /usr/local/bin/toxiproxy-server && \
        wget -q https://github.com/Shopify/toxiproxy/releases/download/v2.12.0/toxiproxy-cli-linux-arm64 -O /usr/local/bin/toxiproxy-cli && \
        chmod +x /usr/local/bin/toxiproxy-server /usr/local/bin/toxiproxy-cli; \
    else \
        echo "⚠️ Unknown architecture: $ARCH. Skipping Chrome and Toxiproxy installation."; \
    fi

# ----------------------------
# Expose port and startup
# ----------------------------
EXPOSE 15441

COPY ./scripts/start_nginx.sh /usr/local/bin/start_nginx.sh
RUN chmod +x /usr/local/bin/start_nginx.sh

ENTRYPOINT ["/usr/local/bin/start_nginx.sh"]
