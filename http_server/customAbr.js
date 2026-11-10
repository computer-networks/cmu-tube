var CustomBitrateRule;

/**
 * This function defines your custom rule which is bound
 * to the Player. For the sake of this project, you only 
 * need to implement the logic in getSwitchRequest, although
 * you may find it helpful to define some helper functions. 
 */
function CustomBitrateRule() {
    let factory = dashjs.FactoryMaker;
    let SwitchRequest = factory.getClassFactoryByName('SwitchRequest');
    let context = this.context; // This is the global dash.js context
    let instance;

    // TODO: Initialize BBA-0 parameters here

    /**
     * TODO: You can add some initialization logic here
     * This function is called at the start of the playback. 
     * You may find it helpful to initialize state variables in this 
     * function. 
     */
    function initRule() {}

    /**
     * This is the function that gets invoked when the dash.js player
     * wants to check if a quality switch is required. Your main logic
     * belongs in this function
     * 
     * @param ruleCtx - RulesContext of your ABR algorithm, see writeup
     * for more information/documentation 
     * 
     * @returns SwitchRequest - contains the next representation
     */
    function getSwitchRequest(ruleCtx) {
        const mediaInfo = ruleCtx.getMediaInfo();
        
        // We limit the scope of this project to video streams
        if (mediaInfo.type !== 'video') {
            return SwitchRequest(context).create();
        }

        // TODO: Implement your ABR rule below.
        // You may find it helpful to reference the write up for  
        // - How to get current and list of available representations(aka chunk qualities)
        // - How to create/initialize a SwitchRequest to signal change in quality
        
        // Return empty switch request if no quality change is needed
        return SwitchRequest(context).create();
    }

    /**
     * Some helper function ideas to get you started. The function to get the current
     * buffer level is provided to you as an example of how you could access the metrics
     */
    function getCurrentBufferLevel(context) {
        // Creates factory functions of MetricsModel and DashMetrics
        const MetricsModel = dashjs.FactoryMaker.getSingletonFactoryByName('MetricsModel');
        const DashMetrics = dashjs.FactoryMaker.getSingletonFactoryByName('DashMetrics');

        // Creates instance of metricsModel + dashMetrics using existing context
        const metricsModel = MetricsModel(context).getInstance();
        const dashMetrics = DashMetrics(context).getInstance();
        const metrics = metricsModel.getMetricsFor('video', true);

        var buf = dashMetrics.getCurrentBufferLevel('video', metrics) || -1;
        return buf;
    }

    /**
     * Helper function that returns dash.js's smoothed throughput estimate for video, in kbps.
     * Pass safe = true for the conservative estimate (scaled down by a safety factor).
     * dash.js computes throughput as bytes / download time, excluding latency, so it can read higher than the link rate.
     * @param ruleCtx - RulesContext passed to getSwitchRequest
     * @param safe - use getSafeAverageThroughput instead of getAverageThroughput
     * @returns throughput in kbps, or null before the first segment has downloaded
     */
    function getThroughput(ruleCtx, safe = false) {
        const throughputController = ruleCtx.getThroughputController();
        const kbps = safe
            ? throughputController.getSafeAverageThroughput('video')
            : throughputController.getAverageThroughput('video');
        return (kbps === null || isNaN(kbps)) ? null : kbps;
    }

    /**
     * Returns dash.js's average request latency for video (time from sending
     * a segment request to receiving its first byte), in ms.
     * @param ruleCtx - RulesContext passed to getSwitchRequest
     * @returns latency in ms, or null before the first segment has downloaded
     */
    function getLatency(ruleCtx) {
        const latencyMs = ruleCtx.getThroughputController().getAverageLatency('video');
        return (latencyMs === null || isNaN(latencyMs)) ? null : latencyMs;
    }

    instance = {
        getSwitchRequest: getSwitchRequest
    };

    initRule();
    return instance;
}

CustomBitrateRule.__dashjs_factory_name = 'CustomBitrateRule';
CustomBitrateRule = dashjs.FactoryMaker.getClassFactory(CustomBitrateRule);