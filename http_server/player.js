// const MANIFEST_URL = "https://dash.akamaized.net/akamai/bbb_30fps/bbb_30fps.mpd";
const MANIFEST_URL = `http://localhost:${window.location.port}/data/manifest.mpd`

class VideoPlayer {
    constructor() {
        this.player = null;
        this.customAbr = null;
        this.currentQualityIndex = -1;

        // NOTE: Do not modify this object. The testing framework relies on it.
        this.evalMetrics = {
            timeToFirstFrame: null,
            numRebuffers: 0,
            numQualitySwitches: 0,
            bitrateHistory: [],
            bufferOccupancy: [],
            startTime: null,
            firstFrameTime: null,
            lastQuality: null
        };

        this.initPlayer();
    }

    initPlayer() {
        this.videoElement = document.getElementById('player');
        this.player = dashjs.MediaPlayer().create();

        this.player.addABRCustomRule('qualitySwitchRules', 'CustomBitrateRule', CustomBitrateRule);

        this.setupEventListeners();
        this.loadVideo();
    }

    setupEventListeners() {
        this.player.on(dashjs.MediaPlayer.events.STREAM_INITIALIZED, () => {
            this.setupCustomAbr();
            this.evalMetrics.startTime = performance.now();
        });

        this.player.on(dashjs.MediaPlayer.events.PLAYBACK_STARTED, () => {
            if (this.evalMetrics.firstFrameTime === null) {
                this.evalMetrics.firstFrameTime = performance.now();
                this.evalMetrics.timeToFirstFrame = this.evalMetrics.firstFrameTime - this.evalMetrics.startTime;
                console.log(`Time to first frame ${this.evalMetrics.timeToFirstFrame.toFixed(2)}ms`);
                this.showMetrics();
            }
        });

        this.player.on(dashjs.MediaPlayer.events.BUFFER_EMPTY, function (e) {
            console.log('Buffer empty!', e.mediaType);
        });

        this.player.on(dashjs.MediaPlayer.events.PLAYBACK_WAITING, () => {
            this.evalMetrics.numRebuffers++;
            console.log(`Number of Rebuffers ${this.evalMetrics.numRebuffers}`);
            this.showMetrics();
        });

        this.player.on(dashjs.MediaPlayer.events.QUALITY_CHANGE_RENDERED, (e) => {
            console.log('(Demo event listener) Quality changed to:', e);

            if (e.mediaType === 'video') {
                const newQualityBps = e.newRepresentation.bandwidth;

                if (this.evalMetrics.lastQuality !== null && this.evalMetrics.lastQuality !== newQualityBps) {
                    this.evalMetrics.numQualitySwitches++;
                    console.log(`Quality switch frequency ${this.evalMetrics.numQualitySwitches}`);
                }

                this.evalMetrics.bitrateHistory.push({
                    bitrate: newQualityBps,
                    timestamp: performance.now()
                });

                this.evalMetrics.lastQuality = newQualityBps;
                this.showMetrics();
            }
        });

        this.player.on(dashjs.MediaPlayer.events.BUFFER_LEVEL_UPDATED, (e) => {
            if (e.mediaType === 'video') {
                this.evalMetrics.bufferOccupancy.push({
                    bufferLevel: e.bufferLevel,
                    timestamp: performance.now()
                });
            }
        });

        setInterval(() => {
            this.showMetrics();
        }, 1000);
    }

    loadVideo() {
        this.player.initialize(this.videoElement, MANIFEST_URL, true);
    }

    setupCustomAbr() {
        this.player.updateSettings({
            streaming: {
                abr: {
                    autoSwitchBitrate: { audio: false, video: true }, // We don't worry about audio in this project
                    rules: {
                        throughputRule: { active: false },
                        bolaRule: { active: false },
                        insufficientBufferRule: { active: false },
                        switchHistoryRule: { active: false },
                        droppedFramesRule: { active: false },
                        abandonRequestsRule: { active: false },
                        l2ARule: { active: false },
                        loLPRule: { active: false },
                    },
                    enableSupplementalPropertyAdaptationSetSwitching: false
                },
                buffer: {
                    fastSwitchEnabled: false,
                    bufferTimeDefault: 30,
                    bufferTimeAtTopQuality: 45
                }
            }
        });
    }

    getAverageBitrate() {
        if (this.evalMetrics.bitrateHistory.length === 0) {
            return 0;
        }

        let totalBitrate = 0;
        for (var entry of this.evalMetrics.bitrateHistory) {
            totalBitrate += entry.bitrate;
        }

        return Math.round(totalBitrate / this.evalMetrics.bitrateHistory.length);
    }

    getCurrentBufferLevel() {
        if (this.evalMetrics.bufferOccupancy.length === 0) {
            return 0;
        }

        const latestEntry = this.evalMetrics.bufferOccupancy[this.evalMetrics.bufferOccupancy.length - 1];
        return latestEntry.bufferLevel.toFixed(2);
    }

    showMetrics() {
        const ttffElem = document.getElementById('ttff');
        const rebufferCountElem = document.getElementById('rebufferCount');
        const avgQualityElem = document.getElementById('averageQuality');
        const bufferLevelElem = document.getElementById('bufferLevel');

        if (ttffElem) {
            let ttff;
            if (this.evalMetrics.timeToFirstFrame) {
                ttff = Math.round(this.evalMetrics.timeToFirstFrame) + 'ms';
            } else {
                ttff = 'No data yet';
            }
            ttffElem.textContent = `TTFF: ${ttff}`;
        }

        if (rebufferCountElem) {
            rebufferCountElem.textContent = `Number of rebuffers ${this.evalMetrics.numRebuffers}`;
        }

        if (avgQualityElem) {
            const avgKbps = Math.round(this.getAverageBitrate() / 1000);
            avgQualityElem.textContent = `Avg Quality ${avgKbps}kbps (${this.evalMetrics.numQualitySwitches} switches)`;
        }

        if (bufferLevelElem) {
            const currentBuffer = this.getCurrentBufferLevel();
            bufferLevelElem.textContent = `Buffer: ${currentBuffer}s`;
        }
    }
}

let globalPlayer;

document.addEventListener('DOMContentLoaded', () => {
    globalPlayer = new VideoPlayer();
    window.videoPlayer = globalPlayer;
});