var CustomBitrateRule;

function CustomBitrateRule() {
    let factory = dashjs.FactoryMaker;
    let SwitchRequest = factory.getClassFactoryByName('SwitchRequest');
    let context = this.context; // This is the global dash.js context
    let instance;

    // TODO: You can add some initialization logic here
    function initRule() {}

    /**
     * This is the function that gets invoked when the dash.js player
     * wants to check if a quality switch is required.
     */
    function getSwitchRequest(ruleCtx) {
        const mediaInfo = ruleCtx.getMediaInfo();
        
        // We limit the scope of this project to video streams
        if (mediaInfo.type !== 'video') {
            return SwitchRequest(context).create();
        }

        // TODO: Implement your ABR rule below.
        
        // Return empty switch request if no quality change is needed
        return SwitchRequest(context).create();
    }

    /**
     * Some helper function ideas to get you started. The function to get the current
     * buffer level is provided to you as an example of how you could access the metrics
     */
    function getCurrentBufferLevel(context) {
        const MetricsModel = dashjs.FactoryMaker.getSingletonFactoryByName('MetricsModel');
        const DashMetrics = dashjs.FactoryMaker.getSingletonFactoryByName('DashMetrics');

        const metricsModel = MetricsModel(context).getInstance();
        const dashMetrics = DashMetrics(context).getInstance();
        const metrics = metricsModel.getMetricsFor('video', true);

        var buf = dashMetrics.getCurrentBufferLevel('video', metrics) || -1;
        return buf;
    }

    // TODO: Fill in the skeleton helper functions below
    function getCurrentQualityIndex() {
        return 0;
    }

    function getNetworkThroughput() {
        return 0;
    }

    instance = {
        getSwitchRequest: getSwitchRequest
    };

    initRule();
    return instance;
}

CustomBitrateRule.__dashjs_factory_name = 'CustomBitrateRule';
CustomBitrateRule = dashjs.FactoryMaker.getClassFactory(CustomBitrateRule);