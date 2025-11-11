# Project 3: CMU-Tube

Welcome to **Project 3!**  
Before you begin, please **read the handout and starter code carefully**.  
This README provides a quick guide to help you set up your development and testing environment.

---

## 🧩 1. Setting Up the Development Environment

We will use **Docker** to provide a consistent environment for development and testing.  
If you don’t already have Docker installed, follow the [official installation guide](https://docs.docker.com/engine/install/).
The development script has been verified on x86 Ubuntu systems, ARM-based Apple M2 devices, and Windows WSL environments.

### Build the Docker Image
Run the following command in the project root directory:
```bash
docker build -t cmu-tube-env .
```

### Start the Container
Launch an interactive container and mount your local project directory:
```bash
docker run -it -v /path/to/cmu-tube/on/host/machine:/15441-project3/cmu-tube cmu-tube-env
```
This command mounts your host directory `/path/to/cmu-tube/on/host/machine` to `/15441-project3/cmu-tube` inside the container.
Any change made in this directory on either the host or the container will be reflected on both sides.
`/cmu-tube/http_server/data` folder stores the video dataset. If it is empty or missing, the startup script will automatically download the required dataset.

## 🎞️ 2. Manually Downloading Video Data (Optional)
If you prefer to download the dataset manually, run:
```bash
cd cmu-tube/source/http_server
wget https://cmu.box.com/shared/static/wkawkp9ilijmokduf3vui2jin6s6o7ta.tar -O video.tar
tar -xvf video.tar
rm video.tar
```
Normally, you **do not need to** manually download the video data — the Docker startup script handles this automatically.

## 🧪 3. Running the Tests
Once your container is ready, navigate to the cmu-tube directory:
```bash
cd /15441-project3/cmu-tube
```
Run test under certain network trace using:
```bash
node test-runner.js <network_trace> --duration <seconds>
```
Example:
```bash
node test-runner.js 10mbit-100ms-1min --duration 30
```
This runs a 30-second streaming test under a 10 Mbps bandwidth and 100 ms latency. 
Run test under all network traces using:
```bash
node test-runner.js --duration <seconds>
```

### View QoE Metrics
After running `node test-runner.js`, a file named `test-results.json` will be generated.
This file contains the overall QoE score, detailed performance metrics, and the complete bitrate history for the test run.

### Network Traces
To evaluate your adaptive bitrate (ABR) algorithm under diverse network conditions, we provide a set of synthetic and real-world traces.
All traces can be found in the `scripts/` directory.

#### 🧪 Synthetic Traces
These traces simulate both **steady** and **dynamic** network conditions.
##### Steady Conditions

| Trace Name           | Bandwidth | Latency | Description                         |
| -------------------- | --------- | ------- | ----------------------------------- |
| `56kbit_100ms_1min`  | 56 kbps   | 100 ms  | Ultra-low bandwidth, medium latency |
| `500kbit_100ms_1min` | 500 kbps  | 100 ms  | Low bandwidth, medium latency       |
| `3mbit_100ms_1min`   | 3 Mbps    | 100 ms  | Medium bandwidth, medium latency    |
| `10mbit_100ms_1min`  | 10 Mbps   | 100 ms  | High bandwidth, medium latency      |
| `unrestricted`       | Localhost | N/A     | No bandwidth or latency constraints |

##### Dynamic Conditions
| Trace Name                  | Bandwidth Behavior                    | Latency    | Description                  |
| --------------------------- | ------------------------------------- | ---------- | ---------------------------- |
| `500kbit_then_unrestricted` | 500 kbps → unrestricted (at 30 s)     | 100 ms     | Starts poor, then improves   |
| `4mbit_then_56kbit`         | 4 Mbps → 56 kbps (at 10 s)            | 100 ms     | Starts good, then degrades   |
| `oscillate_1mbit_start`     | Alternates 1 ↔ 5 Mbps (starts 1 Mbps) | 100 ms     | Unstable bandwidth pattern   |
| `oscillate_5mbit_start`     | Alternates 1 ↔ 5 Mbps (starts 5 Mbps) | 100 ms     | Unstable bandwidth pattern   |
| `6mbit_50ms_jitter`         | 6 Mbps                                | 50 ± 25 ms | Unstable latency with jitter |

#### 🌍 Real-World Traces
These traces are derived from real-world [measurements](https://skulddata.cs.umass.edu/traces/mmsys/2013/pathbandwidth/) collected by the UMass MMSys project.
| Trace Name                   | Scenario  | Description                                                   |
| ---------------------------- | --------- | ------------------------------------------------------------- |
| `jernbanetorget_ljabru_tram` | Tram ride | Bandwidth along a tram route from **Jernbanetorget → Ljabru** |
| `snaroya_smestad_car`        | Car drive | Bandwidth during a drive from **Snaroya → Smestad**           |


## ⚙️ 4. Implementing and Testing Your ABR Algorithm
You will implement your adaptive bitrate (ABR) logic in the following files:

* `http_server/customAbr.js`
* `http_server/player.js`

Use `test-runner.js` to test your implementation.

Each test generates a `test-results.json` file containing various Quality of Experience (QoE) metrics, such as:

* Time to first frame
* Stall time
* Average bitrate
* Number of quality switches
* Number of rebuffers
* Overall QoE score

### Part 1: Implementing Standard BBA-0

For the first part of the project, please implement the standard BBA-0 algorithm as described in the project handout.
Run the provided test cases to evaluate your implementation, analyze the results, and write a short report summarizing your findings.

### Part 2: Improving BBA-0
In the second part of the project, you should extend and improve the BBA-0 algorithm to achieve better video quality and user experience under various network conditions.
Once your improved algorithm is ready, use `test-runner.js` to evaluate it and verify the results in `test-results.json`.


## 🏁 5. Submitting to Gradescope
When you are satisfied with your improved algorithm:

* Upload only the following files to Gradescope:
    * `customAbr.js`
    * `player.js`

* Gradescope will automatically run your code under all the network traces for 60 seconds.
* 🏆 A live leaderboard will show your ranking based on the overall QoE score — the top performer wins a 🎁 special prize!


## 🌐 6. (Optional) Watch CMU-Tube in Your Browser

This section lets you watch CMU-Tube directly in your browser instead of through the automated tests.
It requires a GUI environment and a web browser (we tested on MacOS M2).

#### 🎬 Demo: CMU-Tube

![CMU-Tube Demo](./http_server/cmu-tube-demo.gif)


### Step 1: Launch the HTTP Server Inside Docker and Expose Ports
Start the container you built earlier, but this time expose the required ports so your host browser can reach the HTTP server inside Docker:
```bash
docker run -it \
    -v /path/to/cmu-tube/on/host/machine:/15441-project3/cmu-tube \
    -p 15441:15441 \
    -p 9001-9012:9001-9012 \
    cmu-tube-env
```
This launches the HTTP server inside Docker and allows your host browser to access it through the mapped ports.

Once the container starts, verify it works by opening 👉 `http://localhost:15441/` in your host browser.
You should see the CMU-Tube homepage.

### Step 2: Watch Videos Under Different Network Conditions
To simulate different network traces, enable a specific network setting from within the container:
```bash
cd cmu-tube
./enable_network_for_browser.sh <network_trace>
```
Example:
```bash
./enable_network_for_browser.sh 10mbit-100ms-1min
```
This sets up the same network conditions used by node test-runner.js, but instead of running headless browser inside Docker, you’ll use **your host browser** as the video client.

Next, open your browser and visit:
```
http://localhost:<test_port>
```
For example, the trace 10mbit-100ms-1min uses port **9004**, so you should visit:
```
http://localhost:9004
```
Each network trace has its own port number — you can check which one is used by inspecting the `enable_network_for_browser.sh` script.



### Step 3: (Optional) Extend the Network Duration
By default, each network trace script runs for 60 seconds. After that, the network tunnel shuts down and playback stops.

If you’d like to watch the full video (≈10 minutes) under a specific network trace, simply edit the corresponding script in `./scripts/<trace>.sh` and increase the value in the `sleep` command to a longer duration.
