# Project 3: CMU-Tube

Welcome to **Project 3!**  
Before you begin, please **read the handout and starter code carefully**.  
This README provides a quick guide to help you set up your development and testing environment.

---

## 🧩 1. Setting Up the Development Environment

We will use **Docker** to provide a consistent environment for development and testing.  
If you don’t already have Docker installed, follow the [official installation guide](https://docs.docker.com/engine/install/).

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
wget https://cmu.box.com/shared/static/wkawkp9ilijmokduf3vui2jin6s6o7ta.tar
tar -xvf y3c0t7jav94p08oo1ziz7wjwfz0145fp.tar
rm y3c0t7jav94p08oo1ziz7wjwfz0145fp.tar
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

### Network traces
To evaluate your adaptive bitrate (ABR) algorithm under diverse network conditions, we provide a set of synthetic and real-world traces.
All traces can be found in the `scripts/` directory.

#### 🧪 Synthetic Traces
These traces simulate both **steady** and **dynamic** network conditions.
##### Steady Conditions

| Trace Name           | Bandwidth | Latency | Description                         |
| -------------------- | --------- | ------- | ----------------------------------- |
| `200kbit_200ms_1min` | 200 kbps  | 200 ms  | Ultra-low bandwidth, high latency   |
| `500kbit_100ms_1min` | 500 kbps  | 100 ms  | Low bandwidth, medium latency       |
| `3mbit_100ms_1min`   | 3 Mbps    | 100 ms  | Medium bandwidth, medium latency    |
| `10mbit_100ms_1min`  | 10 Mbps   | 100 ms  | High bandwidth, medium latency      |
| `unrestricted`       | Localhost | N/A     | No bandwidth or latency constraints |

##### Dynamic Conditions
| Trace Name                  | Bandwidth Behavior                    | Latency    | Description                  |
| --------------------------- | ------------------------------------- | ---------- | ---------------------------- |
| `500kbit_then_unrestricted` | 500 kbps → unrestricted (at 30 s)     | 100 ms     | Starts poor, then improves   |
| `unrestricted_then_1mbit`   | Unrestricted → 1 Mbps (at 30 s)       | 100 ms     | Starts good, then degrades   |
| `oscillate_1mbit_start`     | Alternates 1 ↔ 5 Mbps (starts 1 Mbps) | 100 ms     | Unstable bandwidth pattern   |
| `oscillate_5mbit_start`     | Alternates 1 ↔ 5 Mbps (starts 5 Mbps) | 100 ms     | Unstable bandwidth pattern   |
| `6mbit_50ms_jitter`         | 6 Mbps                                | 50 ± 25 ms | Unstable latency with jitter |

#### 🌍 Real-World Traces
These traces are derived from real-world [measurements](https://skulddata.cs.umass.edu/traces/mmsys/2013/pathbandwidth/) collected by the UMass MMSys project.
| Trace Name                   | Scenario  | Description                                                   |
| ---------------------------- | --------- | ------------------------------------------------------------- |
| `jernbanetorget_ljabru_tram` | Tram ride | Bandwidth along a tram route from **Jernbanetorget → Ljabru** |
| `snaroya_smestad_car`        | Car drive | Bandwidth during a drive from **Snarøya → Smestad**           |


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
* 🏆 A live scoreboard will show your ranking based on the overall QoE score — the top performer wins a 🎁 special prize!